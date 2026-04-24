import sharp from "sharp";

/**
 * Generate a binary inpainting mask for known source-site watermarks.
 * White pixels mark the area to be inpainted; black pixels are kept.
 *
 * Detection strategy (dubizzle only for now):
 *   - Scan 4 corners for the orange flame color + dark gray text signature
 *   - If a corner matches, produce a rectangular mask covering the logo region
 */

export type WatermarkCorner = "TL" | "TR" | "BL" | "BR";

export interface WatermarkDetection {
  found: boolean;
  corner?: WatermarkCorner;
  maskBuffer?: Buffer;
  /** Bounding box of the logo in original pixel coordinates */
  region?: { x: number; y: number; w: number; h: number };
  debug?: Record<string, { flame: number; gray: number }>;
}

function isDubizzleFlame(r: number, g: number, b: number): boolean {
  return (
    r >= 180 && r <= 255 &&
    g >= 30 && g <= 130 &&
    b >= 10 && b <= 100 &&
    r - g >= 70 &&
    r - b >= 100
  );
}

function isDubizzleGrayText(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) <= 25 && max >= 30 && max <= 130;
}

export async function detectDubizzleWatermark(imageBuffer: Buffer): Promise<WatermarkDetection> {
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H || W < 100 || H < 100) return { found: false };

  const cornerW = Math.round(W * 0.30);
  const cornerH = Math.round(H * 0.22);
  const corners: Array<{ name: WatermarkCorner; x: number; y: number }> = [
    { name: "TL", x: 0, y: 0 },
    { name: "TR", x: W - cornerW, y: 0 },
    { name: "BL", x: 0, y: H - cornerH },
    { name: "BR", x: W - cornerW, y: H - cornerH },
  ];

  const debug: Record<string, { flame: number; gray: number }> = {};

  for (const c of corners) {
    const { data, info } = await sharp(imageBuffer)
      .extract({ left: c.x, top: c.y, width: cornerW, height: cornerH })
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
    debug[c.name] = { flame: flameRatio, gray: grayRatio };

    if (flameRatio >= 0.0015 && flameRatio <= 0.04 && grayRatio >= 0.015) {
      // Logo detected — build a mask covering this region. Use a slightly
      // larger box than the corner scan (padding) so the inpainter has room.
      const regionW = Math.round(W * 0.26);
      const regionH = Math.round(H * 0.16);
      let rx = 0, ry = 0;
      switch (c.name) {
        case "TL": rx = 0; ry = 0; break;
        case "TR": rx = W - regionW; ry = 0; break;
        case "BL": rx = 0; ry = H - regionH; break;
        case "BR": rx = W - regionW; ry = H - regionH; break;
      }

      // Build mask: black background, white rectangle at logo region.
      const maskBuffer = await sharp({
        create: {
          width: W,
          height: H,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .composite([{
          input: await sharp({
            create: {
              width: regionW,
              height: regionH,
              channels: 3,
              background: { r: 255, g: 255, b: 255 },
            },
          }).png().toBuffer(),
          left: rx,
          top: ry,
        }])
        .png()
        .toBuffer();

      return {
        found: true,
        corner: c.name,
        maskBuffer,
        region: { x: rx, y: ry, w: regionW, h: regionH },
        debug,
      };
    }
  }

  return { found: false, debug };
}
