import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jp",
  display: "swap",
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif-jp",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IT Passport 練習ノート",
    template: "%s · IT Passport 練習ノート",
  },
  description:
    "ITパスポート試験（iパス）の公式過去問 28 年分・2,800 問を AI 解説付きで練習できるサイト。",
  applicationName: "IT Passport 練習ノート",
  keywords: [
    "ITパスポート",
    "iパス",
    "IT Passport",
    "過去問",
    "AI 解説",
    "IPA",
  ],
  openGraph: {
    type: "website",
    siteName: "IT Passport 練習ノート",
    title: "IT Passport 練習ノート",
    description:
      "ITパスポート試験の過去問 28 年分・2,800 問を AI 解説付きで練習。",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "IT Passport 練習ノート",
    description: "過去問 28 年分・2,800 問 · AI 解説つき",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${notoSerifJp.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
