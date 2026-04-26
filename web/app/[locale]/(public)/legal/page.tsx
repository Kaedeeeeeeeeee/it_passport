import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/LegalShell";

const ROWS = [
  ["seller", "sellerValue"],
  ["address", "addressValue"],
  ["phone", "phoneValue"],
  ["email", "emailValue"],
  ["service", "serviceValue"],
  ["price", "priceValue"],
  ["extraFees", "extraFeesValue"],
  ["paymentMethod", "paymentMethodValue"],
  ["paymentTiming", "paymentTimingValue"],
  ["delivery", "deliveryValue"],
  ["returns", "returnsValue"],
  ["environment", "environmentValue"],
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tokushou" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function TokushouPage() {
  const t = await getTranslations("tokushou");
  const items = (key: string) => t(`items.${key}` as const);
  const translationNotice = t("translationNotice");
  return (
    <LegalShell
      title={t("title")}
      subtitle={t("subtitle")}
      lastUpdated={t("lastUpdated")}
      translationNotice={translationNotice || undefined}
    >
      <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-6 gap-y-4 text-[13.5px] leading-[1.7]">
        {ROWS.map(([labelKey, valueKey]) => (
          <div
            key={labelKey}
            className="contents"
          >
            <dt className="t-label text-ink-3 sm:pt-0.5">{items(labelKey)}</dt>
            <dd className="text-ink-2 mb-2 sm:mb-0 whitespace-pre-line">
              {items(valueKey)}
            </dd>
          </div>
        ))}
      </dl>
    </LegalShell>
  );
}
