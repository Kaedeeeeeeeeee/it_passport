import "./globals.css";

/**
 * The real HTML shell (with <html>, fonts, NextIntlClientProvider, locale
 * metadata) lives in `app/[locale]/layout.tsx` so we can set `lang` and load
 * translated messages per request. This root layout only has to exist for
 * Next.js routing and pass children through.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
