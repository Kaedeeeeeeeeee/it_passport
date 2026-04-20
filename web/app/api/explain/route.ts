import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getCachedExplanation, setCachedExplanation } from "@/lib/ai-cache";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/lib/explain-prompt";
import { questionById } from "@/lib/questions";
import type { ChoiceLetter } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  questionId?: string;
  userAnswer?: ChoiceLetter | null;
};

const MODEL = process.env.AI_MODEL || "google/gemini-3-flash";

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { questionId, userAnswer = null } = body;
  if (!questionId || typeof questionId !== "string") {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  const question = questionById.get(questionId);
  if (!question) {
    return NextResponse.json({ error: "unknown questionId" }, { status: 404 });
  }

  const cached = await getCachedExplanation(questionId, MODEL).catch(() => null);
  if (cached) {
    return NextResponse.json({ explanation: cached, cached: true });
  }

  let text: string;
  try {
    const result = await generateText({
      model: MODEL,
      system: SYSTEM_PROMPT,
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

  await setCachedExplanation(questionId, MODEL, text).catch(() => {
    // Cache failures shouldn't block the user response.
  });

  return NextResponse.json({ explanation: text, cached: false });
}
