"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { AiExplanation } from "@/components/explain/AiExplanation";
import { FigureImage } from "@/components/FigureImage";
import { Markdown } from "@/components/md/Markdown";
import { Link, useRouter } from "@/i18n/navigation";
import { categoryLabel } from "@/lib/exam-terms";
import { CHOICE_LETTERS } from "@/lib/questions";
import { newSessionId, recordAttempt, saveSession } from "@/lib/progress";
import { flushPending } from "@/lib/sync";
import type { ChoiceLetter, Question } from "@/lib/types";

type Props = {
  slug: string;
  label: string;
  questions: Question[];
};

type Answer = { letter: ChoiceLetter; correct: boolean };

export function PracticeClient({ slug, label, questions }: Props) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(Answer | null)[]>(() =>
    new Array(questions.length).fill(null),
  );
  const sessionMetaRef = useRef<{ localId: string; startedAt: number } | null>(
    null,
  );

  const q = questions[idx];
  const total = questions.length;
  const progress = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers],
  );
  const current = answers[idx];
  const correctLetters = useMemo(
    () => new Set(q.answer.split("/") as ChoiceLetter[]),
    [q.answer],
  );
  const isLast = idx + 1 === total;

  function commitAnswer(letter: ChoiceLetter) {
    if (current !== null) return;
    const correct = correctLetters.has(letter);

    if (!sessionMetaRef.current) {
      sessionMetaRef.current = {
        localId: newSessionId(),
        startedAt: Date.now(),
      };
    }

    const nextAnswers = answers.slice();
    nextAnswers[idx] = { letter, correct };
    setAnswers(nextAnswers);

    recordAttempt({
      questionId: q.id,
      answer: letter,
      correct,
      timestamp: Date.now(),
    });
  }

  function goNext() {
    if (idx + 1 < total) setIdx(idx + 1);
  }

  function goPrev() {
    if (idx > 0) setIdx(idx - 1);
  }

  function finishAndSubmit() {
    const sessionId = newSessionId();
    const source =
      slug === "random"
        ? { kind: "random" as const }
        : slug.startsWith("exam-")
          ? { kind: "exam" as const, examCode: slug.slice(5) }
          : slug.startsWith("category-")
            ? { kind: "category" as const, category: slug.slice(9) }
            : { kind: "random" as const };
    saveSession({
      id: sessionId,
      createdAt: Date.now(),
      questionIds: questions.map((x) => x.id),
      source,
    });
    const payload = JSON.stringify(
      answers.map((a, i) => ({
        questionId: questions[i].id,
        letter: a?.letter ?? null,
        correct: a?.correct ?? false,
      })),
    );
    sessionStorage.setItem(`itp_answers_${sessionId}`, payload);

    const meta = sessionMetaRef.current;
    const correctCount = answers.filter((a) => a?.correct).length;
    if (meta) {
      void flushPending({
        localId: meta.localId,
        kind: "practice",
        source,
        startedAt: meta.startedAt,
        completedAt: Date.now(),
        questionCount: total,
        correctCount,
      }).catch(() => {
        /* signed out or network — retried on next page load */
      });
    }

    router.push(`/result/${sessionId}`);
  }

  return (
    <div className="flex-1 flex flex-col bg-bg min-h-0">
      <Topbar label={label} idx={idx} total={total} progress={progress} />

      <div className="flex-1 overflow-auto flex justify-center">
        <div className="max-w-[760px] w-full px-5 sm:px-9 py-8 sm:py-10 pb-24">
          <Metadata q={q} />
          <IntegratedContext q={q} />
          <QuestionBody q={q} />
          <Choices
            q={q}
            answered={current}
            correctLetters={correctLetters}
            onPick={commitAnswer}
          />
          {current !== null ? (
            <div className="mt-6">
              <AiExplanation
                key={q.id}
                questionId={q.id}
                userAnswer={current.letter}
              />
            </div>
          ) : null}
        </div>
      </div>

      <FooterBar
        canPrev={idx > 0}
        answered={current !== null}
        isLast={isLast}
        onPrev={goPrev}
        onNext={goNext}
        onFinish={finishAndSubmit}
      />
    </div>
  );
}

