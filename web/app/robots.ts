import type { MetadataRoute } from "next";

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://it-passport.app"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated/private surfaces shouldn't be crawled. Public/SEO
      // surfaces (/, /library, /pricing, /exams, /category) stay open.
      disallow: [
        "/api/",
        "/practice/",
        "/result/",
        "/exam/",
        "/account/",
        "/settings/",
        "/home/",
        "/review/",
        "/stats/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
