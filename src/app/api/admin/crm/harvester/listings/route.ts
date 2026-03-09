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
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const governorate = searchParams.get("governorate");
  const hasPhone = searchParams.get("has_phone");
  const migrationStatus = searchParams.get("migration_status");
  const search = searchParams.get("search");

  try {
    let query = supabase
      .from("ahe_listings")
      .select("*", { count: "exact" })
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform) query = query.eq("source_platform", platform);
    if (category) query = query.eq("maksab_category", category);
    if (governorate) query = query.eq("governorate", governorate);
    if (hasPhone === "true") query = query.not("extracted_phone", "is", null);
    if (migrationStatus) query = query.eq("migration_status", migrationStatus);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data: listings, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listings: listings || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
