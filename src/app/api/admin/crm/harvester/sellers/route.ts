/**
 * AHE Sellers API
 * GET — قائمة المعلنين المكتشفين مع فلاتر وإحصائيات + تصنيف الحيتان
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = req.nextUrl;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;
  const pipelineStatus = searchParams.get("status");
  const hasPhone = searchParams.get("has_phone");
  const whalesOnly = searchParams.get("whales_only");
  const tierFilter = searchParams.get("tier");
  const governorate = searchParams.get("governorate");
  const search = searchParams.get("search");

  try {
    // Main query — sorted by whale_score desc
    let query = supabase
      .from("ahe_sellers")
      .select("*", { count: "exact" })
      .order("whale_score", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (pipelineStatus) query = query.eq("pipeline_status", pipelineStatus);
    if (hasPhone === "true") query = query.not("phone", "is", null);
    if (whalesOnly === "true") query = query.eq("is_whale", true);
    if (tierFilter) query = query.eq("seller_tier", tierFilter);
    if (governorate) query = query.eq("primary_governorate", governorate);
    if (search)
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data: sellers, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Stats queries in parallel
    const [
      withPhoneRes,
      whalesRes,
      bigFishRes,
      regularsRes,
      contactedRes,
      signedUpRes,
    ] = await Promise.all([
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .not("phone", "is", null),
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("seller_tier", "whale"),
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("seller_tier", "big_fish"),
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("seller_tier", "regular"),
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("pipeline_status", "contacted"),
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("pipeline_status", "signed_up"),
    ]);

    return NextResponse.json({
      sellers: sellers || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      stats: {
        with_phone: withPhoneRes.count || 0,
        whales: whalesRes.count || 0,
        big_fish: bigFishRes.count || 0,
        regulars: regularsRes.count || 0,
        contacted: contactedRes.count || 0,
        signed_up: signedUpRes.count || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
