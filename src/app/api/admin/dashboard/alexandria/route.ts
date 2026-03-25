/**
 * GET /api/admin/dashboard/alexandria — Alexandria-focused dashboard data
 * Cars + Properties only
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const ALEX_GOVS = ["الإسكندرية", "alexandria", "الاسكندرية"];

export async function GET() {
  try {
    const sb = getSupabase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // ─── Seller counts ───
    const [carsTotal, carsWithPhone, propsTotal, propsWithPhone] = await Promise.all([
      sb.from("ahe_sellers").select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS).eq("primary_category", "vehicles"),
      sb.from("ahe_sellers").select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS).eq("primary_category", "vehicles").not("phone", "is", null),
      sb.from("ahe_sellers").select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS).eq("primary_category", "properties"),
      sb.from("ahe_sellers").select("id", { count: "exact", head: true })
        .in("primary_governorate", ALEX_GOVS).eq("primary_category", "properties").not("phone", "is", null),
    ]);

    // ─── Outreach counts ───
    const [waleedToday, waleedWeek, ahmedToday, ahmedWeek] = await Promise.all([
      sb.from("outreach_logs").select("id", { count: "exact", head: true })
        .eq("action", "sent").eq("agent_name", "waleed").gte("created_at", todayStart.toISOString()),
      sb.from("outreach_logs").select("id", { count: "exact", head: true })
        .eq("action", "sent").eq("agent_name", "waleed").gte("created_at", weekStart.toISOString()),
      sb.from("outreach_logs").select("id", { count: "exact", head: true })
        .eq("action", "sent").eq("agent_name", "ahmed").gte("created_at", todayStart.toISOString()),
      sb.from("outreach_logs").select("id", { count: "exact", head: true })
        .eq("action", "sent").eq("agent_name", "ahmed").gte("created_at", weekStart.toISOString()),
    ]);

    // ─── Growth chart (last 7 days) ───
    const growthChart: Array<{ date: string; cars: number; properties: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [carsDay, propsDay] = await Promise.all([
        sb.from("ahe_sellers").select("id", { count: "exact", head: true })
          .in("primary_governorate", ALEX_GOVS).eq("primary_category", "vehicles")
          .gte("created_at", dayStart.toISOString()).lt("created_at", dayEnd.toISOString()),
        sb.from("ahe_sellers").select("id", { count: "exact", head: true })
          .in("primary_governorate", ALEX_GOVS).eq("primary_category", "properties")
          .gte("created_at", dayStart.toISOString()).lt("created_at", dayEnd.toISOString()),
      ]);

      growthChart.push({
        date: dayStart.toISOString().split("T")[0],
        cars: carsDay.count || 0,
        properties: propsDay.count || 0,
      });
    }

    // ─── Harvest status — Alexandria scopes only ───
    const { data: scopes } = await sb
      .from("ahe_scopes")
      .select("code, source_platform, maksab_category, last_harvest_at, last_harvest_new_listings, is_paused, is_active")
      .in("governorate", ALEX_GOVS)
      .in("maksab_category", ["vehicles", "properties"])
      .eq("is_active", true)
      .order("source_platform");

    // Count today's listings per scope
    const harvestStatus = await Promise.all(
      (scopes || []).map(async (scope) => {
        const { count } = await sb
          .from("ahe_listings")
          .select("id", { count: "exact", head: true })
          .eq("scope_id", scope.code)
          .gte("created_at", todayStart.toISOString());

        return {
          code: scope.code,
          platform: scope.source_platform,
          category: scope.maksab_category,
          last_harvest_at: scope.last_harvest_at,
          listings_today: count || 0,
          is_paused: scope.is_paused || false,
        };
      })
    );

    return NextResponse.json({
      alexCarsSellers: carsTotal.count || 0,
      alexCarsWithPhone: carsWithPhone.count || 0,
      alexPropertiesSellers: propsTotal.count || 0,
      alexPropertiesWithPhone: propsWithPhone.count || 0,
      waleedMessagesToday: waleedToday.count || 0,
      waleedMessagesWeek: waleedWeek.count || 0,
      ahmedMessagesToday: ahmedToday.count || 0,
      ahmedMessagesWeek: ahmedWeek.count || 0,
      growthChart,
      harvestStatus,
    });
  } catch (err) {
    console.error("[ALEX-DASHBOARD]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
