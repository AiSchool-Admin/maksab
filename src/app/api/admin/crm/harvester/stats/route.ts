/**
 * AHE Stats API
 * GET — إحصائيات Dashboard + بيانات الرسم البياني
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET() {
  const supabase = getServiceClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // Today's stats - run queries in parallel
    const [
      harvestsRes,
      listingsRes,
      sellersRes,
      phonesRes,
      whalesRes,
      chartRes,
    ] = await Promise.all([
      // Harvests today
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
      // Total whales
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("is_whale", true),
      // Last 7 days chart data from ahe_daily_metrics
      supabase
        .from("ahe_daily_metrics")
        .select("metric_date, total_listings_new, total_phones_extracted")
        .gte(
          "metric_date",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        )
        .order("metric_date", { ascending: true }),
    ]);

    // Build chart data - fill in missing days
    const chartData: { date: string; listings: number; phones: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const metric = chartRes.data?.find(
        (m) => m.metric_date === dateStr
      );
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
        whales: whalesRes.count || 0,
        contacted: 0, // TODO: implement when outreach is built
        signed_up: 0,
        lost: 0,
      },
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
