"use client";

import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/Icon";

type Tile = {
  label: string;
  value: string;
  suffix?: string;
  sub: string;
  icon: IconName;
};

export function Overview({
  stats,
}: {
  stats: {
    total: number;
    correct: number;
    accuracy: number;
    seen: number;
    masteredCount: number;
    streak: number;
  };
}) {
  const t = useTranslations("stats");

  const tiles: Tile[] = [
    {
      label: t("totalAttemptsLabel"),
      value: String(stats.total),
      suffix: t("totalAttemptsSuffix") || undefined,
      sub:
        stats.total === 0
          ? t("noData")
          : t("correctCount", { count: stats.correct }),
      icon: "check",
    },
    {
      label: t("accuracyLabel"),
      value: stats.total ? Math.round(stats.accuracy * 100).toString() : "—",
      suffix: stats.total ? "%" : undefined,
      sub: stats.total
        ? stats.accuracy >= 0.6
          ? t("passingHigh")
          : t("passingLow")
        : t("needAttempts"),
      icon: "chart",
    },
    {
      label: t("seenLabel"),
      value: String(stats.seen),
      suffix: t("seenSuffix") || undefined,
      sub: t("masteredCount", { count: stats.masteredCount }),
      icon: "book",
    },
    {
      label: t("streakLabel"),
      value: String(stats.streak),
      suffix: t("streakSuffix") || undefined,
      sub:
        stats.streak === 0
          ? t("streakZero")
          : stats.streak === 1
            ? t("streakOne")
            : t("streakMany"),
      icon: "chart",
    },
  ];

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {tiles.map((s, i) => (
          <div
            key={s.label}
            className={[
              "p-5 sm:px-7",
              i < tiles.length - 1 ? "sm:border-r border-line" : "",
              i < 2 ? "" : "border-t sm:border-t-0 border-line",
              i % 2 === 0 ? "border-r sm:border-r" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 text-ink-3">
              <Icon name={s.icon} size={14} />
              <span className="t-label">{s.label}</span>
            </div>
            <div className="mt-2.5 flex items-baseline">
              <span
                className="t-serif font-medium leading-none"
                style={{ fontSize: 36, letterSpacing: "-1.5px" }}
              >
                {s.value}
              </span>
              {s.suffix ? (
                <span className="text-sm text-ink-3 ml-1.5">{s.suffix}</span>
              ) : null}
            </div>
            <div className="mt-2 text-[11.5px] text-ink-3">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
