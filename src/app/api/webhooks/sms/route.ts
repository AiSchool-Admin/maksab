// Twilio SMS Webhook Handler
// Receives incoming SMS messages and delivery status callbacks
// Docs: https://www.twilio.com/docs/messaging/guides/webhook-request

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { analyzeResponse } from "@/lib/crm/ai/analyze-response";

// POST: Incoming SMS or status callback from Twilio
export async function POST(req: NextRequest) {
  try {
    // Twilio sends form-urlencoded data
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Check if this is a status callback or incoming message
    if (params.MessageStatus) {
      await handleStatusCallback(params);
    } else if (params.Body) {
      await handleIncomingMessage(params);
    }

    // Twilio expects TwiML response (empty is fine for no auto-reply via Twilio)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (err) {
    console.error("[SMS Webhook] Error:", err);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  }
}

async function handleStatusCallback(params: Record<string, string>) {
  const supabase = getServiceClient();

  const messageSid = params.MessageSid;
  const status = params.MessageStatus;

  if (!messageSid) return;

  const statusMap: Record<string, string> = {
    queued: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    undelivered: 'failed',
    failed: 'failed',
  };

  const mappedStatus = statusMap[status];
  if (!mappedStatus) return;

  const updateData: Record<string, unknown> = {
    external_status: mappedStatus,
  };

  if (mappedStatus === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  } else if (mappedStatus === 'failed') {
    updateData.status = 'failed';
    updateData.failure_reason = `SMS ${status}: ${params.ErrorCode || 'unknown'}`;
  }

  await supabase
    .from("crm_conversations")
    .update(updateData)
    .eq("external_message_id", messageSid);
}

async function handleIncomingMessage(params: Record<string, string>) {
  const supabase = getServiceClient();

  const content = params.Body || '';
  const from = params.From || '';
  const messageSid = params.MessageSid || '';

  if (!content || !from) return;

  // Normalize phone: Twilio sends as +201xxxxxxxxx, we store as 01xxxxxxxxx
  let normalizedPhone = from.replace(/^\+/, '');
  if (normalizedPhone.startsWith('2')) {
    normalizedPhone = '0' + normalizedPhone.substring(1);
  }

  // Find the customer
  const { data: customer } = await supabase
    .from("crm_customers")
    .select("id, full_name, phone, lifecycle_stage, assigned_agent_id")
    .or(`phone.eq.${normalizedPhone}`)
    .single();

  if (!customer) {
    console.log(`[SMS Webhook] Unknown sender: ${from}`);
    return;
  }

  // Analyze the message
  const analysis = analyzeResponse(content);

  // Create inbound conversation record
  const { data: conversation } = await supabase
    .from("crm_conversations")
    .insert({
      customer_id: customer.id,
      channel: 'sms',
      direction: 'inbound',
      message_type: 'text',
      content,
      status: 'received',
      external_message_id: messageSid,
      external_status: 'received',
      sentiment: analysis.sentiment,
      intent: analysis.intent,
      ai_suggested_response: analysis.suggestedResponse,
      requires_human_response: analysis.requiresHuman,
      agent_id: customer.assigned_agent_id,
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  // Update customer
  const updateData: Record<string, unknown> = {
    last_response_at: new Date().toISOString(),
    last_response_channel: 'sms',
    last_response_sentiment: analysis.sentiment,
    has_responded: true,
  };

  if (analysis.intent === 'interested' || analysis.intent === 'purchase_intent') {
    if (customer.lifecycle_stage === 'lead' || customer.lifecycle_stage === 'prospect') {
      updateData.lifecycle_stage = 'interested';
    }
  }

  if (analysis.shouldMarkDoNotContact) {
    updateData.do_not_contact = true;
  }

  await supabase
    .from("crm_customers")
    .update(updateData)
    .eq("id", customer.id);

  // Stop campaign if needed
  if (analysis.shouldStopCampaign) {
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
      description: `رد العميل عبر SMS: ${content.substring(0, 80)}`,
      metadata: {
        channel: 'sms',
        conversation_id: conversation?.id,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
      },
      is_system: true,
    });
}
