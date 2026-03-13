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
 * Dashboard statistics for buyer harvesting
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const today = new Date().toISOString().split("T")[0];

    // Total buyers discovered today
    const { count: discoveredToday } = await supabase
      .from("bhe_buyers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`)
      .eq("is_duplicate", false);

    // With phones today
    const { count: withPhonesToday } = await supabase
      .from("bhe_buyers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`)
      .not("buyer_phone", "is", null)
      .eq("is_duplicate", false);

    // Hot buyers today
    const { count: hotToday } = await supabase
      .from("bhe_buyers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`)
      .eq("buyer_tier", "hot_buyer")
      .eq("is_duplicate", false);

    // Matched today
    const { count: matchedToday } = await supabase
      .from("bhe_buyers")
      .select("*", { count: "exact", head: true })
      .gte("last_matched_at", `${today}T00:00:00`)
      .gt("matches_count", 0)
      .eq("is_duplicate", false);

    // Contacted today
    const { count: contactedToday } = await supabase
      .from("bhe_buyers")
      .select("*", { count: "exact", head: true })
      .gte("contacted_at", `${today}T00:00:00`)
      .eq("is_duplicate", false);

    // Signed up (all time)
    const { count: signedUp } = await supabase
      .from("bhe_buyers")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_status", "signed_up")
      .eq("is_duplicate", false);

    // Total all-time
    const { count: totalAll } = await supabase
      .from("bhe_buyers")
      .select("*", { count: "exact", head: true })
      .eq("is_duplicate", false);

    return NextResponse.json({
      today: {
        discovered: discoveredToday || 0,
        with_phones: withPhonesToday || 0,
        hot: hotToday || 0,
        matched: matchedToday || 0,
        contacted: contactedToday || 0,
        signed_up: signedUp || 0,
      },
      total: totalAll || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
