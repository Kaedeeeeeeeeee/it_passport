import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.join(process.cwd(), "content/blog");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO 'YYYY-MM-DD' from frontmatter. */
  date: string;
  tags: string[];
  cover: string | null;
};

export type Post = PostMeta & {
  /** Raw MDX source (frontmatter stripped). */
  body: string;
};

type Frontmatter = {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  cover?: string | null;
  status?: string;
};

function localeDir(locale: string): string {
  return path.join(ROOT, locale);
}

async function readSlugs(locale: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(localeDir(locale), { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
      .map((e) => e.name.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

async function readRaw(
  locale: string,
  slug: string,
): Promise<{ data: Frontmatter; content: string } | null> {
  const file = path.join(localeDir(locale), `${slug}.mdx`);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = matter(raw);
    return { data: parsed.data as Frontmatter, content: parsed.content };
  } catch {
    return null;
  }
}

function toMeta(slug: string, fm: Frontmatter): PostMeta {
  return {
    slug,
    title: fm.title ?? slug,
    description: fm.description ?? "",
    date: fm.date ?? "1970-01-01",
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    cover: fm.cover ?? null,
  };
}

/** List published posts for a locale, newest first. Returns [] if the
 *  locale directory is missing or empty. */
export async function getAllPosts(locale: string): Promise<PostMeta[]> {
  const slugs = await readSlugs(locale);
  const out: PostMeta[] = [];
  for (const slug of slugs) {
    const raw = await readRaw(locale, slug);
    if (!raw) continue;
    if (raw.data.status === "draft") continue;
    out.push(toMeta(slug, raw.data));
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

/** Read a single post (frontmatter + raw MDX body). Returns null if the
 *  file is missing or marked as draft. */
export async function getPost(
  locale: string,
  slug: string,
): Promise<Post | null> {
  const raw = await readRaw(locale, slug);
  if (!raw) return null;
  if (raw.data.status === "draft") return null;
  const meta = toMeta(slug, raw.data);
  return { ...meta, body: raw.content };
}
