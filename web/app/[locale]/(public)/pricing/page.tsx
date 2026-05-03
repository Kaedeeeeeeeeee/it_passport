import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/Topbar";
import { Link } from "@/i18n/navigation";
import { PricingCheckoutButton } from "@/components/pricing/PricingCheckoutButton";
import { getProfile, isPro } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const common = await getTranslations("common");
  const profile = await getProfile();
  const pro = profile ? isPro(profile.subscription_status) : false;

  // ICU array access via t.raw — features come from messages as arrays so
  // localizations can swap copy independently per locale.
  const freeFeatures = (t.raw("freeFeatures") as string[]) ?? [];
  const proFeatures = (t.raw("proFeatures") as string[]) ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle={t("subtitle")} title={t("title")} />

      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <div className="max-w-[920px] mx-auto grid gap-5 sm:grid-cols-2">
          {/* Free */}
          <div className="card flex flex-col">
            <div className="t-label mb-2">{t("freeLabel")}</div>
            <div className="t-serif text-[22px] font-semibold -tracking-[0.3px]">
              {t("freeName")}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span
                className="t-serif font-medium leading-none"
                style={{ fontSize: 36, letterSpacing: "-1.5px" }}
              >
                {t("freePrice")}
              </span>
              <span className="text-[12px] text-ink-3 ml-1.5">
                {t("freeBilling")}
              </span>
            </div>
            <ul className="mt-5 mb-6 space-y-2 text-[13px] text-ink-2 leading-[1.7] flex-1">
              {freeFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="btn opacity-50 cursor-not-allowed"
            >
              {t("ctaCurrent")}
            </button>
          </div>

          {/* Pro */}
          <div
            className="card flex flex-col"
            style={{
              borderColor: "var(--accent)",
              borderWidth: 2,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="t-label">{t("proLabel")}</span>
              <span className="text-[9px] font-semibold tracking-[0.08em] text-flag border border-flag/60 rounded-sm px-1.5 py-px">
                {common("proBadge")}
              </span>
            </div>
            <div className="t-serif text-[22px] font-semibold -tracking-[0.3px]">
              {t("proName")}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span
                className="t-serif font-medium leading-none"
                style={{ fontSize: 36, letterSpacing: "-1.5px" }}
              >
                {t("proPrice")}
              </span>
              <span className="text-[12px] text-ink-3 ml-1.5">
                {t("proBilling")}
              </span>
            </div>
            <ul className="mt-5 mb-6 space-y-2 text-[13px] text-ink-2 leading-[1.7] flex-1">
              {proFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {!profile ? (
              <Link
                href="/login?next=/pricing"
                className="btn btn-primary no-underline text-center"
              >
                {t("ctaLogin")}
              </Link>
            ) : pro ? (
              <div className="flex flex-col gap-2">
                <div className="rounded-[var(--radius)] border border-line bg-surface px-3 py-3 text-[13px]">
                  <div className="font-semibold mb-1">
                    {t("alreadyProTitle")}
                  </div>
                  <div className="text-[12.5px] text-ink-2">
                    {t("alreadyProBody")}
                  </div>
                </div>
                <Link
                  href="/account"
                  className="btn no-underline text-center"
                >
                  {t("ctaManage")}
                </Link>
              </div>
            ) : (
              <PricingCheckoutButton />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
