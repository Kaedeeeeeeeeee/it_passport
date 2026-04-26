import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { Topbar } from "@/components/Topbar";
import { Link } from "@/i18n/navigation";
import { PRACTICE_CATEGORIES } from "@/lib/categories";
import {
  categoryLabel,
  eraLabel,
  eraOf,
  formatExamTitle,
  seasonLabel,
} from "@/lib/exam-terms";
import { exams, questionsByCategory } from "@/lib/questions";

const CATEGORY_SESSION_SIZE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return {
    title: t("title"),
    description: t("subtitle", { count: exams.length }),
  };
}

export default async function LibraryPage() {
  const t = await getTranslations("library");
  const examTerms = await getTranslations("examTerms");

  const sorted = exams
    .slice()
    .sort((a, b) => b.year - a.year || b.exam_code.localeCompare(a.exam_code));

  const grouped = sorted.reduce<Record<"reiwa" | "heisei", typeof sorted>>(
    (acc, e) => {
      acc[eraOf(e.exam_code)].push(e);
      return acc;
    },
    { reiwa: [], heisei: [] },
  );

  const categorySlot = (
    <section>
      <div className="flex items-baseline gap-3.5 mb-3.5">
        <span className="text-[11px] text-ink-3 tracking-[0.08em]">
          {t("categorySubtitle", { n: CATEGORY_SESSION_SIZE })}
        </span>
      </div>

      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {PRACTICE_CATEGORIES.map((cat) => {
          const total = questionsByCategory(cat).length;
          return (
            <Link
              key={cat}
              href={`/practice/category-${cat}?n=${CATEGORY_SESSION_SIZE}`}
              className="card hover:bg-surface-2 transition-colors no-underline text-ink block"
              style={{ padding: 18 }}
            >
              <div className="flex justify-between items-baseline mb-2">
                <div className="font-semibold text-[14px]">
                  {categoryLabel(cat, examTerms)}
                </div>
                <span className="text-[11px] text-ink-3 t-mono">
                  {t("categoryCount", { n: CATEGORY_SESSION_SIZE })}
                </span>
              </div>
              <div className="text-[11.5px] text-ink-3">
                {t("categoryPool", { total })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-3">
                <span>category-{cat}</span>
                <span>{t("openButton")}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );

  const examSlot = (
    <div className="space-y-9">
      {(["reiwa", "heisei"] as const).map((era) => (
        <section key={era}>
          <div className="flex items-baseline gap-3.5 mb-3.5">
            <div className="w-[3px] h-4 bg-accent" />
            <h2 className="t-serif m-0 text-[17px] font-semibold -tracking-[0.3px]">
              {eraLabel(era, examTerms)}
            </h2>
            <span className="text-[11px] text-ink-3 tracking-[0.08em]">
              {t("eraStats", {
                count: grouped[era].length,
                total: grouped[era].length * 100,
              })}
            </span>
          </div>

          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {grouped[era].map((e) => (
              <Link
                key={e.exam_code}
                id={e.exam_code}
                href={`/practice/exam-${e.exam_code}?n=100`}
                className="card hover:bg-surface-2 transition-colors no-underline text-ink block"
                style={{ padding: 18 }}
              >
                <div className="flex justify-between items-baseline mb-2">
                  <div className="font-semibold text-[14px]">
                    {formatExamTitle(e.exam_code, examTerms)}
                  </div>
                  <span className="text-[11px] text-ink-3 t-mono">
                    {e.year}
                  </span>
                </div>
                <div className="text-[11.5px] text-ink-3">
                  {t("examSeasonCount", {
                    season: seasonLabel(e.season, examTerms),
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-ink-3">
                  <span>{e.exam_code}</span>
                  <span>{t("openButton")}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle={t("subtitle", { count: exams.length })} title={t("title")} />

      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <LibraryTabs categorySlot={categorySlot} examSlot={examSlot} />
      </div>
    </div>
  );
}
