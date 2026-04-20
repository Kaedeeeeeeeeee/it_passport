"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FigureImage } from "@/components/FigureImage";
import { Icon } from "@/components/Icon";
import { CHOICE_LETTERS, questionById } from "@/lib/questions";
import type { ChoiceLetter, Question } from "@/lib/types";

type AnswerRec = {
  questionId: string;
  letter: ChoiceLetter | null;
  correct: boolean;
};

type Props = {
  sessionId: string;
  /** When true, skips the page chrome (top bar + outer flex container) so the
   *  component can be embedded inside another result page (e.g. exam). */
  embedded?: boolean;
};

export function ResultClient({ sessionId, embedded = false }: Props) {
  const [answers, setAnswers] = useState<AnswerRec[] | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`itp_answers_${sessionId}`);
    if (raw) {
      try {
        setAnswers(JSON.parse(raw));
      } catch {
        setAnswers([]);
      }
    } else {
      setAnswers([]);
    }
  }, [sessionId]);

  const questions: Question[] = (answers ?? [])
    .map((a) => questionById.get(a.questionId))
    .filter((q): q is Question => q != null);

  if (answers === null) {
    return (
      <div
        className={
          embedded
            ? "text-ink-3 p-6 text-center"
            : "flex-1 flex items-center justify-center text-ink-3"
        }
      >
        読み込み中…
      </div>
    );
  }

  const correct = answers.filter((a) => a.correct).length;
  const total = questions.length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const passed = accuracy >= 60;

  if (embedded) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface overflow-hidden">
        {questions.map((q, i) => {
          const a = answers[i];
          return <ResultRow key={q.id} q={q} answer={a} idx={i} />;
        })}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-5 sm:px-8 py-4 border-b border-line bg-surface-2">
        <Link href="/" className="btn btn-ghost !text-[12px] no-underline">
          ← ホームへ
        </Link>
        <div className="flex-1" />
        <Link
          href="/practice/random?n=10"
          className="btn !text-[12px] no-underline"
        >
          もう一度ランダム
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <div className="max-w-[900px] mx-auto">
          <Summary correct={correct} total={total} accuracy={accuracy} passed={passed} />
          <h2 className="t-label mt-8 mb-2">解説</h2>
          <p className="text-[16px] t-serif font-semibold mb-4">
            問題ごとの振り返り
          </p>
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface overflow-hidden">
            {questions.map((q, i) => {
              const a = answers[i];
              return <ResultRow key={q.id} q={q} answer={a} idx={i} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({
  correct,
  total,
  accuracy,
  passed,
}: {
  correct: number;
  total: number;
  accuracy: number;
  passed: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface overflow-hidden grid sm:grid-cols-[1.2fr_1fr_1fr]">
      <div className="p-6 sm:p-7 bg-accent text-white">
        <div className="t-label !text-white/70">スコア</div>
        <div className="flex items-baseline gap-1 mt-3">
          <span
            className="t-serif font-medium leading-none"
            style={{ fontSize: 54, letterSpacing: "-2px" }}
          >
            {correct}
          </span>
          <span className="t-serif text-[22px] opacity-75">/{total}</span>
        </div>
        <div className="text-[12px] opacity-75 mt-2">
          合格目安 60% · {passed ? "👍 合格ライン" : "あと少し"}
        </div>
      </div>
      <div className="p-6 sm:p-7 border-t sm:border-t-0 sm:border-r border-line">
        <div className="t-label">正答率</div>
        <div
          className="t-serif font-medium mt-2.5"
          style={{ fontSize: 26, letterSpacing: "-0.8px" }}
        >
          {accuracy}%
        </div>
        <div className="text-[11px] text-ink-3 mt-1.5">この回のみ</div>
      </div>
      <div className="p-6 sm:p-7 border-t sm:border-t-0 border-line">
        <div className="t-label">不正解</div>
        <div
          className="t-serif font-medium mt-2.5"
          style={{ fontSize: 26, letterSpacing: "-0.8px" }}
        >
          {total - correct}
        </div>
        <div className="text-[11px] text-ink-3 mt-1.5">まずはここから</div>
      </div>
    </div>
  );
}

function ResultRow({
  q,
  answer,
  idx,
}: {
  q: Question;
  answer: AnswerRec;
  idx: number;
}) {
  const [open, setOpen] = useState(false);
  const correct = answer?.correct ?? false;
  const userLetter = answer?.letter ?? "—";
  const correctLetter = q.answer;
  const categoryLabel: Record<string, string> = {
    strategy: "ストラテジ",
    management: "マネジメント",
    technology: "テクノロジ",
    integrated: "中問",
  };

  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
      >
        <span
          className="grid place-items-center w-7 h-7 rounded-sm shrink-0"
          style={{
            background: correct ? "var(--accent-soft)" : "#f5e4e0",
            color: correct ? "var(--accent-ink)" : "var(--wrong)",
          }}
        >
          <Icon name={correct ? "check" : "x"} size={14} />
        </span>
        <span className="t-mono text-[12px] text-ink-3 w-8 shrink-0">
          #{String(idx + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 text-[13px]">
          {q.category ? categoryLabel[q.category] : "—"} · {q.exam_code} 問{q.number}
        </span>
        <span className="hidden sm:flex gap-4 text-[12px] t-mono text-ink-3">
          <span>
            あなた{" "}
            <span
              className="font-semibold"
              style={{ color: correct ? "var(--accent)" : "var(--wrong)" }}
            >
              {userLetter}
            </span>
          </span>
          <span>
            正解 <span className="font-semibold text-ink">{correctLetter}</span>
          </span>
        </span>
        <span className="text-[11px] text-ink-3 w-4">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <ResultDetail q={q} userLetter={answer?.letter ?? null} />
      ) : null}
    </div>
  );
}

