import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this Next app — we sit inside a
  // polyrepo with a Python-managed parent, which would otherwise cause
  // Turbopack to walk up and pick the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

// `withSentryConfig` enables source-map upload + automatic instrumentation at
// build time. With Turbopack, Sentry skips webpack injection and relies on
// Next's own telemetry hooks (instrumentation.ts / instrumentation-client.ts),
// but the wrapper is still needed for source-map upload via SENTRY_AUTH_TOKEN.
//
// All Sentry-related work is no-op when SENTRY_AUTH_TOKEN is missing, so
// local dev and unconfigured Vercel envs keep building cleanly.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Stay quiet in interactive runs; CI builds get the full upload log.
  silent: !process.env.CI,
  // Upload more of the client bundle so async chunks resolve to original
  // source in stack traces.
  widenClientFileUpload: true,
  // Tunnel Sentry traffic through /monitoring so ad-blockers don't drop
  // the events. Next.js auto-rewrites it to ingest.sentry.io.
  tunnelRoute: "/monitoring",
  // Drop the SDK's `console.log` noise from the client bundle.
  disableLogger: true,
  // `sourcemaps.deleteSourcemapsAfterUpload` defaults to true, so the SDK
  // already strips raw source maps from the deployed build after uploading
  // them to Sentry — no separate `hideSourceMaps` flag needed.
});