function Topbar({
  label,
  idx,
  total,
  progress,
}: {
  label: string;
  idx: number;
  total: number;
  progress: number;
}) {
  const t = useTranslations("practice");
  return (
    <div className="flex items-center gap-4 sm:gap-5 px-4 sm:px-8 py-4 border-b border-line bg-surface-2">
      <Link
        href="/home"
        className="btn btn-ghost !text-[12px] !px-2.5 !py-1.5 no-underline text-ink-2"
      >
        {t("endButton")}
      </Link>
      <div className="flex-1 flex items-center gap-3">
        <div className="t-mono text-[12px] text-ink-3 whitespace-nowrap">
          {String(idx + 1).padStart(2, "0")} / {total}
        </div>
        <div className="bar flex-1 max-w-[380px]">
          <span style={{ width: `${(progress / total) * 100}%` }} />
        </div>
        <div className="t-mono text-[12px] text-ink-3 hidden sm:block">
          {label}
        </div>
      </div>
    </div>
  );
}

function Metadata({ q }: { q: Question }) {
  const practice = useTranslations("practice");
  const examTerms = useTranslations("examTerms");
  const groupLetter = q.integrated_group_id?.split("-").pop() ?? "";
  return (
    <div className="flex items-center gap-2.5 flex-wrap mb-5">
      {q.category ? (
        <span className="chip chip-accent">
          {categoryLabel(q.category, examTerms)}
        </span>
      ) : null}
      <span className="chip">
        {q.exam_code} · {practice("questionLabel", { n: q.number })}
      </span>
      {q.integrated_group_id ? (
        <span className="chip">
          {practice("integratedChip", { group: groupLetter })}
        </span>
      ) : null}
    </div>
  );
}

function IntegratedContext({ q }: { q: Question }) {
  const t = useTranslations("practice");
  if (!q.integrated_context) return null;
  const groupLetter = q.integrated_group_id?.split("-").pop() ?? "";
  return (
    <details
      className="mb-6 rounded-[var(--radius)] border border-line bg-surface-2 overflow-hidden"
      open
    >
      <summary className="cursor-pointer list-none px-5 py-3 flex items-center justify-between text-[12px] text-ink-3 bg-surface">
        <span className="t-label">
          {t("integratedGroupLabel", { group: groupLetter })}
        </span>
        <span className="text-[11px]">{t("collapse")}</span>
      </summary>
      <div className="px-5 py-4 text-[13px] leading-[1.85] text-ink-2">
        <Markdown figures={q.figures}>{q.integrated_context}</Markdown>
      </div>
    </details>
  );
}