function ResultDetail({
  q,
  userLetter,
}: {
  q: Question;
  userLetter: ChoiceLetter | null;
}) {
  return (
    <div className="bg-surface-2 border-t border-line p-5 sm:px-8 sm:py-6">
      {q.integrated_context ? (
        <div className="mb-4 rounded-[var(--radius)] border border-line bg-surface p-4 text-[12.5px] leading-[1.85] text-ink-2 whitespace-pre-wrap">
          <div className="t-label mb-1.5">中問 共通題干</div>
          {q.integrated_context}
        </div>
      ) : null}

      <div className="t-serif text-[14.5px] leading-[1.85] mb-3 whitespace-pre-wrap">
        {q.question}
      </div>

      {q.figures.length > 0 && !q.question.includes("![") ? (
        <div className="mb-3">
          {q.figures.map((f) => (
            <FigureImage key={f.path} figure={f} maxWidth={480} />
          ))}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        {CHOICE_LETTERS.map((letter) => {
          const text = q.choices[letter] ?? "";
          const isCorrect = q.answer.split("/").includes(letter);
          const isUser = userLetter === letter;
          return (
            <div
              key={letter}
              className="flex gap-3 p-3 rounded-[var(--radius)] text-[12.5px] leading-[1.6]"
              style={{
                background: isCorrect
                  ? "var(--accent-soft)"
                  : isUser
                    ? "#f5e4e0"
                    : "var(--surface)",
                border: `1px solid ${
                  isCorrect
                    ? "var(--accent)"
                    : isUser
                      ? "var(--wrong)"
                      : "var(--line)"
                }`,
              }}
            >
              <span
                className="grid place-items-center w-5 h-5 rounded-sm t-serif text-[11px] font-semibold shrink-0"
                style={{
                  background: isCorrect ? "var(--accent)" : "var(--surface-2)",
                  color: isCorrect ? "#fff" : "var(--ink-2)",
                }}
              >
                {letter}
              </span>
              <span className="flex-1">
                {text.startsWith("figure:") ? "(図で選ぶ)" : text || "—"}
              </span>
            </div>
          );
        })}
      </div>

      <AiExplanation questionId={q.id} userAnswer={userLetter} />
    </div>
  );
}

function AiExplanation({
  questionId,
  userAnswer,
}: {
  questionId: string;
  userAnswer: ChoiceLetter | null;
}) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; text: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function load() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, userAnswer }),
      });
      if (!res.ok) {
        const message = await res.text().catch(() => res.statusText);
        throw new Error(message || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { explanation: string };
      setState({ kind: "ready", text: data.explanation });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  if (state.kind === "ready") {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface p-4 text-[13px] leading-[1.85] text-ink-2 whitespace-pre-wrap">
        <div className="t-label mb-2 flex items-center gap-2">
          AI 解説
          <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px normal-case">
            PRO
          </span>
        </div>
        {state.text}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="t-label flex-1 flex items-center gap-2">
          AI 解説
          <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px normal-case">
            PRO
          </span>
        </div>
        {state.kind === "idle" ? (
          <button
            type="button"
            onClick={load}
            className="btn btn-ghost !text-[12px] !py-1.5 !px-3"
          >
            解説を生成
          </button>
        ) : null}
        {state.kind === "loading" ? (
          <span className="text-[11px] text-ink-3">生成中…</span>
        ) : null}
        {state.kind === "error" ? (
          <button
            type="button"
            onClick={load}
            className="btn btn-ghost !text-[12px] !py-1.5 !px-3"
          >
            再試行
          </button>
        ) : null}
      </div>
      {state.kind === "error" ? (
        <p className="mt-2 text-[11.5px] text-wrong">
          {state.message.slice(0, 200)}
        </p>
      ) : null}
    </div>
  );
}
