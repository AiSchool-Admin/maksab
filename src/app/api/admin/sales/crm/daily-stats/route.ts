/**
 * GET /api/admin/sales/crm/daily-stats
 *
 * Returns today's acquisition stats + recent events for live notifications.
 * Auto-refreshed every 30 seconds by the CRM list page.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const sb = getSupabase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Today's counts from outreach_logs
    const [registered, consented, contacted] = await Promise.all([
      sb.from("outreach_logs")
        .select("*", { count: "exact", head: true })
        .eq("action", "registered")
        .gte("created_at", todayISO),
      sb.from("outreach_logs")
        .select("*", { count: "exact", head: true })
        .eq("action", "consented")
        .gte("created_at", todayISO),
      sb.from("outreach_logs")
        .select("*", { count: "exact", head: true })
        .eq("action", "sent")
        .gte("created_at", todayISO),
    ]);

    // Recent events (last 10 important events from today)
    const { data: recentLogs } = await sb
      .from("outreach_logs")
      .select("seller_id, action, agent_name, notes, created_at")
      .in("action", ["registered", "consented", "sent", "stage_change"])
      .gte("created_at", todayISO)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get seller names for recent events
    const sellerIds = [...new Set((recentLogs || []).map((l) => l.seller_id))];
    const { data: sellers } = sellerIds.length > 0
      ? await sb
          .from("ahe_sellers")
          .select("id, name")
          .in("id", sellerIds)
      : { data: [] };

    const sellerMap = new Map((sellers || []).map((s) => [s.id, s.name || "بائع"]));

    const recentEvents = (recentLogs || []).map((log) => ({
      name: sellerMap.get(log.seller_id) || "بائع",
      action: log.action,
      time: new Date(log.created_at).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sellerId: log.seller_id,
    }));

    return NextResponse.json({
      registeredToday: registered.count || 0,
      consentedToday: consented.count || 0,
      contactedToday: contacted.count || 0,
      recentEvents,
    });
  } catch (err) {
    console.error("[daily-stats] Error:", err);
    return NextResponse.json({
      registeredToday: 0,
      consentedToday: 0,
      contactedToday: 0,
      recentEvents: [],
    });
  }
}
