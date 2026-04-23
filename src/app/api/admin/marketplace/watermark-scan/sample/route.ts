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
 * GET /api/admin/marketplace/watermark-scan/sample?limit=5&only_removed=1
 *
 * Returns a sample of already-scanned listings for visual QA:
 * - their current (post-filter) images
 * - how many were removed
 * - which watermark keywords matched
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 50);
  const onlyRemoved = searchParams.get("only_removed") !== "0";
  const random = searchParams.get("random") === "1";

  const supabase = getSupabase();

  let query = supabase
    .from("ahe_listings")
    .select("id, title, source_platform, source_url, all_image_urls, specifications")
    .filter("specifications->_wm_checked", "not.is", null);

  if (onlyRemoved) {
    query = query.filter("specifications->_wm_removed_count", "gt", "0");
  }

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data || [];
  if (random) rows = rows.sort(() => Math.random() - 0.5);
  rows = rows.slice(0, limit);

  const sample = rows.map((l) => {
    const specs = (l.specifications && typeof l.specifications === "object"
      ? l.specifications
      : {}) as Record<string, unknown>;
    return {
      id: l.id,
      title: String(l.title || ""),
      platform: l.source_platform,
      source_url: l.source_url,
      images: Array.isArray(l.all_image_urls)
        ? l.all_image_urls.filter((u: unknown): u is string => typeof u === "string" && !!u)
        : [],
      removed_count: Number(specs._wm_removed_count || 0),
      matched_keywords: Array.isArray(specs._wm_matched) ? (specs._wm_matched as string[]) : [],
      checked_at: specs._wm_checked || null,
    };
  });

  // Aggregate totals for the sidebar
  const { count: totalChecked } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .filter("specifications->_wm_checked", "not.is", null);

  const { count: withRemovals } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .filter("specifications->_wm_removed_count", "gt", "0");

  return NextResponse.json({
    sample,
    totals: {
      checked: totalChecked ?? 0,
      with_removals: withRemovals ?? 0,
    },
  });
}
