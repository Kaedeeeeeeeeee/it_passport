import { describe, expect, it } from "vitest";
import { sample, questionById, questionsForExam } from "./questions";

describe("sample", () => {
  it("returns [] when n is 0", () => {
    expect(sample([1, 2, 3], 0)).toEqual([]);
  });

  it("returns the whole set (shuffled) when n >= size", () => {
    const input = [1, 2, 3, 4, 5];
    const out = sample(input, 5);
    expect(out).toHaveLength(5);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns n unique items drawn from the source when n < size", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = sample(input, 4);
    expect(out).toHaveLength(4);
    expect(new Set(out).size).toBe(4);
    for (const x of out) expect(input.includes(x)).toBe(true);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    sample(input, 3);
    expect(input).toEqual(copy);
  });

  it("returns more than n when the caller passes n > size? (defensive)", () => {
    const out = sample([1, 2], 10);
    // Implementation slices to min(n, size) via out.slice(0, n); n=10, size=2
    // → after shuffle still length 2.
    expect(out).toHaveLength(2);
  });
});

describe("questionsForExam", () => {
  it("returns exactly 100 questions for a real exam code", () => {
    const qs = questionsForExam("2009h21a");
    expect(qs).toHaveLength(100);
    for (const q of qs) expect(q.exam_code).toBe("2009h21a");
  });

  it("returns [] for an unknown exam code", () => {
    expect(questionsForExam("does-not-exist")).toEqual([]);
  });
});

describe("questionById", () => {
  it("resolves a known id", () => {
    const q = questionById.get("2009h21a-1");
    expect(q).toBeDefined();
    expect(q?.exam_code).toBe("2009h21a");
    expect(q?.number).toBe(1);
  });

  it("returns undefined for unknown ids", () => {
    expect(questionById.get("nope")).toBeUndefined();
  });
});
