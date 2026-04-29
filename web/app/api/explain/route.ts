import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getCachedExplanation, setCachedExplanation } from "@/lib/ai-cache";
import { isPro } from "@/lib/auth";
import { userFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildUserPrompt,
  getSystemPrompt,
  type ExplainLanguage,
} from "@/lib/explain-prompt";
import { questionById } from "@/lib/questions";
import type { ChoiceLetter } from "@/lib/types";
import type { ProfileRow } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const SUPPORTED_LANGUAGES: ExplainLanguage[] = ["ja", "zh", "en"];

type Body = {
  questionId?: string;
  userAnswer?: ChoiceLetter | null;
  language?: string;
};

const MODEL = process.env.AI_MODEL || "google/gemini-3-flash";

function resolveLanguage(input: unknown): ExplainLanguage {
  return SUPPORTED_LANGUAGES.includes(input as ExplainLanguage)
    ? (input as ExplainLanguage)
    : "ja";
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { questionId, userAnswer = null } = body;
  const language = resolveLanguage(body.language);
  if (!questionId || typeof questionId !== "string") {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  const question = questionById.get(questionId);
  if (!question) {
    return NextResponse.json({ error: "unknown questionId" }, { status: 404 });
  }

  // Pro gate: AI 解説 is a Pro-tier feature on web. iOS clients fall back
  // to on-device Foundation Models when this returns 402. Anonymous /
  // free callers get rejected; pricing page advertises the upgrade path.
  const proStatus = await getProStatus(req);
  if (!proStatus.isPro) {
    return NextResponse.json(
      { error: "Pro membership required", reason: proStatus.reason },
      { status: 402 },
    );
  }

  const cached = await getCachedExplanation(questionId, MODEL, language).catch(
    () => null,
  );
  if (cached) {
    return NextResponse.json({ explanation: cached, cached: true });
  }

  let text: string;
  try {
    const result = await generateText({
      model: MODEL,
      system: getSystemPrompt(language),
      prompt: buildUserPrompt(question, userAnswer ?? null),
    });
    text = result.text.trim();
  } catch (e) {
    const message = (e as Error).message;
    return NextResponse.json(
      { error: `AI gateway error: ${message}` },
      { status: 502 },
    );
  }

  await setCachedExplanation(questionId, MODEL, language, text).catch(() => {
    // Cache failures shouldn't block the user response.
  });

  return NextResponse.json({ explanation: text, cached: false });
}

type ProStatus =
  | { isPro: true }
  | { isPro: false; reason: "anonymous" | "free" | "unknown" };

/** Resolve the caller's Pro membership state. Mirrors `userFromRequest` so
 *  both cookie (web) and Bearer (iOS) auth paths work; iOS gets the same
 *  402 response and falls back to on-device Foundation Models. */
async function getProStatus(req: Request): Promise<ProStatus> {
  const user = await userFromRequest(req);
  if (!user) return { isPro: false, reason: "anonymous" };

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return { isPro: false, reason: "unknown" };

  const status = data.subscription_status as ProfileRow["subscription_status"];
  return isPro(status) ? { isPro: true } : { isPro: false, reason: "free" };
}
