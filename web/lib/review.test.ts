import { describe, expect, it } from "vitest";
import { selectReviewCandidates, type AttemptRow } from "./review";

const MS_DAY = 86_400_000;
const NOW = Date.parse("2026-04-20T12:00:00Z");

function row(
  question_id: string,
  correct: boolean,
  offsetDays: number,
): AttemptRow {
  return {
    question_id,
    correct,
    attempted_at: new Date(NOW - offsetDays * MS_DAY).toISOString(),
  };
}

describe("selectReviewCandidates: wrong-recent", () => {
  it("picks questions whose latest attempt was wrong and within 14 days", () => {
    const rows = [row("q1", false, 3)]; // 3 days ago, wrong
    expect(selectReviewCandidates(rows, "wrong-recent", NOW)).toEqual(["q1"]);
  });

  it("ignores questions corrected on the latest attempt, even if wrong earlier", () => {
    const rows = [row("q1", false, 10), row("q1", true, 2)];
    expect(selectReviewCandidates(rows, "wrong-recent", NOW)).toEqual([]);
  });

  it("excludes wrong attempts older than 14 days", () => {
    const rows = [row("q1", false, 15)];
    expect(selectReviewCandidates(rows, "wrong-recent", NOW)).toEqual([]);
  });

  it("includes wrong attempts exactly 14 days ago (inclusive window)", () => {
    const rows = [row("q1", false, 14)];
    expect(selectReviewCandidates(rows, "wrong-recent", NOW)).toEqual(["q1"]);
  });
});

describe("selectReviewCandidates: frequent-miss", () => {
  it("includes questions with 2+ wrong attempts regardless of recency", () => {
    const rows = [row("q1", false, 30), row("q1", false, 20)];
    expect(selectReviewCandidates(rows, "frequent-miss", NOW)).toEqual(["q1"]);
  });

  it("excludes questions with only 1 wrong attempt", () => {
    const rows = [row("q1", false, 5), row("q1", true, 1)];
    expect(selectReviewCandidates(rows, "frequent-miss", NOW)).toEqual([]);
  });

  it("still includes when corrects are interleaved but misses >= 2", () => {
    const rows = [
      row("q1", false, 10),
      row("q1", true, 8),
      row("q1", false, 6),
      row("q1", true, 2),
    ];
    expect(selectReviewCandidates(rows, "frequent-miss", NOW)).toEqual(["q1"]);
  });
});

describe("selectReviewCandidates: stale", () => {
  it("picks questions whose latest attempt is > 7 days ago", () => {
    const rows = [row("q1", true, 10)];
    expect(selectReviewCandidates(rows, "stale", NOW)).toEqual(["q1"]);
  });

  it("excludes questions at exactly 7 days (strict greater-than)", () => {
    const rows = [row("q1", true, 7)];
    expect(selectReviewCandidates(rows, "stale", NOW)).toEqual([]);
  });

  it("excludes recently answered questions", () => {
    const rows = [row("q1", true, 1)];
    expect(selectReviewCandidates(rows, "stale", NOW)).toEqual([]);
  });
});

describe("selectReviewCandidates: per-strategy routing on same data", () => {
  it("each strategy filters the same dataset according to its rule", () => {
    const rows: AttemptRow[] = [
      // q_recent_wrong: wrong 3 days ago, in window
      row("q_recent_wrong", false, 3),
      // q_stale: correct 10 days ago, stale
      row("q_stale", true, 10),
      // q_frequent: two wrongs even though old
      row("q_frequent", false, 30),
      row("q_frequent", false, 25),
      // q_fresh: correct 1 day ago — nothing
      row("q_fresh", true, 1),
    ];

    // q_frequent's latest attempt is 25 days ago — outside the 14-day window,
    // so wrong-recent should only catch q_recent_wrong.
    expect(selectReviewCandidates(rows, "wrong-recent", NOW)).toEqual([
      "q_recent_wrong",
    ]);

    expect(selectReviewCandidates(rows, "frequent-miss", NOW)).toEqual([
      "q_frequent",
    ]);

    expect(selectReviewCandidates(rows, "stale", NOW).sort()).toEqual(
      ["q_stale", "q_frequent"].sort(),
    );
  });
});
