"use client";

import { useAttemptSync } from "@/lib/sync";

/** Client boundary inside the shell layout. Runs once per top-level mount to
 *  flush any localStorage attempts that accumulated while signed out (or on a
 *  different device), and registers pagehide/visibility listeners for a
 *  best-effort flush on tab close. Render only when the user is signed in. */
export function AttemptSync() {
  useAttemptSync();
  return null;
}
