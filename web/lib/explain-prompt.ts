import type { ChoiceLetter, Question } from "./types";

export type ExplainLanguage = "ja" | "zh" | "en";

const SYSTEM_PROMPTS: Record<ExplainLanguage, string> = {
  ja: `あなたはITパスポート試験の経験豊富な講師です。受験者が間違えないよう、日本語で簡潔に解説してください。口調は丁寧ですが、冗長な前置きは避けます。

以下の形式で出力してください:

◆ 正解の理由 (3–4行)
◆ 他の選択肢が不適な理由 (各1行)
◆ 関連するシラバス用語があれば最後に括弧書きで補足`,

  zh: `你是日本 IT Passport（iパス）考试的资深讲师。题目本身是日语，请用简体中文简洁、礼貌地解析，不要绕弯子，不要啰嗦的前言。

请按以下格式输出：

◆ 正解的理由（3–4 行）
◆ 其他选项为何不对（每项 1 行）
◆ 如有相关的考纲术语，请在最后用括号补充（保留日语原词并附中文译名）`,

  en: `You are a senior instructor for the Japanese IT Passport (iパス) exam. The question itself is in Japanese — explain it concisely and politely in English. No filler.

Output in this format:

◆ Why the correct answer is right (3–4 lines)
◆ Why each other choice is wrong (1 line each)
◆ Any related syllabus terminology in parentheses at the end (keep the Japanese term, add an English gloss)`,
};

export function getSystemPrompt(language: ExplainLanguage): string {
  return SYSTEM_PROMPTS[language] ?? SYSTEM_PROMPTS.ja;
}

/**
 * Builds the user prompt fed into the LLM. The structural labels stay in
 * Japanese because the question itself is Japanese — keeping the labels in
 * the same language as the source content gives the model less to translate
 * before it gets to the actual reasoning. The system prompt is what controls
 * the language of the answer.
 */
export function buildUserPrompt(
  q: Question,
  userAnswer: ChoiceLetter | null,
): string {
  const choiceLines = (["ア", "イ", "ウ", "エ"] as ChoiceLetter[])
    .map((k) => {
      const raw = q.choices[k] ?? "";
      const text = raw.startsWith("figure:") ? "(図で選ぶ)" : raw || "—";
      return `${k}: ${text}`;
    })
    .join("\n");

  const ctx = q.integrated_context
    ? `【中問 共通題干】\n${q.integrated_context}\n\n`
    : "";

  const userLine = userAnswer
    ? `【ユーザーの回答】${userAnswer}`
    : `【ユーザーの回答】未回答`;

  return `${ctx}【問題】\n${q.question}\n\n【選択肢】\n${choiceLines}\n\n【正解】${q.answer}\n${userLine}`;
}
