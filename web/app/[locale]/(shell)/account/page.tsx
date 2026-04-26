import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getProfile, isPro } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), description: t("subtitle") };
}

const LOCALE_DATE_TAG: Record<Locale, string> = {
  ja: "ja-JP",
  zh: "zh-CN",
  en: "en-US",
};

function fmtDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export default async function AccountPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/account");

  const t = await getTranslations("account");
  const common = await getTranslations("common");
  const locale = (await getLocale()) as Locale;

  const pro = isPro(profile.subscription_status);
  const statusLabel =
    profile.subscription_status &&
    [
      "free",
      "trialing",
      "active",
      "past_due",
      "canceled",
    ].includes(profile.subscription_status)
      ? t(`status.${profile.subscription_status}`)
      : profile.subscription_status;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle={t("subtitle")} title={t("title")} />

      <div className="flex-1 overflow-auto p-5 sm:p-8 space-y-5 max-w-[720px] w-full mx-auto">
        <div className="card">
          <div className="t-label mb-2">{t("accountLabel")}</div>
          <div className="t-serif text-lg font-semibold">{profile.email}</div>
          <div className="text-[11px] text-ink-3 mt-1 t-mono">{profile.id}</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <div className="t-label">{t("planLabel")}</div>
              <div className="t-serif text-lg font-semibold mt-1">
                {statusLabel}
              </div>
            </div>
            {pro ? (
              <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px">
                {common("proBadge")}
              </span>
            ) : null}
          </div>
          {profile.current_period_end ? (
            <div className="text-[12px] text-ink-2">
              {t("nextBilling")}:{" "}
              <span className="t-mono">
                {fmtDate(profile.current_period_end, locale)}
              </span>
            </div>
          ) : null}
          {profile.trial_ends_at ? (
            <div className="text-[12px] text-ink-2 mt-1">
              {t("trialEnd")}:{" "}
              <span className="t-mono">
                {fmtDate(profile.trial_ends_at, locale)}
              </span>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            {pro ? (
              <form action="/api/portal" method="post">
                <button type="submit" className="btn">
                  {t("managePayment")}
                </button>
              </form>
            ) : (
              <Link href="/pricing" className="btn btn-primary no-underline">
                {t("subscribePro")}
              </Link>
            )}
          </div>
        </div>

        <div className="card">
          <div className="t-label mb-2">{t("signOutLabel")}</div>
          <p className="text-[12.5px] text-ink-2 mb-3">{t("signOutBody")}</p>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn">
              {t("signOutButton")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
