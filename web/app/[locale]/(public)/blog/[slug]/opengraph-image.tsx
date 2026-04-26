import { ImageResponse } from "next/og";
import { getPost } from "@/lib/blog";

export const alt = "IT Passport 練習ノート — Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ locale: string; slug: string }>;

export default async function BlogOgImage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);

  const title = post?.title ?? "IT Passport 練習ノート";
  const date = post?.date ?? "";
  const tags = post?.tags?.slice(0, 3) ?? [];

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
              IT Passport 練習ノート
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
              Blog · 用語解説
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 60,
            fontWeight: 600,
            lineHeight: 1.25,
            letterSpacing: -1.5,
            color: "#1a1a1a",
            display: "flex",
            maxWidth: "100%",
          }}
        >
          {title}
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
          <div style={{ display: "flex", gap: 12 }}>
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  border: "1px solid #d4d3cf",
                  borderRadius: 4,
                  padding: "4px 10px",
                  fontSize: 14,
                  color: "#5a5a56",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 16 }}>{date}</div>
        </div>
      </div>
    ),
    size,
  );
}
