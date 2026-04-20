"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { FigureImage } from "@/components/FigureImage";
import { CHOICE_LETTERS } from "@/lib/questions";
import { newSessionId, recordAttempt, saveSession } from "@/lib/progress";
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
  const [picked, setPicked] = useState<ChoiceLetter | null>(null);

  const q = questions[idx];
  const total = questions.length;
  const progress = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers],
  );

  function pick(letter: ChoiceLetter) {
    setPicked(letter);
  }

  function commitAndAdvance() {
    if (!picked) return;
    const acceptedAnswers = q.answer.split("/");
    const correct = acceptedAnswers.includes(picked);

    const nextAnswers = answers.slice();
    nextAnswers[idx] = { letter: picked, correct };
    setAnswers(nextAnswers);

    recordAttempt({
      questionId: q.id,
      answer: picked,
      correct,
      timestamp: Date.now(),
    });

    if (idx + 1 < total) {
      setIdx(idx + 1);
      setPicked(nextAnswers[idx + 1]?.letter ?? null);
    } else {
      const sessionId = newSessionId();
      saveSession({
        id: sessionId,
        createdAt: Date.now(),
        questionIds: questions.map((x) => x.id),
        source:
          slug === "random"
            ? { kind: "random" }
            : slug.startsWith("exam-")
              ? { kind: "exam", examCode: slug.slice(5) }
              : { kind: "random" },
      });
      const payload = JSON.stringify(
        nextAnswers.map((a, i) => ({
          questionId: questions[i].id,
          letter: a?.letter ?? null,
          correct: a?.correct ?? false,
        })),
      );
      sessionStorage.setItem(`itp_answers_${sessionId}`, payload);
      router.push(`/result/${sessionId}`);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-bg min-h-0">
      <Topbar label={label} idx={idx} total={total} progress={progress} />

      <div className="flex-1 overflow-auto flex justify-center">
        <div className="max-w-[760px] w-full px-5 sm:px-9 py-8 sm:py-10 pb-24">
          <Metadata q={q} />
          <IntegratedContext q={q} />
          <QuestionBody q={q} />
          <Choices q={q} picked={picked} onPick={pick} />
        </div>
      </div>

      <FooterBar
        canNext={picked !== null}
        canPrev={idx > 0}
        isLast={idx + 1 === total}
        onPrev={() => {
          if (idx === 0) return;
          setIdx(idx - 1);
          setPicked(answers[idx - 1]?.letter ?? null);
        }}
        onNext={commitAndAdvance}
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
  return (
    <div className="flex items-center gap-4 sm:gap-5 px-4 sm:px-8 py-4 border-b border-line bg-surface-2">
      <a
        href="/"
        className="btn btn-ghost !text-[12px] !px-2.5 !py-1.5 no-underline text-ink-2"
      >
        × 終了
      </a>
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
  const categoryLabel: Record<string, string> = {
    strategy: "ストラテジ系",
    management: "マネジメント系",
    technology: "テクノロジ系",
    integrated: "中問",
  };
  return (
    <div className="flex items-center gap-2.5 flex-wrap mb-5">
      {q.category ? (
        <span className="chip chip-accent">{categoryLabel[q.category]}</span>
      ) : null}
      <span className="chip">
        {q.exam_code} · 問{q.number}
      </span>
      {q.integrated_group_id ? (
        <span className="chip">
          {q.integrated_group_id.split("-").pop()} グループ
        </span>
      ) : null}
    </div>
  );
}

function IntegratedContext({ q }: { q: Question }) {
  if (!q.integrated_context) return null;
  return (
    <details
      className="mb-6 rounded-[var(--radius)] border border-line bg-surface-2 overflow-hidden"
      open
    >
      <summary className="cursor-pointer list-none px-5 py-3 flex items-center justify-between text-[12px] text-ink-3 bg-surface">
        <span className="t-label">中問 {q.integrated_group_id?.split("-").pop()} — 共通の設問</span>
        <span className="text-[11px]">▼ 折りたたむ</span>
      </summary>
      <div className="px-5 py-4 text-[13px] leading-[1.85] text-ink-2 whitespace-pre-wrap">
        {q.integrated_context}
      </div>
    </details>
  );
}

function QuestionBody({ q }: { q: Question }) {
  return (
    <div className="t-serif text-[16px] sm:text-[17px] leading-[1.85] mb-6 whitespace-pre-wrap">
      {q.question.split(/(!\[[^\]]*\]\([^)]+\))/).map((chunk, i) => {
        const m = /!\[[^\]]*\]\(([^)]+)\)/.exec(chunk);
        if (m) {
          const path = m[1].replace(/^\.\.\/figures\//, "figures/");
          const fig = q.figures.find((f) => f.path.endsWith(path.split("/").pop()!));
          if (fig) return <FigureImage key={i} figure={fig} />;
          return null;
        }
        return <span key={i}>{chunk}</span>;
      })}
      {q.figures.length > 0 && !q.question.includes("![") ? (
        <div className="mt-2">
          {q.figures.map((f) => (
            <FigureImage key={f.path} figure={f} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Choices({
  q,
  picked,
  onPick,
}: {
  q: Question;
  picked: ChoiceLetter | null;
  onPick: (letter: ChoiceLetter) => void;
}) {
  const isFigureChoice = q.choice_format === "figure_choices";
  const isSeeFigure = q.choice_format === "see_figure";

  if (isSeeFigure) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {CHOICE_LETTERS.map((letter) => {
          const active = picked === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => onPick(letter)}
              className={
                "p-4 rounded-[var(--radius-lg)] border transition-colors " +
                (active
                  ? "bg-accent-soft border-accent"
                  : "bg-surface border-line hover:bg-surface-2")
              }
            >
              <span
                className={
                  "t-serif text-xl font-semibold " +
                  (active ? "text-accent-ink" : "text-ink")
                }
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
        const active = picked === letter;
        return (
          <button
            key={letter}
            type="button"
            onClick={() => onPick(letter)}
            className={
              "flex items-start gap-4 text-left p-4 sm:px-5 rounded-[var(--radius-lg)] border transition-colors " +
              (active
                ? "bg-accent-soft border-accent"
                : "bg-surface border-line hover:bg-surface-2")
            }
          >
            <span
              className={
                "grid place-items-center w-7 h-7 rounded-sm t-serif text-[13px] font-semibold shrink-0 " +
                (active ? "bg-accent text-white" : "bg-surface-2 text-ink-2")
              }
            >
              {letter}
            </span>
            <span className="flex-1 pt-0.5 text-[13.5px] leading-[1.7] text-ink">
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
                raw
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FooterBar({
  canNext,
  canPrev,
  isLast,
  onPrev,
  onNext,
}: {
  canNext: boolean;
  canPrev: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex justify-between items-center gap-3 px-5 sm:px-8 py-3.5 border-t border-line bg-surface-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="btn btn-ghost !text-[13px]"
      >
        ← 前の問題
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="btn btn-primary flex items-center gap-2"
      >
        {isLast ? "採点する" : "回答して次へ"}
        {!isLast && <Icon name="arrow" size={14} />}
      </button>
    </div>
  );
}
