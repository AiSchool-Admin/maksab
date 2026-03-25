/**
 * GET /api/admin/crm/sellers — Sellers list with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category") || "vehicles";
    const governorates = (searchParams.get("governorates") || "الإسكندرية,alexandria,الاسكندرية").split(",");
    const tier = searchParams.get("tier") || "all";
    const phoneOnly = searchParams.get("phoneOnly") === "true";
    const search = searchParams.get("search") || "";
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Build query
    let query = sb
      .from("ahe_sellers")
      .select("id, name, phone, source_platform, total_listings_seen, seller_tier, whale_score, pipeline_status, created_at, last_outreach_at, primary_category, primary_governorate", { count: "exact" })
      .eq("primary_category", category)
      .in("primary_governorate", governorates);

    if (tier !== "all") query = query.eq("seller_tier", tier);
    if (phoneOnly) query = query.not("phone", "is", null);
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    query = query
      .order("whale_score", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: sellers, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      sellers: sellers || [],
      total: count || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
