"use client";

import { useTranslations } from "next-intl";

type Day = { date: string; total: number; correct: number };

export function DailyTrend({ days }: { days: Day[] }) {
  const t = useTranslations("stats");
  const max = Math.max(1, ...days.map((d) => d.total));
  const totalAnswers = days.reduce((s, d) => s + d.total, 0);

  return (
    <div className="card">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <div className="t-label">{t("trendLabel")}</div>
          <div className="text-[13px] text-ink-3 mt-0.5">
            {t("trendSummary", { count: totalAnswers })}
          </div>
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-[88px]">
        {days.map((d) => {
          const h = (d.total / max) * 100;
          const correctH = d.total ? (d.correct / d.total) * h : 0;
          const title = t("trendTooltip", {
            date: d.date,
            correct: d.correct,
            total: d.total,
          });
          return (
            <div
              key={d.date}
              title={title}
              className="relative flex-1 min-w-[4px] bg-surface-2 rounded-[2px] overflow-hidden"
              style={{ height: `${Math.max(h, d.total ? 4 : 0)}%` }}
            >
              <div
                className="absolute bottom-0 inset-x-0 bg-accent"
                style={{ height: `${(correctH / Math.max(h, 0.01)) * 100}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10.5px] text-ink-3 mt-1.5 t-mono">
        <span>{days[0]?.date.slice(5)}</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
