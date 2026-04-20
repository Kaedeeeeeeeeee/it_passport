import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Handles both the OAuth code-exchange and magic link returns.
 *  - OAuth: URL has ?code=xxx (and state) — swap for session.
 *  - Magic link: Supabase redirects back to this route directly once the user
 *    clicks the email; supabase-js already set the session cookie in that
 *    roundtrip. We only need to honor ?next for the final destination. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

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

  return NextResponse.redirect(new URL(next, url.origin));
}
