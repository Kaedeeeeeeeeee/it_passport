import { describe, expect, it, vi } from "vitest";

// session-resolver now reads UI strings via next-intl's `getTranslations`,
// which requires a Next.js server-component request context. Stub it with an
// identity-style translator so unit tests can exercise the resolution logic
// without a request scope.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    return (
      key: string,
      values?: Record<string, string | number>,
    ): string => {
      if (namespace === "practice") {
        if (key === "randomSessionLabel") return `ランダム ${values?.n} 問`;
        if (key === "examSessionLabel") return `${values?.code} · 全100問`;
        if (key === "categorySessionLabel")
          return `${values?.label} · ${values?.n} 問`;
      }
      if (namespace === "examTerms") {
        const map: Record<string, string> = {
          "category.strategy": "ストラテジ系",
          "category.management": "マネジメント系",
          "category.technology": "テクノロジ系",
          "category.integrated": "中問",
          "category.unknown": "分野なし",
        };
        return map[key] ?? key;
      }
      if (namespace === "review" && key === "sessionPrefix") return "復習";
      return `${namespace}.${key}`;
    };
  },
}));

import { resolveSession } from "./session-resolver";

describe("resolveSession: random", () => {
  it("honors the `n` search param", async () => {
    const r = await resolveSession("random", { n: "5" });
    expect(r).not.toBeNull();
    expect(r!.questions).toHaveLength(5);
    expect(r!.label).toBe("ランダム 5 問");
  });

  it("defaults to 10 questions when n is missing", async () => {
    const r = await resolveSession("random", {});
    expect(r!.questions).toHaveLength(10);
    expect(r!.label).toContain("10");
  });

  it("clamps n to [1, 100]", async () => {
    const big = await resolveSession("random", { n: "500" });
    expect(big!.questions).toHaveLength(100);
    const zero = await resolveSession("random", { n: "0" });
    // Number("0") is 0 (falsy) → falls through to default 10
    expect(zero!.questions).toHaveLength(10);
  });

  it("accepts array param (first element wins)", async () => {
    const r = await resolveSession("random", { n: ["7", "20"] });
    expect(r!.questions).toHaveLength(7);
  });
});

describe("resolveSession: exam-*", () => {
  it("returns all 100 questions for a real exam, ordered by number", async () => {
    const r = await resolveSession("exam-2009h21a", {});
    expect(r).not.toBeNull();
    expect(r!.questions).toHaveLength(100);
    const numbers = r!.questions.map((q) => q.number);
    const sorted = numbers.slice().sort((a, b) => a - b);
    expect(numbers).toEqual(sorted);
    expect(r!.label).toContain("2009h21a");
  });

  it("returns null for unknown exam code", async () => {
    const r = await resolveSession("exam-does-not-exist", {});
    expect(r).toBeNull();
  });
});

describe("resolveSession: category-*", () => {
  it("returns 20 strategy questions by default", async () => {
    const r = await resolveSession("category-strategy", {});
    expect(r).not.toBeNull();
    expect(r!.questions).toHaveLength(20);
    expect(r!.questions.every((q) => q.category === "strategy")).toBe(true);
    expect(r!.label).toContain("ストラテジ系");
    expect(r!.label).toContain("20");
  });

  it("honors `n` param and clamps to pool size", async () => {
    const r = await resolveSession("category-management", { n: "5" });
    expect(r!.questions).toHaveLength(5);
    expect(r!.questions.every((q) => q.category === "management")).toBe(true);
  });

  it("returns null for unsupported categories (e.g. integrated)", async () => {
    expect(await resolveSession("category-integrated", {})).toBeNull();
    expect(await resolveSession("category-bogus", {})).toBeNull();
  });
});

describe("resolveSession: unknown slugs", () => {
  it("returns null for an unrecognised slug", async () => {
    expect(await resolveSession("weird-slug", {})).toBeNull();
  });
});
