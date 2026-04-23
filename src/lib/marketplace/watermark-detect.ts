/**
 * Watermark detector — runs OCR on image bytes and decides whether the image
 * carries a source-site watermark (dubizzle / semsarmasr / opensooq /
 * aqarmap). Called by the /api/admin/marketplace/cleanup-data?task=detect-watermarks
 * cleanup task to prune watermarked images AFTER harvest.
 *
 * Design:
 *   - Uses tesseract.js with the English language pack (watermark text is
 *     in Latin letters even on Arabic platforms: "dubizzle", "semsarmasr").
 *   - Downscales large images to 800px before OCR (watermark text is still
 *     readable, but OCR runs 3-5x faster).
 *   - Keyword list covers all Arabic classifieds brands we harvest from.
 */

import { createWorker, type Worker } from "tesseract.js";
import sharp from "sharp";

/** Brand substrings to look for in OCR output — case-insensitive match. */
const WATERMARK_KEYWORDS = [
  "dubizzle", "olx",
  "semsarmasr", "سمسار",
  "aqarmap", "أقارماب", "عقارماب",
  "opensooq", "أوبن سوق", "السوق المفتوح",
  "propertyfinder", "prop finder",
];

let sharedWorker: Worker | null = null;
let workerInitPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (sharedWorker) return sharedWorker;
  if (!workerInitPromise) {
    workerInitPromise = (async () => {
      const w = await createWorker("eng", 1, {
        // Silent — we don't need progress logs polluting server stdout
        logger: () => {},
      });
      sharedWorker = w;
      return w;
    })();
  }
  return workerInitPromise;
}

/** Release the worker when a batch finishes, freeing memory. */
export async function disposeWatermarkDetector(): Promise<void> {
  if (sharedWorker) {
    try { await sharedWorker.terminate(); } catch { /* ignore */ }
    sharedWorker = null;
    workerInitPromise = null;
  }
}

export interface WatermarkCheckResult {
  hasWatermark: boolean;
  matchedKeyword: string | null;
  ocrText: string;
  durationMs: number;
}

/**
 * Download the image at `url`, normalize it (resize to 800px, auto-rotate),
 * and run OCR. Returns whether any watermark keyword was detected.
 */
export async function checkImageForWatermark(url: string): Promise<WatermarkCheckResult> {
  const start = Date.now();
  const empty = (matched: string | null = null, text = ""): WatermarkCheckResult => ({
    hasWatermark: matched !== null,
    matchedKeyword: matched,
    ocrText: text,
    durationMs: Date.now() - start,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*",
      },
    });
  } catch {
    return empty();
  }
  if (!res.ok) return empty();

  const rawBuffer = Buffer.from(await res.arrayBuffer());

  // Normalize: resize to max 800px wide, auto-rotate EXIF, JPEG format.
  // Watermark text is still readable at 800px but OCR runs much faster.
  let prepared: Buffer;
  try {
    prepared = await sharp(rawBuffer)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    prepared = rawBuffer;
  }

  const worker = await getWorker();
  let text = "";
  try {
    const result = await worker.recognize(prepared);
    text = (result.data.text || "").toLowerCase();
  } catch {
    return empty(null, "");
  }

  // Scan for any known watermark keyword
  for (const kw of WATERMARK_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      return empty(kw, text);
    }
  }
  return empty(null, text);
}
