"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Icon } from "./Icon";

type Variant = "header" | "sidebar";

export function LocaleSwitcher({ variant = "header" }: { variant?: Variant }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("localeSwitcher");

  async function pick(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    // Persist the choice (cookie + profile if signed in) before navigating so
    // the next request — and any other device — sees the new preference.
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // Network hiccup shouldn't block the UX — fall through and navigate.
    }
    router.replace(pathname, { locale: next });
  }

  const triggerClass =
    variant === "sidebar"
      ? "w-full flex items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-ink-2 hover:bg-surface-2"
      : "flex items-center gap-1.5 btn btn-ghost !text-[12.5px] !py-1.5 !px-2.5 no-underline";

  const menuAlignment = variant === "sidebar" ? "left-0" : "right-0";
  // Sidebar sits at the bottom of the column → menu opens upward.
  // Header sits at the top of the page → menu opens downward.
  const menuVertical =
    variant === "sidebar" ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
        className={triggerClass}
      >
        <Icon name="globe" size={14} />
        <span className="flex-1 text-left">{t(locale)}</span>
        <span className="text-[9px] text-ink-3">▾</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="listbox"
            className={`absolute ${menuAlignment} ${menuVertical} min-w-[148px] rounded-[var(--radius)] border border-line bg-surface shadow-md z-50 overflow-hidden`}
          >
            {routing.locales.map((l) => (
              <button
                key={l}
                role="option"
                aria-selected={l === locale}
                type="button"
                onClick={() => pick(l)}
                className={
                  "w-full text-left px-3 py-2 text-[12.5px] hover:bg-surface-2 transition-colors " +
                  (l === locale
                    ? "text-accent-ink font-semibold bg-accent-soft"
                    : "text-ink-2")
                }
              >
                {t(l)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
