import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { exams } from "@/lib/questions";

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://it-passport.app"
).replace(/\/$/, "");

const PUBLIC_CATEGORIES = ["strategy", "management", "technology"] as const;

/** Build the localized URL for a given path under a given locale, honoring
 *  next-intl's "as-needed" prefixing (no prefix for the default `ja`). */
function localizedUrl(path: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  // Landing → bare prefix (`/` for ja, `/zh` for zh, `/en` for en).
  if (path === "" || path === "/") {
    return `${BASE_URL}${prefix || "/"}`;
  }
  return `${BASE_URL}${prefix}${path}`;
}

/** Build the `alternates.languages` map for a given path so each entry
 *  enumerates ja/zh/en variants. */
function alternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of routing.locales) {
    out[locale] = localizedUrl(path, locale);
  }
  return out;
}

function entries(
  path: string,
  lastModified: Date,
): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: localizedUrl(path, locale),
    lastModified,
    alternates: { languages: alternates(path) },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Public/SEO surfaces only. Auth-gated routes (/home, /exam, /review,
  // /stats, /library, /account, /settings) are deliberately excluded —
  // listing them in the sitemap caused Google to follow them and hit a
  // 307 redirect to /login, which inflated "Page with redirect" errors
  // in Search Console and wasted crawl budget. They're also covered in
  // robots.ts disallow.
  const staticPaths = ["/", "/pricing", "/exams", "/blog"];

  const out: MetadataRoute.Sitemap = [];
  for (const p of staticPaths) {
    out.push(...entries(p, now));
  }

  // Per-exam programmatic landing pages (28 codes × 3 locales).
  for (const e of exams) {
    out.push(...entries(`/exams/${e.exam_code}`, now));
  }

  // Category programmatic landing pages (3 categories × 3 locales).
  for (const cat of PUBLIC_CATEGORIES) {
    out.push(...entries(`/category/${cat}`, now));
  }

  // Blog posts. Each locale may have its own slug set; emit only the slugs
  // that actually exist for that locale. A missing/empty content dir is
  // tolerated so deploys don't break before the blog has any content.
  for (const locale of routing.locales) {
    let posts: Awaited<ReturnType<typeof getAllPosts>>;
    try {
      posts = await getAllPosts(locale);
    } catch {
      posts = [];
    }
    for (const post of posts) {
      out.push({
        url: localizedUrl(`/blog/${post.slug}`, locale),
        lastModified: now,
      });
    }
  }

  return out;
}
