import { describe, expect, it } from "vitest";
import {
  computeByCategory,
  computeByExam,
  computeOverview,
  computeRecentDaily,
  type AttemptRow,
} from "./stats";
import { questionById } from "./questions";

function pickIdByCategory(category: string): string {
  for (const [id, q] of questionById) {
    if (q.category === category) return id;
  }
  throw new Error(`no question with category ${category}`);
}

function pickIdByExam(examCode: string): string {
  for (const [id, q] of questionById) {
    if (q.exam_code === examCode) return id;
  }
  throw new Error(`no question for exam ${examCode}`);
}

function row(
  question_id: string,
  correct: boolean,
  isoDate: string,
): AttemptRow {
  return { question_id, correct, attempted_at: isoDate };
}

describe("computeOverview", () => {
  const now = new Date("2026-04-20T12:00:00Z");

  it("returns all zeros on empty input", () => {
    const o = computeOverview([], now);
    expect(o).toEqual({
      total: 0,
      correct: 0,
      accuracy: 0,
      seen: 0,
      masteredCount: 0,
      streak: 0,
    });
  });

  it("counts total/correct across all attempts, seen over unique questions", () => {
    const rows = [
      row("q1", true, "2026-04-20T01:00:00Z"),
      row("q1", false, "2026-04-20T02:00:00Z"),
      row("q2", true, "2026-04-20T03:00:00Z"),
    ];
    const o = computeOverview(rows, now);
    expect(o.total).toBe(3);
    expect(o.correct).toBe(2);
    expect(o.accuracy).toBeCloseTo(2 / 3);
    expect(o.seen).toBe(2);
  });

  it("masteredCount uses the latest attempt per question", () => {
    // q1: wrong then correct → mastered. q2: correct then wrong → not mastered.
    const rows = [
      row("q1", false, "2026-04-20T01:00:00Z"),
      row("q1", true, "2026-04-20T02:00:00Z"),
      row("q2", true, "2026-04-20T01:00:00Z"),
      row("q2", false, "2026-04-20T02:00:00Z"),
    ];
    const o = computeOverview(rows, now);
    expect(o.seen).toBe(2);
    expect(o.masteredCount).toBe(1);
  });

  it("counts streak backward from today when today has activity", () => {
    const rows = [
      row("q1", true, "2026-04-20T01:00:00Z"),
      row("q2", true, "2026-04-19T03:00:00Z"),
      row("q3", true, "2026-04-18T05:00:00Z"),
      // gap on 2026-04-17
      row("q4", true, "2026-04-16T05:00:00Z"),
    ];
    const o = computeOverview(rows, now);
    expect(o.streak).toBe(3);
  });

  it("streak is 0 when today has no activity", () => {
    const rows = [
      row("q1", true, "2026-04-19T03:00:00Z"),
      row("q2", true, "2026-04-18T05:00:00Z"),
    ];
    const o = computeOverview(rows, now);
    expect(o.streak).toBe(0);
  });
});

describe("computeRecentDaily", () => {
  const now = new Date("2026-04-20T12:00:00Z");

  it("returns an array of length `days`", () => {
    const out = computeRecentDaily([], 7, now);
    expect(out).toHaveLength(7);
  });

  it("zeros out days with no data", () => {
    const out = computeRecentDaily([], 3, now);
    expect(out.every((d) => d.total === 0 && d.correct === 0)).toBe(true);
  });

  it("buckets attempts by UTC date and orders oldest-first", () => {
    const rows = [
      row("q1", true, "2026-04-20T10:00:00Z"),
      row("q2", false, "2026-04-20T11:00:00Z"),
      row("q3", true, "2026-04-19T05:00:00Z"),
    ];
    const out = computeRecentDaily(rows, 3, now);
    expect(out.map((d) => d.date)).toEqual([
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
    ]);
    expect(out[2]).toEqual({
      date: "2026-04-20",
      total: 2,
      correct: 1,
    });
    expect(out[1]).toEqual({
      date: "2026-04-19",
      total: 1,
      correct: 1,
    });
  });
});

describe("computeByCategory", () => {
  it("buckets attempts by the question's category", () => {
    const strategyId = pickIdByCategory("strategy");
    const techId = pickIdByCategory("technology");
    const rows = [
      row(strategyId, true, "2026-04-01T00:00:00Z"),
      row(strategyId, false, "2026-04-02T00:00:00Z"),
      row(techId, true, "2026-04-03T00:00:00Z"),
    ];
    const out = computeByCategory(rows);
    const strat = out.find((r) => r.category === "strategy")!;
    const tech = out.find((r) => r.category === "technology")!;
    expect(strat).toEqual({
      category: "strategy",
      total: 2,
      correct: 1,
      accuracy: 0.5,
    });
    expect(tech.total).toBe(1);
    expect(tech.correct).toBe(1);
  });

  it("routes unknown question ids to 'unknown'", () => {
    const rows = [row("does-not-exist", true, "2026-04-01T00:00:00Z")];
    const out = computeByCategory(rows);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe("unknown");
    expect(out[0].total).toBe(1);
  });
});

describe("computeByExam", () => {
  it("sorts by year descending then exam_code ascending", () => {
    // 2009h21a exists; use another exam for a later year.
    const earlyId = pickIdByExam("2009h21a");
    const rows = [row(earlyId, true, "2026-04-01T00:00:00Z")];
    const out = computeByExam(rows);
    expect(out).toHaveLength(1);
    expect(out[0].exam_code).toBe("2009h21a");
    expect(out[0].year).toBe(2009);
  });

  it("omits exams with no attempts", () => {
    const one = pickIdByExam("2009h21a");
    const out = computeByExam([row(one, true, "2026-04-01T00:00:00Z")]);
    expect(out.every((e) => e.total > 0)).toBe(true);
    expect(out.find((e) => e.exam_code === "2009h21a")).toBeDefined();
  });

  it("drops rows whose question id is unknown", () => {
    const out = computeByExam([
      row("unknown-q", true, "2026-04-01T00:00:00Z"),
    ]);
    expect(out).toEqual([]);
  });
});
