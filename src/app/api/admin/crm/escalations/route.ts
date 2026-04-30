/**
 * GET /api/admin/crm/escalations
 *
 * Returns conversations Ahmed has handed off to a human. A conversation
 * lands in the escalation queue when:
 *   1. wa_conversations.status = 'escalated' (Ahmed wrote [ESCALATE]
 *      or the intent classifier flagged anger / want_human)
 *   2. ahe_sellers.pipeline_status = 'needs_human_review' (carried via
 *      the same flow)
 *
 * Each row carries the recent message thread so the human can read
 * what happened before responding.
 *
 * PATCH /api/admin/crm/escalations
 * Body: { conversation_id, action: 'resolved' | 'reopened' }
 *   resolved → flips status to 'completed', clears
 *              ahe_sellers.pipeline_status back to 'contacted'.
 *   reopened → flips status back to 'active' so Ahmed handles new
 *              messages again.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const sb = getSupabase();

    const { data, error } = await sb
      .from("wa_conversations")
      .select(
        "id, seller_id, phone, customer_name, category, governorate, seller_type, listings_count, stage, status, ai_conversation_history, ai_last_intent, escalation_reason, last_message_at, messages_received, messages_sent, updated_at, created_at"
      )
      .eq("status", "escalated")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      escalations: data || [],
      total: data?.length || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, action } = body || {};
    if (!conversation_id) {
      return NextResponse.json(
        { error: "conversation_id required" },
        { status: 400 }
      );
    }
    if (!["resolved", "reopened"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'resolved' or 'reopened'" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // Get the conversation to find the seller_id
    const { data: conv } = await sb
      .from("wa_conversations")
      .select("id, seller_id")
      .eq("id", conversation_id)
      .single();

    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "resolved") {
      await sb
        .from("wa_conversations")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation_id);

      if (conv.seller_id) {
        // Send seller back to "contacted" so they show up again in the
        // outreach pipeline normally, not in the escalation queue.
        await sb
          .from("ahe_sellers")
          .update({
            pipeline_status: "contacted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", conv.seller_id)
          .eq("pipeline_status", "needs_human_review");

        await sb.from("outreach_logs").insert({
          seller_id: conv.seller_id,
          action: "ahmed:escalation:resolved",
          notes: null,
        });
      }
    } else {
      // Reopen → let Ahmed handle the next inbound again
      await sb
        .from("wa_conversations")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation_id);

      if (conv.seller_id) {
        await sb.from("outreach_logs").insert({
          seller_id: conv.seller_id,
          action: "ahmed:escalation:reopened",
          notes: null,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
