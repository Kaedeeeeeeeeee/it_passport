import { notFound } from "next/navigation";
import { ExamClient } from "@/components/exam/ExamClient";
import { requirePro } from "@/lib/auth";
import { questionById } from "@/lib/questions";
import { supabaseServer } from "@/lib/supabase/server";
import type { Question } from "@/lib/types";

type Props = {
  params: Promise<{ sessionId: string }>;
};

type ExamSource = {
  label?: string;
  questionIds?: string[];
  examCode?: string | null;
};

export default async function ExamPage({ params }: Props) {
  const { sessionId } = await params;
  const profile = await requirePro("/exam");

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("sessions")
    .select("id, kind, source, started_at, completed_at, correct_count")
    .eq("id", sessionId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error || !data || data.kind !== "exam") notFound();

  if (data.completed_at) {
    // Once submitted, the result page takes over.
    const { redirect } = await import("next/navigation");
    redirect(`/exam/${sessionId}/result`);
  }

  const source = (data.source ?? {}) as ExamSource;
  const ids = source.questionIds ?? [];
  const questions: Question[] = [];
  for (const id of ids) {
    const q = questionById.get(id);
    if (q) questions.push(q);
  }
  if (questions.length === 0) notFound();

  return (
    <ExamClient
      sessionId={sessionId}
      label={source.label ?? "模擬試験"}
      questions={questions}
      startedAt={new Date(data.started_at).getTime()}
    />
  );
}
