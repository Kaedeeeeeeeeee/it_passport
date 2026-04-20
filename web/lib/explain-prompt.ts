import type { ChoiceLetter, Question } from "./types";

export const SYSTEM_PROMPT = `あなたはITパスポート試験の経験豊富な講師です。受験者が間違えないよう、日本語で簡潔に解説してください。口調は丁寧ですが、冗長な前置きは避けます。`;

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

  return `${ctx}【問題】\n${q.question}\n\n【選択肢】\n${choiceLines}\n\n【正解】${q.answer}\n${userLine}\n\n以下の形式で出力してください:\n\n◆ 正解の理由 (3–4行)\n◆ 他の選択肢が不適な理由 (各1行)\n◆ 関連するシラバス用語があれば最後に括弧書きで補足`;
}
