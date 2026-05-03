import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.join(process.cwd(), "content/blog");

export type FaqItem = { q: string; a: string };

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO 'YYYY-MM-DD' from frontmatter. */
  date: string;
  tags: string[];
  cover: string | null;
  /** Optional Q&A list. When present, the post page emits a
   *  FAQPage JSON-LD block so Google can render rich results. */
  faq: FaqItem[];
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
  faq?: FaqItem[];
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
  const faq = Array.isArray(fm.faq)
    ? fm.faq
        .filter(
          (item): item is FaqItem =>
            !!item &&
            typeof item.q === "string" &&
            typeof item.a === "string" &&
            item.q.trim() !== "" &&
            item.a.trim() !== "",
        )
        .map((item) => ({ q: item.q.trim(), a: item.a.trim() }))
    : [];
  return {
    slug,
    title: fm.title ?? slug,
    description: fm.description ?? "",
    date: fm.date ?? "1970-01-01",
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    cover: fm.cover ?? null,
    faq,
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

/** Return the locales for which a post with this slug exists (and isn't
 *  a draft). Used by per-post `generateMetadata` so hreflang only points
 *  to URLs that resolve — emitting hreflang to a missing locale causes
 *  Google to crawl a 404. */
export async function availableLocalesFor(
  slug: string,
  locales: readonly string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const l of locales) {
    const raw = await readRaw(l, slug);
    if (raw && raw.data.status !== "draft") out.push(l);
  }
  return out;
}

/** Pick up to `n` posts most relevant to `slug` in the same locale.
 *  Ranking: tag-overlap count first, then date desc.
 *  When no other post shares any tag (or the current post has none), fall
 *  back to the newest-N excluding the current post. Returns an empty array
 *  if the locale has fewer than n+1 posts (so the caller can hide the
 *  whole "related" section gracefully). */
export async function getRelatedPosts(
  slug: string,
  locale: string,
  n = 3,
): Promise<PostMeta[]> {
  const all = await getAllPosts(locale);
  const others = all.filter((p) => p.slug !== slug);
  if (others.length < n) return [];
  const current = all.find((p) => p.slug === slug);
  const currentTags = new Set(current?.tags ?? []);
  const scored = others.map((p) => {
    let overlap = 0;
    for (const t of p.tags) if (currentTags.has(t)) overlap++;
    return { post: p, overlap };
  });
  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return a.post.date < b.post.date ? 1 : a.post.date > b.post.date ? -1 : 0;
  });
  // If no overlap anywhere, this is the newest-N (already sorted by date
  // through getAllPosts → others). Either way, slice top N.
  return scored.slice(0, n).map((s) => s.post);
}
