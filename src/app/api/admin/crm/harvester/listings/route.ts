/**
 * AHE Listings API
 * GET — قائمة الإعلانات المحصودة مع فلاتر
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = req.nextUrl;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;
  const category = searchParams.get("category");
  const governorate = searchParams.get("governorate");
  const priceMin = searchParams.get("price_min");
  const priceMax = searchParams.get("price_max");
  const search = searchParams.get("search");
  const featured = searchParams.get("featured");

  try {
    let query = supabase
      .from("ahe_listings")
      .select("*", { count: "exact" })
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq("maksab_category", category);
    if (governorate) query = query.eq("governorate", governorate);
    if (priceMin) query = query.gte("price", parseFloat(priceMin));
    if (priceMax) query = query.lte("price", parseFloat(priceMax));
    if (search) query = query.ilike("title", `%${search}%`);
    if (featured === "featured") query = query.eq("is_featured", true);
    if (featured === "not_featured") query = query.eq("is_featured", false);

    const { data: listings, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listings: listings || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
