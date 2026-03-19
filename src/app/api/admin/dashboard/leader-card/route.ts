/**
 * GET /api/admin/dashboard/leader-card — Aggregated data for the leader card
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getSupabase();
    const today = new Date().toISOString().split("T")[0];

    // Parallel fetches
    const [moderationRes, outreachRes, csRes, alertsRes, targetRes] = await Promise.all([
      // Pending moderation
      sb
        .from("listing_moderation")
        .select("*", { count: "exact", head: true })
        .eq("decision", "review")
        .is("human_decision", null),

      // Outreach sent today
      sb
        .from("ai_interactions")
        .select("*", { count: "exact", head: true })
        .eq("agent", "waleed")
        .gte("created_at", today),

      // CS conversations today
      sb
        .from("cs_conversations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today),

      // Unresolved alerts (non-escalation, non-report)
      sb
        .from("admin_alerts")
        .select("id, message, priority, type")
        .eq("resolved", false)
        .not("type", "in", '("cs_escalation","nora_daily_report")')
        .order("created_at", { ascending: false })
        .limit(5),

      // Today's outreach target
      sb
        .from("daily_outreach_targets")
        .select("message_count")
        .eq("target_date", today)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      pendingModeration: moderationRes.count || 0,
      outreachSentToday: outreachRes.count || 0,
      csConversationsToday: csRes.count || 0,
      outreachTarget: targetRes.data?.message_count || 50,
      alerts: alertsRes.data || [],
    });
  } catch (err: any) {
    console.error("[LEADER-CARD] Error:", err.message);
    return NextResponse.json({
      pendingModeration: 0,
      outreachSentToday: 0,
      csConversationsToday: 0,
      outreachTarget: 50,
      alerts: [],
    });
  }
}
