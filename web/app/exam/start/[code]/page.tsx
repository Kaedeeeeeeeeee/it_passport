import { notFound, redirect } from "next/navigation";
import { requirePro } from "@/lib/auth";
import { allQuestions, questionsForExam, sample } from "@/lib/questions";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Props = {
  params: Promise<{ code: string }>;
};

const EXAM_QUESTION_COUNT = 100;

export default async function ExamStart({ params }: Props) {
  const { code } = await params;
  const profile = await requirePro("/exam");

  let questionIds: string[];
  let sourceLabel: string;
  if (code === "random") {
    questionIds = sample(allQuestions.slice(), EXAM_QUESTION_COUNT).map(
      (q) => q.id,
    );
    sourceLabel = "ランダム 100 問";
  } else {
    const qs = questionsForExam(code).sort((a, b) => a.number - b.number);
    if (qs.length === 0) notFound();
    questionIds = qs.map((q) => q.id);
    sourceLabel = code;
  }

  const { data, error } = await supabaseAdmin()
    .from("sessions")
    .insert({
      user_id: profile.id,
      kind: "exam",
      source: {
        kind: code === "random" ? "random" : "exam",
        examCode: code === "random" ? null : code,
        label: sourceLabel,
        questionIds,
      },
      question_count: questionIds.length,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "failed to create exam session");
  }

  redirect(`/exam/${data.id}`);
}
