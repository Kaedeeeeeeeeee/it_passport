import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PostCard } from "@/components/blog/PostCard";
import type { Locale } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const common = await getTranslations({ locale, namespace: "common" });
  const title = t("indexTitle");
  const description = t("indexSubtitle");
  const og = buildOpenGraph({
    locale,
    title,
    description,
    type: "website",
    siteName: common("appName"),
  });
  return {
    title,
    description,
    openGraph: og.openGraph,
    twitter: og.twitter,
    alternates: buildAlternates("/blog", locale),
  };
}

export default async function BlogIndex({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = await getAllPosts(locale);

  return (
    <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="t-serif text-[28px] sm:text-[32px] font-semibold -tracking-[0.5px] mb-3">
          {t("indexTitle")}
        </h1>
        <p className="text-[14.5px] text-ink-2 leading-relaxed max-w-[640px]">
          {t("indexSubtitle")}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-[13.5px] text-ink-3">—</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} locale={locale as Locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
