#!/usr/bin/env node
// Normalize blog post tags across zh + en to fix DeepSeek's per-call
// inconsistency. Source-of-truth ja/ files are not touched.
//
// Surgical approach: only touch the `tags: [...]` line of each
// frontmatter (matched on the first occurrence near the top of the
// file). This preserves the rest of the YAML formatting (quoting style,
// inline arrays vs block lists) — so the diff stays small.
//
// Usage:
//   node web/scripts/normalize-tags.mjs            # write changes
//   node web/scripts/normalize-tags.mjs --dry-run  # preview only

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.resolve(__dirname, "..", "content", "blog");

const TAG_MAP = {
  zh: {
    "IT 护照": "IT护照",
    "IT パスポート": "IT护照",
    "ITパスポート": "IT护照",
    "IT Passport": "IT护照",
    学习法: "学习方法",
    备考方法: "学习方法",
    备考计划: "学习方法",
    对比: "比较",
    品质管理: "质量管理",
  },
  en: {
    "study methods": "Study Methods",
    "business models": "Business Models",
    seniors: "Seniors",
    "humanities background": "Humanities Background",
    "stay-at-home parents": "Stay-at-Home Parents",
    Network: "Networking",
    "Study plan": "Study Methods",
    "Exam prep": "Study Methods",
    "Legal Affairs": "Legal",
    Quality: "Quality Control",
  },
};

// Extract the array of tag strings from a `tags: [...]` line.
function parseTagsLine(line) {
  // Capture everything between the outermost [ and ]
  const m = line.match(/^(\s*tags:\s*)\[(.*)\](.*)$/);
  if (!m) return null;
  // Split on commas that are NOT inside quoted strings.
  const inner = m[2];
  const tags = [];
  let cur = "";
  let inStr = false;
  let quoteChar = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === "\\") {
        cur += c + (inner[++i] ?? "");
        continue;
      }
      if (c === quoteChar) {
        inStr = false;
        quoteChar = null;
      }
      cur += c;
    } else {
      if (c === '"' || c === "'") {
        inStr = true;
        quoteChar = c;
        cur += c;
      } else if (c === ",") {
        tags.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  if (cur.trim()) tags.push(cur.trim());
  // Strip surrounding quotes
  const unquoted = tags.map((t) => {
    const mm = t.match(/^(['"])(.*)\1$/);
    return mm ? mm[2] : t;
  });
  return { prefix: m[1], unquoted, suffix: m[3], original: tags };
}

function rebuildTagsLine(prefix, mappedTags, originalQuotedTags) {
  // Preserve the quote style from the original (default to double quotes).
  const sample = originalQuotedTags[0] ?? '""';
  const quoteChar = sample.startsWith("'") ? "'" : '"';
  // Dedupe in order
  const seen = new Set();
  const deduped = [];
  for (const t of mappedTags) {
    if (!seen.has(t)) {
      seen.add(t);
      deduped.push(t);
    }
  }
  const inner = deduped.map((t) => `${quoteChar}${t}${quoteChar}`).join(", ");
  return `${prefix}[${inner}]`;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

let totalFiles = 0;
let changedFiles = 0;
const changes = [];

for (const locale of ["zh", "en"]) {
  const dir = path.join(BLOG_DIR, locale);
  const map = TAG_MAP[locale];
  for (const f of (await fs.readdir(dir)).sort()) {
    if (!f.endsWith(".mdx")) continue;
    totalFiles++;
    const filePath = path.join(dir, f);
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split("\n");
    let tagsLineIdx = -1;
    let parsed = null;
    // Look for the tags line within the first ~20 lines (frontmatter region)
    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const p = parseTagsLine(lines[i]);
      if (p) {
        tagsLineIdx = i;
        parsed = p;
        break;
      }
    }
    if (tagsLineIdx === -1) continue;
    const newTags = parsed.unquoted.map((t) =>
      Object.prototype.hasOwnProperty.call(map, t) ? map[t] : t,
    );
    const equal =
      newTags.length === parsed.unquoted.length &&
      newTags.every((t, i) => t === parsed.unquoted[i]);
    if (equal) continue;
    changedFiles++;
    const newLine = rebuildTagsLine(parsed.prefix, newTags, parsed.original);
    changes.push({ file: `${locale}/${f}`, before: lines[tagsLineIdx], after: newLine });
    if (!dryRun) {
      lines[tagsLineIdx] = newLine;
      await fs.writeFile(filePath, lines.join("\n"), "utf8");
    }
  }
}

console.log(`${dryRun ? "DRY RUN — " : ""}${changedFiles}/${totalFiles} files ${dryRun ? "would change" : "changed"}`);
for (const c of changes) {
  console.log(`  ${c.file}`);
  console.log(`    - ${c.before}`);
  console.log(`    + ${c.after}`);
}
