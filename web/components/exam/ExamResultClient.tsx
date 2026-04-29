"use client";

import { useTranslations } from "next-intl";
import { CategoryBreakdown } from "@/components/stats/CategoryBreakdown";
import { ResultClient } from "@/components/result/ResultClient";
import { Link } from "@/i18n/navigation";
import type { CategoryStat } from "@/lib/stats";

type Props = {
  sessionId: string;
  total: number;
  correct: number;
  accuracy: number;
  passed: boolean;
  categoryRows: CategoryStat[];
  wrongCount: number;
};

export function ExamResultClient({
  sessionId,
  total,
  correct,
  accuracy,
  passed,
  categoryRows,
  wrongCount,
}: Props) {
  const t = useTranslations("exam");
  return (
    <>
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface overflow-hidden grid sm:grid-cols-[1.2fr_1fr_1fr]">
        <div
          className="p-6 sm:p-7 text-white"
          style={{ background: passed ? "var(--accent)" : "var(--wrong)" }}
        >
          <div className="t-label !text-white/70">{t("scoreLabel")}</div>
          <div className="flex items-baseline gap-1 mt-3">
            <span
              className="t-serif font-medium leading-none"
              style={{ fontSize: 54, letterSpacing: "-2px" }}
            >
              {correct}
            </span>
            <span className="t-serif text-[22px] opacity-75">/{total}</span>
          </div>
          <div className="text-[12px] opacity-85 mt-2">
            {t("passNote")}
            {passed ? t("passed") : t("almost")}
          </div>
        </div>
        <div className="p-6 sm:p-7 border-t sm:border-t-0 sm:border-r border-line">
          <div className="t-label">{t("accuracyLabel")}</div>
          <div
            className="t-serif font-medium mt-2.5"
            style={{ fontSize: 26, letterSpacing: "-0.8px" }}
          >
            {Math.round(accuracy * 100)}%
          </div>
          <div className="text-[11px] text-ink-3 mt-1.5">
            {t("outOfHundred")}
          </div>
        </div>
        <div className="p-6 sm:p-7 border-t sm:border-t-0 border-line">
          <div className="t-label">{t("wrongLabel")}</div>
          <div
            className="t-serif font-medium mt-2.5"
            style={{ fontSize: 26, letterSpacing: "-0.8px" }}
          >
            {wrongCount}
          </div>
          {wrongCount > 0 ? (
            <Link
              href={`/exam/${sessionId}/review`}
              className="inline-block mt-2 btn btn-primary !text-[12px] no-underline"
            >
              {t("reviewWrong")}
            </Link>
          ) : (
            <div className="text-[11px] text-ink-3 mt-1.5">{t("perfect")}</div>
          )}
        </div>
      </div>

      <CategoryBreakdown rows={categoryRows} />

      <div>
        <h2 className="t-label mt-2 mb-2">{t("explanationsHeader")}</h2>
        <p className="text-[16px] t-serif font-semibold mb-4">
          {t("explanationsTitle")}
        </p>
        {/* Page wrapper does requirePro, so isPro is guaranteed here. */}
        <ResultClient sessionId={sessionId} isPro embedded />
      </div>
    </>
  );
}
