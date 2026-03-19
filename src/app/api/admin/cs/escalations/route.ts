/**
 * GET  /api/admin/cs/escalations — Fetch real escalations from admin_alerts
 * POST /api/admin/cs/escalations — Admin responds to or resolves escalation
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

    const { data: alerts, error } = await sb
      .from("admin_alerts")
      .select("*")
      .eq("type", "cs_escalation")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[ESCALATIONS] Fetch error:", error.message);
      return NextResponse.json({ escalations: [], stats: { total: 0, pending: 0, resolved: 0 } });
    }

    const escalations = (alerts || []).map((a: any) => ({
      id: a.id,
      conversation_id: a.conversation_id || "",
      customer_name: a.user_name || "مستخدم",
      customer_phone: "",
      customer_type: "individual" as const,
      priority: a.priority === "critical" ? "urgent" : "medium",
      reason: a.issue_summary || a.message,
      time_ago: getTimeAgo(a.created_at),
      status: a.resolved ? "resolved" : "pending",
      resolved_at: a.resolved_at ? getTimeAgo(a.resolved_at) : undefined,
      admin_response: a.admin_response || null,
    }));

    const pending = escalations.filter((e: any) => e.status === "pending").length;
    const resolved = escalations.filter((e: any) => e.status === "resolved").length;

    return NextResponse.json({
      escalations,
      stats: { total: escalations.length, pending, resolved },
    });
  } catch (err: any) {
    console.error("[ESCALATIONS] Error:", err.message);
    return NextResponse.json({ escalations: [], stats: { total: 0, pending: 0, resolved: 0 } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = getServiceClient();
    const body = await req.json();
    const { action, escalation_id, response, admin_id } = body;

    if (action === "respond") {
      // Admin responds to escalation
      if (!escalation_id || !response) {
        return NextResponse.json({ error: "مطلوب" }, { status: 400 });
      }

      // Update the escalation alert
      await sb
        .from("admin_alerts")
        .update({
          admin_response: response,
          responded_at: new Date().toISOString(),
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", escalation_id);

      // Get the conversation_id to send admin's response via Sara
      const { data: alert } = await sb
        .from("admin_alerts")
        .select("conversation_id")
        .eq("id", escalation_id)
        .maybeSingle();

      if (alert?.conversation_id) {
        // Insert admin response as a message in the CS conversation
        await sb.from("cs_messages").insert({
          conversation_id: alert.conversation_id,
          sender_type: "agent",
          sender_name: "ممدوح (المشرف)",
          message: response,
          message_type: "text",
        });

        // Update conversation status
        await sb
          .from("cs_conversations")
          .update({ status: "agent_handling" })
          .eq("id", alert.conversation_id);
      }

      // Log human decision
      await sb.from("human_decisions").insert({
        decision_type: "escalation_response",
        context: `تصعيد #${escalation_id}`,
        decision: response,
        admin_id: admin_id || null,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "resolve") {
      if (!escalation_id) {
        return NextResponse.json({ error: "مطلوب" }, { status: 400 });
      }

      await sb
        .from("admin_alerts")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", escalation_id);

      // Log human decision
      await sb.from("human_decisions").insert({
        decision_type: "escalation_resolved",
        context: `تصعيد #${escalation_id}`,
        decision: "تم الحل",
        admin_id: admin_id || null,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[ESCALATIONS] POST error:", err.message);
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
