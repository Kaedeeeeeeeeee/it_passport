import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { ProgressSummary } from "@/components/ProgressSummary";
import { allQuestions, exams } from "@/lib/questions";

function formatExamTitle(examCode: string): string {
  const m = /^(\d{4})(r|h)(\d+)([a-z]*)$/.exec(examCode);
  if (!m) return examCode;
  const [, , eraLetter, eraYear, suffix] = m;
  const era = eraLetter === "r" ? "令和" : "平成";
  const seasonMap: Record<string, string> = {
    "": "",
    a: "秋期",
    h: "春期",
    o: "10月",
    tokubetsu: "特別",
  };
  return `${era}${eraYear}年度${seasonMap[suffix] ?? ""}`;
}

function formatToday() {
  const d = new Date();
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}.${mo}.${dd} (${days[d.getDay()]})`;
}

export default function DashboardPage() {
  const latestExam = exams
    .slice()
    .sort((a, b) => b.year - a.year || b.exam_code.localeCompare(a.exam_code))[0];

  const figureCount = allQuestions.filter((q) => q.figures.length > 0).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        subtitle={`${formatToday()} · 今日も、少しずつ。`}
        title="ITパスポート試験 練習"
        right={
          <Link href="/library" className="btn btn-primary no-underline">
            問題集から選ぶ →
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-6">
        <ProgressSummary />

        <div className="card">
          <div className="flex justify-between items-center mb-3.5 gap-4">
            <div>
              <div className="t-label">すぐに始める</div>
              <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                ランダム 10 問
              </div>
            </div>
            <Link
              href="/practice/random?n=10"
              className="btn btn-primary no-underline"
            >
              始める
            </Link>
          </div>
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            全 2,800 問から 10 問ランダムに選んで練習します。答え終わると AI
            解説付きで結果を確認できます。
          </p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3.5 gap-4">
            <div>
              <div className="t-label">最新の過去問</div>
              <div className="t-serif text-lg font-semibold mt-1 -tracking-[0.2px]">
                {formatExamTitle(latestExam.exam_code)}
              </div>
            </div>
            <Link href="/library" className="btn no-underline">
              開く
            </Link>
          </div>
          <div className="text-[12.5px] text-ink-2">
            100 問 · <span className="t-mono">{figureCount}</span>
            問に図表あり
          </div>
        </div>
      </div>
    </div>
  );
}
