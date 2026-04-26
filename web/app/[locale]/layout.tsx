import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Noto_Sans_JP, Noto_Serif_JP, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { routing, type Locale } from "@/i18n/routing";
import { HTML_LANG, OG_LOCALE, SITE_URL } from "@/lib/seo";

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
  // metadataBase makes Next.js emit absolute URLs for og:image /
  // twitter:image — without it, file-based opengraph-image.tsx routes
  // resolve to relative URLs which Twitter / Slack / LINE unfurl
  // doesn't follow correctly.
  return {
    metadataBase: new URL(SITE_URL),
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
    alternates: {
      languages: {
        ja: "/",
        zh: "/zh",
        en: "/en",
        "x-default": "/",
      },
    },
    // Site-verification meta tags. Each is conditional on its env var so
    // dev / unconfigured environments don't emit empty meta tags.
    verification: (() => {
      const v: NonNullable<Metadata["verification"]> = {};
      if (process.env.GOOGLE_SITE_VERIFICATION) {
        v.google = process.env.GOOGLE_SITE_VERIFICATION;
      }
      if (process.env.BING_SITE_VERIFICATION) {
        // Bing's meta tag uses name="msvalidate.01"; Next.js emits
        // anything in `verification.other` as <meta name="<key>"
        // content="<value>">.
        v.other = { "msvalidate.01": process.env.BING_SITE_VERIFICATION };
      }
      return Object.keys(v).length ? v : undefined;
    })(),
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
  const common = await getTranslations({ locale, namespace: "common" });
  const appName = common("appName");

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: appName,
    url: SITE_URL,
    inLanguage: routing.locales,
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: appName,
    url: SITE_URL,
  };

  return (
    <html
      lang={HTML_LANG[locale as Locale]}
      className={`${notoSansJp.variable} ${notoSerifJp.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
