import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { requirePro } from "@/lib/auth";
import { sample } from "@/lib/questions";
import {
  REVIEW_STRATEGIES,
  getReviewCandidates,
  type ReviewStrategy,
} from "@/lib/review";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Props = {
  params: Promise<{ strategy: string }>;
};

const MAX_QUESTIONS = 20;

export default async function ReviewLauncher({ params }: Props) {
  const { strategy } = await params;
  if (!REVIEW_STRATEGIES.includes(strategy as ReviewStrategy)) notFound();
  const key = strategy as ReviewStrategy;

  const profile = await requirePro(`/review`);
  const candidates = await getReviewCandidates(profile.id, key);
  if (candidates.length === 0) redirect("/review");

  const picked = sample(candidates, Math.min(candidates.length, MAX_QUESTIONS));
  const t = await getTranslations("review");

  const { data, error } = await supabaseAdmin()
    .from("sessions")
    .insert({
      user_id: profile.id,
      kind: "review",
      source: {
        kind: "review",
        strategy: key,
        label: t(`strategy.${key}.title`),
        questionIds: picked,
      },
      question_count: picked.length,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "failed to create review session");

  redirect(`/practice/review-${data.id}`);
}
