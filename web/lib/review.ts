import { supabaseServer } from "./supabase/server";

export type ReviewStrategy =
  | "wrong-recent"
  | "frequent-miss"
  | "stale";

export const REVIEW_STRATEGIES: ReviewStrategy[] = [
  "wrong-recent",
  "frequent-miss",
  "stale",
];

export const REVIEW_META: Record<
  ReviewStrategy,
  { title: string; subtitle: string; hint: string }
> = {
  "wrong-recent": {
    title: "最近間違えた",
    subtitle: "直近 2 週間で間違えた問題",
    hint: "記憶が新しいうちに復習しましょう。",
  },
  "frequent-miss": {
    title: "繰り返し間違える",
    subtitle: "2 回以上間違えた問題",
    hint: "苦手ポイントを集中攻略します。",
  },
  stale: {
    title: "久しく解いていない",
    subtitle: "7 日以上前に答えた問題",
    hint: "忘却曲線に合わせて再確認。",
  },
};

export type AttemptRow = {
  question_id: string;
  correct: boolean;
  attempted_at: string;
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

const MS_DAY = 86_400_000;

export function selectReviewCandidates(
  rows: AttemptRow[],
  strategy: ReviewStrategy,
  now: number = Date.now(),
): string[] {
  const byQ = new Map<string, AttemptRow[]>();
  for (const r of rows) {
    const arr = byQ.get(r.question_id) ?? [];
    arr.push(r);
    byQ.set(r.question_id, arr);
  }

  const ids: string[] = [];
  for (const [qid, attempts] of byQ) {
    const latest = attempts[attempts.length - 1];
    const latestMs = new Date(latest.attempted_at).getTime();

    if (strategy === "wrong-recent") {
      if (!latest.correct && now - latestMs <= 14 * MS_DAY) ids.push(qid);
    } else if (strategy === "frequent-miss") {
      const misses = attempts.filter((a) => !a.correct).length;
      if (misses >= 2) ids.push(qid);
    } else if (strategy === "stale") {
      if (now - latestMs > 7 * MS_DAY) ids.push(qid);
    }
  }
  return ids;
}

export async function getReviewCandidates(
  userId: string,
  strategy: ReviewStrategy,
): Promise<string[]> {
  const rows = await fetchAttempts(userId);
  return selectReviewCandidates(rows, strategy);
}

export async function getAllCandidateCounts(
  userId: string,
): Promise<Record<ReviewStrategy, number>> {
  const rows = await fetchAttempts(userId);
  return {
    "wrong-recent": selectReviewCandidates(rows, "wrong-recent").length,
    "frequent-miss": selectReviewCandidates(rows, "frequent-miss").length,
    stale: selectReviewCandidates(rows, "stale").length,
  };
}
