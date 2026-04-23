import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs"; // sharp requires Node runtime, not edge

/**
 * Image proxy with watermark handling per source.
 *
 * - SemsarMasr: crop bottom 8.5% (fixed watermark position).
 * - Dubizzle: blur the top-right corner where the "dubizzle" watermark sits.
 *   We don't crop — that would lose useful image area. We don't try URL
 *   transformation either (tested; Dubizzle bakes the watermark into the
 *   stored file, not as a Cloudinary overlay). Instead we apply a heavy
 *   Gaussian blur to the watermark region so text becomes unreadable
 *   while the rest of the image stays sharp.
 */

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

/**
 * Blur a specific rectangular region of the image in place. Leaves the rest
 * of the image sharp. Used to make the Dubizzle watermark text unreadable
 * without losing image area.
 */
async function blurRegion(
  buffer: ArrayBuffer,
  leftPct: number,
  topPct: number,
  widthPct: number,
  heightPct: number,
  blurSigma: number,
): Promise<Buffer> {
  const src = Buffer.from(buffer);
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  if (!w || !h) return src;

  const regionLeft = Math.max(0, Math.round(w * leftPct));
  const regionTop = Math.max(0, Math.round(h * topPct));
  const regionWidth = Math.max(1, Math.min(w - regionLeft, Math.round(w * widthPct)));
  const regionHeight = Math.max(1, Math.min(h - regionTop, Math.round(h * heightPct)));

  // Extract the region, blur it heavily, re-composite back onto the original.
  const blurredRegion = await sharp(src)
    .extract({ left: regionLeft, top: regionTop, width: regionWidth, height: regionHeight })
    .blur(blurSigma)
    .toBuffer();

  return sharp(src)
    .composite([{ input: blurredRegion, left: regionLeft, top: regionTop }])
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

    // Dubizzle: watermark position varies per image (top-left, top-right,
    // center, etc. — Dubizzle randomizes as an anti-scrape measure). A fixed
    // blur region only cleans some images while blurring others pointlessly,
    // so we leave Dubizzle images untouched and rely on attribution elsewhere
    // in the UI. AI inpainting is a possible future upgrade.
    // (isDubizzle kept in case we add a better strategy later.)

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
