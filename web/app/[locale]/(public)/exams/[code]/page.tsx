import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import {
  categoryLabel,
  formatExamTitle,
  seasonLabel,
} from "@/lib/exam-terms";
import { exams, questionsForExam } from "@/lib/questions";
import {
  breadcrumbSchema,
  buildAlternates,
  buildOpenGraph,
  homeBreadcrumb,
  localizedUrl,
} from "@/lib/seo";

const TEASER_LIMIT = 80;

export function generateStaticParams() {
  return exams.map((e) => ({ code: e.exam_code }));
}

type Params = Promise<{ locale: string; code: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const e = exams.find((x) => x.exam_code === code);
  if (!e) return {};
  const t = await getTranslations({ locale, namespace: "publicExam" });
  const examTerms = await getTranslations({ locale, namespace: "examTerms" });
  const common = await getTranslations({ locale, namespace: "common" });
  const title = t("examTitle", { title: formatExamTitle(code, examTerms) });
  const description = t("examSubtitle", {
    season: seasonLabel(e.season, examTerms),
  });
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
    alternates: buildAlternates(`/exams/${code}`, locale),
  };
}

/** Truncate to ~TEASER_LIMIT characters at a sensible break, with ellipsis.
 *  Strips markdown noise (newlines/tables) so the teaser stays readable. */
function teaser(question: string): string {
  const flat = question.replace(/\s+/g, " ").trim();
  if (flat.length <= TEASER_LIMIT) return flat;
  return flat.slice(0, TEASER_LIMIT).trim() + "…";
}

export default async function PublicExamPage({ params }: { params: Params }) {
  const { locale, code } = await params;
  const e = exams.find((x) => x.exam_code === code);
  if (!e) notFound();

  const t = await getTranslations("publicExam");
  const examTerms = await getTranslations("examTerms");
  const common = await getTranslations({ locale, namespace: "common" });
  const title = formatExamTitle(code, examTerms);
  const seasonText = seasonLabel(e.season, examTerms);
  const questions = questionsForExam(code).sort((a, b) => a.number - b.number);
  const examUrl = localizedUrl(`/exams/${code}`, locale);

  const quizSchema = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: t("examTitle", { title }),
    about:
      "IT Passport (iパス) — Information-Technology Engineers Examination, administered by IPA Japan.",
    url: examUrl,
    inLanguage: ["ja", "zh", "en"],
    educationalLevel: "Beginner",
    learningResourceType: "Practice Exam",
    educationalUse: ["self-assessment", "exam preparation"],
    numberOfQuestions: 100,
    datePublished: `${e.year}-01-01`,
    provider: {
      "@type": "Organization",
      name: "Information-technology Promotion Agency, Japan (IPA)",
      url: "https://www.ipa.go.jp/",
    },
    publisher: {
      "@type": "Organization",
      name: common("appName"),
      url: localizedUrl("/", locale),
    },
  };

  const breadcrumb = breadcrumbSchema(
    [
      homeBreadcrumb(locale),
      { name: t("indexTitle"), path: "/exams" },
      { name: t("examTitle", { title }), path: `/exams/${code}` },
    ],
    locale,
  );

  return (
    <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-12 sm:py-16">
      <JsonLd data={quizSchema} />
      <JsonLd data={breadcrumb} />

      <header className="mb-9">
        <Link
          href="/exams"
          className="text-[12.5px] text-ink-3 hover:text-ink-2 no-underline"
        >
          ← {t("indexTitle")}
        </Link>
        <h1 className="t-serif text-[28px] sm:text-[32px] font-semibold -tracking-[0.5px] mt-3 mb-2">
          {t("examTitle", { title })}
        </h1>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-ink-2">
          <span className="t-label">{seasonText}</span>
          <span className="t-mono text-[11.5px] text-ink-3">{e.year}</span>
          <span className="t-mono text-[11.5px] text-ink-3">·</span>
          <span className="t-mono text-[11.5px] text-ink-3">{code}</span>
        </div>
      </header>

      <ul className="space-y-2">
        {questions.map((q) => (
          <li
            key={q.id}
            className="rounded-[var(--radius)] border border-line bg-surface px-4 py-3 flex items-start gap-3.5"
          >
            <span className="t-mono text-[11.5px] text-ink-3 shrink-0 w-12 pt-0.5">
              {t("questionTeaser", { n: q.number })}
            </span>
            <span className="flex-1 text-[13.5px] leading-[1.7] text-ink-2">
              {teaser(q.question)}
            </span>
            {q.category ? (
              <span className="t-label shrink-0 hidden sm:block">
                {categoryLabel(q.category, examTerms)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-10 flex justify-center">
        <Link
          href={`/login?next=/practice/exam-${code}`}
          className="btn btn-primary no-underline whitespace-nowrap"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </div>
  );
}
