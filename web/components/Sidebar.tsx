"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSubscribeModal } from "./subscribe/SubscribeModal";
import { Icon, type IconName } from "./Icon";
import { LocaleSwitcher } from "./LocaleSwitcher";

type Item = {
  href: string;
  key: "home" | "library" | "exam" | "review" | "stats";
  icon: IconName;
  pro?: boolean;
};

const ITEMS: Item[] = [
  { href: "/home", key: "home", icon: "home" },
  { href: "/library", key: "library", icon: "book" },
  { href: "/exam", key: "exam", icon: "exam", pro: true },
  { href: "/review", key: "review", icon: "bookmark", pro: true },
  { href: "/stats", key: "stats", icon: "chart", pro: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

type Props = {
  user: { email: string | null; isPro: boolean } | null;
};

export function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("sidebar");
  const common = useTranslations("common");
  const { open: openSubscribeModal } = useSubscribeModal();
  const isProUser = user?.isPro ?? false;

  return (
    <aside className="w-[212px] shrink-0 border-r border-line bg-surface-2 py-6 px-4 hidden md:flex flex-col">
      <Link
        href="/home"
        className="flex items-baseline gap-2 px-2.5 pb-6 no-underline text-ink"
      >
        <span className="grid h-[22px] w-[22px] place-items-center rounded-sm bg-accent text-white text-[11px] font-bold t-mono">
          iP
        </span>
        <span>
          <span className="block text-sm font-semibold -tracking-[0.2px]">
            {locale === "en" ? "IT Passport" : "IT Passport"}
          </span>
          <span className="block text-[10px] text-ink-3 tracking-[0.08em] mt-px">
            {common("tagline").split(" · ")[0]}
          </span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((it) => {
          const active = isActive(pathname, it.href);
          const proGated = it.pro && !isProUser;
          const cls = [
            "group flex items-center gap-3 px-2.5 py-2 rounded-sm text-[13.5px] no-underline w-full text-left",
            active
              ? "bg-surface text-accent-ink font-semibold shadow-[inset_2px_0_0_var(--accent)]"
              : "text-ink-2 font-medium hover:bg-surface",
          ].join(" ");
          const inner = (
            <>
              <Icon name={it.icon} size={16} />
              <span className="flex-1 flex justify-between items-baseline">
                <span>{t(it.key)}</span>
                <span className="text-[10px] text-ink-3 font-normal tracking-[0.04em]">
                  {t(`${it.key}Sub`)}
                </span>
              </span>
            </>
          );
          // Non-Pro user clicking a Pro feature: intercept and open the
          // subscribe modal instead of navigating (the destination would
          // server-side requirePro and redirect to /pricing anyway, but
          // a modal keeps the user in context).
          if (proGated) {
            return (
              <button
                key={it.href}
                type="button"
                onClick={() => openSubscribeModal(`sidebar:${it.key}`)}
                className={cls}
              >
                {inner}
              </button>
            );
          }
          return (
            <Link key={it.href} href={it.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="mb-2.5">
        <LocaleSwitcher variant="sidebar" />
      </div>

      {user ? (
        <Link
          href="/account"
          className="mb-2.5 flex items-center gap-2.5 rounded-sm border border-line bg-surface px-3 py-2.5 no-underline text-ink hover:bg-surface-2"
        >
          <div className="grid place-items-center h-7 w-7 rounded-full bg-accent-soft text-accent-ink text-[11px] font-semibold">
            {user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] truncate">{user.email ?? "—"}</div>
            <div className="text-[10px] text-ink-3">
              {isProUser ? t("proMember") : t("freeMember")}
            </div>
          </div>
          <Icon name="settings" size={14} />
        </Link>
      ) : (
        <Link
          href="/login"
          className="btn mb-2.5 !text-[12.5px] no-underline text-center block"
        >
          {t("loginButton")}
        </Link>
      )}

      <Link
        href="/blog"
        className="text-[11.5px] text-ink-3 hover:text-accent no-underline mb-2 block px-2.5"
      >
        {t("blog")}
      </Link>

      <a
        href={`mailto:${t("feedbackEmail")}?subject=${encodeURIComponent(t("feedbackSubject"))}`}
        className="text-[11px] text-ink-3 hover:text-accent no-underline mb-2 block text-center"
      >
        {t("feedback")}
      </a>

      <div className="rounded-sm border border-line bg-surface px-3.5 py-3 text-[11px] leading-relaxed text-ink-2">
        <div className="t-label text-[10px] mb-1.5">{t("sourceLabel")}</div>
        {t("sourceBodyLine1")}
        <br />
        {t("sourceBodyLine2")}
        <a
          href="https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 block text-[10px] text-ink-3 hover:text-accent no-underline"
        >
          {t("sourceLink")}
        </a>
      </div>
    </aside>
  );
}
