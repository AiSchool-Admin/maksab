import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Match both Arabic and slug formats for backward compatibility
const ALEX_GOVS = ["الإسكندرية", "alexandria", "الاسكندرية"];

export async function GET() {
  try {
    const supabase = getSupabase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    // Alexandria car sellers
    const { count: alexCarsSellers } = await supabase
      .from("ahe_sellers")
      .select("id", { count: "exact", head: true })
      .in("primary_governorate", ALEX_GOVS)
      .eq("primary_category", "vehicles");

    // Alexandria property sellers
    const { count: alexPropertiesSellers } = await supabase
      .from("ahe_sellers")
      .select("id", { count: "exact", head: true })
      .in("primary_governorate", ALEX_GOVS)
      .eq("primary_category", "properties");

    // Waleed messages today (outreach for vehicles)
    const { count: waleedMessagesToday } = await supabase
      .from("ahe_outreach_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .eq("action", "sent");

    // Monthly revenue
    const { data: revenueData } = await supabase
      .from("revenue_transactions")
      .select("amount_egp")
      .gte("created_at", monthStart.toISOString())
      .eq("payment_status", "completed");

    const monthlyRevenue = (revenueData || []).reduce((sum, t) => sum + (t.amount_egp || 0), 0);

    // Last harvest per source
    const { data: lastHarvests } = await supabase
      .from("ahe_scopes")
      .select("source_platform, last_harvest_at")
      .eq("is_active", true)
      .eq("governorate", "الإسكندرية")
      .not("last_harvest_at", "is", null)
      .order("last_harvest_at", { ascending: false });

    // Deduplicate by platform
    const seenPlatforms = new Set<string>();
    const lastHarvestBySource = (lastHarvests || []).filter((h) => {
      if (seenPlatforms.has(h.source_platform)) return false;
      seenPlatforms.add(h.source_platform);
      return true;
    });

    return NextResponse.json({
      alexCarsSellers: alexCarsSellers || 0,
      alexPropertiesSellers: alexPropertiesSellers || 0,
      waleedMessagesToday: waleedMessagesToday || 0,
      ahmedMessagesToday: 0, // Will be split once ahmed has separate tracking
      monthlyRevenue,
      lastHarvestBySource,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
