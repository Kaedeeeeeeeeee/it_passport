import { track as vercelTrack } from "@vercel/analytics";

/**
 * Custom analytics events. We intentionally keep this list small and stable
 * so the funnel is easy to read in the Vercel dashboard.
 *
 * `login_succeeded` was originally in the plan but skipped — it would have
 * required either a server-side track from the OAuth callback (which no-ops
 * locally without VERCEL_* tokens) or threading a one-shot `?login=1` hint
 * through the redirect, which adds non-trivial wiring for a low-value event.
 */
export type EventName =
  | "practice_started"
  | "exam_finished"
  | "explanation_generated";

export type Props = Record<string, string | number | boolean | null>;

/**
 * Browser-side analytics. No-op if the Analytics script hasn't loaded yet
 * (e.g. on localhost where the script intentionally skips). Failures are
 * swallowed — analytics must never break the app.
 */
export function track(event: EventName, props?: Props) {
  try {
    vercelTrack(event, props);
  } catch {
    // best-effort
  }
}
