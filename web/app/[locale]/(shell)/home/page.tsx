import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Topbar } from "@/components/Topbar";
import { ProgressSummary } from "@/components/ProgressSummary";
import { Link } from "@/i18n/navigation";
import { formatExamTitle } from "@/lib/exam-terms";
import { allQuestions, exams } from "@/lib/questions";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const date = new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale as Locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());
  return { title: t("title"), description: t("subtitle", { date }) };
}

const LOCALE_DATE_TAG: Record<Locale, string> = {
  ja: "ja-JP",
  zh: "zh-CN",
  en: "en-US",
};

function formatToday(locale: Locale) {
  const d = new Date();
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

export default async function DashboardPage() {
  const t = await getTranslations("home");
  const library = await getTranslations("library");
  const examTerms = await getTranslations("examTerms");
  const locale = (await getLocale()) as Locale;

  const latestExam = exams
    .slice()
    .sort(
      (a, b) => b.year - a.year || b.exam_code.localeCompare(a.exam_code),
    )[0];

  const figureCount = allQuestions.filter((q) => q.figures.length > 0).length;
  const totalQuestions = allQuestions.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        subtitle={t("subtitle", { date: formatToday(locale) })}
        title={t("title")}
        right={
          <Link href="/library" className="btn btn-primary no-underline">
            {t("browseLibrary")}
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-6">
        <ProgressSummary />

        <div className="card">
          <div className="flex justify-between items-center mb-3.5 gap-4">
            <div>
              <div className="t-label">{t("quickStartLabel")}</div>
              <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                {t("quickStartTitle")}
              </div>
            </div>
            <Link
              href="/practice/random?n=10"
              className="btn btn-primary no-underline"
            >
              {t("quickStartCta")}
            </Link>
          </div>
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            {t("quickStartBody", { total: totalQuestions.toLocaleString() })}
          </p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3.5 gap-4">
            <div>
              <div className="t-label">{t("latestExamLabel")}</div>
              <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                {formatExamTitle(latestExam.exam_code, examTerms)}
              </div>
            </div>
            <Link href="/library" className="btn no-underline">
              {library("openButton").replace(" →", "")}
            </Link>
          </div>
          <div className="text-[12.5px] text-ink-2">
            {t("latestExamMeta", { count: figureCount })}
          </div>
        </div>
      </div>
    </div>
  );
}
