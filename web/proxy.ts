import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Proxy (Next 16 renamed `middleware` → `proxy`).
 *  Refreshes the Supabase auth session cookie on every request that passes
 *  the matcher. Without this, expired session cookies would cause server
 *  components to see the user as logged-out. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
