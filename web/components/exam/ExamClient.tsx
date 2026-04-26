"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { FigureImage } from "@/components/FigureImage";
import { Markdown } from "@/components/md/Markdown";
import { useRouter } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { categoryLabel } from "@/lib/exam-terms";
import { CHOICE_LETTERS } from "@/lib/questions";
import { recordAttempt } from "@/lib/progress";
import type { ChoiceLetter, Question } from "@/lib/types";

type Props = {
  sessionId: string;
  label: string;
  questions: Question[];
  startedAt: number; // ms from server
};

type Answer = {
  letter: ChoiceLetter;
  correct: boolean;
  answeredAt: number;
};

const EXAM_DURATION_MS = 100 * 60 * 1000;

type LocalState = {
  answers: (Answer | null)[];
  idx: number;
};

function lsKey(sessionId: string) {
  return `itp_exam_${sessionId}`;
}

function loadLocal(sessionId: string, total: number): LocalState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(lsKey(sessionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalState;
    if (!Array.isArray(parsed.answers) || parsed.answers.length !== total) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveLocal(sessionId: string, state: LocalState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(lsKey(sessionId), JSON.stringify(state));
}

function clearLocal(sessionId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(lsKey(sessionId));
}

function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function ExamClient({ sessionId, label, questions, startedAt }: Props) {
  const router = useRouter();
  const t = useTranslations("exam");
  const total = questions.length;
  const endsAt = startedAt + EXAM_DURATION_MS;

  const [hydrated, setHydrated] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(Answer | null)[]>(() =>
    new Array(total).fill(null),
  );
  // Initial render (SSR and first hydration) shows the full duration; the
  // tick effect below recomputes against the real clock as soon as the
  // client mounts.
  const [remaining, setRemaining] = useState(EXAM_DURATION_MS);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    const local = loadLocal(sessionId, total);
    if (local) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only; hydrate once.
      setAnswers(local.answers);
      setIdx(Math.min(local.idx, total - 1));
    }
    setHydrated(true);
  }, [sessionId, total]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocal(sessionId, { answers, idx });
  }, [hydrated, sessionId, answers, idx]);

  const submit = useCallback(
    async (reason: "manual" | "timeout") => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      track("exam_finished", { reason });
      const completedAt = Date.now();
      const payloadAnswers = questions.map((q, i) => {
        const a = answers[i];
        return {
          questionId: q.id,
          letter: a?.letter ?? null,
          correct: a?.correct ?? false,
          answeredAt: a?.answeredAt ?? completedAt,
        };
      });

      // Cache the per-question snapshot so the result page can render rows
      // the same way the practice result page does.
      const snapshot = payloadAnswers.map((a) => ({
        questionId: a.questionId,
        letter: a.letter,
        correct: a.correct,
      }));
      sessionStorage.setItem(
        `itp_answers_${sessionId}`,
        JSON.stringify(snapshot),
      );

      try {
        await fetch("/api/exam-submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
            answers: payloadAnswers,
            completedAt,
          }),
          credentials: "same-origin",
        });
      } catch {
        // Best effort — user will see the local result page either way.
      }

      clearLocal(sessionId);
      router.replace(`/exam/${sessionId}/result`);
    },
    [answers, questions, router, sessionId],
  );

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, endsAt - Date.now());
      setRemaining(r);
      if (r === 0) void submit("timeout");
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, submit]);

  const q = questions[idx];
  const answered = answers.filter((a) => a !== null).length;

  function pick(letter: ChoiceLetter) {
    const acceptedAnswers = q.answer.split("/");
    const correct = acceptedAnswers.includes(letter);
    const now = Date.now();
    setAnswers((prev) => {
      const next = prev.slice();
      next[idx] = { letter, correct, answeredAt: now };
      return next;
    });
    recordAttempt({
      questionId: q.id,
      answer: letter,
      correct,
      timestamp: now,
    });
  }

  function confirmSubmit() {
    if (answered < total) {
      const ok = confirm(t("confirmExit", { n: total - answered }));
      if (!ok) return;
    }
    void submit("manual");
  }

  const picked = answers[idx]?.letter ?? null;

  return (
    <div className="flex-1 flex flex-col bg-bg min-h-0">
      <ExamTopbar
        label={label}
        idx={idx}
        total={total}
        answered={answered}
        remaining={remaining}
        onEnd={confirmSubmit}
      />
      <div className="flex-1 overflow-auto flex justify-center">
        <div className="max-w-[760px] w-full px-5 sm:px-9 py-8 sm:py-10 pb-24">
          <Metadata q={q} />
          <IntegratedContext q={q} />
          <QuestionBody q={q} />
          <Choices q={q} picked={picked} onPick={pick} />
        </div>
      </div>
      <ExamFooter
        idx={idx}
        total={total}
        onPrev={() => setIdx(Math.max(0, idx - 1))}
        onNext={() => setIdx(Math.min(total - 1, idx + 1))}
        onJump={(i) => setIdx(i)}
        answers={answers}
        submitting={submitting}
      />
    </div>
  );
}

