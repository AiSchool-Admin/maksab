/**
 * Watermark inpainting service.
 *
 * Sends an image + mask to one of two LaMa-based providers:
 *   1. Self-hosted IOPaint (primary — free, unlimited, via Railway)
 *   2. Replicate hosted LaMa (fallback — free credit then pay-per-use)
 *
 * Both providers accept the same abstraction: buffer + mask → cleaned buffer.
 * Mask convention: white pixels = region to inpaint, black = keep.
 */

export type InpaintProvider = "iopaint" | "replicate";

export interface InpaintInput {
  imageBuffer: Buffer;
  maskBuffer: Buffer;
}

export interface InpaintOutput {
  cleanedBuffer: Buffer;
  provider: InpaintProvider;
  durationMs: number;
}

// ── IOPaint (self-hosted on Railway) ────────────────────────────────
async function inpaintWithIOPaint(input: InpaintInput): Promise<InpaintOutput> {
  const base = process.env.IOPAINT_URL;
  if (!base) throw new Error("IOPAINT_URL not configured");

  const started = Date.now();
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(input.imageBuffer)], { type: "image/jpeg" }), "image.jpg");
  form.append("mask", new Blob([new Uint8Array(input.maskBuffer)], { type: "image/png" }), "mask.png");

  const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/inpaint`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`IOPaint ${res.status}: ${text.slice(0, 200)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return {
    cleanedBuffer: Buffer.from(arrayBuf),
    provider: "iopaint",
    durationMs: Date.now() - started,
  };
}

// ── Replicate (hosted LaMa) ─────────────────────────────────────────
// Uses the public LaMa inpainting model. We pass the image + mask as
// base64 data URIs and poll for the result.

async function inpaintWithReplicate(input: InpaintInput): Promise<InpaintOutput> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN not configured");

  const started = Date.now();
  const imgB64 = `data:image/jpeg;base64,${input.imageBuffer.toString("base64")}`;
  const maskB64 = `data:image/png;base64,${input.maskBuffer.toString("base64")}`;

  // Model: allenhooo/lama (LaMa — MIT licensed, well-tested on Replicate)
  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "b0afd4f61fd8601cbd7bf27cdbe4e4ff0dcba50c0f87bb33cd9c8d49e1e0f3d9",
      input: { image: imgB64, mask: maskB64 },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`Replicate create ${createRes.status}: ${text.slice(0, 200)}`);
  }

  const created = await createRes.json();
  const getUrl: string = created.urls?.get;
  if (!getUrl) throw new Error("Replicate: missing prediction URL");

  // Poll for completion (max 60s)
  const deadline = Date.now() + 60_000;
  let result: { status: string; output?: string | string[]; error?: string } | null = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1200));
    const pollRes = await fetch(getUrl, { headers: { "Authorization": `Bearer ${token}` } });
    if (!pollRes.ok) continue;
    const j = await pollRes.json();
    if (j.status === "succeeded" || j.status === "failed" || j.status === "canceled") {
      result = j;
      break;
    }
  }

  if (!result) throw new Error("Replicate polling timed out");
  if (result.status !== "succeeded") throw new Error(`Replicate: ${result.status} ${result.error || ""}`);

  const outUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!outUrl) throw new Error("Replicate: no output URL");

  const dlRes = await fetch(outUrl);
  if (!dlRes.ok) throw new Error(`Replicate download ${dlRes.status}`);
  const arrayBuf = await dlRes.arrayBuffer();

  return {
    cleanedBuffer: Buffer.from(arrayBuf),
    provider: "replicate",
    durationMs: Date.now() - started,
  };
}

// ── Public API: try IOPaint first, then Replicate ────────────────────
export async function inpaintImage(input: InpaintInput): Promise<InpaintOutput> {
  const errors: string[] = [];

  if (process.env.IOPAINT_URL) {
    try {
      return await inpaintWithIOPaint(input);
    } catch (err) {
      errors.push(`iopaint: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (process.env.REPLICATE_API_TOKEN) {
    try {
      return await inpaintWithReplicate(input);
    } catch (err) {
      errors.push(`replicate: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`All inpainting providers failed: ${errors.join("; ") || "no providers configured"}`);
}
