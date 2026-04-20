import { supabaseServer } from "./supabase/server";
import { questionById, exams } from "./questions";
import type { Category } from "./types";

export type AttemptRow = {
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

export type Overview = {
  total: number;
  correct: number;
  accuracy: number;
  seen: number;
  masteredCount: number;
  streak: number;
};

/** Pure core of getOverview. `now` is injected so tests can pin a date. */
export function computeOverview(rows: AttemptRow[], now: Date): Overview {
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
  const cursor = new Date(now);
  for (;;) {
    const k = cursor.toISOString().slice(0, 10);
    if (!days.has(k)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { total, correct, accuracy, seen, masteredCount, streak };
}

export async function getOverview(userId: string) {
  return computeOverview(await fetchAttempts(userId), new Date());
}

export type DailyBucket = { date: string; total: number; correct: number };

export function computeRecentDaily(
  rows: AttemptRow[],
  days: number,
  now: Date,
): DailyBucket[] {
  const byDay = new Map<string, { total: number; correct: number }>();
  for (const r of rows) {
    const k = dayKey(r.attempted_at);
    const cur = byDay.get(k) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (r.correct) cur.correct += 1;
    byDay.set(k, cur);
  }
  const out: DailyBucket[] = [];
  const cursor = new Date(now);
  for (let i = 0; i < days; i++) {
    const k = cursor.toISOString().slice(0, 10);
    const agg = byDay.get(k) ?? { total: 0, correct: 0 };
    out.push({ date: k, ...agg });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out.reverse();
}

export async function getRecentDaily(userId: string, days = 30) {
  return computeRecentDaily(await fetchAttempts(userId), days, new Date());
}

export type CategoryStat = {
  category: Category | "unknown";
  total: number;
  correct: number;
  accuracy: number;
};

export function computeByCategory(rows: AttemptRow[]): CategoryStat[] {
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

export async function getByCategory(userId: string): Promise<CategoryStat[]> {
  return computeByCategory(await fetchAttempts(userId));
}

export type ExamStat = {
  exam_code: string;
  year: number;
  total: number;
  correct: number;
  accuracy: number;
};

export function computeByExam(rows: AttemptRow[]): ExamStat[] {
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
  return list.sort(
    (a, b) => b.year - a.year || a.exam_code.localeCompare(b.exam_code),
  );
}

export async function getByExam(userId: string): Promise<ExamStat[]> {
  return computeByExam(await fetchAttempts(userId));
}