function QuestionBody({ q }: { q: Question }) {
  const hasInlineImage = /!\[[^\]]*\]\([^)]+\)/.test(q.question);
  return (
    <div className="t-serif mb-6 text-[16px] leading-[1.85] sm:text-[17px]">
      <Markdown figures={q.figures}>{q.question}</Markdown>
      {q.figures.length > 0 && !hasInlineImage ? (
        <div className="mt-2">
          {q.figures.map((f) => (
            <FigureImage key={f.path} figure={f} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ChoiceStyle = {
  background: string;
  border: string;
  letterBg: string;
  letterColor: string;
};

function choiceStyle(
  letter: ChoiceLetter,
  answered: Answer | null,
  correctLetters: Set<ChoiceLetter>,
): ChoiceStyle {
  if (answered === null) {
    return {
      background: "var(--surface)",
      border: "var(--line)",
      letterBg: "var(--surface-2)",
      letterColor: "var(--ink-2)",
    };
  }
  const isCorrect = correctLetters.has(letter);
  const isUserPick = answered.letter === letter;
  if (isCorrect) {
    return {
      background: "var(--accent-soft)",
      border: "var(--accent)",
      letterBg: "var(--accent)",
      letterColor: "#fff",
    };
  }
  if (isUserPick) {
    return {
      background: "#f5e4e0",
      border: "var(--wrong)",
      letterBg: "var(--wrong)",
      letterColor: "#fff",
    };
  }
  return {
    background: "var(--surface)",
    border: "var(--line)",
    letterBg: "var(--surface-2)",
    letterColor: "var(--ink-3)",
  };
}

function Choices({
  q,
  answered,
  correctLetters,
  onPick,
}: {
  q: Question;
  answered: Answer | null;
  correctLetters: Set<ChoiceLetter>;
  onPick: (letter: ChoiceLetter) => void;
}) {
  const isFigureChoice = q.choice_format === "figure_choices";
  const isSeeFigure = q.choice_format === "see_figure";
  const locked = answered !== null;

  if (isSeeFigure) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {CHOICE_LETTERS.map((letter) => {
          const s = choiceStyle(letter, answered, correctLetters);
          return (
            <button
              key={letter}
              type="button"
              onClick={() => onPick(letter)}
              disabled={locked}
              style={{ background: s.background, borderColor: s.border }}
              className={
                "p-4 rounded-[var(--radius-lg)] border transition-colors " +
                (locked ? "cursor-default" : "hover:bg-surface-2")
              }
            >
              <span
                className="t-serif text-xl font-semibold"
                style={{
                  color:
                    locked && correctLetters.has(letter)
                      ? "var(--accent-ink)"
                      : "var(--ink)",
                }}
              >
                {letter}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {CHOICE_LETTERS.map((letter) => {
        const raw = q.choices[letter] ?? "";
        const isFigRef = raw.startsWith("figure:");
        const s = choiceStyle(letter, answered, correctLetters);
        const handleActivate = () => {
          if (!locked) onPick(letter);
        };
        return (
          <div
            key={letter}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-disabled={locked}
            onClick={handleActivate}
            onKeyDown={(e) => {
              if (locked) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleActivate();
              }
            }}
            style={{ background: s.background, borderColor: s.border }}
            className={
              "flex items-start gap-4 text-left p-4 sm:px-5 rounded-[var(--radius-lg)] border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/50 " +
              (locked ? "cursor-default" : "cursor-pointer hover:bg-surface-2")
            }
          >
            <span
              className="grid place-items-center w-7 h-7 rounded-sm t-serif text-[13px] font-semibold shrink-0 mt-0.5"
              style={{ background: s.letterBg, color: s.letterColor }}
            >
              {letter}
            </span>
            <div className="flex-1 pt-0.5 text-[13.5px] leading-[1.7] text-ink">
              {isFigRef || isFigureChoice ? (
                <FigureImage
                  figure={{
                    path: isFigRef ? raw.slice(7) : raw,
                    type: null,
                    description: null,
                  }}
                  maxWidth={320}
                />
              ) : (
                <Markdown figures={q.figures}>{raw}</Markdown>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FooterBar({
  canPrev,
  answered,
  isLast,
  onPrev,
  onNext,
  onFinish,
}: {
  canPrev: boolean;
  answered: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const t = useTranslations("practice");
  return (
    <div className="flex justify-between items-center gap-3 px-5 sm:px-8 py-3.5 border-t border-line bg-surface-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="btn btn-ghost !text-[13px]"
      >
        {t("prev")}
      </button>
      {answered ? (
        isLast ? (
          <button
            type="button"
            onClick={onFinish}
            className="btn btn-primary !text-[13px]"
          >
            {t("finish")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="btn btn-primary !text-[13px]"
          >
            {t("next")}
          </button>
        )
      ) : (
        <div className="t-mono text-[11px] text-ink-3">{t("beforePick")}</div>
      )}
    </div>
  );
}
