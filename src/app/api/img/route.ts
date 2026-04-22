import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs"; // sharp requires Node runtime, not edge

// Hosts whose images need watermark removal.
// The key is a matcher against the source URL; the value is the crop config.
const WATERMARK_CROPS: Array<{
  match: RegExp;
  // Strip the bottom N% of the image (where watermarks typically sit).
  bottomPct: number;
}> = [
  { match: /semsarmasr|sooqmsr/i, bottomPct: 0.085 }, // "سمسار مصر" watermark bottom-right
];

async function stripBottomWatermark(buffer: ArrayBuffer, bottomPct: number): Promise<Buffer> {
  const img = sharp(Buffer.from(buffer));
  const meta = await img.metadata();
  const w = meta.width;
  const h = meta.height;
  if (!w || !h) return Buffer.from(buffer);

  const cropPx = Math.max(1, Math.round(h * bottomPct));
  const newHeight = Math.max(h - cropPx, 1);

  return img
    .extract({ left: 0, top: 0, width: w, height: newHeight })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("url required", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*",
      },
    });

    if (!res.ok) return new Response("Image not found", { status: 404 });

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const rawBuffer = await res.arrayBuffer();

    // Decide if we need to strip a watermark based on the source URL.
    const cropConfig = WATERMARK_CROPS.find((c) => c.match.test(url));

    if (cropConfig && /image\//i.test(contentType)) {
      try {
        const processed = await stripBottomWatermark(rawBuffer, cropConfig.bottomPct);
        return new Response(new Uint8Array(processed), {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=604800, immutable",
            "X-Maksab-Watermark-Stripped": "1",
          },
        });
      } catch (e) {
        // Fall through to raw image if processing fails — better than returning 500
        console.warn("[img-proxy] watermark strip failed:", e instanceof Error ? e.message : e);
      }
    }

    return new Response(rawBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("Error fetching image", { status: 500 });
  }
}
