import type { Category, Season } from "./types";

type Translator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const SUFFIX_KEYS = new Set(["a", "h", "o", "tokubetsu"]);

/** Locale-aware exam title:
 *    2024r06       → 令和06年度     / Reiwa 06    / 令和06年度
 *    2018h30a      → 平成30年度秋期 / Heisei 30 Autumn / 平成30年度秋季
 *
 *  Pass the translator from `useTranslations("examTerms")` (client) or
 *  `getTranslations({ namespace: "examTerms" })` (server). */
export function formatExamTitle(examCode: string, t: Translator): string {
  const m = /^(\d{4})(r|h)(\d+)([a-z]*)$/.exec(examCode);
  if (!m) return examCode;
  const [, , eraLetter, eraYear, suffixKey] = m;
  const era = eraLetter === "r" ? t("era.reiwa") : t("era.heisei");
  const suffix = SUFFIX_KEYS.has(suffixKey) ? t(`suffix.${suffixKey}`) : "";
  return t("examTitle", { era, year: eraYear, suffix });
}

export function eraLabel(era: "reiwa" | "heisei", t: Translator): string {
  return t(`era.${era}`);
}

export function seasonLabel(season: Season, t: Translator): string {
  return t(`season.${season}`);
}

export function categoryLabel(
  category: Category | "unknown",
  t: Translator,
): string {
  return t(`category.${category}`);
}

export function eraOf(examCode: string): "reiwa" | "heisei" {
  return examCode.includes("r") && !/h\d/.test(examCode) ? "reiwa" : "heisei";
}
