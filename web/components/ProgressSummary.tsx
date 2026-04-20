"use client";

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

export function ProgressSummary() {
  const [stats, setStats] = useState<Stat[] | null>(null);

  useEffect(() => {
    const s = summarize(loadProgress());
    setStats([
      {
        label: "学習した問題",
        value: String(s.seen),
        suffix: "問",
        sub: s.seen === 0 ? "さあ、始めましょう" : `正解 ${s.correct}問`,
        icon: "check",
      },
      {
        label: "正答率",
        value: s.seen
          ? Math.round(s.accuracy * 100).toString()
          : "—",
        suffix: s.seen ? "%" : undefined,
        sub: s.seen
          ? s.accuracy >= 0.6
            ? "合格ラインを超えています"
            : "まだ 60% 未満"
          : "1問以上解くと表示されます",
        icon: "chart",
      },
      {
        label: "未着手",
        value: String(2800 - s.seen),
        suffix: "問",
        sub: "全 2,800 問のうち",
        icon: "book",
      },
    ]);
  }, []);

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
