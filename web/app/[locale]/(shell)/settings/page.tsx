import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/ComingSoon";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <ComingSoon
      subtitle={t("subtitle")}
      title={t("title")}
      note={t("note")}
    />
  );
}
