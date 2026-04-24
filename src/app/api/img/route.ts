import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Image proxy with per-source watermark handling.
 *
 * - SemsarMasr: crop bottom 8.5% (fixed watermark position).
 * - Dubizzle: detect which corner has the orange flame logo, then mirror-inpaint
 *   from the opposite corner. Free, fast (~100ms), no AI needed.
 */

type Corner = "TL" | "TR" | "BL" | "BR";

interface CornerBox { name: Corner; x: number; y: number; w: number; h: number }

/** Dubizzle flame: saturated red-orange (#E04B1F to #F37030 approx). */
function isDubizzleFlame(r: number, g: number, b: number): boolean {
  return (
    r >= 180 && r <= 255 &&
    g >= 30 && g <= 130 &&
    b >= 10 && b <= 100 &&
    r - g >= 70 &&
    r - b >= 100
  );
}

/** Dubizzle text: dark charcoal gray. */
function isDubizzleGrayText(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) <= 25 && max >= 30 && max <= 130;
}

async function detectDubizzleCorner(buffer: Buffer, W: number, H: number): Promise<Corner | null> {
  const cornerW = Math.round(W * 0.30);
  const cornerH = Math.round(H * 0.22);
  const corners: CornerBox[] = [
    { name: "TL", x: 0, y: 0, w: cornerW, h: cornerH },
    { name: "TR", x: W - cornerW, y: 0, w: cornerW, h: cornerH },
    { name: "BL", x: 0, y: H - cornerH, w: cornerW, h: cornerH },
    { name: "BR", x: W - cornerW, y: H - cornerH, w: cornerW, h: cornerH },
  ];

  for (const c of corners) {
    try {
      const { data, info } = await sharp(buffer)
        .extract({ left: c.x, top: c.y, width: c.w, height: c.h })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const channels = info.channels;
      const total = data.length / channels;
      let flame = 0;
      let gray = 0;
      for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (isDubizzleFlame(r, g, b)) flame++;
        if (isDubizzleGrayText(r, g, b)) gray++;
      }
      const flameRatio = flame / total;
      const grayRatio = gray / total;
      if (flameRatio >= 0.0015 && flameRatio <= 0.04 && grayRatio >= 0.015) {
        return c.name;
      }
    } catch {
      /* skip corner on error */
    }
  }
  return null;
}

/**
 * Cover a corner with a mirror copy of the opposite corner. Works well for
 * natural backgrounds (sky, walls, ground) which dominate the dubizzle logo
 * area. Imperfect on corners with complex content, but 10× better than
 * leaving the watermark visible.
 */
async function inpaintCornerWithMirror(
  buffer: Buffer,
  corner: Corner,
  W: number,
  H: number,
): Promise<Buffer> {
  // Logo region: 22% wide × 12% tall (tight around the logo, not the full corner scan box)
  const regionW = Math.round(W * 0.22);
  const regionH = Math.round(H * 0.12);

  let srcX: number, srcY: number, tgtX: number, tgtY: number, flipH = false, flipV = false;
  switch (corner) {
    case "TR":
      srcX = 0; srcY = 0; tgtX = W - regionW; tgtY = 0; flipH = true; break;
    case "TL":
      srcX = W - regionW; srcY = 0; tgtX = 0; tgtY = 0; flipH = true; break;
    case "BR":
      srcX = 0; srcY = H - regionH; tgtX = W - regionW; tgtY = H - regionH; flipH = true; break;
    case "BL":
      srcX = W - regionW; srcY = H - regionH; tgtX = 0; tgtY = H - regionH; flipH = true; break;
  }

  let extractor = sharp(buffer).extract({ left: srcX, top: srcY, width: regionW, height: regionH });
  if (flipH) extractor = extractor.flop();
  if (flipV) extractor = extractor.flip();

  // Slight blur on the patch so seam is less visible
  const patch = await extractor.blur(1.5).png().toBuffer();

  return sharp(buffer)
    .composite([{ input: patch, left: tgtX, top: tgtY }])
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();
}

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
    const isDubizzle = /dubizzle|classistatic/i.test(url);
    const isSemsar = /semsarmasr|sooqmsr/i.test(url);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*",
      },
    });
    if (!res.ok) return new Response("Image not found", { status: 404 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    // SemsarMasr: fixed-position crop at the bottom.
    if (isSemsar && /image\//i.test(contentType)) {
      try {
        const processed = await stripBottomWatermark(buffer, 0.085);
        return new Response(new Uint8Array(processed), {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=604800, immutable",
            "X-Maksab-Watermark": "cropped-bottom",
          },
        });
      } catch { /* fall through */ }
    }

    // Dubizzle: detect which corner has the flame logo, mirror-inpaint it.
    if (isDubizzle && /image\//i.test(contentType)) {
      try {
        const src = Buffer.from(buffer);
        const meta = await sharp(src).metadata();
        if (meta.width && meta.height && meta.width >= 200 && meta.height >= 200) {
          const corner = await detectDubizzleCorner(src, meta.width, meta.height);
          if (corner) {
            const cleaned = await inpaintCornerWithMirror(src, corner, meta.width, meta.height);
            return new Response(new Uint8Array(cleaned), {
              headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=604800, immutable",
                "X-Maksab-Watermark": `inpainted-${corner}`,
              },
            });
          }
        }
      } catch { /* fall through to raw */ }
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("Error fetching image", { status: 500 });
  }
}
