/**
 * POST /api/whatsapp/send
 *
 * Send WhatsApp messages via Meta Cloud API.
 * Supports:
 * 1. Template messages with parameters (for outreach pipeline)
 * 2. Free-form text messages (for replies within 24h window)
 *
 * Auth: Requires admin session token or internal API key.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getWhatsAppProvider,
  type TemplateComponent,
} from "@/lib/crm/channels/whatsapp";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface SendRequest {
  /** Recipient phone (Egyptian format: 01xxxxxxxxx) */
  to: string;
  /** Template name (registered in Meta Business) */
  template_name?: string;
  /** Template body parameters: ["أحمد", "دوبيزل"] → {{1}}, {{2}} */
  template_params?: string[];
  /** Free-form text (only works within 24h reply window) */
  text?: string;
  /** Seller ID for logging */
  seller_id?: string;
  /** Pipeline action to record */
  pipeline_action?: string;
  /** Agent name (waleed/ahmed) */
  agent_name?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Basic auth check — admin token or internal key
    const authHeader = req.headers.get("authorization") || "";
    const internalKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const isInternal = authHeader === `Bearer ${internalKey}`;

    // Also accept admin session cookie/token
    const adminToken = req.headers.get("x-admin-token") ||
      req.cookies.get("admin_token")?.value;

    if (!isInternal && !adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SendRequest = await req.json();

    if (!body.to) {
      return NextResponse.json({ error: "to (phone) is required" }, { status: 400 });
    }

    if (!body.template_name && !body.text) {
      return NextResponse.json(
        { error: "Either template_name or text is required" },
        { status: 400 }
      );
    }

    const wa = getWhatsAppProvider();

    let result;

    if (body.template_name) {
      // Build template components from params array
      const components: TemplateComponent[] = [];

      if (body.template_params && body.template_params.length > 0) {
        components.push({
          type: "body",
          parameters: body.template_params.map((p) => ({
            type: "text" as const,
            text: p,
          })),
        });
      }

      result = await wa.sendTemplate({
        to: body.to,
        templateName: body.template_name,
        components,
      });
    } else {
      // Free-form text message (within 24h window)
      result = await wa.send({
        to: body.to,
        content: body.text!,
      });
    }

    // Log to database
    if (body.seller_id) {
      const sb = getSupabase();

      // Log outreach
      await sb.from("outreach_logs").insert({
        seller_id: body.seller_id,
        action: result.success ? "sent" : "failed",
        channel: "whatsapp_api",
        agent_name: body.agent_name || "system",
        notes: body.template_name
          ? `Template: ${body.template_name}`
          : `Text: ${(body.text || "").substring(0, 100)}`,
        external_message_id: result.externalMessageId || null,
      }).then(({ error }) => {
        if (error) console.error("[whatsapp/send] Log error:", error.message);
      });

      // Update pipeline status if action specified
      if (body.pipeline_action && result.success) {
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          last_outreach_at: new Date().toISOString(),
          last_outreach_template: body.template_name || null,
        };

        if (body.pipeline_action === "contacted_1") {
          updates.pipeline_status = "contacted_1";
        } else if (body.pipeline_action === "contacted_2") {
          updates.pipeline_status = "contacted_2";
        } else if (body.pipeline_action === "registered") {
          updates.pipeline_status = "registered";
        }

        await sb.from("ahe_sellers")
          .update(updates)
          .eq("id", body.seller_id);

        // Increment outreach count
        await sb.rpc("increment_outreach_count", { p_seller_id: body.seller_id })
          .then(({ error }) => {
            if (error) console.error("[whatsapp/send] Increment error:", error.message);
          });
      }
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Send failed", success: false },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message_id: result.externalMessageId,
    });
  } catch (err) {
    console.error("[whatsapp/send] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
