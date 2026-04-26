import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Paths that must never be locale-prefixed: API routes, the OAuth/magic-
// link callback, and Next.js file-convention SEO files (sitemap.xml,
// robots.txt). These still need the Supabase session refresh, though.
const SKIP_INTL =
  /^\/(?:api\/|callback(?:$|[/?])|sitemap\.xml(?:$|\?)|robots\.txt(?:$|\?))/;

/** Proxy (Next 16 renamed `middleware` → `proxy`).
 *
 *  1. Delegates locale detection/routing to next-intl for public paths.
 *  2. Refreshes the Supabase auth session cookie on every request so server
 *     components never see a stale session. */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  let response: NextResponse;

  if (SKIP_INTL.test(path)) {
    response = NextResponse.next({ request });
  } else {
    response = intlMiddleware(request);
    // If next-intl wants to redirect (e.g. `/` → `/en/`), honor it immediately.
    // The next request will hit this proxy again for the session refresh.
    if (response.status === 307 || response.status === 308) {
      return response;
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Preserve the response from next-intl (which may carry a rewrite
          // header) — only attach the refreshed cookies, don't rebuild it.
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Touching getUser() refreshes the session if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Skip static files, Next internals, images, and favicon/og-image routes.
    "/((?!_next/static|_next/image|icon|opengraph-image|favicon|figures|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
