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

interface SubmitBody {
  listing_id: string;
  clean_images: string[];      // URLs that passed OCR (no watermark)
  removed_count: number;       // how many URLs were dropped
  matched_keywords?: string[]; // which watermark words were found
}

/**
 * POST /api/admin/marketplace/watermark-scan/submit
 *
 * Body: { listing_id, clean_images: [...], removed_count, matched_keywords }
 *
 * Updates the listing's image fields to keep only clean URLs and marks it
 * as OCR-checked so the next-batch query won't return it again.
 */
export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.listing_id || !Array.isArray(body.clean_images)) {
    return NextResponse.json({ error: "listing_id and clean_images[] required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Merge _wm_checked marker into existing specifications
  const { data: existing } = await supabase
    .from("ahe_listings")
    .select("specifications")
    .eq("id", body.listing_id)
    .maybeSingle();

  const newSpecs = {
    ...(existing?.specifications && typeof existing.specifications === "object"
      ? existing.specifications
      : {}),
    _wm_checked: new Date().toISOString(),
    _wm_removed_count: body.removed_count,
    ...(body.matched_keywords && body.matched_keywords.length > 0
      ? { _wm_matched: body.matched_keywords }
      : {}),
  };

  const { error } = await supabase
    .from("ahe_listings")
    .update({
      all_image_urls: body.clean_images,
      main_image_url: body.clean_images[0] || null,
      thumbnail_url: body.clean_images[0] || null,
      specifications: newSpecs,
    })
    .eq("id", body.listing_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    clean_count: body.clean_images.length,
    removed_count: body.removed_count,
  });
}
