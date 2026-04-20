import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { requirePro } from "@/lib/auth";
import {
  REVIEW_META,
  REVIEW_STRATEGIES,
  getAllCandidateCounts,
} from "@/lib/review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const profile = await requirePro("/review");
  const counts = await getAllCandidateCounts(profile.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        subtitle="間違えた問題を集中的に"
        title="復習"
      />
      <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-4">
        {REVIEW_STRATEGIES.map((key) => {
          const meta = REVIEW_META[key];
          const n = counts[key];
          const disabled = n === 0;
          return (
            <div key={key} className="card">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="t-label">{meta.subtitle}</div>
                  <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                    {meta.title}
                  </div>
                  <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">
                    {meta.hint}
                  </p>
                  <div className="mt-3 t-mono text-[12px] text-ink-3">
                    候補 {n} 問
                  </div>
                </div>
                {disabled ? (
                  <button
                    type="button"
                    disabled
                    className="btn btn-primary opacity-40 cursor-not-allowed"
                  >
                    候補なし
                  </button>
                ) : (
                  <Link
                    href={`/review/${key}`}
                    className="btn btn-primary no-underline"
                  >
                    始める
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
