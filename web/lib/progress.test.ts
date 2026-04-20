// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import {
  latestByQuestion,
  loadProgress,
  markSynced,
  migrateV1,
  pendingAttempts,
  recordAttempt,
  summarize,
  type AttemptRecord,
  type ProgressState,
  type ProgressStateV1,
} from "./progress";

function rec(
  questionId: string,
  correct: boolean,
  timestamp: number,
  answer = "ア",
): AttemptRecord {
  return { questionId, answer, correct, timestamp };
}

afterEach(() => {
  localStorage.clear();
});

describe("migrateV1", () => {
  it("converts empty v1 state to empty v2", () => {
    const v1: ProgressStateV1 = { version: 1, attempts: {} };
    const v2 = migrateV1(v1);
    expect(v2).toEqual({ version: 2, attempts: [], syncedUpTo: 0 });
  });

  it("sorts attempts by timestamp ascending", () => {
    const v1: ProgressStateV1 = {
      version: 1,
      attempts: {
        q1: rec("q1", true, 300),
        q2: rec("q2", false, 100),
        q3: rec("q3", true, 200),
      },
    };
    const v2 = migrateV1(v1);
    expect(v2.version).toBe(2);
    expect(v2.attempts.map((a) => a.timestamp)).toEqual([100, 200, 300]);
    expect(v2.syncedUpTo).toBe(0);
  });

  it("handles missing attempts map defensively", () => {
    const v1 = { version: 1 } as ProgressStateV1;
    const v2 = migrateV1(v1);
    expect(v2.attempts).toEqual([]);
  });
});

describe("pendingAttempts", () => {
  const s = (syncedUpTo: number, attempts: AttemptRecord[]): ProgressState => ({
    version: 2,
    syncedUpTo,
    attempts,
  });

  it("returns everything when watermark is 0", () => {
    const state = s(0, [rec("a", true, 10), rec("b", false, 20)]);
    expect(pendingAttempts(state).map((a) => a.questionId)).toEqual(["a", "b"]);
  });

  it("uses strict greater-than against watermark", () => {
    const state = s(20, [
      rec("a", true, 10),
      rec("b", false, 20),
      rec("c", true, 30),
    ]);
    expect(pendingAttempts(state).map((a) => a.questionId)).toEqual(["c"]);
  });

  it("returns empty when everything is synced", () => {
    const state = s(100, [rec("a", true, 10), rec("b", false, 50)]);
    expect(pendingAttempts(state)).toEqual([]);
  });
});

describe("latestByQuestion", () => {
  it("keeps the attempt with the max timestamp per question", () => {
    const state: ProgressState = {
      version: 2,
      syncedUpTo: 0,
      attempts: [
        rec("q1", false, 10),
        rec("q1", true, 30),
        rec("q1", false, 20),
        rec("q2", true, 5),
      ],
    };
    const latest = latestByQuestion(state);
    expect(latest.q1.timestamp).toBe(30);
    expect(latest.q1.correct).toBe(true);
    expect(latest.q2.timestamp).toBe(5);
  });

  it("handles unordered input", () => {
    const state: ProgressState = {
      version: 2,
      syncedUpTo: 0,
      attempts: [rec("q1", true, 50), rec("q1", false, 10)],
    };
    expect(latestByQuestion(state).q1.correct).toBe(true);
  });
});

describe("summarize", () => {
  it("returns zero accuracy on empty state", () => {
    const state: ProgressState = { version: 2, attempts: [], syncedUpTo: 0 };
    expect(summarize(state)).toEqual({ seen: 0, correct: 0, accuracy: 0 });
  });

  it("bases accuracy on unique questions, not total attempts", () => {
    // q1 is missed twice then corrected; "seen"=1, "correct"=1 → accuracy=1,
    // not correct=1 / total=3.
    const state: ProgressState = {
      version: 2,
      syncedUpTo: 0,
      attempts: [
        rec("q1", false, 10),
        rec("q1", false, 20),
        rec("q1", true, 30),
      ],
    };
    expect(summarize(state)).toEqual({ seen: 1, correct: 1, accuracy: 1 });
  });

  it("computes partial accuracy over unique questions", () => {
    const state: ProgressState = {
      version: 2,
      syncedUpTo: 0,
      attempts: [
        rec("q1", true, 10),
        rec("q2", false, 20),
        rec("q3", true, 30),
        rec("q4", false, 40),
      ],
    };
    const s = summarize(state);
    expect(s.seen).toBe(4);
    expect(s.correct).toBe(2);
    expect(s.accuracy).toBe(0.5);
  });
});

describe("recordAttempt + loadProgress round trip (localStorage)", () => {
  it("persists the attempt and loads it back", () => {
    recordAttempt(rec("q1", true, 123));
    const loaded = loadProgress();
    expect(loaded.version).toBe(2);
    expect(loaded.attempts).toHaveLength(1);
    expect(loaded.attempts[0]).toMatchObject({ questionId: "q1", correct: true });
  });

  it("migrates a v1 blob in localStorage on next load", () => {
    localStorage.setItem(
      "itp_progress_v1",
      JSON.stringify({
        version: 1,
        attempts: { q1: rec("q1", true, 10), q2: rec("q2", false, 5) },
      }),
    );
    const loaded = loadProgress();
    expect(loaded.version).toBe(2);
    expect(loaded.attempts.map((a) => a.questionId)).toEqual(["q2", "q1"]);
  });
});

describe("markSynced", () => {
  it("advances watermark monotonically", () => {
    recordAttempt(rec("q1", true, 100));
    markSynced(50);
    expect(loadProgress().syncedUpTo).toBe(50);
    markSynced(200);
    expect(loadProgress().syncedUpTo).toBe(200);
  });

  it("does not move watermark backwards", () => {
    recordAttempt(rec("q1", true, 100));
    markSynced(200);
    markSynced(50);
    expect(loadProgress().syncedUpTo).toBe(200);
  });
});
