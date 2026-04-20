"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

type Item = {
  href: string;
  label: string;
  sub: string;
  icon: IconName;
  disabled?: boolean;
};

const ITEMS: Item[] = [
  { href: "/", label: "ホーム", sub: "Dashboard", icon: "home" },
  { href: "/library", label: "問題集", sub: "Library", icon: "book" },
  { href: "/exam", label: "模擬試験", sub: "Mock exam", icon: "exam", disabled: true },
  { href: "/review", label: "復習", sub: "Review", icon: "bookmark", disabled: true },
  { href: "/stats", label: "統計", sub: "Stats", icon: "chart", disabled: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-[212px] shrink-0 border-r border-line bg-surface-2 py-6 px-4 hidden md:flex flex-col">
      <Link
        href="/"
        className="flex items-baseline gap-2 px-2.5 pb-6 no-underline text-ink"
      >
        <span className="grid h-[22px] w-[22px] place-items-center rounded-sm bg-accent text-white text-[11px] font-bold t-mono">
          iP
        </span>
        <span>
          <span className="block text-sm font-semibold -tracking-[0.2px]">
            IT Passport
          </span>
          <span className="block text-[10px] text-ink-3 tracking-[0.08em] mt-px">
            練習ノート
          </span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((it) => {
          const active = isActive(pathname, it.href);
          const cls = [
            "group flex items-center gap-3 px-2.5 py-2 rounded-sm text-[13.5px]",
            active
              ? "bg-surface text-accent-ink font-semibold shadow-[inset_2px_0_0_var(--accent)]"
              : "text-ink-2 font-medium",
            it.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-surface",
          ].join(" ");
          const inner = (
            <>
              <Icon name={it.icon} size={16} />
              <span className="flex-1 flex justify-between items-baseline">
                <span>{it.label}</span>
                <span className="text-[10px] text-ink-3 font-normal tracking-[0.04em]">
                  {it.disabled ? "近日公開" : it.sub}
                </span>
              </span>
            </>
          );
          if (it.disabled) {
            return (
              <span key={it.href} className={cls} aria-disabled>
                {inner}
              </span>
            );
          }
          return (
            <Link key={it.href} href={it.href} className={cls + " no-underline"}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="rounded-sm border border-line bg-surface px-3.5 py-3.5 mb-2.5">
        <div className="t-label text-[10px]">出典</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-2">
          独立行政法人
          <br />
          情報処理推進機構 (IPA)
        </p>
        <p className="mt-2 text-[10px] text-ink-3">非商用学習用途</p>
      </div>
    </aside>
  );
}
