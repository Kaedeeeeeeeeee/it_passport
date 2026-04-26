import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "zh", "en"],
  defaultLocale: "ja",
  // "as-needed" keeps the Japanese URLs unchanged (/home, /library, …) while
  // other locales get a prefix (/en/home, /zh/library, …). Preserves SEO and
  // existing links for the primary audience.
  localePrefix: "as-needed",
  // Auto-detect via Accept-Language on first visit; user choice wins via the
  // NEXT_LOCALE cookie afterwards.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
export const locales = routing.locales;
