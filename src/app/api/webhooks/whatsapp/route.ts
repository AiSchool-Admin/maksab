// WhatsApp Cloud API Webhook Handler
// Receives incoming messages and status updates from Meta
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { analyzeResponse } from "@/lib/crm/ai/analyze-response";
import { generateAhmedResponseCautious } from "@/lib/whatsapp/ahmed-cautious";

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

    // ─── Ahmed AI flow (ahe_sellers + wa_conversations) ───
    // The acquisition pipeline targets sellers in ahe_sellers, NOT the
    // legacy crm_customers table. If we recognize the sender as one of
    // our outreach targets, route the message through Ahmed.
    const { data: ahmedSeller } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, primary_category, primary_governorate, total_listings_seen, seller_tier, pipeline_status, merchant_admin_phone")
      .or(`phone.eq.${normalizedPhone},merchant_admin_phone.eq.${normalizedPhone}`)
      .maybeSingle();

    if (ahmedSeller) {
      try {
        await runAhmedFlow({
          supabase,
          seller: ahmedSeller,
          messageId: msg.id,
          messageContent: content,
          messageTimestamp: parseInt(msg.timestamp) * 1000,
          senderPhone: msg.from,
          normalizedPhone,
        });
      } catch (ahmedErr) {
        console.error("[WhatsApp Webhook] Ahmed flow failed:", ahmedErr);
        // Fall through to legacy flow as a safety net
      }
      continue; // Ahmed flow handled this message
    }

    // ─── Legacy crm_customers flow (existing campaigns) ───
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

// ═════════════════════════════════════════════════════════════════
//  Ahmed AI flow — for ahe_sellers (acquisition pipeline targets)
// ═════════════════════════════════════════════════════════════════
//
// Decoupled from the legacy crm_customers flow. Calls Ahmed's cautious
// responder (MVP scope: greetings / how-to-register / hours / general
// pricing — anything else escalates to a human). Persists conversation
// history in wa_conversations.
//
// Behaviour matrix:
//   - Ahmed in scope     → send AI reply, append to history, stage
//                          stays/advances to 'conversation'
//   - Ahmed escalates    → send safe "زميلي هيرد" placeholder, mark
//                          conversation status='escalated', set
//                          seller pipeline_status='needs_human_review'
//   - Ahmed errors out   → fall back silently (don't send anything,
//                          conversation flagged for human review)

interface AhmedSeller {
  id: string;
  name: string | null;
  phone: string | null;
  primary_category: string | null;
  primary_governorate: string | null;
  total_listings_seen: number | null;
  seller_tier: string | null;
  pipeline_status: string | null;
  merchant_admin_phone: string | null;
}

interface ConversationHistoryEntry {
  role: "user" | "assistant";
  content: string;
  ts?: string;
}

