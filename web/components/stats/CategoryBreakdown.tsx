import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import type { CategoryStat } from "@/lib/stats";

export function CategoryBreakdown({ rows }: { rows: CategoryStat[] }) {
  const byKey = new Map(rows.map((r) => [r.category, r] as const));
  const ordered = CATEGORY_ORDER.map((k) => byKey.get(k)).filter(
    (r): r is CategoryStat => !!r && r.total > 0,
  );

  if (ordered.length === 0) {
    return (
      <div className="card">
        <div className="t-label mb-2">分野別</div>
        <p className="text-[13px] text-ink-3">
          データがありません。練習を始めると表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="t-label mb-3">分野別の正答率</div>
      <div className="flex flex-col gap-3">
        {ordered.map((r) => (
          <div key={r.category}>
            <div className="flex justify-between items-baseline text-[13px] mb-1">
              <span className="text-ink">{CATEGORY_LABELS[r.category]}</span>
              <span className="t-mono text-ink-3">
                {r.correct}/{r.total}
                <span className="ml-2 text-ink">
                  {Math.round(r.accuracy * 100)}%
                </span>
              </span>
            </div>
            <div className="bar">
              <span style={{ width: `${Math.round(r.accuracy * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
