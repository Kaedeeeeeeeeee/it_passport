import { Topbar } from "@/components/Topbar";
import { CategoryBreakdown } from "@/components/stats/CategoryBreakdown";
import { DailyTrend } from "@/components/stats/DailyTrend";
import { ExamMatrix } from "@/components/stats/ExamMatrix";
import { Overview } from "@/components/stats/Overview";
import { requirePro } from "@/lib/auth";
import {
  getByCategory,
  getByExam,
  getOverview,
  getRecentDaily,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const profile = await requirePro("/stats");

  const [overview, daily, byCat, byExam] = await Promise.all([
    getOverview(profile.id),
    getRecentDaily(profile.id, 30),
    getByCategory(profile.id),
    getByExam(profile.id),
  ]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle="学習の軌跡" title="統計" />
      <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-6">
        <Overview stats={overview} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CategoryBreakdown rows={byCat} />
          <DailyTrend days={daily} />
        </div>
        <ExamMatrix rows={byExam} />
      </div>
    </div>
  );
}
