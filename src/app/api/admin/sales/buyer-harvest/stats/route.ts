import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/admin/sales/buyer-harvest/stats
 * Dashboard statistics for buyer harvesting + tier breakdown
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const today = new Date().toISOString().split("T")[0];

    const [
      discoveredTodayRes,
      withPhonesTodayRes,
      hotTodayRes,
      matchedTodayRes,
      contactedTodayRes,
      signedUpRes,
      totalAllRes,
      // Buyer Whale Tiers
      whaleBuyersRes,
      bigBuyersRes,
      regularBuyersRes,
      smallBuyersRes,
      coldBuyersRes,
      // Readiness
      readyNowRes,
      activelySearchingRes,
      interestedRes,
      // Total purchase value
      purchaseValueRes,
    ] = await Promise.all([
      supabase.from("bhe_buyers").select("*", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`).eq("is_duplicate", false),
      supabase.from("bhe_buyers").select("*", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`).not("buyer_phone", "is", null).eq("is_duplicate", false),
      supabase.from("bhe_buyers").select("*", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`).eq("buyer_tier", "hot_buyer").eq("is_duplicate", false),
      supabase.from("bhe_buyers").select("*", { count: "exact", head: true }).gte("last_matched_at", `${today}T00:00:00`).gt("matches_count", 0).eq("is_duplicate", false),
      supabase.from("bhe_buyers").select("*", { count: "exact", head: true }).gte("contacted_at", `${today}T00:00:00`).eq("is_duplicate", false),
      supabase.from("bhe_buyers").select("*", { count: "exact", head: true }).eq("pipeline_status", "signed_up").eq("is_duplicate", false),
      supabase.from("bhe_buyers").select("*", { count: "exact", head: true }).eq("is_duplicate", false),
      // Tiers
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "whale_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "big_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "regular_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "small_buyer"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("buyer_tier", "cold_buyer"),
      // Readiness
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("purchase_readiness", "ready_now"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("purchase_readiness", "actively_searching"),
      supabase.from("bhe_buyers").select("id", { count: "exact", head: true }).eq("purchase_readiness", "interested"),
      // Total value
      supabase.from("bhe_buyers").select("estimated_purchase_value").not("estimated_purchase_value", "is", null).gt("estimated_purchase_value", 0),
    ]);

    const totalPurchaseValue = (purchaseValueRes.data || []).reduce(
      (sum: number, row: { estimated_purchase_value: number }) => sum + (row.estimated_purchase_value || 0), 0
    );

    return NextResponse.json({
      today: {
        discovered: discoveredTodayRes.count || 0,
        with_phones: withPhonesTodayRes.count || 0,
        hot: hotTodayRes.count || 0,
        matched: matchedTodayRes.count || 0,
        contacted: contactedTodayRes.count || 0,
        signed_up: signedUpRes.count || 0,
      },
      total: totalAllRes.count || 0,
      buyer_tiers: {
        whale_buyer: whaleBuyersRes.count || 0,
        big_buyer: bigBuyersRes.count || 0,
        regular_buyer: regularBuyersRes.count || 0,
        small_buyer: smallBuyersRes.count || 0,
        cold_buyer: coldBuyersRes.count || 0,
      },
      buyer_readiness: {
        ready_now: readyNowRes.count || 0,
        actively_searching: activelySearchingRes.count || 0,
        interested: interestedRes.count || 0,
      },
      buyer_total_purchase_value: totalPurchaseValue,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
