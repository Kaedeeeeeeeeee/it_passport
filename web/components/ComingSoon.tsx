import { Topbar } from "./Topbar";

export function ComingSoon({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note: string;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle={subtitle} title={title} />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="card max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="t-label">Pro メンバー限定</span>
            <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px">
              PRO
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-2">{note}</p>
          <p className="text-[11px] text-ink-3 mt-4">
            近日公開 · 今は準備中です
          </p>
        </div>
      </div>
    </div>
  );
}
