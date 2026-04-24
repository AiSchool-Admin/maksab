import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * GET /api/admin/marketplace/watermark-preview/sample?limit=10
 *
 * Returns up to N Dubizzle image URLs sampled at random from the DB, for
 * side-by-side preview of the server-side mirror-inpaint proxy.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ahe_listings")
    .select("id, title, source_platform, all_image_urls")
    .eq("source_platform", "dubizzle_bookmarklet")
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten to (listing_id, title, url) and shuffle
  const pairs: { listing_id: string; title: string; original_url: string }[] = [];
  for (const l of data || []) {
    const imgs = Array.isArray(l.all_image_urls) ? l.all_image_urls : [];
    for (const u of imgs) {
      if (typeof u === "string" && u.startsWith("http")) {
        pairs.push({ listing_id: l.id, title: String(l.title || "").slice(0, 80), original_url: u });
      }
    }
  }
  pairs.sort(() => Math.random() - 0.5);

  return NextResponse.json({
    images: pairs.slice(0, limit),
    total_pool: pairs.length,
  });
}
