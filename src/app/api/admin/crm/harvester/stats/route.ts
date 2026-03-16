/**
 * AHE Stats API
 * GET — إحصائيات Dashboard + بيانات الرسم البياني + تصنيف البائعين والمشترين
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET() {
  const supabase = getServiceClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // All stats queries in parallel
    const [
      harvestsRes,
      listingsRes,
      sellersRes,
      phonesRes,
      // Seller tiers
      sellerWhalesRes,
      sellerBigFishRes,
      sellerRegularsRes,
      sellerSmallFishRes,
      sellerVisitorsRes,
      sellerMonthlyValueRes,
      // Buyer tiers
      buyerWhaleBuyersRes,
      buyerBigBuyersRes,
      buyerRegularBuyersRes,
      buyerSmallBuyersRes,
      buyerColdBuyersRes,
      buyerTotalValueRes,
      // Buyer readiness
      buyerReadyNowRes,
      buyerActivelySearchingRes,
      buyerInterestedRes,
      // Chart
      chartRes,
    ] = await Promise.all([
      // Today's harvests
      supabase
        .from("ahe_harvest_jobs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`),
      // Listings today
      supabase
        .from("ahe_listings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`)
        .eq("is_duplicate", false),
      // Sellers today
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`),
      // Phones today
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .not("phone", "is", null)
        .gte("created_at", `${today}T00:00:00`),

      // ═══ Seller Tiers ═══
      supabase.from("ahe_sellers").select("id", { count: "exact", head: true }).eq("seller_tier", "whale"),
      supabase.from("ahe_sellers").select("id", { count: "exact", head: true }).eq("seller_tier", "big_fish"),
      supabase.from("ahe_sellers").select("id", { count: "exact", head: true }).eq("seller_tier", "regular"),
      supabase.from("ahe_sellers").select("id", { count: "exact", head: true }).eq("seller_tier", "small_fish"),
      supabase.from("ahe_sellers").select("id", { count: "exact", head: true }).eq("seller_tier", "visitor"),
      supabase.from("ahe_sellers").select("estimated_monthly_value").not("estimated_monthly_value", "is", null).gt("estimated_monthly_value", 0),

      // ═══ Buyer Tiers ═══
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "whale_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "big_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "regular_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "small_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "cold_buyer"),
      supabase.from("bhe_buyers").select("estimated_purchase_value").not("estimated_purchase_value", "is", null).gt("estimated_purchase_value", 0),

      // ═══ Buyer Readiness ═══
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("purchase_readiness", "ready_now"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("purchase_readiness", "actively_searching"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("purchase_readiness", "interested"),

      // Chart
      supabase
        .from("ahe_daily_metrics")
        .select("metric_date, total_listings_new, total_phones_extracted")
        .gte("metric_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("metric_date", { ascending: true }),
    ]);

    // Calculate totals
    const sellerMonthlyValue = (sellerMonthlyValueRes.data || []).reduce(
      (sum: number, row: { estimated_monthly_value: number }) => sum + (row.estimated_monthly_value || 0), 0
    );

    const buyerTotalValue = (buyerTotalValueRes.data || []).reduce(
      (sum: number, row: { estimated_purchase_value: number }) => sum + (row.estimated_purchase_value || 0), 0
    );

    // Build chart data
    const chartData: { date: string; listings: number; phones: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const metric = chartRes.data?.find((m) => m.metric_date === dateStr);
      chartData.push({
        date: dateStr,
        listings: metric?.total_listings_new || 0,
        phones: metric?.total_phones_extracted || 0,
      });
    }

    return NextResponse.json({
      today: {
        harvests: harvestsRes.count || 0,
        listings: listingsRes.count || 0,
        sellers: sellersRes.count || 0,
        phones: phonesRes.count || 0,
        whales: sellerWhalesRes.count || 0,
        contacted: 0,
        signed_up: 0,
        lost: 0,
      },
      tiers: {
        whale: sellerWhalesRes.count || 0,
        big_fish: sellerBigFishRes.count || 0,
        regular: sellerRegularsRes.count || 0,
        small_fish: sellerSmallFishRes.count || 0,
        visitor: sellerVisitorsRes.count || 0,
      },
      estimated_monthly_value: sellerMonthlyValue,
      buyer_tiers: {
        whale_buyer: buyerWhaleBuyersRes.count || 0,
        big_buyer: buyerBigBuyersRes.count || 0,
        regular_buyer: buyerRegularBuyersRes.count || 0,
        small_buyer: buyerSmallBuyersRes.count || 0,
        cold_buyer: buyerColdBuyersRes.count || 0,
      },
      buyer_readiness: {
        ready_now: buyerReadyNowRes.count || 0,
        actively_searching: buyerActivelySearchingRes.count || 0,
        interested: buyerInterestedRes.count || 0,
      },
      buyer_total_purchase_value: buyerTotalValue,
      chart: chartData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطأ في الخادم",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
