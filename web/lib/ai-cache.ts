import { supabaseAdmin } from "./supabase/admin";

const TABLE = "ai_explanations";

export async function getCachedExplanation(
  questionId: string,
  model: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("explanation")
    .eq("question_id", questionId)
    .eq("model", model)
    .maybeSingle();
  if (error) throw error;
  return data?.explanation ?? null;
}

export async function setCachedExplanation(
  questionId: string,
  model: string,
  text: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from(TABLE)
    .upsert(
      { question_id: questionId, model, explanation: text },
      { onConflict: "question_id,model" },
    );
  if (error) throw error;
}
