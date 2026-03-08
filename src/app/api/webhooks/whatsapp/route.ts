// WhatsApp Cloud API Webhook Handler
// Receives incoming messages and status updates from Meta
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { analyzeResponse } from "@/lib/crm/ai/analyze-response";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'maksab_webhook_verify';

// GET: WhatsApp webhook verification (required by Meta)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Incoming WhatsApp messages and status updates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // WhatsApp Cloud API sends an array of entries
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;

        // Handle status updates (sent, delivered, read)
        if (value.statuses) {
          await handleStatusUpdates(value.statuses);
        }

        // Handle incoming messages
        if (value.messages) {
          const contacts = value.contacts || [];
          await handleIncomingMessages(value.messages, contacts);
        }
      }
    }

    // Always return 200 to acknowledge receipt (Meta requirement)
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    // Still return 200 — Meta will retry if we return error
    return NextResponse.json({ status: "ok" });
  }
}

async function handleStatusUpdates(statuses: Array<{
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}>) {
  const supabase = getServiceClient();

  for (const status of statuses) {
    // Map WhatsApp status to our status
    const statusMap: Record<string, string> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };

    const mappedStatus = statusMap[status.status];
    if (!mappedStatus) continue;

    // Update conversation record by external_message_id
    const { error } = await supabase
      .from("crm_conversations")
      .update({
        external_status: mappedStatus,
        ...(mappedStatus === 'delivered' ? { delivered_at: new Date(parseInt(status.timestamp) * 1000).toISOString() } : {}),
        ...(mappedStatus === 'read' ? { read_at: new Date(parseInt(status.timestamp) * 1000).toISOString() } : {}),
        ...(mappedStatus === 'failed' ? {
          status: 'failed',
          failure_reason: status.errors?.[0]?.title || 'WhatsApp delivery failed',
        } : {}),
      })
      .eq("external_message_id", status.id);

    if (error) {
      console.error(`[WhatsApp Webhook] Status update failed for ${status.id}:`, error.message);
    }
  }
}

async function handleIncomingMessages(
  messages: Array<{
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: { id: string; caption?: string };
  }>,
  contacts: Array<{ profile?: { name: string }; wa_id: string }>
) {
  const supabase = getServiceClient();

  for (const msg of messages) {
    // Only handle text messages for now
    const content = msg.type === 'text' ? msg.text?.body :
                    msg.type === 'image' ? (msg.image?.caption || '[صورة]') :
                    `[${msg.type}]`;

    if (!content) continue;

    // Find contact info
    const contact = contacts.find(c => c.wa_id === msg.from);
    const senderName = contact?.profile?.name || '';

    // Normalize phone: WhatsApp sends as 201xxxxxxxxx, we store as 01xxxxxxxxx
    const normalizedPhone = msg.from.startsWith('2') ? '0' + msg.from.substring(1) : msg.from;

    // Find the customer by phone/whatsapp
    const { data: customer } = await supabase
      .from("crm_customers")
      .select("id, full_name, phone, lifecycle_stage, assigned_agent_id")
      .or(`phone.eq.${normalizedPhone},whatsapp.eq.${normalizedPhone},whatsapp.eq.${msg.from}`)
      .single();

    if (!customer) {
      console.log(`[WhatsApp Webhook] Unknown sender: ${msg.from} (${senderName})`);
      // Could auto-create customer here in the future
      continue;
    }

    // Analyze the message with AI
    const analysis = analyzeResponse(content);

    // Create inbound conversation record
    const { data: conversation, error: convError } = await supabase
      .from("crm_conversations")
      .insert({
        customer_id: customer.id,
        channel: 'whatsapp',
        direction: 'inbound',
        message_type: msg.type === 'text' ? 'text' : 'media',
        content,
        status: 'received',
        external_message_id: msg.id,
        external_status: 'received',
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        ai_suggested_response: analysis.suggestedResponse,
        requires_human_response: analysis.requiresHuman,
        agent_id: customer.assigned_agent_id,
        received_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (convError) {
      console.error(`[WhatsApp Webhook] Failed to save message from ${msg.from}:`, convError.message);
      continue;
    }

    // Update customer response tracking
    const updateData: Record<string, unknown> = {
      last_response_at: new Date().toISOString(),
      last_response_channel: 'whatsapp',
      last_response_sentiment: analysis.sentiment,
      has_responded: true,
    };

    // If they showed interest, update lifecycle
    if (analysis.intent === 'interested' || analysis.intent === 'purchase_intent') {
      if (customer.lifecycle_stage === 'lead' || customer.lifecycle_stage === 'prospect') {
        updateData.lifecycle_stage = 'interested';
      }
    }

    // If they want to unsubscribe
    if (analysis.shouldMarkDoNotContact) {
      updateData.do_not_contact = true;
    }

    await supabase
      .from("crm_customers")
      .update(updateData)
      .eq("id", customer.id);

    // Stop campaign messages if needed
    if (analysis.shouldStopCampaign) {
      // Cancel any queued messages for this customer
      await supabase
        .from("crm_conversations")
        .update({ status: 'cancelled' })
        .eq("customer_id", customer.id)
        .eq("status", "queued");
    }

    // Log activity
    await supabase
      .from("crm_activity_log")
      .insert({
        customer_id: customer.id,
        activity_type: "message_received",
        description: `رد العميل عبر واتساب: ${content.substring(0, 80)}`,
        metadata: {
          channel: 'whatsapp',
          conversation_id: conversation?.id,
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          requires_human: analysis.requiresHuman,
        },
        is_system: true,
      });

    // If auto-response is appropriate and we have one, send it
    if (analysis.suggestedResponse && !analysis.requiresHuman && !analysis.shouldMarkDoNotContact) {
      await sendAutoResponse(supabase, customer.id, msg.from, analysis.suggestedResponse);
    }
  }
}

async function sendAutoResponse(
  supabase: ReturnType<typeof getServiceClient>,
  customerId: string,
  recipientPhone: string,
  content: string
) {
  // Import channel sender dynamically to avoid circular deps
  const { sendMessage } = await import("@/lib/crm/channels");

  const result = await sendMessage('whatsapp', {
    to: recipientPhone,
    content,
  });

  // Record the auto-response
  await supabase
    .from("crm_conversations")
    .insert({
      customer_id: customerId,
      channel: 'whatsapp',
      direction: 'outbound',
      message_type: 'text',
      content,
      status: result.success ? 'sent' : 'failed',
      external_message_id: result.externalMessageId || null,
      is_automated: true,
      sent_at: new Date().toISOString(),
    });
}
