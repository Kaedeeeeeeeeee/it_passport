import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/ComingSoon";

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
  return (
    <ComingSoon
      subtitle={t("subtitle")}
      title={t("title")}
      note={t("note")}
    />
  );
}