function ExamTopbar({
  label,
  idx,
  total,
  answered,
  remaining,
  onEnd,
}: {
  label: string;
  idx: number;
  total: number;
  answered: number;
  remaining: number;
  onEnd: () => void;
}) {
  const t = useTranslations("exam");
  const low = remaining <= 5 * 60 * 1000;
  return (
    <div className="flex items-center gap-4 sm:gap-5 px-4 sm:px-8 py-4 border-b border-line bg-surface-2">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <div className="t-mono text-[12px] text-ink-3 whitespace-nowrap">
          {String(idx + 1).padStart(2, "0")} / {total}
        </div>
        <div className="bar flex-1 max-w-[380px]">
          <span style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        <div className="t-mono text-[12px] text-ink-3 hidden sm:block truncate">
          {label}
        </div>
      </div>
      <div
        className={
          "t-mono text-[14px] font-semibold tabular-nums " +
          (low ? "text-wrong" : "text-ink")
        }
        aria-label={t("remainingTime")}
      >
        {formatRemaining(remaining)}
      </div>
      <button
        type="button"
        onClick={onEnd}
        className="btn !text-[12px] !px-3 !py-1.5"
      >
        {t("endButton")}
      </button>
    </div>
  );
}

function ExamFooter({
  idx,
  total,
  onPrev,
  onNext,
  onJump,
  answers,
  submitting,
}: {
  idx: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  answers: (Answer | null)[];
  submitting: boolean;
}) {
  const t = useTranslations("exam");
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="border-t border-line bg-surface-2">
      {navOpen ? (
        <div className="border-b border-line px-4 sm:px-6 py-3 max-h-[35vh] overflow-auto">
          <div className="grid grid-cols-10 sm:grid-cols-20 gap-1">
            {answers.map((a, i) => {
              const active = i === idx;
              const done = a !== null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onJump(i);
                    setNavOpen(false);
                  }}
                  className={[
                    "aspect-square text-[11px] t-mono rounded-sm border transition-colors",
                    active
                      ? "border-accent bg-accent text-white"
                      : done
                        ? "border-accent/40 bg-accent-soft text-accent-ink"
                        : "border-line bg-surface text-ink-3 hover:bg-surface-2",
                  ].join(" ")}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex justify-between items-center gap-3 px-5 sm:px-8 py-3.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={idx === 0 || submitting}
          className="btn btn-ghost !text-[13px]"
        >
          {t("prev")}
        </button>
        <button
          type="button"
          onClick={() => setNavOpen((x) => !x)}
          className="btn btn-ghost !text-[12px]"
        >
          {navOpen ? t("navClose") : t("navOpen")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={idx + 1 >= total || submitting}
          className="btn btn-ghost !text-[13px]"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}

function Metadata({ q }: { q: Question }) {
  const exam = useTranslations("exam");
  const examTerms = useTranslations("examTerms");
  return (
    <div className="flex items-center gap-2.5 flex-wrap mb-5">
      {q.category ? (
        <span className="chip chip-accent">
          {categoryLabel(q.category, examTerms)}
        </span>
      ) : null}
      <span className="chip">
        {q.exam_code} · {exam("questionLabel", { n: q.number })}
      </span>
    </div>
  );
}

function IntegratedContext({ q }: { q: Question }) {
  const t = useTranslations("exam");
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
          <div
            key={letter}
            role="button"
            tabIndex={0}
            onClick={() => onPick(letter)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(letter);
              }
            }}
            className={
              "flex items-start gap-4 text-left p-4 sm:px-5 rounded-[var(--radius-lg)] border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/50 " +
              (active
                ? "bg-accent-soft border-accent"
                : "bg-surface border-line hover:bg-surface-2")
            }
          >
            <span
              className={
                "grid place-items-center w-7 h-7 rounded-sm t-serif text-[13px] font-semibold shrink-0 mt-0.5 " +
                (active ? "bg-accent text-white" : "bg-surface-2 text-ink-2")
              }
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

