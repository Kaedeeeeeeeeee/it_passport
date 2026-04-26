import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { requirePro } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Props = {
  params: Promise<{ sessionId: string }>;
};

/** Launcher: pick the wrong questions from an exam session and start a review
 *  practice session with them. Mirrors the /review/[strategy] pattern. */
export default async function ExamReviewLauncher({ params }: Props) {
  const { sessionId } = await params;
  const profile = await requirePro("/exam");
  const t = await getTranslations("exam");
  const admin = supabaseAdmin();

  const { data: exam } = await admin
    .from("sessions")
    .select("id, user_id, kind, source")
    .eq("id", sessionId)
    .maybeSingle();
  if (!exam || exam.user_id !== profile.id || exam.kind !== "exam") notFound();

  const source = (exam.source ?? {}) as { questionIds?: string[]; label?: string };
  const questionIds = source.questionIds ?? [];
  if (questionIds.length === 0) redirect(`/exam/${sessionId}/result`);

  const { data: attempts } = await admin
    .from("attempts")
    .select("question_id, correct")
    .eq("user_id", profile.id)
    .eq("session_id", sessionId);
  const correctSet = new Set(
    (attempts ?? []).filter((a) => a.correct).map((a) => a.question_id as string),
  );
  const wrong = questionIds.filter((id) => !correctSet.has(id));
  if (wrong.length === 0) redirect(`/exam/${sessionId}/result`);

  const { data, error } = await admin
    .from("sessions")
    .insert({
      user_id: profile.id,
      kind: "review",
      source: {
        kind: "review",
        strategy: "exam-wrong",
        label: t("examWrongLabel", { label: source.label ?? t("title") }),
        questionIds: wrong,
      },
      question_count: wrong.length,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "failed to create review session");
  }

  redirect(`/practice/review-${data.id}`);
}
