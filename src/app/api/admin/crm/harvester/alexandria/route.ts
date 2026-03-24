/**
 * Alexandria MVP Stats API
 * GET — إحصائيات حصاد الإسكندرية (سيارات + عقارات)
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

// Match both Arabic and English slug formats for backward compatibility
const ALEX_GOVS = ["الإسكندرية", "alexandria", "الاسكندرية"];

export async function GET() {
  const supabase = getServiceClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // All queries in parallel
    const [
      // Scopes
      scopesRes,
      // Car sellers in Alex with phone
      carSellersWithPhoneRes,
      // Car sellers total
      carSellersTotalRes,
      // Property sellers with phone
      propSellersWithPhoneRes,
      // Property sellers total
      propSellersTotalRes,
      // Car listings
      carListingsRes,
      // Property listings
      propListingsRes,
      // Today's car listings
      carListingsTodayRes,
      // Today's property listings
      propListingsTodayRes,
      // Recent jobs
      recentJobsRes,
      // Scope stats (last harvest per scope)
      scopeStatsRes,
    ] = await Promise.all([
      // Active Alexandria scopes (scopes always use Arabic)
      supabase
        .from("ahe_scopes")
        .select("*")
        .eq("governorate", "الإسكندرية")
        .in("maksab_category", ["سيارات", "عقارات"])
        .order("priority", { ascending: true }),

      // Car sellers with phone in Alexandria
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS)
        .eq("primary_category", "سيارات")
        .not("phone", "is", null),

      // Total car sellers
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS)
        .eq("primary_category", "سيارات"),

      // Property sellers with phone
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS)
        .eq("primary_category", "عقارات")
        .not("phone", "is", null),

      // Total property sellers
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS)
        .eq("primary_category", "عقارات"),

      // Total car listings
      supabase
        .from("ahe_listings")
        .select("id", { count: "exact", head: true })
        .in("governorate", ALEX_GOVS)
        .eq("maksab_category", "سيارات"),

      // Total property listings
      supabase
        .from("ahe_listings")
        .select("id", { count: "exact", head: true })
        .in("governorate", ALEX_GOVS)
        .eq("maksab_category", "عقارات"),

      // Today's car listings
      supabase
        .from("ahe_listings")
        .select("id", { count: "exact", head: true })
        .in("governorate", ALEX_GOVS)
        .eq("maksab_category", "سيارات")
        .gte("created_at", `${today}T00:00:00`),

      // Today's property listings
      supabase
        .from("ahe_listings")
        .select("id", { count: "exact", head: true })
        .in("governorate", ALEX_GOVS)
        .eq("maksab_category", "عقارات")
        .gte("created_at", `${today}T00:00:00`),

      // Recent harvest jobs for Alexandria scopes
      supabase
        .from("ahe_harvest_jobs")
        .select("*, ahe_scopes!inner(name, code, maksab_category, source_platform)")
        .eq("ahe_scopes.governorate", "الإسكندرية")
        .order("created_at", { ascending: false })
        .limit(20),

      // Last harvest per scope
      supabase
        .from("ahe_scopes")
        .select("code, name, source_platform, maksab_category, last_harvest_at, last_harvest_new_listings, last_harvest_new_sellers, total_harvests, total_listings_found, total_sellers_found, total_phones_extracted, is_active, priority, server_fetch_blocked")
        .eq("governorate", "الإسكندرية")
        .in("maksab_category", ["سيارات", "عقارات"])
        .order("priority", { ascending: true }),
    ]);

    // Platform comparison: listings per platform
    const platformComparison: Record<string, { listings: number; sellers: number; phones: number }> = {};

    const { data: platformListings } = await supabase
      .from("ahe_listings")
      .select("source_platform")
      .in("governorate", ALEX_GOVS)
      .in("maksab_category", ["سيارات", "عقارات"]);

    if (platformListings) {
      for (const l of platformListings) {
        if (!platformComparison[l.source_platform]) {
          platformComparison[l.source_platform] = { listings: 0, sellers: 0, phones: 0 };
        }
        platformComparison[l.source_platform].listings++;
      }
    }

    // Daily growth: listings per day for last 7 days
    const dailyGrowth: { date: string; cars: number; properties: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const [carsDay, propsDay] = await Promise.all([
        supabase
          .from("ahe_listings")
          .select("id", { count: "exact", head: true })
          .in("governorate", ALEX_GOVS)
          .eq("maksab_category", "سيارات")
          .gte("created_at", `${dateStr}T00:00:00`)
          .lt("created_at", `${dateStr}T23:59:59`),
        supabase
          .from("ahe_listings")
          .select("id", { count: "exact", head: true })
          .in("governorate", ALEX_GOVS)
          .eq("maksab_category", "عقارات")
          .gte("created_at", `${dateStr}T00:00:00`)
          .lt("created_at", `${dateStr}T23:59:59`),
      ]);

      dailyGrowth.push({
        date: dateStr,
        cars: carsDay.count || 0,
        properties: propsDay.count || 0,
      });
    }

    return NextResponse.json({
      scopes: scopesRes.data || [],
      cars: {
        total_listings: carListingsRes.count || 0,
        listings_today: carListingsTodayRes.count || 0,
        total_sellers: carSellersTotalRes.count || 0,
        sellers_with_phone: carSellersWithPhoneRes.count || 0,
      },
      properties: {
        total_listings: propListingsRes.count || 0,
        listings_today: propListingsTodayRes.count || 0,
        total_sellers: propSellersTotalRes.count || 0,
        sellers_with_phone: propSellersWithPhoneRes.count || 0,
      },
      recent_jobs: recentJobsRes.data || [],
      scope_stats: scopeStatsRes.data || [],
      platform_comparison: platformComparison,
      daily_growth: dailyGrowth,
    });
  } catch (error) {
    console.error("[ALEX-STATS] Error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل إحصائيات الإسكندرية" },
      { status: 500 }
    );
  }
}
