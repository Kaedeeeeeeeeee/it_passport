"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { ChoiceLetter } from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "error"; message: string };

export function AiExplanation({
  questionId,
  userAnswer,
}: {
  questionId: string;
  userAnswer: ChoiceLetter | null;
}) {
  const t = useTranslations("aiExplanation");
  const common = useTranslations("common");
  const locale = useLocale();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function load() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, userAnswer, language: locale }),
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
          {t("title")}
          <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px normal-case">
            {common("proBadge")}
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
          {t("title")}
          <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px normal-case">
            {common("proBadge")}
          </span>
        </div>
        {state.kind === "idle" ? (
          <button
            type="button"
            onClick={load}
            className="btn btn-ghost !text-[12px] !py-1.5 !px-3"
          >
            {t("generate")}
          </button>
        ) : null}
        {state.kind === "loading" ? (
          <span className="text-[11px] text-ink-3">{t("generating")}</span>
        ) : null}
        {state.kind === "error" ? (
          <button
            type="button"
            onClick={load}
            className="btn btn-ghost !text-[12px] !py-1.5 !px-3"
          >
            {t("retry")}
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
