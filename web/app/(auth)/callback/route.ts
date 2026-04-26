import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

const SUPPORTED = routing.locales as readonly string[];

/** Handles both the OAuth code-exchange and magic link returns.
 *  - OAuth: URL has ?code=xxx (and state) — swap for session.
 *  - Magic link: Supabase redirects back to this route directly once the user
 *    clicks the email; supabase-js already set the session cookie in that
 *    roundtrip. We only need to honor ?next for the final destination. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/home";

  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          url.origin,
        ),
      );
    }
  }

  const response = NextResponse.redirect(new URL(next, url.origin));

  // If the user has a saved UI-language preference and it differs from the
  // current cookie on this device, override the cookie so the proxy +
  // next-intl rewrite into the right locale on the next request. This is what
  // makes the preference follow the user across devices/browsers.
  try {
    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    if (auth.user) {
      const { data: profile } = await sb
        .from("profiles")
        .select("preferred_language")
        .eq("id", auth.user.id)
        .maybeSingle();
      const preferred = (profile as { preferred_language?: string | null } | null)
        ?.preferred_language;
      if (preferred && SUPPORTED.includes(preferred)) {
        const currentCookie = request.headers
          .get("cookie")
          ?.split(/;\s*/)
          .find((c) => c.startsWith("NEXT_LOCALE="))
          ?.slice("NEXT_LOCALE=".length);
        if (currentCookie !== preferred) {
          response.cookies.set("NEXT_LOCALE", preferred, {
            path: "/",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 365,
          });
        }
      }
    }
  } catch {
    // Non-fatal — the redirect itself should always succeed; the user can
    // re-pick the language from the switcher if this lookup fails.
  }

  return response;
}
