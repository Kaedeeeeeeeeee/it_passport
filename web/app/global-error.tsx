"use client";

/**
 * Root-level error boundary. Next.js renders this when an error escapes
 * the app's nested error boundaries. We forward to Sentry so even
 * full-tree crashes get captured, then show a minimal fallback that
 * doesn't depend on layouts (which may have crashed themselves).
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "48px 24px",
          maxWidth: 640,
          margin: "0 auto",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
          We&apos;ve been notified and are looking into it. Please refresh the
          page to try again.
        </p>
      </body>
    </html>
  );
}
