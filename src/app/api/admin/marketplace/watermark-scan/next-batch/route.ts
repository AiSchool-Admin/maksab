import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * GET /api/admin/marketplace/watermark-scan/next-batch?limit=10&platform=<opt>
 *
 * Returns the next batch of listings whose images haven't been OCR-checked
 * yet (specifications._wm_checked IS NULL). Client-side OCR flow:
 *   1. UI calls this → gets a batch
 *   2. For each listing, OCRs each image in the browser via tesseract.js
 *   3. POSTs result to /submit
 *   4. Calls this again until empty
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const platform = searchParams.get("platform");

  const supabase = getSupabase();

  let query = supabase
    .from("ahe_listings")
    .select("id, title, source_platform, all_image_urls, specifications")
    .not("all_image_urls", "is", null)
    .filter("all_image_urls", "neq", "{}")
    .filter("specifications->_wm_checked", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (platform) query = query.eq("source_platform", platform);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending = (data || []).map((l) => ({
    id: l.id,
    title: String(l.title || "").substring(0, 80),
    platform: l.source_platform,
    images: Array.isArray(l.all_image_urls)
      ? l.all_image_urls.filter((u: unknown): u is string => typeof u === "string" && !!u)
      : [],
  }));

  // Total remaining (for progress bar)
  let countQuery = supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .not("all_image_urls", "is", null)
    .filter("all_image_urls", "neq", "{}")
    .filter("specifications->_wm_checked", "is", null);
  if (platform) countQuery = countQuery.eq("source_platform", platform);
  const { count: remaining } = await countQuery;

  return NextResponse.json({
    listings: pending,
    remaining: remaining ?? 0,
  });
}
