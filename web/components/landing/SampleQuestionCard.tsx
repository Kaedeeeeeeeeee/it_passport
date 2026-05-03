"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Markdown } from "@/components/md/Markdown";
import { CHOICE_LETTERS } from "@/lib/questions";
import type { ChoiceLetter, Question } from "@/lib/types";

type Pick = { letter: ChoiceLetter; correct: boolean };

type ChoiceTone = "neutral" | "correct" | "userWrong" | "fadedNeutral";

const TONE_STYLE: Record<
  ChoiceTone,
  { background: string; border: string; letterBg: string; letterColor: string }
> = {
  neutral: {
    background: "var(--surface)",
    border: "var(--line)",
    letterBg: "var(--surface-2)",
    letterColor: "var(--ink-2)",
  },
  correct: {
    background: "var(--accent-soft)",
    border: "var(--accent)",
    letterBg: "var(--accent)",
    letterColor: "#fff",
  },
  userWrong: {
    background: "#f5e4e0",
    border: "var(--wrong)",
    letterBg: "var(--wrong)",
    letterColor: "#fff",
  },
  fadedNeutral: {
    background: "var(--surface)",
    border: "var(--line)",
    letterBg: "var(--surface-2)",
    letterColor: "var(--ink-3)",
  },
};

function toneFor(
  letter: ChoiceLetter,
  pick: Pick | null,
  correctSet: Set<ChoiceLetter>,
): ChoiceTone {
  if (pick === null) return "neutral";
  if (correctSet.has(letter)) return "correct";
  if (pick.letter === letter) return "userWrong";
  return "fadedNeutral";
}

export function SampleQuestionCard({
  q,
  index,
  categoryText,
}: {
  q: Question;
  index: number;
  /** Pre-resolved category label from the server. Empty string hides the chip. */
  categoryText: string;
}) {
  const t = useTranslations("publicSample");
  const [pick, setPick] = useState<Pick | null>(null);

  const correctSet = useMemo(
    () => new Set(q.answer.split("/") as ChoiceLetter[]),
    [q.answer],
  );

  const handlePick = (letter: ChoiceLetter) => {
    if (pick !== null) return;
    setPick({ letter, correct: correctSet.has(letter) });
  };

  return (
    <li className="card" style={{ padding: 20 }}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <div className="t-mono text-[11.5px] text-ink-3">
          {q.exam_code} · #{index + 1}
        </div>
        {categoryText ? <div className="t-label">{categoryText}</div> : null}
      </div>

      <div className="text-[14px] leading-[1.85]">
        <Markdown figures={q.figures}>{q.question}</Markdown>
      </div>

      <div
        className="mt-4 flex flex-col gap-2"
        role="radiogroup"
        aria-label={t("tapHint")}
      >
        {CHOICE_LETTERS.map((letter) => {
          const text = q.choices[letter];
          if (!text) return null;
          const tone = toneFor(letter, pick, correctSet);
          const style = TONE_STYLE[tone];
          const isLocked = pick !== null;
          const isUserPick = pick?.letter === letter;
          const isCorrect = correctSet.has(letter);
          return (
            <button
              key={letter}
              type="button"
              role="radio"
              aria-checked={isUserPick}
              onClick={() => handlePick(letter)}
              disabled={isLocked}
              style={{ background: style.background, borderColor: style.border }}
              className={
                "flex items-start gap-3 rounded-[var(--radius)] border px-3 py-2 text-[13px] leading-[1.75] text-left transition-colors " +
                (isLocked
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-surface-2")
              }
            >
              <span
                className="t-mono text-[12.5px] shrink-0 w-5 flex items-center justify-center rounded-[2px]"
                style={{
                  background: style.letterBg,
                  color: style.letterColor,
                }}
              >
                {letter}
              </span>
              <span className="flex-1">{text}</span>
              {isLocked && isCorrect ? (
                <span aria-hidden="true" className="t-mono text-[12px] text-accent-ink shrink-0">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {pick === null ? (
        <div className="mt-3 text-[11.5px] text-ink-3">{t("tapHint")}</div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
          <span
            className="t-label"
            style={{ color: pick.correct ? "var(--accent-ink)" : "var(--wrong)" }}
          >
            {pick.correct
              ? t("correctFeedback")
              : t("wrongFeedback", { answer: [...correctSet].join(" / ") })}
          </span>
          <button
            type="button"
            onClick={() => setPick(null)}
            className="text-ink-3 underline-offset-2 hover:text-accent hover:underline"
          >
            {t("tryAgain")}
          </button>
          <span className="text-ink-3">{t("previewExplanation")}</span>
        </div>
      )}
    </li>
  );
}
