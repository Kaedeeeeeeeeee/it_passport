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
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function TermsPage() {
  const t = await getTranslations("terms");
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
