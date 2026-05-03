#!/usr/bin/env node
// Batch-translate Japanese blog posts to zh + en using DeepSeek.
//
// Usage:
//   node web/scripts/translate-blog.mjs                         # all locales, all slugs, skip existing
//   node web/scripts/translate-blog.mjs --locale zh             # just zh
//   node web/scripts/translate-blog.mjs --slugs bpr-bpm,it-vs-fe
//   node web/scripts/translate-blog.mjs --force                 # overwrite existing
//   node web/scripts/translate-blog.mjs --dry-run               # print first translation, no writes
//
// Reads DEEPSEEK_API_KEY from web/.env.local.
// Concurrency is capped at 4 to stay well under DeepSeek's rate limits.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_WEB = path.resolve(__dirname, "..");
const BLOG_DIR = path.join(REPO_WEB, "content", "blog");
const SOURCE_LOCALE = "ja";
const TARGET_LOCALES = ["zh", "en"];
const CONCURRENCY = 4;
const MAX_RETRIES = 3;

const TARGET_META = {
  zh: {
    label: "Simplified Chinese (中文，zh-CN)",
    audienceHint:
      "中国大陆读者，多数是在日华人/留学生在备考日本经济产业省主办的 ITパスポート 国家资格。",
    glossary: [
      "ITパスポート → IT护照（首次出现可保留 ITパスポート 原文，后续可统一为 IT护照）",
      "基本情報技術者試験 → 基本信息技术者考试（缩写 FE）",
      "応用情報技術者試験 → 应用信息技术者考试（缩写 AP）",
      "経済産業省 → 经济产业省",
      "情報処理推進機構 / IPA → 信息处理推进机构（IPA）",
      "ストラテジ系/マネジメント系/テクノロジ系 → 战略类/管理类/技术类",
      "過去問 → 历年真题",
      "合格率 → 合格率（保留）",
      "受験料 → 考试报名费",
      "CBT → CBT（保留缩写）",
      "ITSS → ITSS（保留缩写）",
    ],
  },
  en: {
    label: "American English (en-US)",
    audienceHint:
      "International readers (often non-Japanese-speakers living in Japan, or career-curious developers) studying for ITパスポート, the Japanese METI/IPA national IT literacy exam.",
    glossary: [
      "ITパスポート → IT Passport (or 'IT Passport exam' for clarity)",
      "基本情報技術者試験 → Fundamental Information Technology Engineer Examination (FE)",
      "応用情報技術者試験 → Applied Information Technology Engineer Examination (AP)",
      "経済産業省 → Ministry of Economy, Trade and Industry (METI)",
      "情報処理推進機構 / IPA → Information-technology Promotion Agency (IPA)",
      "ストラテジ系/マネジメント系/テクノロジ系 → Strategy / Management / Technology",
      "過去問 → past exam questions",
      "合格率 → pass rate",
      "受験料 → exam fee",
      "CBT → CBT (keep acronym)",
      "ITSS → ITSS (keep acronym)",
    ],
  },
};

function buildPrompt(targetLocale, mdxSource) {
  const t = TARGET_META[targetLocale];
  return `You are translating a Japanese MDX blog post about the ITパスポート (Japan IT Passport) certification exam into ${t.label}.

AUDIENCE: ${t.audienceHint}

TERMINOLOGY GLOSSARY (use these renderings consistently):
${t.glossary.map((g) => `- ${g}`).join("\n")}

MUST PRESERVE EXACTLY (do NOT translate, do NOT modify):
- The YAML frontmatter structure (\`---\` delimiters and field names: title, description, date, tags, cover)
- The \`date:\` value (ISO YYYY-MM-DD)
- The \`cover:\` value (null or a path)
- All Markdown syntax: heading levels (##, ###), tables, lists, code blocks, blockquotes
- Internal link URLs: in \`[text](/blog/foo)\`, translate \`text\` but KEEP \`/blog/foo\` exactly. Same for \`/category/...\`, \`/exam\`, \`/exams\`, \`/practice/...\`.
- HTML/MDX special characters and any inline code

TRANSLATE NATURALLY:
- title and description in frontmatter
- tags (translate the visible labels, keep them as a YAML array)
- All body prose, headings, table cells, list items, blockquotes
- Link anchor text (the part inside \`[ ]\`)

OUTPUT FORMAT: Return ONLY the translated MDX. No code fences (no \`\`\`), no preamble like "Here is the translation:", no trailing notes. Start directly with the \`---\` of the frontmatter.

SOURCE MDX:
${mdxSource}`;
}

