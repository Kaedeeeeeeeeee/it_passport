// @vitest-environment happy-dom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { flushPending } from "./sync";
import { loadProgress, recordAttempt } from "./progress";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function status(code: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status: code,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("flushPending", () => {
  it("returns null when there is nothing to flush", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await flushPending();
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("advances watermark to the max timestamp on 200 OK", async () => {
    recordAttempt({ questionId: "q1", answer: "ア", correct: true, timestamp: 100 });
    recordAttempt({ questionId: "q2", answer: "イ", correct: false, timestamp: 250 });
    recordAttempt({ questionId: "q3", answer: "ウ", correct: true, timestamp: 180 });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ inserted: 3 })));

    const result = await flushPending();
    expect(result).toEqual({ inserted: 3 });
    expect(loadProgress().syncedUpTo).toBe(250);
  });

  it("does NOT advance watermark on 401 (signed-out)", async () => {
    recordAttempt({ questionId: "q1", answer: "ア", correct: true, timestamp: 100 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(status(401, { error: "not authenticated" })));

    const result = await flushPending();
    expect(result).toBeNull();
    expect(loadProgress().syncedUpTo).toBe(0);
  });

  it("does NOT advance watermark on 500 (server error)", async () => {
    recordAttempt({ questionId: "q1", answer: "ア", correct: true, timestamp: 100 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(status(500, { error: "boom" })));

    const result = await flushPending();
    expect(result).toBeNull();
    expect(loadProgress().syncedUpTo).toBe(0);
  });

  it("includes session payload in the request body when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ inserted: 0, sessionId: "srv-id" }));
    vi.stubGlobal("fetch", fetchMock);

    const session = {
      localId: "local-123",
      kind: "practice" as const,
      source: { kind: "random" },
      startedAt: 1000,
      completedAt: 2000,
      questionCount: 10,
      correctCount: 7,
    };
    const result = await flushPending(session);
    expect(result).toEqual({ inserted: 0, sessionId: "srv-id" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/sync-progress");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.session).toEqual(session);
    expect(Array.isArray(body.attempts)).toBe(true);
  });

  it("tags attempts with session.localId when a session is given", async () => {
    recordAttempt({ questionId: "q1", answer: "ア", correct: true, timestamp: 100 });
    const fetchMock = vi.fn().mockResolvedValue(ok({ inserted: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await flushPending({
      localId: "local-abc",
      kind: "exam",
      startedAt: 10,
      questionCount: 1,
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.attempts[0].localSessionId).toBe("local-abc");
  });

  it("re-flushes attempts that are still above the watermark after a successful sync", async () => {
    recordAttempt({ questionId: "q1", answer: "ア", correct: true, timestamp: 100 });
    const fetchMock = vi.fn().mockResolvedValue(ok({ inserted: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await flushPending();
    expect(loadProgress().syncedUpTo).toBe(100);

    // Now add an attempt above the watermark and another at-or-below (should
    // not be re-sent). Only q2 is pending.
    recordAttempt({ questionId: "q2", answer: "イ", correct: false, timestamp: 200 });
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(ok({ inserted: 1 }));
    await flushPending();
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.attempts.map((a: { questionId: string }) => a.questionId)).toEqual(["q2"]);
    expect(loadProgress().syncedUpTo).toBe(200);
  });
});
