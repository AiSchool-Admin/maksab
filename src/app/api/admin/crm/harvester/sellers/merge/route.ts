/**
 * POST /api/admin/crm/harvester/sellers/merge
 *
 * Merge duplicate sellers by name + refresh active_listings counts.
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function POST() {
  const supabase = getServiceClient();

  try {
    // Step 1: Merge duplicates
    const { data: mergeResults, error: mergeError } = await supabase
      .rpc("merge_duplicate_sellers");

    if (mergeError) {
      return NextResponse.json(
        { error: "فشل دمج المعلنين: " + mergeError.message },
        { status: 500 }
      );
    }

    // Step 2: Refresh active_listings for all sellers
    const { data: refreshCount, error: refreshError } = await supabase
      .rpc("refresh_seller_active_listings");

    if (refreshError) {
      console.error("refresh_seller_active_listings error:", refreshError.message);
    }

    return NextResponse.json({
      success: true,
      merged: mergeResults || [],
      merged_count: (mergeResults || []).length,
      active_listings_refreshed: refreshCount || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/crm/harvester/sellers/merge
 *
 * Preview duplicates without merging.
 */
export async function GET() {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .rpc("preview_duplicate_sellers");

    // If RPC doesn't exist, fall back to raw query
    if (error) {
      // Manual query fallback
      const { data: sellers } = await supabase
        .from("ahe_sellers")
        .select("id, name, phone, total_listings_seen, whale_score, source_platform, primary_governorate");

      if (!sellers) {
        return NextResponse.json({ duplicates: [], count: 0 });
      }

      // Group by name in JS
      const nameMap = new Map<string, typeof sellers>();
      for (const s of sellers) {
        if (!s.name || s.name.length < 3) continue;
        const key = s.name;
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(s);
      }

      const duplicates = Array.from(nameMap.entries())
        .filter(([, arr]) => arr.length > 1)
        .map(([name, arr]) => ({
          name,
          count: arr.length,
          phones: arr.map((s) => s.phone).filter(Boolean),
          total_listings: arr.reduce((sum, s) => sum + (s.total_listings_seen || 0), 0),
          records: arr,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      return NextResponse.json({
        duplicates,
        count: duplicates.length,
      });
    }

    return NextResponse.json({ duplicates: data, count: (data || []).length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
