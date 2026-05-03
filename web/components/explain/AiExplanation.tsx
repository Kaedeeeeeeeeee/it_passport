"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Markdown } from "@/components/md/Markdown";
import { useSubscribeModal } from "@/components/subscribe/SubscribeModal";
import { track } from "@/lib/analytics";
import type { ChoiceLetter } from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "error"; message: string };

export function AiExplanation({
  questionId,
  userAnswer,
  isPro,
}: {
  questionId: string;
  userAnswer: ChoiceLetter | null;
  isPro: boolean;
}) {
  const t = useTranslations("aiExplanation");
  const locale = useLocale();
  const { open: openSubscribeModal } = useSubscribeModal();
  const [state, setState] = useState<State>({ kind: "idle" });

  function handleClick() {
    if (!isPro) {
      openSubscribeModal("ai_explanation");
      return;
    }
    void load();
  }

  async function load() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, userAnswer, language: locale }),
      });
      if (res.status === 402) {
        // Defense in depth: server caught a non-Pro request even though
        // our prop said otherwise (stale session, etc). Open the same
        // paywall modal as the client-side check would have.
        openSubscribeModal("ai_explanation:server_402");
        setState({ kind: "idle" });
        return;
      }
      if (!res.ok) {
        const message = await res.text().catch(() => res.statusText);
        throw new Error(message || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { explanation: string };
      setState({ kind: "ready", text: data.explanation });
      track("explanation_generated", { language: locale });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  if (state.kind === "ready") {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface p-4 text-[13px] leading-[1.85] text-ink-2">
        <div className="t-label mb-2">{t("title")}</div>
        <Markdown>{state.text}</Markdown>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="t-label flex-1">{t("title")}</div>
        {state.kind === "idle" ? (
          <button
            type="button"
            onClick={handleClick}
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
            onClick={handleClick}
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
