import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SampleQuestionCard } from "@/components/landing/SampleQuestionCard";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link, redirect } from "@/i18n/navigation";
import { getProfile } from "@/lib/auth";
import { categoryLabel } from "@/lib/exam-terms";
import { allQuestions, questionById, exams } from "@/lib/questions";
import type { Question } from "@/lib/types";

/** Hand-picked sample questions for the public landing page. Five short
 *  vertical-choice items with no figures, taken across recent exams and
 *  categories so visitors get a feel for the breadth before signing in. */
const SAMPLE_QUESTION_IDS = [
  "2024r06-1",
  "2024r06-40",
  "2024r06-56",
  "2023r05-49",
  "2022r04-5",
] as const;

function loadSampleQuestions(): Question[] {
  return SAMPLE_QUESTION_IDS.map((id) => {
    const q = questionById.get(id);
    if (!q) throw new Error(`Sample question not found: ${id}`);
    return q;
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const common = await getTranslations({ locale, namespace: "common" });
  const t = await getTranslations({ locale, namespace: "landing" });
  return { title: common("appName"), description: t("heroBody") };
}

export default async function LandingPage() {
  const profile = await getProfile();
  const locale = await getLocale();
  if (profile) redirect({ href: "/home", locale });

  const t = await getTranslations("landing");
  const common = await getTranslations("common");
  const sampleT = await getTranslations("publicSample");
  const blogT = await getTranslations("blog");
  const legalNav = await getTranslations("legalNav");
  const examTerms = await getTranslations("examTerms");
  const totalQuestions = allQuestions.length;
  const totalExams = exams.length;
  const sampleQuestions = loadSampleQuestions();

  return (
    <div className="flex-1 flex flex-col bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-[3px] h-5 bg-accent" />
            <span className="t-serif text-[15px] font-semibold -tracking-[0.2px]">
              {common("appName")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher variant="header" />
            <Link
              href="/login"
              className="btn btn-ghost !text-[13px] no-underline"
            >
              {t("navLogin")}
            </Link>
            <Link
              href="/login"
              className="btn btn-primary !text-[13px] no-underline"
            >
              {t("navStart")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-[1040px] mx-auto px-6 sm:px-9 py-16 sm:py-24">
          <div className="max-w-[640px]">
            <div className="t-label mb-4">{t("eyebrow")}</div>
            <h1 className="t-serif text-[32px] sm:text-[44px] font-semibold leading-[1.25] -tracking-[0.6px] mb-5">
              {t("heroTitle", {
                exams: totalExams,
                questions: totalQuestions.toLocaleString(),
              })}
            </h1>
            <p className="text-[15px] sm:text-[16px] text-ink-2 leading-[1.85] mb-8">
              {t("heroBody")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary no-underline">
                {t("ctaPrimary")}
              </Link>
              <Link href="/login" className="btn btn-ghost no-underline">
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="public-sample-heading"
          className="border-t border-line bg-surface"
        >
          <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-14 sm:py-16">
            <div className="t-label mb-3">{sampleT("sectionLabel")}</div>
            <h2
              id="public-sample-heading"
              className="t-serif text-[24px] sm:text-[28px] font-semibold -tracking-[0.4px] mb-2"
            >
              {sampleT("sectionTitle")}
            </h2>
            <p className="text-[14px] text-ink-2 leading-relaxed mb-6 sm:mb-8 max-w-[640px]">
              {sampleT("sectionBody")}
            </p>

            <ol className="space-y-4">
              {sampleQuestions.map((q, i) => {
                const categoryText =
                  q.category && q.category !== "integrated"
                    ? categoryLabel(q.category, examTerms)
                    : "";
                return (
                  <SampleQuestionCard
                    key={q.id}
                    q={q}
                    index={i}
                    categoryText={categoryText}
                  />
                );
              })}
            </ol>

            <div className="mt-8 flex justify-center">
              <Link
                href="/login"
                className="btn btn-primary no-underline whitespace-nowrap"
              >
                {sampleT("ctaButton")}
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-[1040px] mx-auto px-6 sm:px-9 py-16 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              label={t("featureLibraryLabel")}
              title={t("featureLibraryTitle", {
                total: totalQuestions.toLocaleString(),
              })}
              body={t("featureLibraryBody")}
            />
            <FeatureCard
              label={t("featureAiLabel")}
              title={t("featureAiTitle")}
              body={t("featureAiBody")}
            />
            <FeatureCard
              label={t("featureExamLabel")}
              title={t("featureExamTitle")}
              body={t("featureExamBody")}
            />
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="t-serif text-[22px] font-semibold -tracking-[0.3px] mb-2">
                {t("bottomCtaTitle")}
              </div>
              <p className="text-[13.5px] text-ink-2 leading-relaxed">
                {t("bottomCtaBody")}
              </p>
            </div>
            <Link
              href="/login"
              className="btn btn-primary no-underline whitespace-nowrap"
            >
              {t("bottomCtaButton")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11.5px] text-ink-3">
          <span>© {common("appName")}</span>
          <nav className="flex items-center gap-4 flex-wrap">
            <Link href="/blog" className="hover:text-accent no-underline">
              {blogT("nav")}
            </Link>
            <Link href="/terms" className="hover:text-accent no-underline">
              {legalNav("terms")}
            </Link>
            <Link href="/privacy" className="hover:text-accent no-underline">
              {legalNav("privacy")}
            </Link>
            <Link href="/legal" className="hover:text-accent no-underline">
              {legalNav("tokushou")}
            </Link>
            <span className="t-mono">{common("tagline")}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card">
      <div className="t-label mb-2.5">{label}</div>
      <div className="t-serif text-[16.5px] font-semibold -tracking-[0.2px] mb-2">
        {title}
      </div>
      <p className="text-[12.5px] text-ink-2 leading-[1.8]">{body}</p>
    </div>
  );
}
