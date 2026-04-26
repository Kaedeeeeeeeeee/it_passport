import "server-only";
import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://it-passport.app"
).replace(/\/$/, "");

export const OG_LOCALE: Record<Locale, string> = {
  ja: "ja_JP",
  zh: "zh_CN",
  en: "en_US",
};

export const HTML_LANG: Record<Locale, string> = {
  ja: "ja",
  zh: "zh-Hans",
  en: "en",
};

/** Build the absolute URL for a given path under a given locale, honoring
 *  next-intl's "as-needed" prefixing (no prefix for the default `ja`). */
export function localizedUrl(path: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  if (path === "" || path === "/") {
    return `${SITE_URL}${prefix || "/"}`;
  }
  return `${SITE_URL}${prefix}${path}`;
}

/** Build the `alternates` block for `generateMetadata`: canonical to the
 *  current locale's URL plus hreflang variants for every locale. */
export function buildAlternates(
  path: string,
  locale: string,
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = localizedUrl(path, l);
  }
  languages["x-default"] = localizedUrl(path, routing.defaultLocale);
  return {
    canonical: localizedUrl(path, locale),
    languages,
  };
}

type OgType = "website" | "article";

/** Standardized openGraph + twitter blocks. The `images` field is left
 *  unset so Next.js's file-based opengraph-image convention can supply
 *  the absolute URL automatically when an `opengraph-image.tsx` exists
 *  in the same route segment. Override only when a route needs a
 *  different image. */
export function buildOpenGraph(opts: {
  locale: string;
  title: string;
  description: string;
  type?: OgType;
  url?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  siteName: string;
}): { openGraph: Metadata["openGraph"]; twitter: Metadata["twitter"] } {
  const og: NonNullable<Metadata["openGraph"]> = {
    type: opts.type ?? "website",
    title: opts.title,
    description: opts.description,
    locale: OG_LOCALE[opts.locale as Locale] ?? opts.locale,
    siteName: opts.siteName,
    ...(opts.url ? { url: opts.url } : {}),
  };
  if (opts.type === "article") {
    Object.assign(og, {
      publishedTime: opts.publishedTime,
      modifiedTime: opts.modifiedTime ?? opts.publishedTime,
      authors: opts.authors,
      tags: opts.tags,
    });
  }
  return {
    openGraph: og,
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}

export type BreadcrumbItem = { name: string; path: string };

/** schema.org BreadcrumbList — last item should be the current page. */
export function breadcrumbSchema(items: BreadcrumbItem[], locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: localizedUrl(item.path, locale),
    })),
  };
}

/** schema.org Article for blog posts. We deliberately omit the `image`
 *  field: Next.js's file-based opengraph-image convention emits a hashed
 *  URL (e.g. `opengraph-image-abc123?xyz`) that we can't reliably name
 *  from build-time code. The og:image meta tag still carries the right
 *  URL for social sharing — Article schema is valid without `image`. */
export function articleSchema(opts: {
  locale: string;
  slugPath: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  tags: string[];
  publisherName: string;
}) {
  const url = localizedUrl(opts.slugPath, opts.locale);
  const publisher = {
    "@type": "Organization",
    name: opts.publisherName,
    url: SITE_URL,
  };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: publisher,
    publisher,
    inLanguage: opts.locale,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: opts.tags.join(", "),
  };
}

const BREADCRUMB_HOME: Record<Locale, string> = {
  ja: "ホーム",
  zh: "首页",
  en: "Home",
};

export function homeBreadcrumb(locale: string): BreadcrumbItem {
  return {
    name: BREADCRUMB_HOME[locale as Locale] ?? "Home",
    path: "/",
  };
}
