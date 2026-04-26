import { supabaseAdmin } from "./supabase/admin";

const TABLE = "ai_explanations";

export async function getCachedExplanation(
  questionId: string,
  model: string,
  language: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("explanation")
    .eq("question_id", questionId)
    .eq("model", model)
    .eq("language", language)
    .maybeSingle();
  if (error) throw error;
  return data?.explanation ?? null;
}

export async function setCachedExplanation(
  questionId: string,
  model: string,
  language: string,
  text: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from(TABLE)
    .upsert(
      { question_id: questionId, model, language, explanation: text },
      { onConflict: "question_id,model,language" },
    );
  if (error) throw error;
}
