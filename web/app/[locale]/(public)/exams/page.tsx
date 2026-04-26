import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  eraLabel,
  eraOf,
  formatExamTitle,
  seasonLabel,
} from "@/lib/exam-terms";
import { exams } from "@/lib/questions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicExam" });
  return {
    title: t("indexTitle"),
    description: t("indexSubtitle"),
  };
}

export default async function PublicExamsIndex() {
  const t = await getTranslations("publicExam");
  const examTerms = await getTranslations("examTerms");

  // Sort newest first inside each era for a familiar reading order.
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

      <div className="space-y-10">
        {(["reiwa", "heisei"] as const).map((era) =>
          grouped[era].length ? (
            <section key={era}>
              <div className="flex items-baseline gap-3.5 mb-4">
                <div className="w-[3px] h-4 bg-accent" />
                <h2 className="t-serif m-0 text-[18px] font-semibold -tracking-[0.3px]">
                  {eraLabel(era, examTerms)}
                </h2>
                <span className="text-[11px] text-ink-3 tracking-[0.08em]">
                  {grouped[era].length} · {grouped[era].length * 100}
                </span>
              </div>
              <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                {grouped[era].map((e) => (
                  <li key={e.exam_code}>
                    <Link
                      href={`/exams/${e.exam_code}`}
                      className="card hover:bg-surface-2 transition-colors no-underline text-ink block"
                      style={{ padding: 16 }}
                    >
                      <div className="flex justify-between items-baseline mb-1.5">
                        <div className="font-semibold text-[14px]">
                          {formatExamTitle(e.exam_code, examTerms)}
                        </div>
                        <span className="text-[11px] text-ink-3 t-mono">
                          {e.year}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-ink-3">
                        {seasonLabel(e.season, examTerms)} · 100
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-3">
                        <span className="t-mono">{e.exam_code}</span>
                        <span>→</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}
