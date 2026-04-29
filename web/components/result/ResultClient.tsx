"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AiExplanation } from "@/components/explain/AiExplanation";
import { FigureImage } from "@/components/FigureImage";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/md/Markdown";
import { Link } from "@/i18n/navigation";
import { categoryLabel } from "@/lib/exam-terms";
import { CHOICE_LETTERS, questionById } from "@/lib/questions";
import type { ChoiceLetter, Question } from "@/lib/types";

type AnswerRec = {
  questionId: string;
  letter: ChoiceLetter | null;
  correct: boolean;
};

type Props = {
  sessionId: string;
  isPro: boolean;
  /** When true, skips the page chrome (top bar + outer flex container) so the
   *  component can be embedded inside another result page (e.g. exam). */
  embedded?: boolean;
};

export function ResultClient({ sessionId, isPro, embedded = false }: Props) {
  const t = useTranslations("result");
  const [answers, setAnswers] = useState<AnswerRec[] | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`itp_answers_${sessionId}`);
    if (raw) {
      try {
        // sessionStorage is client-only; hydrate once on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
        {t("loading")}
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
          return <ResultRow key={q.id} q={q} answer={a} idx={i} isPro={isPro} />;
        })}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-5 sm:px-8 py-4 border-b border-line bg-surface-2">
        <Link href="/home" className="btn btn-ghost !text-[12px] no-underline">
          {t("backHome")}
        </Link>
        <div className="flex-1" />
        <Link
          href="/practice/random?n=10"
          className="btn !text-[12px] no-underline"
        >
          {t("tryAgain")}
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <div className="max-w-[900px] mx-auto">
          <Summary
            correct={correct}
            total={total}
            accuracy={accuracy}
            passed={passed}
          />
          <h2 className="t-label mt-8 mb-2">{t("sectionLabel")}</h2>
          <p className="text-[16px] t-serif font-semibold mb-4">
            {t("sectionTitle")}
          </p>
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface overflow-hidden">
            {questions.map((q, i) => {
              const a = answers[i];
              return <ResultRow key={q.id} q={q} answer={a} idx={i} isPro={isPro} />;
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
  const t = useTranslations("result");
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface overflow-hidden grid sm:grid-cols-[1.2fr_1fr_1fr]">
      <div className="p-6 sm:p-7 bg-accent text-white">
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
        <div className="text-[12px] opacity-75 mt-2">
          {t("passCutoff")}
          {passed ? t("passed") : t("almost")}
        </div>
      </div>
      <div className="p-6 sm:p-7 border-t sm:border-t-0 sm:border-r border-line">
        <div className="t-label">{t("accuracyLabel")}</div>
        <div
          className="t-serif font-medium mt-2.5"
          style={{ fontSize: 26, letterSpacing: "-0.8px" }}
        >
          {accuracy}%
        </div>
        <div className="text-[11px] text-ink-3 mt-1.5">{t("thisSession")}</div>
      </div>
      <div className="p-6 sm:p-7 border-t sm:border-t-0 border-line">
        <div className="t-label">{t("wrongLabel")}</div>
        <div
          className="t-serif font-medium mt-2.5"
          style={{ fontSize: 26, letterSpacing: "-0.8px" }}
        >
          {total - correct}
        </div>
        <div className="text-[11px] text-ink-3 mt-1.5">
          {t("startFromHere")}
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  q,
  answer,
  idx,
  isPro,
}: {
  q: Question;
  answer: AnswerRec;
  idx: number;
  isPro: boolean;
}) {
  const t = useTranslations("result");
  const practice = useTranslations("practice");
  const examTerms = useTranslations("examTerms");
  const [open, setOpen] = useState(false);
  const correct = answer?.correct ?? false;
  const userLetter = answer?.letter ?? "—";
  const correctLetter = q.answer;

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
          {t("rowSummary", {
            category: q.category ? categoryLabel(q.category, examTerms) : "—",
            exam: q.exam_code,
            questionLabel: practice("questionLabel", { n: q.number }),
          })}
        </span>
        <span className="hidden sm:flex gap-4 text-[12px] t-mono text-ink-3">
          <span>
            {t("yourAnswer")}{" "}
            <span
              className="font-semibold"
              style={{ color: correct ? "var(--accent)" : "var(--wrong)" }}
            >
              {userLetter}
            </span>
          </span>
          <span>
            {t("correctAnswer")}{" "}
            <span className="font-semibold text-ink">{correctLetter}</span>
          </span>
        </span>
        <span className="text-[11px] text-ink-3 w-4">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <ResultDetail
          q={q}
          userLetter={answer?.letter ?? null}
          isPro={isPro}
        />
      ) : null}
    </div>
  );
}

function ResultDetail({
  q,
  userLetter,
  isPro,
}: {
  q: Question;
  userLetter: ChoiceLetter | null;
  isPro: boolean;
}) {
  const t = useTranslations("result");
  return (
    <div className="bg-surface-2 border-t border-line p-5 sm:px-8 sm:py-6">
      {q.integrated_context ? (
        <div className="mb-4 rounded-[var(--radius)] border border-line bg-surface p-4 text-[12.5px] leading-[1.85] text-ink-2">
          <div className="t-label mb-1.5">{t("integratedContextLabel")}</div>
          <Markdown figures={q.figures} figureMaxWidth={480}>
            {q.integrated_context}
          </Markdown>
        </div>
      ) : null}

      <div className="t-serif text-[14.5px] leading-[1.85] mb-3">
        <Markdown figures={q.figures} figureMaxWidth={480}>
          {q.question}
        </Markdown>
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
              <div className="flex-1">
                {text.startsWith("figure:") ? (
                  t("choiceFigure")
                ) : text ? (
                  <Markdown figures={q.figures}>{text}</Markdown>
                ) : (
                  t("choiceEmpty")
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AiExplanation questionId={q.id} userAnswer={userLetter} isPro={isPro} />
    </div>
  );
}
