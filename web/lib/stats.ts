import { supabaseServer } from "./supabase/server";
import { questionById, exams } from "./questions";
import type { Category } from "./types";

type AttemptRow = {
  question_id: string;
  correct: boolean;
  attempted_at: string; // ISO timestamp
};

async function fetchAttempts(userId: string): Promise<AttemptRow[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("attempts")
    .select("question_id, correct, attempted_at")
    .eq("user_id", userId)
    .order("attempted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AttemptRow[];
}

function dayKey(iso: string): string {
  // Treat timestamps as UTC days; good enough for a solo-study app.
  return iso.slice(0, 10);
}

/** Overview tiles: total attempts, unique questions seen, overall accuracy,
 *  and the current consecutive-day streak ending today (JST-agnostic). */
export async function getOverview(userId: string) {
  const rows = await fetchAttempts(userId);
  const total = rows.length;
  const correct = rows.filter((r) => r.correct).length;
  const accuracy = total ? correct / total : 0;

  const uniqueLatest = new Map<string, AttemptRow>();
  for (const r of rows) uniqueLatest.set(r.question_id, r);
  const seen = uniqueLatest.size;
  const masteredCount = Array.from(uniqueLatest.values()).filter(
    (r) => r.correct,
  ).length;

  const days = new Set(rows.map((r) => dayKey(r.attempted_at)));
  let streak = 0;
  const today = new Date();
  for (;;) {
    const k = today.toISOString().slice(0, 10);
    if (!days.has(k)) break;
    streak += 1;
    today.setUTCDate(today.getUTCDate() - 1);
  }

  return { total, correct, accuracy, seen, masteredCount, streak };
}

/** Attempts-per-day + daily accuracy for the last `days` days. */
export async function getRecentDaily(userId: string, days = 30) {
  const rows = await fetchAttempts(userId);
  const byDay = new Map<string, { total: number; correct: number }>();
  for (const r of rows) {
    const k = dayKey(r.attempted_at);
    const cur = byDay.get(k) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (r.correct) cur.correct += 1;
    byDay.set(k, cur);
  }
  const out: Array<{ date: string; total: number; correct: number }> = [];
  const cursor = new Date();
  for (let i = 0; i < days; i++) {
    const k = cursor.toISOString().slice(0, 10);
    const agg = byDay.get(k) ?? { total: 0, correct: 0 };
    out.push({ date: k, ...agg });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out.reverse();
}

export type CategoryStat = {
  category: Category | "unknown";
  total: number;
  correct: number;
  accuracy: number;
};

export async function getByCategory(
  userId: string,
): Promise<CategoryStat[]> {
  const rows = await fetchAttempts(userId);
  const buckets = new Map<string, { total: number; correct: number }>();
  for (const r of rows) {
    const q = questionById.get(r.question_id);
    const cat = (q?.category ?? "unknown") as Category | "unknown";
    const cur = buckets.get(cat) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (r.correct) cur.correct += 1;
    buckets.set(cat, cur);
  }
  return Array.from(buckets.entries()).map(([category, v]) => ({
    category: category as Category | "unknown",
    total: v.total,
    correct: v.correct,
    accuracy: v.total ? v.correct / v.total : 0,
  }));
}

export type ExamStat = {
  exam_code: string;
  year: number;
  total: number;
  correct: number;
  accuracy: number;
};

export async function getByExam(userId: string): Promise<ExamStat[]> {
  const rows = await fetchAttempts(userId);
  const buckets = new Map<string, { total: number; correct: number }>();
  for (const r of rows) {
    const q = questionById.get(r.question_id);
    if (!q) continue;
    const cur = buckets.get(q.exam_code) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (r.correct) cur.correct += 1;
    buckets.set(q.exam_code, cur);
  }
  const list: ExamStat[] = [];
  for (const e of exams) {
    const v = buckets.get(e.exam_code);
    if (!v) continue;
    list.push({
      exam_code: e.exam_code,
      year: e.year,
      total: v.total,
      correct: v.correct,
      accuracy: v.total ? v.correct / v.total : 0,
    });
  }
  return list.sort((a, b) => b.year - a.year || a.exam_code.localeCompare(b.exam_code));
}
