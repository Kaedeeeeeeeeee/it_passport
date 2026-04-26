import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { PRACTICE_CATEGORIES } from "@/lib/categories";
import { categoryLabel } from "@/lib/exam-terms";
import { questionsByCategory } from "@/lib/questions";
import {
  breadcrumbSchema,
  buildAlternates,
  buildOpenGraph,
  homeBreadcrumb,
  localizedUrl,
} from "@/lib/seo";
import type { Category } from "@/lib/types";

const PREVIEW_SIZE = 20;
const TEASER_LIMIT = 80;

export function generateStaticParams() {
  return PRACTICE_CATEGORIES.map((name) => ({ name }));
}

function isPublicCategory(name: string): name is Category {
  return (PRACTICE_CATEGORIES as readonly string[]).includes(name);
}

type Params = Promise<{ locale: string; name: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, name } = await params;
  if (!isPublicCategory(name)) return {};
  const t = await getTranslations({ locale, namespace: "publicCategory" });
  const examTerms = await getTranslations({ locale, namespace: "examTerms" });
  const common = await getTranslations({ locale, namespace: "common" });
  const label = categoryLabel(name, examTerms);
  const total = questionsByCategory(name).length;
  const title = t("title", { label });
  const description = t("subtitle", { count: total });
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
    alternates: buildAlternates(`/category/${name}`, locale),
  };
}

function teaser(question: string): string {
  const flat = question.replace(/\s+/g, " ").trim();
  if (flat.length <= TEASER_LIMIT) return flat;
  return flat.slice(0, TEASER_LIMIT).trim() + "…";
}

export default async function PublicCategoryPage({
  params,
}: {
  params: Params;
}) {
  const { locale, name } = await params;
  if (!isPublicCategory(name)) notFound();

  const t = await getTranslations("publicCategory");
  const examTerms = await getTranslations("examTerms");
  const publicExam = await getTranslations({ locale, namespace: "publicExam" });
  const label = categoryLabel(name, examTerms);
  const all = questionsByCategory(name);
  const total = all.length;

  // Deterministic preview: sort by exam_code DESC then question number ASC
  // and take the first N. Avoids randomness so the page is cacheable and the
  // same set is shown to every crawler request.
  const preview = all
    .slice()
    .sort(
      (a, b) =>
        b.exam_code.localeCompare(a.exam_code) || a.number - b.number,
    )
    .slice(0, PREVIEW_SIZE);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("title", { label }),
    description: t("subtitle", { count: total }),
    url: localizedUrl(`/category/${name}`, locale),
    inLanguage: ["ja", "zh", "en"],
    isPartOf: {
      "@type": "WebSite",
      name: "IT Passport Practice",
      url: localizedUrl("/", locale),
    },
  };

  const breadcrumb = breadcrumbSchema(
    [
      homeBreadcrumb(locale),
      { name: publicExam("indexTitle"), path: "/exams" },
      { name: t("title", { label }), path: `/category/${name}` },
    ],
    locale,
  );

  return (
    <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-12 sm:py-16">
      <JsonLd data={collectionSchema} />
      <JsonLd data={breadcrumb} />

      <header className="mb-9">
        <Link
          href="/exams"
          className="text-[12.5px] text-ink-3 hover:text-ink-2 no-underline"
        >
          ← {label}
        </Link>
        <h1 className="t-serif text-[28px] sm:text-[32px] font-semibold -tracking-[0.5px] mt-3 mb-2">
          {t("title", { label })}
        </h1>
        <p className="text-[13.5px] text-ink-2 leading-relaxed">
          {t("subtitle", { count: total })}
        </p>
      </header>

      <ul className="space-y-2">
        {preview.map((q) => (
          <li
            key={q.id}
            className="rounded-[var(--radius)] border border-line bg-surface px-4 py-3 flex items-start gap-3.5"
          >
            <span className="t-mono text-[11.5px] text-ink-3 shrink-0 w-24 pt-0.5">
              {q.exam_code} #{q.number}
            </span>
            <span className="flex-1 text-[13.5px] leading-[1.7] text-ink-2">
              {teaser(q.question)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex justify-center">
        <Link
          href={`/login?next=/practice/category-${name}?n=20`}
          className="btn btn-primary no-underline whitespace-nowrap"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </div>
  );
}