function parseArgs(argv) {
  const out = { locale: "both", slugs: null, force: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") out.force = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--locale") out.locale = argv[++i];
    else if (a === "--slugs") out.slugs = argv[++i].split(",").map((s) => s.trim());
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node web/scripts/translate-blog.mjs [--locale zh|en|both] [--slugs a,b,c] [--force] [--dry-run]");
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

async function loadDeepseekKey() {
  // Read web/.env.local; tolerate missing values surrounded by quotes.
  const envPath = path.join(REPO_WEB, ".env.local");
  const raw = await fs.readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*DEEPSEEK_API_KEY\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v) return v;
  }
  throw new Error("DEEPSEEK_API_KEY not found in web/.env.local");
}

async function callDeepseek(apiKey, prompt) {
  // deepseek-chat is plenty for translation; reasoner is overkill and 3x cost.
  const body = {
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    stream: false,
  };
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        // 90s should comfortably cover even the longest blog posts.
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`DeepSeek HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.length < 50) {
        throw new Error(`DeepSeek returned empty/short content: ${JSON.stringify(json).slice(0, 300)}`);
      }
      return content;
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES - 1) {
        const delay = 1000 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

function sanitizeOutput(content) {
  // DeepSeek occasionally wraps the result in ```mdx fences despite the
  // instruction. Strip them — we want the raw MDX.
  let s = content.trim();
  if (s.startsWith("```")) {
    const firstNl = s.indexOf("\n");
    if (firstNl > 0) s = s.slice(firstNl + 1);
    if (s.endsWith("```")) s = s.slice(0, -3).trimEnd();
  }
  // Make sure it begins with a frontmatter block.
  if (!s.startsWith("---")) {
    throw new Error(`Translated MDX missing frontmatter delimiter: ${s.slice(0, 120)}`);
  }
  return s + (s.endsWith("\n") ? "" : "\n");
}

async function translateSlug(apiKey, slug, targetLocale, options) {
  const inPath = path.join(BLOG_DIR, SOURCE_LOCALE, `${slug}.mdx`);
  const outPath = path.join(BLOG_DIR, targetLocale, `${slug}.mdx`);
  if (!options.force) {
    try {
      await fs.access(outPath);
      return { slug, locale: targetLocale, status: "skipped" };
    } catch {
      // doesn't exist, proceed
    }
  }
  const source = await fs.readFile(inPath, "utf8");
  const prompt = buildPrompt(targetLocale, source);
  const raw = await callDeepseek(apiKey, prompt);
  const out = sanitizeOutput(raw);
  if (options.dryRun) {
    console.log(`\n========== DRY RUN: ${targetLocale}/${slug}.mdx ==========\n`);
    console.log(out);
    return { slug, locale: targetLocale, status: "dryrun" };
  }
  await fs.writeFile(outPath, out, "utf8");
  return { slug, locale: targetLocale, status: "written", bytes: out.length };
}

async function pool(items, concurrency, worker) {
  const results = [];
  let i = 0;
  let active = 0;
  return await new Promise((resolve, reject) => {
    const next = () => {
      if (i === items.length && active === 0) return resolve(results);
      while (active < concurrency && i < items.length) {
        const idx = i++;
        active++;
        worker(items[idx])
          .then((r) => {
            results[idx] = r;
            active--;
            next();
          })
          .catch((e) => reject(e));
      }
    };
    next();
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = await loadDeepseekKey();

  const allFiles = await fs.readdir(path.join(BLOG_DIR, SOURCE_LOCALE));
  let slugs = allFiles
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
  if (args.slugs) slugs = slugs.filter((s) => args.slugs.includes(s));

  const locales = args.locale === "both" ? TARGET_LOCALES : [args.locale];
  for (const l of locales) {
    if (!TARGET_META[l]) {
      console.error(`Unknown locale: ${l}`);
      process.exit(1);
    }
  }

  const tasks = [];
  for (const slug of slugs) {
    for (const locale of locales) tasks.push({ slug, locale });
  }

  console.error(`Translating ${slugs.length} slugs × ${locales.length} locales = ${tasks.length} files (concurrency ${CONCURRENCY})`);

  let done = 0;
  let written = 0;
  let skipped = 0;
  let failed = 0;
  const start = Date.now();

  const results = await pool(tasks, CONCURRENCY, async (t) => {
    try {
      const r = await translateSlug(apiKey, t.slug, t.locale, args);
      done++;
      if (r.status === "written") written++;
      else if (r.status === "skipped") skipped++;
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`[${done}/${tasks.length}] ${r.status.padEnd(7)} ${t.locale}/${t.slug}.mdx (${elapsed}s)`);
      return r;
    } catch (e) {
      failed++;
      done++;
      console.error(`[${done}/${tasks.length}] FAILED  ${t.locale}/${t.slug}.mdx — ${e.message}`);
      return { ...t, status: "failed", error: e.message };
    }
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.error(`\nDone in ${elapsed}s — written: ${written}, skipped: ${skipped}, failed: ${failed}`);
  if (failed > 0) {
    console.error(`\nFailed files:`);
    for (const r of results) {
      if (r.status === "failed") console.error(`  ${r.locale}/${r.slug}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