async function runAhmedFlow(args: {
  supabase: ReturnType<typeof getServiceClient>;
  seller: AhmedSeller;
  messageId: string;
  messageContent: string;
  messageTimestamp: number; // ms epoch
  senderPhone: string;       // 201xxx format, used by sendMessage
  normalizedPhone: string;   // 01xxx format, stored on conversation
}) {
  const {
    supabase,
    seller,
    messageId,
    messageContent,
    messageTimestamp,
    senderPhone,
    normalizedPhone,
  } = args;

  // Find or create the wa_conversation for this seller
  const { data: existingConv } = await supabase
    .from("wa_conversations")
    .select("id, stage, status, ai_conversation_history, messages_received, messages_sent")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  type ConvRow = {
    id: string;
    stage: string;
    status: string;
    ai_conversation_history: ConversationHistoryEntry[] | null;
    messages_received: number | null;
    messages_sent: number | null;
  };

  let conversation: ConvRow | null = existingConv as ConvRow | null;

  if (!conversation) {
    const sellerType: "whale" | "business" | "individual" =
      (seller.total_listings_seen || 0) >= 20
        ? "whale"
        : (seller.total_listings_seen || 0) >= 5
        ? "business"
        : "individual";

    const { data: newConv } = await supabase
      .from("wa_conversations")
      .insert({
        seller_id: seller.id,
        phone: normalizedPhone,
        customer_name: seller.name,
        category: seller.primary_category,
        governorate: seller.primary_governorate,
        seller_type: sellerType,
        listings_count: seller.total_listings_seen || 0,
        status: "active",
        stage: "conversation",
      })
      .select("id, stage, status, ai_conversation_history, messages_received, messages_sent")
      .single();
    conversation = (newConv as ConvRow | null) || null;
  }

  if (!conversation) {
    console.error("[Ahmed Flow] Could not establish conversation for seller", seller.id);
    return;
  }

  // Don't run Ahmed on conversations we've already escalated — let the human handle them
  if (conversation.status === "escalated" || conversation.status === "opted_out") {
    // Just log the inbound message; do NOT auto-respond
    await appendInboundActivity(supabase, seller.id, messageContent);
    return;
  }

  const history: ConversationHistoryEntry[] =
    (conversation.ai_conversation_history as ConversationHistoryEntry[] | null) || [];

  // Generate cautious Ahmed response
  const aiResult = await generateAhmedResponseCautious(
    {
      id: conversation.id,
      phone: normalizedPhone,
      customer_name: seller.name,
      governorate: seller.primary_governorate,
      listings_count: seller.total_listings_seen || 0,
      seller_type:
        (seller.total_listings_seen || 0) >= 20
          ? "whale"
          : (seller.total_listings_seen || 0) >= 5
          ? "business"
          : "individual",
      stage: conversation.stage,
      ai_conversation_history: history.map((h) => ({ role: h.role, content: h.content })),
    },
    messageContent
  );

  // Append the user message + Ahmed reply to history (capped to last 20 turns
  // to keep payload size reasonable — Claude doesn't need ancient context).
  const userEntry: ConversationHistoryEntry = {
    role: "user",
    content: messageContent,
    ts: new Date(messageTimestamp).toISOString(),
  };
  const assistantEntry: ConversationHistoryEntry = {
    role: "assistant",
    content: aiResult.outgoing_reply,
    ts: new Date().toISOString(),
  };
  const updatedHistory: ConversationHistoryEntry[] = [
    ...history,
    userEntry,
    assistantEntry,
  ].slice(-40);

  // Update conversation row
  const updateFields: Record<string, unknown> = {
    ai_conversation_history: updatedHistory,
    ai_last_intent: aiResult.intent,
    messages_received: (conversation.messages_received || 0) + 1,
    messages_sent: (conversation.messages_sent || 0) + 1,
    last_message_at: new Date().toISOString(),
    last_message_direction: "outbound",
    updated_at: new Date().toISOString(),
  };

  if (aiResult.escalated) {
    updateFields.status = "escalated";
    updateFields.escalation_reason = aiResult.escalation_reason || "out of scope";
    // Mark the seller for human review on the whales/sellers page
    await supabase
      .from("ahe_sellers")
      .update({
        pipeline_status: "needs_human_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", seller.id);
  } else if (conversation.stage === "initial_outreach") {
    updateFields.stage = "conversation";
  }

  await supabase
    .from("wa_conversations")
    .update(updateFields)
    .eq("id", conversation.id);

  // Send the actual WhatsApp reply (skipped on Claude error → outgoing_reply empty)
  if (aiResult.outgoing_reply && aiResult.outgoing_reply.trim()) {
    try {
      const { sendMessage } = await import("@/lib/crm/channels");
      await sendMessage("whatsapp", {
        to: senderPhone,
        content: aiResult.outgoing_reply,
      });
    } catch (sendErr) {
      console.error("[Ahmed Flow] Failed to send WhatsApp reply:", sendErr);
    }
  }

  // Log activity for audit
  await appendInboundActivity(supabase, seller.id, messageContent, {
    intent: aiResult.intent,
    escalated: aiResult.escalated,
    reason: aiResult.escalation_reason,
    external_message_id: messageId,
  });
}

async function appendInboundActivity(
  supabase: ReturnType<typeof getServiceClient>,
  sellerId: string,
  content: string,
  meta?: {
    intent?: string;
    escalated?: boolean;
    reason?: string;
    external_message_id?: string;
  }
) {
  try {
    await supabase.from("outreach_logs").insert({
      seller_id: sellerId,
      action: meta?.escalated
        ? `ahmed:escalated:${meta?.reason || "unknown"}`
        : `ahmed:replied:${meta?.intent || "unknown"}`,
      notes: content.length > 200 ? content.substring(0, 200) + "…" : content,
    });
  } catch (logErr) {
    console.warn("[Ahmed Flow] activity log skipped:", logErr);
  }
}
