import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { getProfile, isPro } from "@/lib/auth";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, string> = {
  free: "無料プラン",
  trialing: "無料トライアル中",
  active: "Pro メンバー",
  past_due: "支払い失敗（要更新）",
  canceled: "解約済み",
};

export default async function AccountPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/account");

  const pro = isPro(profile.subscription_status);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle="アカウント" title="メンバーシップ" />

      <div className="flex-1 overflow-auto p-5 sm:p-8 space-y-5 max-w-[720px] w-full mx-auto">
        <div className="card">
          <div className="t-label mb-2">アカウント</div>
          <div className="t-serif text-lg font-semibold">{profile.email}</div>
          <div className="text-[11px] text-ink-3 mt-1 t-mono">{profile.id}</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <div className="t-label">プラン</div>
              <div className="t-serif text-lg font-semibold mt-1">
                {STATUS_LABEL[profile.subscription_status] ?? profile.subscription_status}
              </div>
            </div>
            {pro ? (
              <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px">
                PRO
              </span>
            ) : null}
          </div>
          {profile.current_period_end ? (
            <div className="text-[12px] text-ink-2">
              次回更新: <span className="t-mono">{fmtDate(profile.current_period_end)}</span>
            </div>
          ) : null}
          {profile.trial_ends_at ? (
            <div className="text-[12px] text-ink-2 mt-1">
              トライアル終了: <span className="t-mono">{fmtDate(profile.trial_ends_at)}</span>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            {pro ? (
              <form action="/api/portal" method="post">
                <button type="submit" className="btn">
                  支払い管理
                </button>
              </form>
            ) : (
              <Link href="/pricing" className="btn btn-primary no-underline">
                Pro に加入する
              </Link>
            )}
          </div>
        </div>

        <div className="card">
          <div className="t-label mb-2">ログアウト</div>
          <p className="text-[12.5px] text-ink-2 mb-3">
            サインアウトすると、このブラウザではログイン状態が解除されます。進捗は再度ログインすれば戻ります。
          </p>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn">
              サインアウト
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
