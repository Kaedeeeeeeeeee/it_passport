/**
 * Next.js 16 client-side instrumentation hook (replaces the legacy
 * `sentry.client.config.ts`). Runs once before React hydrates, sets up
 * Sentry browser SDK so client crashes get captured and routed to the
 * Sentry project.
 *
 * No-op when `NEXT_PUBLIC_SENTRY_DSN` is unset, so dev / CI / preview
 * builds without a DSN stay silent.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // 10% perf trace sample — keeps Sentry quota happy.
    tracesSampleRate: 0.1,
    // Session replay only on errored sessions — privacy-friendly default
    // (no replay on healthy sessions, full replay around errors so we can
    // see the leadup).
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    // Replay integration is opt-in; uncomment + add the import once we
    // actually want to spend the quota on session replay.
    // integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
  });
}

// Forward router transitions to Sentry so navigation-related crashes
// land with the right page context.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
