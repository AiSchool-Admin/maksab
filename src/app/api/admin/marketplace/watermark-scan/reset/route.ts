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
 * POST /api/admin/marketplace/watermark-scan/reset
 *
 * Clears the `_wm_checked` marker from all listings so the scan can re-run
 * with a newer detector. Does NOT restore removed images (they're already
 * lost — the scan rewrites all_image_urls in place).
 *
 * Body (optional): { platform?: string } → reset only that platform
 */
export async function POST(req: NextRequest) {
  let platform: string | null = null;
  try {
    const body = await req.json();
    platform = body.platform || null;
  } catch {
    // No body = reset all
  }

  const supabase = getSupabase();

  // Fetch candidate IDs (JS-side filter avoids JSONB operator quirks)
  let query = supabase
    .from("ahe_listings")
    .select("id, specifications, source_platform")
    .limit(10000);
  if (platform) query = query.eq("source_platform", platform);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const toReset = (data || []).filter((l) => {
    const s = l.specifications as Record<string, unknown> | null;
    return s && typeof s === "object" && !!s._wm_checked;
  });

  let cleared = 0;
  for (const l of toReset) {
    const s = { ...(l.specifications as Record<string, unknown>) };
    delete s._wm_checked;
    delete s._wm_removed_count;
    delete s._wm_matched;
    const { error: updateErr } = await supabase
      .from("ahe_listings")
      .update({ specifications: s })
      .eq("id", l.id);
    if (!updateErr) cleared++;
  }

  return NextResponse.json({
    ok: true,
    total_candidates: data?.length || 0,
    cleared,
    platform: platform || "all",
  });
}
