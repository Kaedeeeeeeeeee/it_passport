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
      // surfaces (/, /pricing, /exams, /category, /blog) stay open.
      // /library is currently auth-gated (lives under (shell)) so it's
      // disallowed for now; making it a public catalog landing is a
      // future TODO.
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
        "/library/",
        "/login/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
