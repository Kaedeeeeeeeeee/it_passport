import { NextResponse } from "next/server";
import { userFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";

const SUPPORTED = routing.locales as readonly string[];
type SupportedLocale = (typeof routing.locales)[number];

function isSupported(value: unknown): value is SupportedLocale {
  return typeof value === "string" && SUPPORTED.includes(value);
}

/** Persist the user's UI-language choice.
 *
 *  Always writes the `NEXT_LOCALE` cookie so anonymous users still get their
 *  preference remembered on this device. If the user is signed in, also mirror
 *  the choice to `profiles.preferred_language` so it follows them to other
 *  devices (picked up on next sign-in by the OAuth/magic-link callback). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const locale = (body as { locale?: unknown } | null)?.locale;
  if (!isSupported(locale)) {
    return NextResponse.json(
      { error: "unsupported locale" },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  const user = await userFromRequest(request);
  if (user) {
    const { error } = await supabaseAdmin()
      .from("profiles")
      .update({ preferred_language: locale })
      .eq("id", user.id);
    if (error) {
      // Non-fatal: cookie write already succeeded, so the choice still takes
      // effect on this device. Surface the failure for observability.
      console.error("[/api/locale] failed to persist preferred_language", error);
    }
  }

  return response;
}
