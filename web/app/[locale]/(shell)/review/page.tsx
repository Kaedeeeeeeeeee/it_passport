import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/Topbar";
import { Link } from "@/i18n/navigation";
import { requirePro } from "@/lib/auth";
import { REVIEW_STRATEGIES, getAllCandidateCounts } from "@/lib/review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const profile = await requirePro("/review");
  const counts = await getAllCandidateCounts(profile.id);
  const t = await getTranslations("review");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle={t("subtitle")} title={t("title")} />
      <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-4">
        {REVIEW_STRATEGIES.map((key) => {
          const n = counts[key];
          const disabled = n === 0;
          return (
            <div key={key} className="card">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="t-label">{t(`strategy.${key}.subtitle`)}</div>
                  <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                    {t(`strategy.${key}.title`)}
                  </div>
                  <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">
                    {t(`strategy.${key}.hint`)}
                  </p>
                  <div className="mt-3 t-mono text-[12px] text-ink-3">
                    {t("candidates", { n })}
                  </div>
                </div>
                {disabled ? (
                  <button
                    type="button"
                    disabled
                    className="btn btn-primary opacity-40 cursor-not-allowed"
                  >
                    {t("noCandidates")}
                  </button>
                ) : (
                  <Link
                    href={`/review/${key}`}
                    className="btn btn-primary no-underline"
                  >
                    {t("startButton")}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
