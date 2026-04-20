"use client";

import {
  loadProgress,
  markSynced,
  pendingAttempts,
  type AttemptRecord,
} from "./progress";
import { useEffect } from "react";

export type SyncSessionPayload = {
  localId: string;        // client-generated id, to correlate attempts
  kind: "practice" | "exam" | "review";
  source?: unknown;       // free-form JSON: { examCode } | { strategy } | ...
  startedAt: number;      // ms
  completedAt?: number;   // ms
  questionCount: number;
  correctCount?: number;
};

export type SyncRequest = {
  attempts: Array<{
    questionId: string;
    answer: string;
    correct: boolean;
    timestamp: number;
    localSessionId?: string; // links back to session.localId
  }>;
  session?: SyncSessionPayload;
};

export type SyncResponse = {
  inserted: number;
  sessionId?: string; // server-generated uuid, if a session was created
};

const ENDPOINT = "/api/sync-progress";

/** Flush all unsynced attempts in localStorage to the server. Does nothing
 *  if the user is signed out (server returns 401 and we don't mark synced).
 *  Returns null when there's nothing to flush. */
export async function flushPending(
  session?: SyncSessionPayload,
): Promise<SyncResponse | null> {
  const state = loadProgress();
  const pending = pendingAttempts(state);
  if (pending.length === 0 && !session) return null;

  const body: SyncRequest = {
    attempts: pending.map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
      correct: a.correct,
      timestamp: a.timestamp,
      localSessionId: session?.localId,
    })),
    session,
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    keepalive: true,
  });

  if (!res.ok) {
    // 401 (not signed in) is expected — keep the pending attempts around.
    return null;
  }

  const data = (await res.json()) as SyncResponse;
  const watermark = pending.reduce(
    (m, a) => (a.timestamp > m ? a.timestamp : m),
    state.syncedUpTo,
  );
  markSynced(watermark);
  return data;
}

/** Best-effort flush using sendBeacon. Use from beforeunload / pagehide.
 *  Doesn't wait for a response and doesn't update the synced watermark —
 *  a follow-up `flushPending()` on next load will re-send if necessary
 *  (dedup guard in the DB handles idempotency). */
export function beaconFlush(session?: SyncSessionPayload): void {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const state = loadProgress();
  const pending = pendingAttempts(state);
  if (pending.length === 0 && !session) return;
  const body: SyncRequest = {
    attempts: pending.map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
      correct: a.correct,
      timestamp: a.timestamp,
      localSessionId: session?.localId,
    })),
    session,
  };
  const blob = new Blob([JSON.stringify(body)], {
    type: "application/json",
  });
  navigator.sendBeacon(ENDPOINT, blob);
}

/** Hook: register visibility / pagehide listeners so unsynced attempts get
 *  a best-effort flush when the user leaves. Pair with an on-mount
 *  `flushPending()` to catch returning users. */
export function useAttemptSync(): void {
  useEffect(() => {
    let cancelled = false;

    void flushPending().catch(() => {
      /* ignore — likely signed out */
    });

    const onVisibility = () => {
      if (document.visibilityState === "hidden") beaconFlush();
    };
    const onPageHide = () => beaconFlush();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      void cancelled;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);
}

export type { AttemptRecord };
