import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs"; // sharp requires Node runtime, not edge

/**
 * Image proxy with watermark handling per source.
 *
 * - SemsarMasr: crop bottom 8.5% (fixed watermark position).
 * - Dubizzle: URL transform — request Cloudinary to send the image
 *   WITHOUT their watermark overlay. Dubizzle images are served through
 *   Cloudinary with a transformation preset (e.g. `t_web_ads_w_large`)
 *   that adds the "Dubizzle" watermark as an overlay. Stripping those
 *   transforms returns the base image without the overlay.
 *
 * If the URL-transform approach doesn't yield a different image (e.g.
 * for old assets baked with the watermark), we fall back to the original
 * image unchanged — cleaner than blind cropping for a watermark that can
 * appear top, middle, or bottom.
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
 * Rewrite a Dubizzle image URL to request a non-watermarked version from
 * Cloudinary. Typical watermarked URL:
 *   https://images.dubizzle.com.eg/t_web_ads_w_large/f_auto,q_auto:good/v1/...
 * Transform-free URL:
 *   https://images.dubizzle.com.eg/v1/...
 */
function rewriteDubizzleUrl(url: string): string | null {
  if (!/images\.dubizzle\.com\.eg|images\.classistatic\.com/i.test(url)) return null;
  const rewritten = url.replace(
    /(images\.(?:dubizzle\.com\.eg|classistatic\.com))\/(?:[^/]+\/)*?(v\d+\/)/,
    "$1/$2"
  );
  return rewritten !== url ? rewritten : null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("url required", { status: 400 });

  try {
    const isDubizzle = /dubizzle|classistatic/i.test(url);
    const isSemsar = /semsarmasr|sooqmsr/i.test(url);

    let buffer: ArrayBuffer | null = null;
    let contentType = "image/jpeg";
    let stripMode = "none";

    // For Dubizzle: first try fetching a transform-stripped URL.
    if (isDubizzle) {
      const cleanUrl = rewriteDubizzleUrl(url);
      if (cleanUrl) {
        try {
          const cleanRes = await fetch(cleanUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "image/*",
            },
          });
          if (cleanRes.ok) {
            buffer = await cleanRes.arrayBuffer();
            contentType = cleanRes.headers.get("content-type") || "image/jpeg";
            stripMode = "url-stripped";
          }
        } catch { /* fall through */ }
      }
    }

    // Fetch original if we don't already have a clean version.
    if (!buffer) {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/*",
        },
      });
      if (!res.ok) return new Response("Image not found", { status: 404 });
      buffer = await res.arrayBuffer();
      contentType = res.headers.get("content-type") || "image/jpeg";
    }

    // SemsarMasr fixed-position crop
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
      } catch { /* fall through to raw buffer */ }
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Maksab-Watermark": stripMode,
      },
    });
  } catch {
    return new Response("Error fetching image", { status: 500 });
  }
}
