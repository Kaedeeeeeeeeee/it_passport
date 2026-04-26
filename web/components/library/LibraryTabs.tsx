"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

type TabKey = "category" | "exam";

export function LibraryTabs({
  categorySlot,
  examSlot,
}: {
  categorySlot: ReactNode;
  examSlot: ReactNode;
}) {
  const t = useTranslations("library");
  const [active, setActive] = useState<TabKey>("category");

  return (
    <>
      <div
        role="tablist"
        aria-label={t("title")}
        className="flex gap-1 border-b border-line mb-6"
      >
        <TabButton
          label={t("tabCategory")}
          active={active === "category"}
          onClick={() => setActive("category")}
        />
        <TabButton
          label={t("tabYear")}
          active={active === "exam"}
          onClick={() => setActive("exam")}
        />
      </div>

      <div
        role="tabpanel"
        hidden={active !== "category"}
        aria-hidden={active !== "category"}
      >
        {categorySlot}
      </div>
      <div
        role="tabpanel"
        hidden={active !== "exam"}
        aria-hidden={active !== "exam"}
      >
        {examSlot}
      </div>
    </>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "t-serif px-4 py-2.5 text-[14px] font-semibold border-b-2 -mb-px transition-colors " +
        (active
          ? "border-accent text-ink"
          : "border-transparent text-ink-3 hover:text-ink-2")
      }
    >
      {label}
    </button>
  );
}
