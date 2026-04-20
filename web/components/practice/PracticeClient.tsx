"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { FigureImage } from "@/components/FigureImage";
import { CHOICE_LETTERS } from "@/lib/questions";
import { newSessionId, recordAttempt, saveSession } from "@/lib/progress";
import { flushPending } from "@/lib/sync";
import type { ChoiceLetter, Figure, Question } from "@/lib/types";

type Props = {
  slug: string;
  label: string;
  questions: Question[];
};

type Answer = { letter: ChoiceLetter; correct: boolean };

const ADVANCE_DELAY_MS = 260;

export function PracticeClient({ slug, label, questions }: Props) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(Answer | null)[]>(() =>
    new Array(questions.length).fill(null),
  );
  const [picked, setPicked] = useState<ChoiceLetter | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[idx];
  const total = questions.length;
  const progress = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers],
  );

  const sessionMetaRef = useRef<{ localId: string; startedAt: number } | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  function clearAdvanceTimer() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function pick(letter: ChoiceLetter) {
    setPicked(letter);
    clearAdvanceTimer();
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      commitAndAdvance(letter);
    }, ADVANCE_DELAY_MS);
  }

  function commitAndAdvance(letter: ChoiceLetter) {
    const acceptedAnswers = q.answer.split("/");
    const correct = acceptedAnswers.includes(letter);

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

    if (idx + 1 < total) {
      setIdx(idx + 1);
      setPicked(nextAnswers[idx + 1]?.letter ?? null);
    } else {
      const sessionId = newSessionId();
      const source =
        slug === "random"
          ? { kind: "random" as const }
          : slug.startsWith("exam-")
            ? { kind: "exam" as const, examCode: slug.slice(5) }
            : { kind: "random" as const };
      saveSession({
        id: sessionId,
        createdAt: Date.now(),
        questionIds: questions.map((x) => x.id),
        source,
      });
      const payload = JSON.stringify(
        nextAnswers.map((a, i) => ({
          questionId: questions[i].id,
          letter: a?.letter ?? null,
          correct: a?.correct ?? false,
        })),
      );
      sessionStorage.setItem(`itp_answers_${sessionId}`, payload);

      const meta = sessionMetaRef.current;
      const correctCount = nextAnswers.filter((a) => a?.correct).length;
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
        canPrev={idx > 0}
        isLast={idx + 1 === total}
        onPrev={() => {
          if (idx === 0) return;
          clearAdvanceTimer();
          setIdx(idx - 1);
          setPicked(answers[idx - 1]?.letter ?? null);
        }}
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

function resolveFigure(src: string, figures: Figure[]): Figure | undefined {
  const normalized = src.replace(/^\.\.\/figures\//, "figures/");
  const filename = normalized.split("/").pop() ?? "";
  if (!filename) return undefined;
  return figures.find((f) => f.path.endsWith(filename));
}

function buildMarkdownComponents(figures: Figure[]): Components {
  return {
    p: ({ children }) => (
      <p className="mb-3 last:mb-0">{children}</p>
    ),
    img: ({ src }) => {
      const fig = resolveFigure(typeof src === "string" ? src : "", figures);
      return fig ? <FigureImage figure={fig} /> : null;
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-[var(--radius)] border border-line">
        <table className="w-full border-collapse text-[13.5px] leading-[1.6]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-surface-2 text-ink-2">{children}</thead>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-line last:border-b-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="border-r border-line px-3 py-2 text-left font-semibold last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-r border-line px-3 py-2 align-top last:border-r-0">
        {children}
      </td>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>
    ),
    code: ({ className, children }) => {
      const isBlock = /language-/.test(className ?? "");
      if (isBlock) {
        return (
          <code className={"t-mono text-[13px] " + (className ?? "")}>
            {children}
          </code>
        );
      }
      return (
        <code className="t-mono rounded bg-surface-2 px-1 py-0.5 text-[0.92em]">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-[var(--radius)] bg-surface-2 p-3">
        {children}
      </pre>
    ),
  };
}

function QuestionBody({ q }: { q: Question }) {
  const hasInlineImage = /!\[[^\]]*\]\([^)]+\)/.test(q.question);
  const components = useMemo(
    () => buildMarkdownComponents(q.figures),
    [q.figures],
  );
  return (
    <div className="t-serif mb-6 text-[16px] leading-[1.85] sm:text-[17px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {q.question}
      </ReactMarkdown>
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
  canPrev,
  isLast,
  onPrev,
}: {
  canPrev: boolean;
  isLast: boolean;
  onPrev: () => void;
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
      <div className="t-mono text-[11px] text-ink-3">
        {isLast ? "選択すると採点します" : "選択すると次へ進みます"}
      </div>
    </div>
  );
}
