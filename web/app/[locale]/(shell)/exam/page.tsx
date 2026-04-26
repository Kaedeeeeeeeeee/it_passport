import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/Topbar";
import { Link } from "@/i18n/navigation";
import { requirePro } from "@/lib/auth";
import { formatExamTitle } from "@/lib/exam-terms";
import { exams } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exam" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function ExamPage() {
  await requirePro("/exam");
  const t = await getTranslations("exam");
  const examTerms = await getTranslations("examTerms");

  const sorted = exams
    .slice()
    .sort((a, b) => b.year - a.year || b.exam_code.localeCompare(a.exam_code));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle={t("subtitle")} title={t("title")} />
      <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-6">
        <div className="card">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="t-label">{t("randomLabel")}</div>
              <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                {t("randomTitle")}
              </div>
              <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">
                {t("randomBody")}
              </p>
            </div>
            <Link
              href="/exam/start/random"
              className="btn btn-primary no-underline"
            >
              {t("startButton")}
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-3.5 mb-3.5">
            <div className="w-[3px] h-4 bg-accent" />
            <h2 className="t-serif m-0 text-[17px] font-semibold -tracking-[0.3px]">
              {t("pastTitle")}
            </h2>
            <span className="text-[11px] text-ink-3 tracking-[0.08em]">
              {t("pastCount", { count: sorted.length })}
            </span>
          </div>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {sorted.map((e) => (
              <Link
                key={e.exam_code}
                href={`/exam/start/${e.exam_code}`}
                className="card hover:bg-surface-2 transition-colors no-underline text-ink block"
                style={{ padding: 16 }}
              >
                <div className="flex justify-between items-baseline mb-1.5">
                  <div className="font-semibold text-[13.5px]">
                    {formatExamTitle(e.exam_code, examTerms)}
                  </div>
                  <span className="t-mono text-[11px] text-ink-3">
                    {e.year}
                  </span>
                </div>
                <div className="text-[11px] text-ink-3">{t("examMeta")}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
