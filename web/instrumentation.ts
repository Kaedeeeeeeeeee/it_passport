/**
 * Next.js 16 server-side instrumentation hook. Loads the Sentry SDK for the
 * Node.js or Edge runtime based on `NEXT_RUNTIME`. Re-exports
 * `onRequestError` so Sentry can capture server-side render and route
 * errors automatically.
 *
 * Sentry stays dormant when `NEXT_PUBLIC_SENTRY_DSN` is unset (e.g. local
 * dev without a Sentry account), so this file is safe to commit before
 * the Sentry project exists.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // No DSN configured — skip init so dev/CI doesn't try to phone home.
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // 10% trace sample is plenty for a small SaaS — most observability
      // value comes from errors, not perf traces.
      tracesSampleRate: 0.1,
      // Skip noisy local stacks; Sentry's defaults are fine in production.
      enabled: true,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: true,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
