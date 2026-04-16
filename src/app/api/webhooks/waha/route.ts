/**
 * POST /api/webhooks/waha
 *
 * Receives webhooks from WAHA (self-hosted WhatsApp).
 * Events: message (incoming), session.status (connected/disconnected/qr)
 *
 * Configure in WAHA env: WHATSAPP_HOOK_URL=https://maksab.vercel.app/api/webhooks/waha
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface WahaWebhookPayload {
  event: string;
  session: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}

export async function POST(req: NextRequest) {
  try {
    // Optional: verify webhook signature if WAHA_WEBHOOK_SECRET set
    const expectedSecret = process.env.WAHA_WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = req.headers.get("x-webhook-secret") || "";
      if (provided !== expectedSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body: WahaWebhookPayload = await req.json();

    if (body.event === "message") {
      await handleIncomingMessage(body.payload);
    } else if (body.event === "session.status") {
      console.log(`[WAHA Webhook] Session ${body.session} status:`, body.payload.status);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WAHA Webhook] Error:", err);
    // Always return 200 to prevent retries on internal errors
    return NextResponse.json({ ok: true });
  }
}

async function handleIncomingMessage(payload: Record<string, unknown>) {
  // WAHA message payload structure:
  // {
  //   id: "msg_id",
  //   from: "201xxxxxxxxx@c.us",
  //   body: "message text",
  //   fromMe: false,
  //   timestamp: 1234567890,
  //   notifyName: "User Name"
  // }

  const from = String(payload.from || "");
  const body = String(payload.body || "");
  const fromMe = !!payload.fromMe;
  const messageId = String(payload.id || "");
  const senderName = String(payload.notifyName || "");

  // Only handle incoming (not echo of our own messages)
  if (fromMe) return;

  // Extract phone from chatId (format: 201xxxxxxxxx@c.us → 01xxxxxxxxx)
  const phone = from.replace(/@.*/, "").replace(/^2/, "0");
  if (!phone || phone.length < 10) return;

  console.log(`[WAHA Webhook] Incoming from ${phone} (${senderName}): ${body.substring(0, 80)}`);

  const sb = getSupabase();

  // Find seller by phone
  const { data: seller } = await sb
    .from("ahe_sellers")
    .select("id, name, pipeline_status")
    .or(`phone.eq.${phone},phone.eq.0${phone.substring(1)}`)
    .maybeSingle();

  if (seller) {
    // Update seller as having responded
    await sb.from("ahe_sellers").update({
      last_response_at: new Date().toISOString(),
      pipeline_status: seller.pipeline_status === "registered"
        ? "registered" // Keep registered if already
        : "interested", // Otherwise mark as interested
      updated_at: new Date().toISOString(),
    }).eq("id", seller.id);

    // Log the response
    await sb.from("outreach_logs").insert({
      seller_id: seller.id,
      action: "responded",
      agent_name: "system",
      notes: `[WAHA INBOUND ${messageId}] ${senderName}: ${body.substring(0, 200)}`,
    });

    // TODO: AI response analysis + auto-reply
  } else {
    console.log(`[WAHA Webhook] Unknown sender: ${phone}`);
  }
}

// GET — health check
export async function GET() {
  return NextResponse.json({ ok: true, service: "waha-webhook" });
}
