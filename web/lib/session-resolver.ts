import { allQuestions, questionById, questionsForExam, sample } from "./questions";
import { supabaseServer } from "./supabase/server";
import type { Question } from "./types";

/** Resolve a session slug from /practice/<sessionId> + search params into the
 *  concrete list of questions to practice, in the order to show.
 *
 *  Slug forms:
 *    random           → ?n=<count> random questions
 *    exam-<code>      → every question in the exam
 *    review-<uuid>    → server-side review session; read questionIds from DB
 */
export async function resolveSession(
  sessionId: string,
  search: Record<string, string | string[] | undefined>,
): Promise<{ label: string; questions: Question[] } | null> {
  if (sessionId === "random") {
    const raw = search.n;
    const n = Math.max(
      1,
      Math.min(100, Number(Array.isArray(raw) ? raw[0] : raw) || 10),
    );
    return {
      label: `ランダム ${n} 問`,
      questions: sample(allQuestions.slice(), n),
    };
  }
  if (sessionId.startsWith("exam-")) {
    const code = sessionId.slice(5);
    const qs = questionsForExam(code).sort((a, b) => a.number - b.number);
    if (qs.length === 0) return null;
    return { label: `${code} · 全100問`, questions: qs };
  }
  if (sessionId.startsWith("review-")) {
    const uuid = sessionId.slice(7);
    return resolveReviewSession(uuid);
  }
  return null;
}

async function resolveReviewSession(
  uuid: string,
): Promise<{ label: string; questions: Question[] } | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("sessions")
    .select("kind, source")
    .eq("id", uuid)
    .maybeSingle();
  if (error || !data) return null;
  if (data.kind !== "review") return null;

  const source = data.source as {
    questionIds?: unknown;
    label?: unknown;
  } | null;
  const ids = Array.isArray(source?.questionIds)
    ? (source?.questionIds as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : [];
  if (ids.length === 0) return null;

  const questions: Question[] = [];
  for (const id of ids) {
    const q = questionById.get(id);
    if (q) questions.push(q);
  }
  if (questions.length === 0) return null;

  const label =
    typeof source?.label === "string"
      ? `復習 · ${source.label}`
      : "復習";
  return { label, questions };
}
