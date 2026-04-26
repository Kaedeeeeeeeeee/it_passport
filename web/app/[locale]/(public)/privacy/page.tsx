import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/LegalShell";
import { Markdown } from "@/components/md/Markdown";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const translationNotice = t("translationNotice");
  return (
    <LegalShell
      title={t("title")}
      subtitle={t("subtitle")}
      lastUpdated={t("lastUpdated")}
      translationNotice={translationNotice || undefined}
    >
      <Markdown>{t("body")}</Markdown>
    </LegalShell>
  );
}
