import Link from "next/link";
import { redirect } from "next/navigation";
import { allQuestions, exams } from "@/lib/questions";
import { getProfile } from "@/lib/auth";

export default async function LandingPage() {
  const profile = await getProfile();
  if (profile) redirect("/home");

  const totalQuestions = allQuestions.length;
  const totalExams = exams.length;

  return (
    <div className="flex-1 flex flex-col bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-[3px] h-5 bg-accent" />
            <span className="t-serif text-[15px] font-semibold -tracking-[0.2px]">
              IT Passport 練習ノート
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="btn btn-ghost !text-[13px] no-underline"
            >
              ログイン
            </Link>
            <Link
              href="/login"
              className="btn btn-primary !text-[13px] no-underline"
            >
              はじめる
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-[1040px] mx-auto px-6 sm:px-9 py-16 sm:py-24">
          <div className="max-w-[640px]">
            <div className="t-label mb-4">ITパスポート試験 · iパス対策</div>
            <h1 className="t-serif text-[32px] sm:text-[44px] font-semibold leading-[1.25] -tracking-[0.6px] mb-5">
              公式過去問 {totalExams} 回分・{totalQuestions.toLocaleString()}{" "}
              問を、<br className="hidden sm:block" />
              AI 解説つきで。
            </h1>
            <p className="text-[15px] sm:text-[16px] text-ink-2 leading-[1.85] mb-8">
              分野別の 20 問ドリルから本番同形式の模擬試験まで。間違えた問題は
              AI が即座に解説し、復習リストに自動で積み上がります。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="btn btn-primary no-underline"
              >
                無料で始める →
              </Link>
              <Link
                href="/login"
                className="btn btn-ghost no-underline"
              >
                既にアカウントをお持ちの方
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-[1040px] mx-auto px-6 sm:px-9 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              label="Library"
              title="全 2,800 問 · 分野別ドリル"
              body="ストラテジ・マネジメント・テクノロジの 3 分野から 20 問ランダム抽出。スキマ時間で弱点だけを集中的に。"
            />
            <FeatureCard
              label="AI Explanation"
              title="AI が即座に解説"
              body="正解選択肢の根拠と不正解選択肢の間違いを 1 問ごとに日本語で解説。テキストを開く手間なし。"
            />
            <FeatureCard
              label="Mock Exam"
              title="本番同形式の模擬試験"
              body="100 問 · 100 分 · 60% 合格の本番そっくりな模擬試験。分野別の得点も自動集計。"
            />
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="t-serif text-[22px] font-semibold -tracking-[0.3px] mb-2">
                まずは無料で始めよう
              </div>
              <p className="text-[13.5px] text-ink-2 leading-relaxed">
                メールアドレスまたは Google
                アカウントでサインイン。進捗は端末間で自動同期されます。
              </p>
            </div>
            <Link
              href="/login"
              className="btn btn-primary no-underline whitespace-nowrap"
            >
              ログインして始める →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-[1040px] mx-auto px-6 sm:px-9 py-6 flex items-center justify-between text-[11.5px] text-ink-3">
          <span>© IT Passport 練習ノート</span>
          <span className="t-mono">iパス対策 · AI 解説つき</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card">
      <div className="t-label mb-2.5">{label}</div>
      <div className="t-serif text-[16.5px] font-semibold -tracking-[0.2px] mb-2">
        {title}
      </div>
      <p className="text-[12.5px] text-ink-2 leading-[1.8]">{body}</p>
    </div>
  );
}
