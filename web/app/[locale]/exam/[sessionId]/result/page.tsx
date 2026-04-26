import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePro } from "@/lib/auth";
import { questionById } from "@/lib/questions";
import { supabaseServer } from "@/lib/supabase/server";
import { ExamResultClient } from "@/components/exam/ExamResultClient";
import type { Category } from "@/lib/types";

type Props = {
  params: Promise<{ sessionId: string }>;
};

type ExamSource = {
  label?: string;
  questionIds?: string[];
};

export default async function ExamResultPage({ params }: Props) {
  const { sessionId } = await params;
  const profile = await requirePro("/exam");

  const sb = await supabaseServer();
  const { data: session } = await sb
    .from("sessions")
    .select(
      "id, kind, source, started_at, completed_at, question_count, correct_count",
    )
    .eq("id", sessionId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!session || session.kind !== "exam") notFound();

  const source = (session.source ?? {}) as ExamSource;
  const questionIds = source.questionIds ?? [];

  const { data: attempts } = await sb
    .from("attempts")
    .select("question_id, answer, correct, attempted_at")
    .eq("user_id", profile.id)
    .eq("session_id", sessionId);

  const byQ = new Map<string, { answer: string; correct: boolean }>();
  for (const a of attempts ?? []) {
    byQ.set(a.question_id as string, {
      answer: a.answer as string,
      correct: a.correct as boolean,
    });
  }

  const total = questionIds.length;
  const correct =
    typeof session.correct_count === "number"
      ? session.correct_count
      : Array.from(byQ.values()).filter((a) => a.correct).length;
  const accuracy = total ? correct / total : 0;
  const passed = accuracy >= 0.6;

  const catBuckets: Record<string, { total: number; correct: number }> = {};
  for (const id of questionIds) {
    const q = questionById.get(id);
    const key = (q?.category ?? "unknown") as Category | "unknown";
    const bucket = catBuckets[key] ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (byQ.get(id)?.correct) bucket.correct += 1;
    catBuckets[key] = bucket;
  }
  const categoryRows = Object.entries(catBuckets).map(([key, v]) => ({
    category: key as Category | "unknown",
    total: v.total,
    correct: v.correct,
    accuracy: v.total ? v.correct / v.total : 0,
  }));

  const wrongIds = questionIds.filter((id) => {
    const a = byQ.get(id);
    return !a || !a.correct;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-5 sm:px-8 py-4 border-b border-line bg-surface-2">
        <Link href="/exam" className="btn btn-ghost !text-[12px] no-underline">
          ← 模擬試験一覧
        </Link>
        <div className="flex-1" />
        <div className="t-mono text-[11px] text-ink-3 hidden sm:block">
          {source.label ?? sessionId}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <div className="max-w-[900px] mx-auto space-y-6">
          <ExamResultClient
            sessionId={sessionId}
            total={total}
            correct={correct}
            accuracy={accuracy}
            passed={passed}
            categoryRows={categoryRows}
            wrongCount={wrongIds.length}
          />
        </div>
      </div>
    </div>
  );
}
