"use client";

export type AttemptRecord = {
  questionId: string;
  answer: string;        // the letter the user picked
  correct: boolean;
  timestamp: number;     // ms
};

/** v2 is append-only: every attempt is kept so we can reconstruct history and
 *  ingest into Supabase. `syncedUpTo` is a watermark timestamp — attempts with
 *  `timestamp <= syncedUpTo` have been confirmed landed in the DB. */
export type ProgressState = {
  version: 2;
  attempts: AttemptRecord[];
  syncedUpTo: number; // 0 = nothing synced yet
};

export type ProgressStateV1 = {
  version: 1;
  attempts: Record<string, AttemptRecord>;
};

const KEY = "itp_progress_v1";

function empty(): ProgressState {
  return { version: 2, attempts: [], syncedUpTo: 0 };
}

export function migrateV1(v1: ProgressStateV1): ProgressState {
  const attempts = Object.values(v1.attempts ?? {}).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  return { version: 2, attempts, syncedUpTo: 0 };
}

function saveState(state: ProgressState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressState | ProgressStateV1;
    if (parsed?.version === 2) return parsed;
    if (parsed?.version === 1) {
      const migrated = migrateV1(parsed);
      saveState(migrated);
      return migrated;
    }
    return empty();
  } catch {
    return empty();
  }
}

export function recordAttempt(rec: AttemptRecord): ProgressState {
  const state = loadProgress();
  state.attempts.push(rec);
  saveState(state);
  return state;
}

export function pendingAttempts(state: ProgressState): AttemptRecord[] {
  return state.attempts.filter((a) => a.timestamp > state.syncedUpTo);
}

/** Mark every attempt with timestamp <= watermark as synced. */
export function markSynced(watermark: number): ProgressState {
  const state = loadProgress();
  if (watermark > state.syncedUpTo) {
    state.syncedUpTo = watermark;
    saveState(state);
  }
  return state;
}

/** Latest attempt per question, keyed by questionId. Used by ProgressSummary
 *  and anything else that wants the "current state" view. */
export function latestByQuestion(
  state: ProgressState,
): Record<string, AttemptRecord> {
  const out: Record<string, AttemptRecord> = {};
  for (const a of state.attempts) {
    const existing = out[a.questionId];
    if (!existing || a.timestamp > existing.timestamp) out[a.questionId] = a;
  }
  return out;
}

export function summarize(state: ProgressState) {
  const latest = Object.values(latestByQuestion(state));
  const seen = latest.length;
  const correct = latest.filter((a) => a.correct).length;
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
    | { kind: "random" }
    | { kind: "review"; strategy: string };
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
