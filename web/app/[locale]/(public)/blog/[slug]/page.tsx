import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { availableLocalesFor, getPost } from "@/lib/blog";
import {
  articleSchema,
  breadcrumbSchema,
  buildAlternates,
  buildOpenGraph,
  homeBreadcrumb,
} from "@/lib/seo";

type Params = Promise<{ locale: string; slug: string }>;

const LOCALE_DATE_TAG: Record<Locale, string> = {
  ja: "ja-JP",
  zh: "zh-CN",
  en: "en-US",
};

function fmtDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    dateStyle: "long",
  }).format(new Date(iso));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);
  if (!post) return {};
  const common = await getTranslations({ locale, namespace: "common" });
  const siteName = common("appName");
  const path = `/blog/${slug}`;
  const available = await availableLocalesFor(slug, routing.locales);
  const og = buildOpenGraph({
    locale,
    title: post.title,
    description: post.description,
    type: "article",
    publishedTime: post.date,
    authors: [siteName],
    tags: post.tags,
    siteName,
  });
  return {
    title: post.title,
    description: post.description,
    openGraph: og.openGraph,
    twitter: og.twitter,
    alternates: buildAlternates(path, locale, available),
  };
}

// Reuses the same styling tokens as web/components/md/Markdown.tsx so blog
// bodies feel visually consistent with practice/result/library pages.
// remark-math/rehype-katex are intentionally excluded — keeps the bundle
// lighter and posts don't currently use math.
const MDX_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 last:mb-0 text-[14.5px] leading-[1.9] text-ink-2">
      {children}
    </p>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="t-serif text-[20px] sm:text-[22px] font-semibold -tracking-[0.3px] mt-10 mb-3 text-ink">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="t-serif text-[16.5px] font-semibold -tracking-[0.2px] mt-7 mb-2 text-ink">
      {children}
    </h3>
  ),
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
    <a
      href={href}
      className="text-accent underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-accent pl-4 my-5 text-ink-2 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto rounded-[var(--radius)] border border-line">
      <table className="w-full border-collapse text-[13.5px] leading-[1.6]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-surface-2 text-ink-2">{children}</thead>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-line last:border-b-0">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-r border-line px-3 py-2 text-left font-semibold last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-r border-line px-3 py-2 align-top last:border-r-0">
      {children}
    </td>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-6 text-[14.5px] leading-[1.9] text-ink-2">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-[14.5px] leading-[1.9] text-ink-2">
      {children}
    </ol>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={"t-mono text-[13px] " + (className ?? "")}>
          {children}
        </code>
      );
    }
    return (
      <code className="t-mono rounded bg-surface-2 px-1 py-0.5 text-[0.92em]">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-4 overflow-x-auto rounded-[var(--radius)] bg-surface-2 p-3">
      {children}
    </pre>
  ),
};

export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: "blog" });
  const common = await getTranslations({ locale, namespace: "common" });
  const siteName = common("appName");

  const article = articleSchema({
    locale,
    slugPath: `/blog/${slug}`,
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    tags: post.tags,
    publisherName: siteName,
  });

  const breadcrumb = breadcrumbSchema(
    [
      homeBreadcrumb(locale),
      { name: t("indexTitle"), path: "/blog" },
      { name: post.title, path: `/blog/${slug}` },
    ],
    locale,
  );

  return (
    <article className="max-w-[720px] mx-auto px-6 sm:px-9 py-12 sm:py-16">
      <JsonLd data={article} />
      <JsonLd data={breadcrumb} />
      <Link
        href="/blog"
        className="text-[12.5px] text-ink-3 hover:text-ink-2 no-underline"
      >
        ← {t("indexTitle")}
      </Link>

      <header className="mt-4 mb-9">
        <h1 className="t-serif text-[28px] sm:text-[34px] font-semibold -tracking-[0.5px] leading-[1.25] mb-4">
          {post.title}
        </h1>
        <div className="t-mono text-[12px] text-ink-3 mb-4">
          {fmtDate(post.date, locale as Locale)}
        </div>
        {post.description ? (
          <p className="text-[14.5px] text-ink-2 leading-[1.85]">
            {post.description}
          </p>
        ) : null}
        {post.tags.length > 0 ? (
          <div className="mt-5">
            <span className="t-label text-[10px] mr-2.5">{t("tagsLabel")}</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10.5px] text-ink-3 border border-line rounded-sm px-1.5 py-px tracking-[0.04em] mr-1.5"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="border-t border-line pt-8">
        <MDXRemote
          source={post.body}
          components={MDX_COMPONENTS}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, remarkBreaks],
            },
          }}
        />
      </div>
    </article>
  );
}
