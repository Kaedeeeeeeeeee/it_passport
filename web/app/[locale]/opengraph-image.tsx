import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

export const alt = "IT Passport 練習ノート — ITパスポート試験 過去問・AI 解説";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Localized copy for the landing OG card. The image is rendered per
 *  locale by Next.js's file-based opengraph-image convention, so each
 *  of /, /zh, /en gets its own pre-rendered PNG with the right strings. */
const COPY: Record<Locale, {
  brand: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  stats: string[];
  source: string;
}> = {
  ja: {
    brand: "IT Passport 練習ノート",
    eyebrow: "PAST-EXAM PRACTICE",
    title: "ITパスポート試験",
    subtitle: "過去問28年分・AI解説つき",
    stats: ["2,800 問", "令和7〜平成21年", "228 図表"],
    source: "出典: IPA · 非商用学習用途",
  },
  zh: {
    brand: "IT Passport 練習ノート",
    eyebrow: "IT PASSPORT 真題練習",
    title: "IT Passport 考試",
    subtitle: "28 年真題 · AI 解析",
    stats: ["2,800 題", "令和 7〜平成 21", "228 圖表"],
    source: "來源: IPA · 非商用學習用途",
  },
  en: {
    brand: "IT Passport Practice",
    eyebrow: "PAST-EXAM PRACTICE",
    title: "IT Passport Exam",
    subtitle: "28 years of past exams · with AI explanations",
    stats: ["2,800 questions", "2009–2025 official", "228 figures"],
    source: "Source: IPA · non-commercial study use",
  },
};

type Params = Promise<{ locale: string }>;

export default async function OpengraphImage({ params }: { params: Params }) {
  const { locale } = await params;
  const c = hasLocale(routing.locales, locale)
    ? COPY[locale as Locale]
    : COPY[routing.defaultLocale];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: "#f6f5f1",
          color: "#1a1a1a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              background: "#2d4a3e",
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: -1,
            }}
          >
            iP
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>
              {c.brand}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#8a8a86",
                letterSpacing: 1,
                marginTop: 2,
                textTransform: "uppercase",
              }}
            >
              {c.eyebrow}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: -2,
              color: "#1a1a1a",
              display: "flex",
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 500,
              color: "#2d4a3e",
              letterSpacing: -0.8,
              display: "flex",
            }}
          >
            {c.subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#8a8a86",
            fontSize: 18,
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            {c.stats.map((s) => (
              <div key={s} style={{ display: "flex" }}>
                {s}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 14 }}>{c.source}</div>
        </div>
      </div>
    ),
    size,
  );
}
