import type { ReactNode } from "react";
import { Topbar } from "./Topbar";

/** Shared layout for /terms, /privacy, /legal — Topbar + centered prose
 *  container. Mirrors the visual rhythm of (shell) pages so legal content
 *  doesn't feel like an island. */
export function LegalShell({
  title,
  subtitle,
  lastUpdated,
  translationNotice,
  children,
}: {
  title: string;
  subtitle: string;
  lastUpdated: string;
  translationNotice?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <Topbar subtitle={subtitle} title={title} />
      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <div className="max-w-[760px] mx-auto">
          <div className="text-[11.5px] text-ink-3 mb-6 t-mono">
            {lastUpdated}
          </div>
          {translationNotice ? (
            <div className="rounded-[var(--radius)] border border-line bg-surface-2 px-4 py-3 mb-6 text-[12.5px] text-ink-2 leading-relaxed">
              {translationNotice}
            </div>
          ) : null}
          <div className="text-[14px] leading-[1.85] text-ink-2 prose-legal">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
