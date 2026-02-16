import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "مكسب — كل صفقة مكسب";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1B7A3D 0%, #145C2E 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: "#D4A843",
              marginLeft: 20,
            }}
          >
            $
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#D4A843",
            }}
          >
            مكسب
          </span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#FFFFFF",
            opacity: 0.9,
          }}
        >
          كل صفقة مكسب
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#E8F5E9",
            marginTop: 20,
            opacity: 0.7,
          }}
        >
          سوق إلكتروني مصري — بيع وشراء وتبديل
        </div>
      </div>
    ),
    { ...size }
  );
}
