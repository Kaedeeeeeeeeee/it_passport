"use client";

export type AttemptRecord = {
  questionId: string;
  answer: string;        // the letter the user picked
  correct: boolean;
  timestamp: number;     // ms
};

export type ProgressState = {
  version: 1;
  attempts: Record<string, AttemptRecord>; // keyed by questionId (last attempt wins)
};

const KEY = "itp_progress_v1";

function empty(): ProgressState {
  return { version: 1, attempts: {} };
}

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressState;
    if (parsed?.version !== 1) return empty();
    return parsed;
  } catch {
    return empty();
  }
}

export function recordAttempt(rec: AttemptRecord): ProgressState {
  const state = loadProgress();
  state.attempts[rec.questionId] = rec;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  return state;
}

export function summarize(state: ProgressState) {
  const items = Object.values(state.attempts);
  const seen = items.length;
  const correct = items.filter((a) => a.correct).length;
  const accuracy = seen ? correct / seen : 0;
  return { seen, correct, accuracy };
}

export type SessionSpec = {
  id: string;
  createdAt: number;
  questionIds: string[];
  source:
    | { kind: "exam"; examCode: string }
    | { kind: "category"; category: string }
    | { kind: "random" };
};

const SESSION_PREFIX = "itp_session_";

export function saveSession(spec: SessionSpec) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_PREFIX + spec.id, JSON.stringify(spec));
}

export function loadSession(id: string): SessionSpec | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionSpec;
  } catch {
    return null;
  }
}

export function newSessionId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
