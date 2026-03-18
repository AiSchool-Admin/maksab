/**
 * GET  /api/admin/ai/team-stats — AI Team dashboard data
 * POST /api/admin/ai/team-stats — Resolve alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Fetch all data in parallel
    const [interactionsRes, todayInteractionsRes, moderationRes, alertsRes] = await Promise.all([
      // All-time interactions per agent
      sb.from("ai_interactions").select("agent, outcome"),
      // Today's interactions per agent
      sb.from("ai_interactions").select("agent, outcome").gte("created_at", todayISO),
      // Today's moderation stats
      sb.from("listing_moderation").select("decision").gte("created_at", todayISO),
      // Unresolved alerts (last 50)
      sb.from("admin_alerts")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Build agent stats
    const agents = ["sara", "waleed", "mazen", "nora"].map(agentId => {
      const allRows = (interactionsRes.data || []).filter((r: any) => r.agent === agentId);
      const todayRows = (todayInteractionsRes.data || []).filter((r: any) => r.agent === agentId);

      const outcomes: Record<string, number> = {};
      for (const row of allRows) {
        const o = (row as any).outcome || "pending";
        outcomes[o] = (outcomes[o] || 0) + 1;
      }

      return {
        agent: agentId,
        total: allRows.length,
        today: todayRows.length,
        outcomes,
      };
    });

    // Build moderation stats
    const modRows = moderationRes.data || [];
    const moderation = {
      total: modRows.length,
      approved: modRows.filter((r: any) => r.decision === "approve").length,
      rejected: modRows.filter((r: any) => r.decision === "reject").length,
      review: modRows.filter((r: any) => r.decision === "review").length,
    };

    return NextResponse.json({
      agents,
      moderation,
      alerts: alertsRes.data || [],
    });
  } catch (error) {
    console.error("[AI-TEAM-STATS] Error:", error);
    return NextResponse.json({ agents: [], moderation: { total: 0, approved: 0, rejected: 0, review: 0 }, alerts: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, alert_id } = await req.json();

    if (action === "resolve_alert" && alert_id) {
      const sb = getServiceClient();
      await sb
        .from("admin_alerts")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alert_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[AI-TEAM-STATS] POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
