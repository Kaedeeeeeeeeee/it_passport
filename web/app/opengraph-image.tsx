import { ImageResponse } from "next/og";

export const alt = "IT Passport 練習ノート — ITパスポート試験 過去問 28年分・AI解説つき";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
              Past-exam practice
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
            ITパスポート試験
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
            過去問28年分 · AI解説つき
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
            <div style={{ display: "flex" }}>2,800 問</div>
            <div style={{ display: "flex" }}>令和7〜平成21年</div>
            <div style={{ display: "flex" }}>228 図表</div>
          </div>
          <div style={{ display: "flex", fontSize: 14 }}>
            出典: IPA · 非商用学習用途
          </div>
        </div>
      </div>
    ),
    size,
  );
}
