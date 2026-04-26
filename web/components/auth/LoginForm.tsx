"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Props = { nextPath: string };

export function LoginForm({ nextPath }: Props) {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; email: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const supabase = supabaseBrowser();

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState({ kind: "sending" });
    const redirectTo = `${window.location.origin}/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setState({ kind: "error", message: error.message });
    } else {
      setState({ kind: "sent", email });
    }
  }

  async function googleSignIn() {
    const redirectTo = `${window.location.origin}/callback?next=${encodeURIComponent(nextPath)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  if (state.kind === "sent") {
    return (
      <div className="rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-4 text-[13px] leading-relaxed text-accent-ink">
        <div className="font-semibold mb-1">{t("magicLinkSent")}</div>
        <div className="text-ink-2">
          <span className="t-mono">{state.email}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={googleSignIn}
        className="btn flex items-center justify-center gap-3 py-3"
      >
        <GoogleIcon />
        <span>{t("googleButton")}</span>
      </button>

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-line" />
        <span className="text-[10px] text-ink-3 tracking-[0.1em] uppercase">
          {t("or")}
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <form onSubmit={sendMagicLink} className="flex flex-col gap-2.5">
        <label className="t-label">{t("magicLinkPlaceholder")}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="px-3 py-2.5 rounded-sm border border-line-strong bg-surface text-[14px] focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={state.kind === "sending" || !email}
          className="btn btn-primary py-3"
        >
          {state.kind === "sending" ? t("sending") : t("magicLinkButton")}
        </button>
      </form>

      {state.kind === "error" ? (
        <p className="text-[12px] text-wrong mt-1">{state.message}</p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.12A6.98 6.98 0 0 1 5.5 12c0-.73.13-1.45.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.28 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
