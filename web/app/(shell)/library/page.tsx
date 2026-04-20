import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { exams } from "@/lib/questions";

function seasonLabel(season: string): string {
  const m: Record<string, string> = {
    annual: "通年",
    spring: "春期",
    autumn: "秋期",
    october: "10月",
    special: "特別",
  };
  return m[season] ?? season;
}

function eraGroup(examCode: string): "reiwa" | "heisei" {
  return examCode.includes("r") && !/h\d/.test(examCode) ? "reiwa" : "heisei";
}

function eraTitle(era: "reiwa" | "heisei"): string {
  return era === "reiwa" ? "令和" : "平成";
}

export default function LibraryPage() {
  const sorted = exams
    .slice()
    .sort((a, b) => b.year - a.year || b.exam_code.localeCompare(a.exam_code));

  const grouped = sorted.reduce<Record<"reiwa" | "heisei", typeof sorted>>(
    (acc, e) => {
      acc[eraGroup(e.exam_code)].push(e);
      return acc;
    },
    { reiwa: [], heisei: [] },
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle="公式過去問 28 回分" title="問題集" />

      <div className="flex-1 overflow-auto p-5 sm:p-8 space-y-9">
        {(["reiwa", "heisei"] as const).map((era) => (
          <section key={era}>
            <div className="flex items-baseline gap-3.5 mb-3.5">
              <div className="w-[3px] h-4 bg-accent" />
              <h2 className="t-serif m-0 text-[17px] font-semibold -tracking-[0.3px]">
                {eraTitle(era)}
              </h2>
              <span className="text-[11px] text-ink-3 tracking-[0.08em]">
                {grouped[era].length} 回 · {grouped[era].length * 100} 問
              </span>
            </div>

            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {grouped[era].map((e) => {
                const m = /^(\d{4})(r|h)(\d+)([a-z]*)$/.exec(e.exam_code);
                const eraYear = m?.[3] ?? "";
                const suffix = m?.[4] ?? "";
                const title = `${eraTitle(era)}${eraYear}年度${
                  { "": "", a: "秋期", h: "春期", o: "10月", tokubetsu: "特別" }[suffix] ?? ""
                }`;
                return (
                  <Link
                    key={e.exam_code}
                    id={e.exam_code}
                    href={`/practice/exam-${e.exam_code}?n=100`}
                    className="card hover:bg-surface-2 transition-colors no-underline text-ink block"
                    style={{ padding: 18 }}
                  >
                    <div className="flex justify-between items-baseline mb-2">
                      <div className="font-semibold text-[14px]">{title}</div>
                      <span className="text-[11px] text-ink-3 t-mono">
                        {e.year}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-ink-3">
                      {seasonLabel(e.season)} · 100 問
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-ink-3">
                      <span>{e.exam_code}</span>
                      <span>開く →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
