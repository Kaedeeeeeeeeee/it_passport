"use client";

import { useTranslations } from "next-intl";
import type { ExamStat } from "@/lib/stats";

function tone(accuracy: number): string {
  if (accuracy >= 0.8) return "bg-[#b7e3c7] text-[#0d3d1f]";
  if (accuracy >= 0.6) return "bg-[#d8edb9] text-[#2d4014]";
  if (accuracy >= 0.4) return "bg-[#f4e4a8] text-[#5a4812]";
  if (accuracy >= 0.2) return "bg-[#f2cca8] text-[#5c2f11]";
  return "bg-[#e8b5b5] text-[#5a1717]";
}

export function ExamMatrix({ rows }: { rows: ExamStat[] }) {
  const t = useTranslations("stats");

  function formatExamShort(examCode: string): string {
    const m = /^(\d{4})(r|h)(\d+)([a-z]*)$/.exec(examCode);
    if (!m) return examCode;
    const [, , eraLetter, eraYear, suffix] = m;
    const era = eraLetter === "r" ? "R" : "H";
    const seasonMap: Record<string, string> = {
      "": "",
      a: t("examShortSeasonAutumn"),
      h: t("examShortSeasonSpring"),
      o: t("examShortSeasonOctober"),
      tokubetsu: t("examShortSeasonSpecial"),
    };
    return `${era}${eraYear}${seasonMap[suffix] ?? ""}`;
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="t-label mb-2">{t("examEmptyLabel")}</div>
        <p className="text-[13px] text-ink-3">{t("examEmptyHint")}</p>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="t-label mb-3">{t("examAccuracyTitle")}</div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {rows.map((r) => (
          <div
            key={r.exam_code}
            title={`${r.exam_code} · ${r.correct}/${r.total} · ${Math.round(r.accuracy * 100)}%`}
            className={
              "aspect-square rounded-[var(--radius)] p-1.5 flex flex-col justify-between " +
              tone(r.accuracy)
            }
          >
            <div className="t-mono text-[10.5px] opacity-80">
              {formatExamShort(r.exam_code)}
            </div>
            <div className="t-serif text-[15px] font-semibold leading-none">
              {Math.round(r.accuracy * 100)}
              <span className="text-[10px] font-normal opacity-70">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
