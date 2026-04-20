import type { CategoryStat } from "@/lib/stats";
import type { Category } from "@/lib/types";

const LABELS: Record<Category | "unknown", string> = {
  strategy: "ストラテジ系",
  management: "マネジメント系",
  technology: "テクノロジ系",
  integrated: "中問",
  unknown: "分野なし",
};

const ORDER: (Category | "unknown")[] = [
  "strategy",
  "management",
  "technology",
  "integrated",
  "unknown",
];

export function CategoryBreakdown({ rows }: { rows: CategoryStat[] }) {
  const byKey = new Map(rows.map((r) => [r.category, r] as const));
  const ordered = ORDER.map((k) => byKey.get(k)).filter(
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
              <span className="text-ink">{LABELS[r.category]}</span>
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
