import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getRelatedPosts } from "@/lib/blog";
import { PostCard } from "./PostCard";

/** Related-posts strip rendered at the end of a blog post, above the CTA.
 *  Picks up to 3 sibling posts in the same locale by tag-overlap.
 *  Renders nothing when the locale has too few posts to recommend
 *  meaningfully — that keeps single-post locales from showing an empty
 *  section header. */
export async function RelatedPosts({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const related = await getRelatedPosts(slug, locale, 3);
  if (related.length === 0) return null;
  const t = await getTranslations("blog");
  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="t-label text-[11px] mb-4">{t("relatedPostsLabel")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((post) => (
          <PostCard key={post.slug} post={post} locale={locale} />
        ))}
      </div>
    </section>
  );
}
