import type { Category } from "./types";

export const CATEGORY_LABELS: Record<Category | "unknown", string> = {
  strategy: "ストラテジ系",
  management: "マネジメント系",
  technology: "テクノロジ系",
  integrated: "中問",
  unknown: "分野なし",
};

export const CATEGORY_ORDER: (Category | "unknown")[] = [
  "strategy",
  "management",
  "technology",
  "integrated",
  "unknown",
];

export const PRACTICE_CATEGORIES: Category[] = [
  "strategy",
  "management",
  "technology",
];
