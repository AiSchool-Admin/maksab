import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { detectDubizzleWatermark } from "@/lib/marketplace/watermark-mask";
import { inpaintImage } from "@/lib/marketplace/inpaint-service";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — each listing takes up to ~60s
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "cleaned-images";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

interface CleanResult {
  listing_id: string;
  original_count: number;
  cleaned_count: number;
  errors: string[];
  provider_counts: Record<string, number>;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function uploadCleaned(
  supabase: ReturnType<typeof getSupabase>,
  listingId: string,
  idx: number,
  buf: Buffer,
): Promise<string | null> {
  // Compress to WebP at 75% for smaller storage
  const compressed = await sharp(buf)
    .webp({ quality: 75, effort: 4 })
    .toBuffer();

  const path = `${listingId}/${idx}.webp`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, compressed, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });

  if (error) return null;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function processListing(
  supabase: ReturnType<typeof getSupabase>,
  listing: { id: string; all_image_urls: string[] },
): Promise<CleanResult> {
  const result: CleanResult = {
    listing_id: listing.id,
    original_count: listing.all_image_urls.length,
    cleaned_count: 0,
    errors: [],
    provider_counts: {},
  };

  const cleanedUrls: string[] = [];

  for (let i = 0; i < listing.all_image_urls.length; i++) {
    const url = listing.all_image_urls[i];
    if (typeof url !== "string" || !url.startsWith("http")) continue;

    const original = await downloadImage(url);
    if (!original) {
      result.errors.push(`img[${i}]: download failed`);
      cleanedUrls.push(url); // keep original URL as fallback
      continue;
    }

    try {
      const detection = await detectDubizzleWatermark(original);
      if (!detection.found || !detection.maskBuffer) {
        // No watermark detected — upload the original as-is (compressed)
        const publicUrl = await uploadCleaned(supabase, listing.id, i, original);
        cleanedUrls.push(publicUrl || url);
        continue;
      }

      const inpainted = await inpaintImage({
        imageBuffer: original,
        maskBuffer: detection.maskBuffer,
      });
      result.provider_counts[inpainted.provider] =
        (result.provider_counts[inpainted.provider] || 0) + 1;

      const publicUrl = await uploadCleaned(supabase, listing.id, i, inpainted.cleanedBuffer);
      if (publicUrl) {
        cleanedUrls.push(publicUrl);
        result.cleaned_count++;
      } else {
        result.errors.push(`img[${i}]: upload failed`);
        cleanedUrls.push(url);
      }
    } catch (err) {
      result.errors.push(`img[${i}]: ${err instanceof Error ? err.message : String(err)}`);
      cleanedUrls.push(url); // keep original on error
    }
  }

  // Update DB if anything changed
  if (cleanedUrls.length > 0) {
    await supabase
      .from("ahe_listings")
      .update({
        all_image_urls: cleanedUrls,
        main_image_url: cleanedUrls[0],
        thumbnail_url: cleanedUrls[0],
      })
      .eq("id", listing.id);
  }

  return result;
}

/**
 * POST /api/admin/marketplace/clean-images
 *
 * Body: { limit?: number, platform?: string, force?: boolean }
 *
 * Picks up to `limit` listings that haven't been cleaned yet (no
 * specifications._images_cleaned), runs watermark detection + inpainting on
 * each image via IOPaint (primary) or Replicate (fallback), uploads results
 * to Supabase Storage, and replaces URLs in the DB.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(parseInt(body.limit || "5"), 20);
  const platform = body.platform || "dubizzle_bookmarklet";
  const force = body.force === true;

  if (!process.env.IOPAINT_URL && !process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({
      error: "No inpainting provider configured. Set IOPAINT_URL or REPLICATE_API_TOKEN.",
    }, { status: 500 });
  }

  const supabase = getSupabase();

  // Find candidates — JS-side filter to avoid JSONB operator quirks
  const { data, error } = await supabase
    .from("ahe_listings")
    .select("id, all_image_urls, specifications")
    .eq("source_platform", platform)
    .not("all_image_urls", "is", null)
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = (data || []).filter((l) => {
    const urls = Array.isArray(l.all_image_urls) ? l.all_image_urls : [];
    if (urls.length === 0) return false;
    if (force) return true;
    const specs = l.specifications as Record<string, unknown> | null;
    return !specs?._images_cleaned;
  }).slice(0, limit);

  const results: CleanResult[] = [];
  for (const c of candidates) {
    const res = await processListing(supabase, {
      id: c.id,
      all_image_urls: (c.all_image_urls as string[]).slice(0, 3),
    });
    results.push(res);

    // Mark as cleaned even on partial success so we don't loop forever
    const existingSpecs = (c.specifications && typeof c.specifications === "object"
      ? c.specifications
      : {}) as Record<string, unknown>;
    await supabase
      .from("ahe_listings")
      .update({
        specifications: {
          ...existingSpecs,
          _images_cleaned: new Date().toISOString(),
          _images_cleaned_count: res.cleaned_count,
          _images_cleaned_errors: res.errors.length,
        },
      })
      .eq("id", c.id);
  }

  // Count remaining
  const totalListings = data?.length || 0;
  const totalCandidates = (data || []).filter((l) => {
    const urls = Array.isArray(l.all_image_urls) ? l.all_image_urls : [];
    if (urls.length === 0) return false;
    if (force) return true;
    const specs = l.specifications as Record<string, unknown> | null;
    return !specs?._images_cleaned;
  }).length;

  return NextResponse.json({
    processed: results.length,
    total_candidates: totalCandidates,
    total_listings: totalListings,
    remaining: Math.max(0, totalCandidates - results.length),
    results,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") || "dubizzle_bookmarklet";
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("ahe_listings")
    .select("id, specifications")
    .eq("source_platform", platform)
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let cleaned = 0;
  let pending = 0;
  for (const l of data || []) {
    const specs = l.specifications as Record<string, unknown> | null;
    if (specs?._images_cleaned) cleaned++;
    else pending++;
  }

  return NextResponse.json({
    platform,
    cleaned,
    pending,
    total: (data || []).length,
    iopaint_configured: !!process.env.IOPAINT_URL,
    replicate_configured: !!process.env.REPLICATE_API_TOKEN,
  });
}
