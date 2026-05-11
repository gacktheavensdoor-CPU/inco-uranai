import { ImageResponse } from "next/og";

export const runtime = "edge";

function sanitizeColor(c: string | null): string {
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return "#2ECC71";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "インコ型";
  const emoji = searchParams.get("emoji") ?? "🦜";
  const color = sanitizeColor(searchParams.get("color"));
  const archetype = searchParams.get("archetype") ?? "";
  const isHidden = searchParams.get("hidden") === "1";

  // lighten the main color for gradient bg
  const bgColor = color + "22";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${bgColor} 0%, #f0fdf4 50%, ${bgColor} 100%)`,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* border frame */}
        <div
          style={{
            position: "absolute",
            inset: 20,
            border: `4px solid ${color}`,
            borderRadius: 32,
            opacity: 0.3,
          }}
        />

        {/* hidden badge */}
        {isHidden && (
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 52,
              background: color,
              color: "white",
              fontSize: 22,
              fontWeight: 700,
              padding: "6px 20px",
              borderRadius: 999,
              display: "flex",
            }}
          >
            ✨ 隠しキャラ解放！
          </div>
        )}

        {/* branding top-left */}
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 52,
            color: color,
            fontSize: 22,
            fontWeight: 700,
            display: "flex",
          }}
        >
          🦜 インコ占い
        </div>

        {/* emoji */}
        <div style={{ fontSize: 120, lineHeight: 1, marginBottom: 20, display: "flex" }}>
          {emoji}
        </div>

        {/* archetype chip */}
        {archetype && (
          <div
            style={{
              background: color,
              color: "white",
              fontSize: 26,
              fontWeight: 700,
              padding: "8px 28px",
              borderRadius: 999,
              marginBottom: 20,
              display: "flex",
            }}
          >
            {archetype}
          </div>
        )}

        {/* main title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 900,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          あなたは「{type}」
        </div>

        {/* bottom label */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            fontSize: 24,
            color: "#666",
            display: "flex",
          }}
        >
          インコと暮らすズボラ夫婦チャンネル 公式診断
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
