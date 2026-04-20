import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { requirePro } from "@/lib/auth";
import { exams } from "@/lib/questions";

export const dynamic = "force-dynamic";

function formatExamTitle(examCode: string): string {
  const m = /^(\d{4})(r|h)(\d+)([a-z]*)$/.exec(examCode);
  if (!m) return examCode;
  const [, , eraLetter, eraYear, suffix] = m;
  const era = eraLetter === "r" ? "令和" : "平成";
  const suffixMap: Record<string, string> = {
    "": "",
    a: "秋期",
    h: "春期",
    o: "10月",
    tokubetsu: "特別",
  };
  return `${era}${eraYear}年度${suffixMap[suffix] ?? ""}`;
}

export default async function ExamPage() {
  await requirePro("/exam");
  const sorted = exams
    .slice()
    .sort((a, b) => b.year - a.year || b.exam_code.localeCompare(a.exam_code));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        subtitle="本番と同じ 100 問 · 100 分 · 60% で合格"
        title="模擬試験"
      />
      <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-6">
        <div className="card">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="t-label">ランダム</div>
              <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                ランダム 100 問
              </div>
              <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">
                全 2,800 問から 100 問ランダムに出題。分野の偏りなく実力を測れます。
              </p>
            </div>
            <Link
              href="/exam/start/random"
              className="btn btn-primary no-underline"
            >
              始める
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-3.5 mb-3.5">
            <div className="w-[3px] h-4 bg-accent" />
            <h2 className="t-serif m-0 text-[17px] font-semibold -tracking-[0.3px]">
              過去問モード
            </h2>
            <span className="text-[11px] text-ink-3 tracking-[0.08em]">
              {sorted.length} 回
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
                    {formatExamTitle(e.exam_code)}
                  </div>
                  <span className="t-mono text-[11px] text-ink-3">
                    {e.year}
                  </span>
                </div>
                <div className="text-[11px] text-ink-3">
                  100 問 · 100 分
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
