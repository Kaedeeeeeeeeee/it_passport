import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  return (
    <div className="card w-full max-w-md">
      <Link
        href="/"
        className="t-label text-ink-3 no-underline hover:text-accent"
      >
        ← IT Passport 練習ノート
      </Link>
      <h1 className="t-serif text-2xl font-semibold mt-3 mb-1 text-accent-ink">
        ログイン
      </h1>
      <p className="text-[13px] text-ink-2 mb-5">
        メールでマジックリンクを受け取るか、Google で続行します。
      </p>
      {error ? (
        <p className="text-[12px] text-wrong mb-4 border border-wrong/30 bg-wrong/5 rounded-sm px-3 py-2">
          {decodeURIComponent(error)}
        </p>
      ) : null}
      <LoginForm nextPath={next ?? "/home"} />
      <p className="mt-6 text-[11px] text-ink-3 leading-relaxed">
        ログインすると、進捗が端末間で同期され、Pro 機能（AI 解説・模擬試験・復習・統計）が利用できるようになります。
      </p>
    </div>
  );
}
