"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";

type Source = string;

type Ctx = {
  /** Show the subscribe modal. `source` is recorded in the
   *  `paywall_shown` analytics event so we can see which Pro click
   *  point converted (e.g., "sidebar:exam", "ai_explanation"). */
  open: (source: Source) => void;
};

const SubscribeModalContext = createContext<Ctx | null>(null);

export function useSubscribeModal(): Ctx {
  const ctx = useContext(SubscribeModalContext);
  if (!ctx) {
    throw new Error(
      "useSubscribeModal must be used inside <SubscribeModalProvider>",
    );
  }
  return ctx;
}

/** Single shared paywall modal, opened by any Pro-gated click point.
 *  Uses the native <dialog> element for built-in focus trap, ESC-to-
 *  close, and backdrop a11y. The provider belongs at the shell layout
 *  level — every Pro feature surface lives under (shell). */
export function SubscribeModalProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const t = useTranslations("subscribeModal");
  const pricingT = useTranslations("pricing");
  const price = pricingT("proPrice");

  // Read pricing.proFeatures.* one entry at a time (next-intl v4 message
  // arrays). Stop at the first missing key so the modal stays in sync if
  // the array shrinks. Computed once per locale change via useMemo so we
  // don't trigger the react-hooks/set-state-in-effect lint rule.
  const features = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        out.push(pricingT(`proFeatures.${i}`));
      } catch {
        break;
      }
    }
    return out;
  }, [pricingT]);

  const open = useCallback((source: Source) => {
    track("paywall_shown", { source });
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  return (
    <SubscribeModalContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        className="
          rounded-[var(--radius-lg)] border border-line bg-surface p-0
          backdrop:bg-ink/40
          w-[92vw] max-w-[420px]
          open:animate-none
        "
      >
        <div className="p-6 sm:p-7">
          <header className="mb-4">
            <div className="t-label mb-2" style={{ color: "var(--accent-ink)" }}>
              Pro
            </div>
            <h2 className="t-serif text-[20px] sm:text-[22px] font-semibold -tracking-[0.3px] leading-snug text-ink">
              {t("title")}
            </h2>
          </header>

          <p className="text-[13.5px] leading-[1.85] text-ink-2 mb-5">
            {t("body", { price })}
          </p>

          {features.length > 0 ? (
            <ul className="space-y-2 mb-6">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-[13px] leading-[1.7] text-ink-2"
                >
                  <span
                    aria-hidden="true"
                    className="t-mono shrink-0 mt-px"
                    style={{ color: "var(--accent)" }}
                  >
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/pricing"
              onClick={() => {
                track("paywall_cta_clicked");
                close();
              }}
              className="btn btn-primary no-underline"
            >
              {pricingT("ctaSubscribe")}
            </Link>
            <button
              type="button"
              onClick={close}
              className="text-[13px] text-ink-3 underline-offset-2 hover:text-accent hover:underline"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      </dialog>
    </SubscribeModalContext.Provider>
  );
}
