import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link } from "@/i18n/navigation";

/** Marketing/SEO-only chrome — header (logo + locale + login) and footer.
 *  No sidebar, no auth guard. Used by /exams and /category programmatic
 *  landing pages so they're indexable without sign-in. */
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("landing");
  const common = await getTranslations("common");
  const legalNav = await getTranslations("legalNav");

  return (
    <div className="flex-1 flex flex-col bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline text-ink"
          >
            <div className="w-[3px] h-5 bg-accent" />
            <span className="t-serif text-[15px] font-semibold -tracking-[0.2px]">
              {common("appName")}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher variant="header" />
            <Link
              href="/login"
              className="btn btn-ghost !text-[13px] no-underline"
            >
              {t("navLogin")}
            </Link>
            <Link
              href="/login"
              className="btn btn-primary !text-[13px] no-underline"
            >
              {t("navStart")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11.5px] text-ink-3">
          <span>© {common("appName")}</span>
          <nav className="flex items-center gap-4 flex-wrap">
            <Link href="/terms" className="hover:text-accent">
              {legalNav("terms")}
            </Link>
            <Link href="/privacy" className="hover:text-accent">
              {legalNav("privacy")}
            </Link>
            <Link href="/legal" className="hover:text-accent">
              {legalNav("tokushou")}
            </Link>
            <span className="t-mono">{common("tagline")}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
