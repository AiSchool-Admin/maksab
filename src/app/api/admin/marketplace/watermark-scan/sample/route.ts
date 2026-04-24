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

interface SpecsObj {
  _wm_checked?: string;
  _wm_removed_count?: number;
  _wm_matched?: string[];
}

/**
 * GET /api/admin/marketplace/watermark-scan/sample?limit=5&only_removed=1&random=1
 *
 * Returns a sample of already-scanned listings for visual QA. Filters in JS
 * because Supabase JSONB filter operators are finicky.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 50);
  const onlyRemoved = searchParams.get("only_removed") !== "0";
  const random = searchParams.get("random") === "1";

  const supabase = getSupabase();

  // Pull everything that's been touched (we have ~100 listings, fine to filter JS-side)
  const { data, error } = await supabase
    .from("ahe_listings")
    .select("id, title, source_platform, source_url, all_image_urls, specifications")
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = data || [];

  const checked = all.filter((l) => {
    const s = l.specifications as SpecsObj | null;
    return s && typeof s === "object" && !!s._wm_checked;
  });

  const withRemovals = checked.filter((l) => {
    const s = l.specifications as SpecsObj;
    return Number(s._wm_removed_count || 0) > 0;
  });

  let pool = onlyRemoved ? withRemovals : checked;
  if (random) {
    pool = [...pool].sort(() => Math.random() - 0.5);
  } else {
    pool = [...pool].sort((a, b) => {
      const ar = Number((a.specifications as SpecsObj)._wm_removed_count || 0);
      const br = Number((b.specifications as SpecsObj)._wm_removed_count || 0);
      return br - ar;
    });
  }
  const picked = pool.slice(0, limit);

  const sample = picked.map((l) => {
    const s = (l.specifications || {}) as SpecsObj;
    return {
      id: l.id,
      title: String(l.title || ""),
      platform: l.source_platform,
      source_url: l.source_url,
      images: Array.isArray(l.all_image_urls)
        ? l.all_image_urls.filter((u: unknown): u is string => typeof u === "string" && !!u)
        : [],
      removed_count: Number(s._wm_removed_count || 0),
      matched_keywords: Array.isArray(s._wm_matched) ? s._wm_matched : [],
      checked_at: s._wm_checked || null,
    };
  });

  // Aggregate keyword distribution across all checked listings
  const keywordCounts: Record<string, number> = {};
  for (const l of checked) {
    const kws = (l.specifications as SpecsObj)._wm_matched;
    if (Array.isArray(kws)) {
      for (const k of kws) keywordCounts[k] = (keywordCounts[k] || 0) + 1;
    }
  }

  return NextResponse.json({
    sample,
    totals: {
      checked: checked.length,
      with_removals: withRemovals.length,
      total_listings: all.length,
    },
    keyword_distribution: keywordCounts,
  });
}
