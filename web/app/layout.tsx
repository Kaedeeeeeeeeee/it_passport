import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * The real HTML shell (with <html>, fonts, NextIntlClientProvider, locale
 * metadata) lives in `app/[locale]/layout.tsx` so we can set `lang` and load
 * translated messages per request. This root layout only has to exist for
 * Next.js routing and pass children through.
 *
 * Vercel Analytics + Speed Insights are injected here so they cover every
 * route — including the (auth)/callback handler that lives outside the
 * locale segment.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );
}
