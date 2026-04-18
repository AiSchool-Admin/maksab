/**
 * POST /api/admin/sales/crm/[id]/message
 *
 * Send a message to a seller from the Seller 360 page.
 * Supports channel selection: "whatsapp_cloud" | "waha" | "sms" | "auto"
 *
 * "auto" tries in order: WA Cloud → WAHA → SMS
 *
 * Request body:
 *   {
 *     content: "Free-form text message",
 *     channel?: "auto" | "whatsapp_cloud" | "waha" | "sms",
 *     template_name?: "account_ready", // WA Cloud only
 *     template_params?: ["https://..."],
 *     agent_name?: "nadia" // defaults to session user
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWhatsAppProvider } from "@/lib/crm/channels/whatsapp";
import { getWahaProvider } from "@/lib/crm/channels/waha";
import { getSmsProvider } from "@/lib/crm/channels/sms";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface SendMessageBody {
  content: string;
  channel?: "auto" | "whatsapp_cloud" | "waha" | "sms";
  template_name?: string;
  template_params?: string[];
  agent_name?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: SendMessageBody = await req.json();

    if (!body.content && !body.template_name) {
      return NextResponse.json(
        { error: "content or template_name is required" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // 1. Get seller phone
    const { data: seller } = await sb
      .from("ahe_sellers")
      .select("phone, name")
      .eq("id", id)
      .single();

    if (!seller?.phone) {
      return NextResponse.json({ error: "Seller has no phone" }, { status: 400 });
    }

    const channel = body.channel || "auto";
    const agentName = body.agent_name || "agent";

    let result: {
      success: boolean;
      channel: "whatsapp_cloud" | "waha" | "sms" | "none";
      messageId: string | null;
      error: string | null;
    } = {
      success: false,
      channel: "none",
      messageId: null,
      error: null,
    };

    // ─── Try WhatsApp Cloud API ────────────────────────────────
    if (channel === "auto" || channel === "whatsapp_cloud") {
      try {
        const wa = getWhatsAppProvider();
        if (wa.isConfigured() && body.template_name) {
          const r = await wa.sendTemplate({
            to: seller.phone,
            templateName: body.template_name,
            languageCode: "en",
            components: body.template_params && body.template_params.length > 0
              ? [{
                  type: "body",
                  parameters: body.template_params.map((p) => ({ type: "text" as const, text: p })),
                }]
              : [],
          });
          if (r.success) {
            result = {
              success: true,
              channel: "whatsapp_cloud",
              messageId: r.externalMessageId || null,
              error: null,
            };
          } else {
            result.error = `WA Cloud: ${r.error}`;
          }
        }
      } catch (e) {
        result.error = `WA Cloud: ${e instanceof Error ? e.message : "Unknown"}`;
      }
    }

    // ─── Try WAHA ──────────────────────────────────────────────
    if (!result.success && (channel === "auto" || channel === "waha")) {
      try {
        const waha = getWahaProvider();
        if (waha.isConfigured() && body.content) {
          const r = await waha.send({
            to: seller.phone,
            content: body.content,
          });
          if (r.success) {
            result = {
              success: true,
              channel: "waha",
              messageId: r.externalMessageId || null,
              error: null,
            };
          } else {
            result.error = `${result.error || ""} | WAHA: ${r.error}`;
          }
        }
      } catch (e) {
        result.error = `${result.error || ""} | WAHA: ${e instanceof Error ? e.message : "Unknown"}`;
      }
    }

    // ─── Try SMS ───────────────────────────────────────────────
    if (!result.success && (channel === "auto" || channel === "sms")) {
      try {
        const sms = getSmsProvider();
        if (sms.getProviderName() !== "none" && body.content) {
          const r = await sms.send({
            to: seller.phone,
            content: body.content,
          });
          if (r.success) {
            result = {
              success: true,
              channel: "sms",
              messageId: r.externalMessageId || null,
              error: null,
            };
          } else {
            result.error = `${result.error || ""} | SMS: ${r.error}`;
          }
        }
      } catch (e) {
        result.error = `${result.error || ""} | SMS: ${e instanceof Error ? e.message : "Unknown"}`;
      }
    }

    // 2. Log to outreach_logs
    const snippet = (body.content || body.template_name || "").substring(0, 200);
    await sb.from("outreach_logs").insert({
      seller_id: id,
      action: result.success ? "sent" : "failed",
      agent_name: agentName,
      notes: result.success
        ? `[${result.channel.toUpperCase()} ${result.messageId}] ${snippet}`
        : `[FAILED ${result.error}] ${snippet}`,
      template_id: body.template_name || null,
    });

    // 3. Update seller stats on success
    if (result.success) {
      const { data: currentSeller } = await sb
        .from("ahe_sellers")
        .select("outreach_count, first_outreach_at, pipeline_status")
        .eq("id", id)
        .single();

      const updates: Record<string, unknown> = {
        last_outreach_at: new Date().toISOString(),
        outreach_count: (currentSeller?.outreach_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };

      // Set first_outreach_at if null
      if (!currentSeller?.first_outreach_at) {
        updates.first_outreach_at = new Date().toISOString();
      }

      // Auto-advance pipeline if still in early stages
      const currentStage = currentSeller?.pipeline_status;
      if (currentStage === null || currentStage === "discovered" || currentStage === "phone_found") {
        updates.pipeline_status = "contacted_1";
      } else if (currentStage === "contacted_1") {
        updates.pipeline_status = "contacted_2";
      }

      await sb.from("ahe_sellers").update(updates).eq("id", id);
    }

    if (!result.success) {
      const noChannelConfigured =
        !getWhatsAppProvider().isConfigured() &&
        !getWahaProvider().isConfigured() &&
        getSmsProvider().getProviderName() === "none";

      return NextResponse.json(
        {
          success: false,
          error: noChannelConfigured
            ? "لا يوجد قناة إرسال متاحة. أضف WAHA أو SMS Misr في env vars."
            : result.error || "فشل الإرسال من كل القنوات",
          channel_tried: channel,
          channels_configured: {
            whatsapp_cloud: getWhatsAppProvider().isConfigured(),
            waha: getWahaProvider().isConfigured(),
            sms: getSmsProvider().getProviderName() !== "none",
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      channel: result.channel,
      message_id: result.messageId,
    });
  } catch (err) {
    console.error("[sales/crm/[id]/message] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
