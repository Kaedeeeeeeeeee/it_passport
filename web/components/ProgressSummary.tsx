"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { loadProgress, summarize } from "@/lib/progress";
import { Icon, type IconName } from "./Icon";

type Stat = {
  label: string;
  value: string;
  suffix?: string;
  sub: string;
  icon: IconName;
};

const TOTAL_QUESTIONS = 2800;

export function ProgressSummary() {
  const t = useTranslations("progress");
  const [stats, setStats] = useState<Stat[] | null>(null);

  useEffect(() => {
    const s = summarize(loadProgress());
    setStats([
      {
        label: t("seenLabel"),
        value: String(s.seen),
        suffix: t("seenSuffix") || undefined,
        sub:
          s.seen === 0
            ? t("noAttempts")
            : t("correctCount", { count: s.correct }),
        icon: "check",
      },
      {
        label: t("accuracyLabel"),
        value: s.seen ? Math.round(s.accuracy * 100).toString() : "—",
        suffix: s.seen ? "%" : undefined,
        sub: s.seen
          ? s.accuracy >= 0.6
            ? t("passingHigh")
            : t("passingLow")
          : t("needAttempts"),
        icon: "chart",
      },
      {
        label: t("untouchedLabel"),
        value: String(TOTAL_QUESTIONS - s.seen),
        suffix: t("seenSuffix") || undefined,
        sub: t("untouchedSub", { total: TOTAL_QUESTIONS.toLocaleString() }),
        icon: "book",
      },
    ]);
  }, [t]);

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {(stats ?? new Array<null>(3).fill(null)).map((s, i) => (
          <div
            key={i}
            className={[
              "p-5 sm:px-7",
              i < 2 ? "sm:border-r border-line" : "",
              i > 0 ? "border-t sm:border-t-0 border-line" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 text-ink-3">
              {s ? (
                <>
                  <Icon name={s.icon} size={14} />
                  <span className="t-label">{s.label}</span>
                </>
              ) : (
                <span className="t-label opacity-40">—</span>
              )}
            </div>
            <div className="mt-2.5 flex items-baseline">
              <span
                className="t-serif font-medium leading-none"
                style={{ fontSize: 38, letterSpacing: "-1.5px" }}
              >
                {s?.value ?? "—"}
              </span>
              {s?.suffix ? (
                <span className="text-sm text-ink-3 ml-1.5">{s.suffix}</span>
              ) : null}
            </div>
            <div className="mt-2 text-[11.5px] text-ink-3">{s?.sub ?? ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
