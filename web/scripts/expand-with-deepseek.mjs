#!/usr/bin/env node
// Expand a blog outline MDX file in place using DeepSeek's chat API.
// Reads bullets under each heading, returns a fully-prosed Japanese post.
// Author-time tool — DEEPSEEK_API_KEY lives in web/.env.local only.
//
// Usage:
//   node --env-file=.env.local scripts/expand-with-deepseek.mjs \
//     content/blog/ja/firewall-toha.mdx [content/blog/ja/...]

import { readFile, writeFile } from "node:fs/promises";
import { argv, exit, env } from "node:process";

const API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
const TEMPERATURE = 0.3;

if (!env.DEEPSEEK_API_KEY) {
  console.error(
    "DEEPSEEK_API_KEY not set. Pass --env-file=.env.local or export it.",
  );
  exit(1);
}

const files = argv.slice(2);
if (files.length === 0) {
  console.error("Usage: expand-with-deepseek.mjs <outline.mdx> [...]");
  exit(1);
}

const SYSTEM_PROMPT = `You are filling in a Japanese-language blog post outline for an IT Passport (ITパスポート / iパス) exam study site. The user will paste an MDX file containing complete frontmatter and a body skeleton with H2/H3 headings and \`-\` bullet points listing facts.

## Your task

Return the FULL FILE (frontmatter + body), with the following changes applied:

1. **Expand bullets into prose.** Inside the body, every \`- ...\` bullet under each H2/H3 heading must be replaced by 2–4 flowing sentences in Japanese keigo (です/ます調) covering the same facts. Do NOT keep bullets at all, EXCEPT:
   - Sub-lists under \`### 過去問の典型パターン\` headings (keep as bullet list).
   - Sub-lists under \`## 関連用語\` headings when they are short cross-reference links (keep as bullet list).
   - Markdown tables — preserve verbatim.
   - Fenced code blocks (\`\`\`sql etc.) — preserve verbatim.
2. **Total body length: 800–1400 Japanese characters.**
3. **Frontmatter**: preserve every field and value EXCEPT delete the \`status: "draft"\` line if present.
4. **Delete** the \`{/* SUBAGENT WRITING NOTES … */}\` comment block at the top of the body if present.
5. **Keep every H2 and H3 heading exactly** as written.
6. **Preserve every internal link** \`[テキスト](/path)\` exactly — these are non-negotiable.

## Style rules (strict)

- 日本語敬体（です/ます調）。
- 禁止フレーズ：「いかがでしたか」「本記事では」「最後までお読みいただきありがとうございました」「まとめると」「〜について解説しました」など、LLM 的な前置きや締めの定型句は一切使わない。
- 数字・固有名詞は bullet で指定された通りに正確に維持。創作・脚色しない。
- 受験者目線で「試験に出るからこう覚える」のスタンスを貫く。情報密度を高く、冗長な接続詞は避ける。
- 段落は 1〜3 文で短く。

## Output format (CRITICAL)

Return ONLY the raw MDX file content, starting with \`---\` (frontmatter open) and ending with the last line of the body. NO markdown code fences (\`\`\`mdx etc.) wrapping the output. NO preamble like "以下が修正されたファイルです". NO trailing commentary. The output is written directly back to disk — anything extra breaks the file.

## Domain context

- IT パスポート試験は IPA（情報処理推進機構）が実施する国家試験で、IT 入門レベル。
- 試験は 100 問、CBT 方式、合格ライン 60%（各分野 30% 以上）。
- 3 大分野：ストラテジ系・マネジメント系・テクノロジ系。
- 読者の主層：社会人・大学生で、初学者が多い。`;

/** Strip common LLM wrapper artifacts (code fences, leading whitespace). */
function unwrap(text) {
  let t = text.trim();
  // Strip a leading ```mdx / ```markdown / ``` fence
  t = t.replace(/^```(?:mdx|markdown|md)?\s*\n/, "");
  // Strip trailing ```
  t = t.replace(/\n```\s*$/, "");
  return t.trim() + "\n";
}

async function expand(filePath) {
  const original = await readFile(filePath, "utf8");
  const userPrompt = `Here is the outline file. Apply the rules and return the FULL FILE content with bullets expanded, status:draft removed, SUBAGENT NOTES deleted. Output raw MDX only.\n\n${original}`;

  const t0 = Date.now();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: TEMPERATURE,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  const data = await res.json();
  const expanded = data.choices?.[0]?.message?.content;
  if (!expanded) {
    throw new Error(`No content in response: ${JSON.stringify(data)}`);
  }
  const cleaned = unwrap(expanded);
  await writeFile(filePath, cleaned);
  const ms = Date.now() - t0;
  const u = data.usage ?? {};
  return {
    filePath,
    chars: cleaned.length,
    ms,
    inputTokens: u.prompt_tokens,
    outputTokens: u.completion_tokens,
  };
}

for (const file of files) {
  try {
    const r = await expand(file);
    const cost =
      ((r.inputTokens ?? 0) * 0.14 + (r.outputTokens ?? 0) * 0.28) / 1_000_000;
    console.log(
      `✓ ${r.filePath} — ${r.chars} chars, ${(r.ms / 1000).toFixed(1)}s, ${r.inputTokens}→${r.outputTokens} tok ($${cost.toFixed(4)})`,
    );
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
    exit(1);
  }
}
