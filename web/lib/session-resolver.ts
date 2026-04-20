import { allQuestions, questionsForExam, sample } from "./questions";
import type { Question } from "./types";

/** Resolve a session slug from /practice/<sessionId> + search params into the
 *  concrete list of questions to practice, in the order to show. */
export function resolveSession(
  sessionId: string,
  search: Record<string, string | string[] | undefined>,
): { label: string; questions: Question[] } | null {
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
  return null;
}
