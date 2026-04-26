import { getTranslations } from "next-intl/server";
import { PRACTICE_CATEGORIES } from "./categories";
import { categoryLabel } from "./exam-terms";
import {
  allQuestions,
  questionById,
  questionsByCategory,
  questionsForExam,
  sample,
} from "./questions";
import { supabaseServer } from "./supabase/server";
import type { Category, Question } from "./types";

/** Resolve a session slug from /practice/<sessionId> + search params into the
 *  concrete list of questions to practice, in the order to show.
 *
 *  Slug forms:
 *    random           → ?n=<count> random questions
 *    exam-<code>      → every question in the exam
 *    category-<name>  → ?n=<count> random questions from the category
 *    review-<uuid>    → server-side review session; read questionIds from DB
 */
export async function resolveSession(
  sessionId: string,
  search: Record<string, string | string[] | undefined>,
): Promise<{ label: string; questions: Question[] } | null> {
  const practice = await getTranslations("practice");

  if (sessionId === "random") {
    const raw = search.n;
    const n = Math.max(
      1,
      Math.min(100, Number(Array.isArray(raw) ? raw[0] : raw) || 10),
    );
    return {
      label: practice("randomSessionLabel", { n }),
      questions: sample(allQuestions.slice(), n),
    };
  }
  if (sessionId.startsWith("exam-")) {
    const code = sessionId.slice(5);
    const qs = questionsForExam(code).sort((a, b) => a.number - b.number);
    if (qs.length === 0) return null;
    return {
      label: practice("examSessionLabel", { code }),
      questions: qs,
    };
  }
  if (sessionId.startsWith("category-")) {
    const cat = sessionId.slice(9) as Category;
    if (!PRACTICE_CATEGORIES.includes(cat)) return null;
    const raw = search.n;
    const requested = Number(Array.isArray(raw) ? raw[0] : raw) || 20;
    const pool = questionsByCategory(cat);
    if (pool.length === 0) return null;
    const n = Math.max(1, Math.min(100, Math.min(requested, pool.length)));
    const examTerms = await getTranslations("examTerms");
    return {
      label: practice("categorySessionLabel", {
        label: categoryLabel(cat, examTerms),
        n,
      }),
      questions: sample(pool, n),
    };
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

  const review = await getTranslations("review");
  const prefix = review("sessionPrefix");
  const label =
    typeof source?.label === "string"
      ? `${prefix} · ${source.label}`
      : prefix;
  return { label, questions };
}
