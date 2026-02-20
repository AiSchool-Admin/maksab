import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Dynamic OG Image Generator — مكسب
 *
 * GET /api/og?title=...&price=...&location=...&type=...
 *
 * Generates a branded 1200x630 image with:
 * - Green gradient background
 * - Ad title, price, location
 * - Sale type badge
 * - مكسب logo
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "إعلان على مكسب";
  const price = searchParams.get("price") || "";
  const location = searchParams.get("location") || "";
  const type = searchParams.get("type") || "cash";
  const category = searchParams.get("category") || "";

  const typeLabel =
    type === "auction"
      ? "مزاد"
      : type === "exchange"
        ? "تبديل"
        : type === "live_auction"
          ? "مزاد لايف"
          : "للبيع";

  const typeEmoji =
    type === "auction" ? "🔨" : type === "exchange" ? "🔄" : type === "live_auction" ? "📡" : "💰";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1B7A3D 0%, #145C2E 80%, #0D3D1E 100%)",
          fontFamily: "sans-serif",
          padding: 60,
          position: "relative",
        }}
      >
        {/* Top: Logo + Badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: "#D4A843" }}>$</span>
            <span style={{ fontSize: 42, fontWeight: 700, color: "#D4A843" }}>مكسب</span>
          </div>

          {/* Sale type badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: "8px 20px",
            }}
          >
            <span style={{ fontSize: 24 }}>{typeEmoji}</span>
            <span style={{ fontSize: 22, color: "#FFFFFF", fontWeight: 700 }}>{typeLabel}</span>
          </div>
        </div>

        {/* Middle: Title */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <h1
            style={{
              fontSize: title.length > 40 ? 42 : 52,
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.3,
              direction: "rtl",
              textAlign: "right",
              margin: 0,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </h1>

          {/* Price */}
          {price && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                direction: "rtl",
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 900, color: "#D4A843" }}>{price}</span>
              <span style={{ fontSize: 28, color: "#D4A843", opacity: 0.8 }}>جنيه</span>
            </div>
          )}
        </div>

        {/* Bottom: Location + Category */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            {location && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#E8F5E9",
                  fontSize: 20,
                  opacity: 0.8,
                }}
              >
                <span>📍</span>
                <span>{location}</span>
              </div>
            )}
            {category && (
              <div
                style={{
                  color: "#E8F5E9",
                  fontSize: 20,
                  opacity: 0.6,
                }}
              >
                {category}
              </div>
            )}
          </div>
          <div style={{ color: "#E8F5E9", fontSize: 18, opacity: 0.5 }}>maksab.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
