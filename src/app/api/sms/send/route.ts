/**
 * POST /api/sms/send
 *
 * Send SMS via SMS Misr (Egyptian provider — cheapest for Egypt numbers).
 * Falls back to Twilio if SMS Misr not configured.
 *
 * Auth: Requires service role key or admin session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSmsProvider } from "@/lib/crm/channels/sms";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface SendSmsRequest {
  /** Recipient phone (Egyptian format: 01xxxxxxxxx) */
  to: string;
  /** SMS content (Arabic supported, 70 chars/message or English 160 chars) */
  content: string;
  /** Seller ID for logging */
  seller_id?: string;
  /** Agent name (system/waleed/ahmed) */
  agent_name?: string;
  /** Pipeline action to record */
  pipeline_action?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization") || "";
    const internalKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const isInternal = authHeader === `Bearer ${internalKey}`;
    const adminToken = req.headers.get("x-admin-token") ||
      req.cookies.get("admin_token")?.value;

    if (!isInternal && !adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SendSmsRequest = await req.json();

    if (!body.to || !body.content) {
      return NextResponse.json(
        { error: "to and content are required" },
        { status: 400 }
      );
    }

    if (body.content.length > 500) {
      return NextResponse.json(
        { error: "SMS content too long (max 500 chars)" },
        { status: 400 }
      );
    }

    const sms = getSmsProvider();
    const result = await sms.send({
      to: body.to,
      content: body.content,
    });

    // Log to outreach_logs if seller_id provided
    if (body.seller_id) {
      const sb = getSupabase();
      await sb.from("outreach_logs").insert({
        seller_id: body.seller_id,
        action: result.success ? "sent" : "failed",
        agent_name: body.agent_name || "system",
        notes: result.success
          ? `[SMS SENT ${result.externalMessageId}] ${sms.getProviderName()}: ${body.content.substring(0, 100)}`
          : `[SMS FAILED: ${result.error}] ${sms.getProviderName()}: ${body.content.substring(0, 50)}`,
      }).then(({ error }) => {
        if (error) console.error("[sms/send] Log error:", error.message);
      });

      // Update pipeline status if action specified
      if (body.pipeline_action && result.success) {
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          last_outreach_at: new Date().toISOString(),
        };

        if (body.pipeline_action === "contacted_1") {
          updates.pipeline_status = "contacted_1";
          updates.first_outreach_at = new Date().toISOString();
        } else if (body.pipeline_action === "contacted_2") {
          updates.pipeline_status = "contacted_2";
        }

        await sb.from("ahe_sellers")
          .update(updates)
          .eq("id", body.seller_id);

        await sb.rpc("increment_outreach_count", { p_seller_id: body.seller_id });
      }
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "SMS send failed", success: false },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message_id: result.externalMessageId,
      provider: sms.getProviderName(),
      cost_egp: result.cost,
    });
  } catch (err) {
    console.error("[sms/send] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
