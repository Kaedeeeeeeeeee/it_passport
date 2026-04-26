import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Noto_Sans_JP, Noto_Serif_JP, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";

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

const HTML_LANG: Record<Locale, string> = {
  ja: "ja",
  zh: "zh-Hans",
  en: "en",
};

const OG_LOCALE: Record<Locale, string> = {
  ja: "ja_JP",
  zh: "zh_CN",
  en: "en_US",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "landing" });
  const common = await getTranslations({ locale, namespace: "common" });
  const appName = common("appName");
  const description = t("heroBody");
  return {
    title: { default: appName, template: `%s · ${appName}` },
    description,
    applicationName: appName,
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
      siteName: appName,
      title: appName,
      description,
      locale: OG_LOCALE[locale as Locale],
    },
    twitter: {
      card: "summary_large_image",
      title: appName,
      description,
    },
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={HTML_LANG[locale as Locale]}
      className={`${notoSansJp.variable} ${notoSerifJp.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
