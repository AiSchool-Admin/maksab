/**
 * User-facing CS Chat API
 * GET  — Get user's active conversation + messages
 * POST — Create conversation or send message
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";
import type { CSIntent } from "@/types/cs";
import { CS_INTENT_PATTERNS, CS_AI_RESPONSES } from "@/types/cs";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function detectIntent(message: string): CSIntent {
  for (const [intent, pattern] of Object.entries(CS_INTENT_PATTERNS)) {
    if (intent === "unknown") continue;
    if (pattern.test(message)) return intent as CSIntent;
  }
  return "unknown";
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1) return true;
  return false;
}

async function getCSSettings(sb: ReturnType<typeof getServiceClient>) {
  const { data, error } = await sb.from("cs_settings").select("*");

  if (error) {
    console.error("[CS-SETTINGS] Error fetching cs_settings:", error.message);
  }

  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  console.log("[CS-SETTINGS] Raw DB values:", JSON.stringify(settings));

  // If table is empty, use safe defaults (AI enabled)
  const isEmpty = Object.keys(settings).length === 0;
  if (isEmpty) {
    console.warn("[CS-SETTINGS] cs_settings table is EMPTY — using defaults with AI enabled");
  }

  const parsed = {
    ai_enabled: isEmpty ? true : toBool(settings.ai_enabled),
    ai_auto_greet: isEmpty ? true : toBool(settings.ai_auto_greet),
    ai_auto_transfer: isEmpty ? true : toBool(settings.ai_auto_transfer),
    ai_handle_complaints: toBool(settings.ai_handle_complaints),
    ai_max_messages: Number(settings.ai_max_messages) || 3,
    ai_transfer_delay_seconds: Number(settings.ai_transfer_delay_seconds) || 30,
    working_hours_start: String(settings.working_hours_start || "09:00").replace(/^"|"$/g, ""),
    working_hours_end: String(settings.working_hours_end || "17:00").replace(/^"|"$/g, ""),
    outside_hours_ai_only: isEmpty ? true : toBool(settings.outside_hours_ai_only),
  };

  console.log("[CS-SETTINGS] Parsed settings:", JSON.stringify(parsed));
  return parsed;
}

function isWithinWorkingHours(start: string, end: string): boolean {
  const now = new Date();
  // Egypt timezone offset (UTC+2)
  const egyptHour = (now.getUTCHours() + 2) % 24;
  const egyptMin = now.getUTCMinutes();
  const currentTime = egyptHour * 60 + egyptMin;

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startTime = startH * 60 + startM;
  const endTime = endH * 60 + endM;

  return currentTime >= startTime && currentTime <= endTime;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const sb = getServiceClient();

    // Get active conversation for user
    const { data: conv } = await sb
      .from("cs_conversations")
      .select("*")
      .eq("user_id", session.userId)
      .in("status", ["open", "ai_handling", "waiting_agent", "agent_handling"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    // Get messages
    const { data: messages } = await sb
      .from("cs_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      conversation: conv,
      messages: messages || [],
    });
  } catch (error) {
    console.error("CS chat GET error:", error);
    return NextResponse.json({ conversation: null, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const sb = getServiceClient();
    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      // Start a new conversation
      const { category, message } = body;

      // Get user info
      const { data: user } = await sb
        .from("profiles")
        .select("display_name, phone")
        .eq("id", session.userId)
        .maybeSingle();

      // Check for existing active conversation
      const { data: existing } = await sb
        .from("cs_conversations")
        .select("id")
        .eq("user_id", session.userId)
        .in("status", ["open", "ai_handling", "waiting_agent", "agent_handling"])
        .maybeSingle();

      let conversationId = existing?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: conv, error: convError } = await sb
          .from("cs_conversations")
          .insert({
            user_id: session.userId,
            user_name: user?.display_name || null,
            user_phone: user?.phone || null,
            category: category || "general",
            status: "open",
          })
          .select()
          .single();

        if (convError) {
          return NextResponse.json({ error: convError.message }, { status: 500 });
        }
        conversationId = conv.id;

        // Get CS settings
        const csSettings = await getCSSettings(sb);

        // Send AI greeting if enabled
        if (csSettings.ai_enabled && csSettings.ai_auto_greet) {
          await sb.from("cs_messages").insert({
            conversation_id: conversationId,
            sender_type: "ai",
            sender_name: "سارة",
            message: "أهلاً بيك في مكسب! 💚 أنا سارة، المساعدة الذكية. إزاي أقدر أساعدك؟",
            message_type: "text",
          });

          await sb
            .from("cs_conversations")
            .update({ status: "ai_handling", ai_handled: true })
            .eq("id", conversationId);
        }
      }

      // Send user's message if provided
      if (message) {
        console.log("[CS-CHAT] START action — saving user message:", message);
        const { error: msgInsertErr } = await sb.from("cs_messages").insert({
          conversation_id: conversationId,
          sender_type: "user",
          sender_id: session.userId,
          sender_name: user?.display_name || "مستخدم",
          message,
          message_type: "text",
        });

        if (msgInsertErr) {
          console.error("[CS-CHAT] Error saving user message:", msgInsertErr.message);
        } else {
          console.log("[CS-CHAT] User message saved, calling handleAIResponse...");
          await handleAIResponse(sb, conversationId, message, session.userId);
          console.log("[CS-CHAT] handleAIResponse completed for START action");
        }
      }

      // Return conversation + messages
      const { data: messages } = await sb
        .from("cs_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      const { data: conv } = await sb
        .from("cs_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      return NextResponse.json({
        conversation: conv,
        messages: messages || [],
      });
    }

    if (action === "send") {
      const { conversation_id, message } = body;
      if (!conversation_id || !message) {
        return NextResponse.json({ error: "مطلوب" }, { status: 400 });
      }

      // Verify user owns this conversation
      const { data: conv } = await sb
        .from("cs_conversations")
        .select("user_id")
        .eq("id", conversation_id)
        .single();

      if (!conv || conv.user_id !== session.userId) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }

      // Get user info
      const { data: user } = await sb
        .from("profiles")
        .select("display_name")
        .eq("id", session.userId)
        .maybeSingle();

      // Insert user message
      console.log("[CS-CHAT] SEND action — saving user message:", message, "conv:", conversation_id);
      const { data: msg, error } = await sb
        .from("cs_messages")
        .insert({
          conversation_id,
          sender_type: "user",
          sender_id: session.userId,
          sender_name: user?.display_name || "مستخدم",
          message,
          message_type: "text",
        })
        .select()
        .single();

      if (error) {
        console.error("[CS-CHAT] Error saving user message:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("[CS-CHAT] User message saved, calling handleAIResponse...");
      // AI auto-response — MUST await before returning response
      await handleAIResponse(sb, conversation_id, message, session.userId);
      console.log("[CS-CHAT] handleAIResponse completed for SEND action");

      // Return ALL messages (not just user's) so frontend shows AI response immediately
      const { data: allMessages } = await sb
        .from("cs_messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true });

      const { data: updatedConv } = await sb
        .from("cs_conversations")
        .select("*")
        .eq("id", conversation_id)
        .single();

      return NextResponse.json({
        message: msg,
        messages: allMessages || [],
        conversation: updatedConv,
      });
    }

    if (action === "rate") {
      const { conversation_id, rating, feedback } = body;
      if (!conversation_id || !rating) {
        return NextResponse.json({ error: "مطلوب" }, { status: 400 });
      }

      const { error } = await sb
        .from("cs_conversations")
        .update({
          csat_rating: rating,
          csat_feedback: feedback || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation_id)
        .eq("user_id", session.userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("CS chat POST error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

async function handleAIResponse(
  sb: ReturnType<typeof getServiceClient>,
  conversationId: string,
  userMessage: string,
  userId: string
) {
  try {
  console.log(`[CS-AI] === handleAIResponse START === conv=${conversationId} msg="${userMessage}"`);

  const csSettings = await getCSSettings(sb);
  console.log(`[CS-AI] ai_enabled=${csSettings.ai_enabled}, ai_auto_greet=${csSettings.ai_auto_greet}, ai_max_messages=${csSettings.ai_max_messages}`);

  if (!csSettings.ai_enabled) {
    console.log("[CS-AI] ai_enabled is false — SKIPPING response. THIS IS WHY AI IS NOT RESPONDING!");
    return;
  }

  // Get conversation state
  const { data: conv, error: convError } = await sb
    .from("cs_conversations")
    .select("status, ai_message_count, category")
    .eq("id", conversationId)
    .single();

  if (convError) {
    console.error("[CS-AI] Error fetching conversation:", convError.message);
    return;
  }

  if (!conv) {
    console.error("[CS-AI] Conversation not found:", conversationId);
    return;
  }

  console.log(`[CS-AI] Conversation state: status=${conv.status}, ai_message_count=${conv.ai_message_count}, category=${conv.category}`);

  // Don't respond if agent is handling
  if (conv.status === "agent_handling") {
    console.log("[CS-AI] Agent is handling — skipping AI response");
    return;
  }

  const intent = detectIntent(userMessage);
  console.log(`[CS-AI] Intent detected: "${intent}" for message: "${userMessage}"`);

  // Immediate transfer for complaints/fraud if not configured
  if (
    (intent === "complaint" && !csSettings.ai_handle_complaints) ||
    conv.category === "fraud"
  ) {
    // Send transfer message
    await sb.from("cs_messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      sender_name: "سارة",
      message:
        "⚠️ فاهم إن فيه مشكلة — هحوّلك لزميلي المتخصص فوراً.\nهيرد عليك في أقل من 5 دقائق! 🙏",
      message_type: "text",
    });

    await sb
      .from("cs_conversations")
      .update({
        status: "waiting_agent",
        priority: "high",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
    return;
  }

  // Check if AI has hit max messages
  if (conv.ai_message_count >= csSettings.ai_max_messages && csSettings.ai_auto_transfer) {
    const withinHours = isWithinWorkingHours(
      csSettings.working_hours_start,
      csSettings.working_hours_end
    );

    if (withinHours) {
      await sb.from("cs_messages").insert({
        conversation_id: conversationId,
        sender_type: "ai",
        sender_name: "سارة",
        message:
          "هحوّلك لزميلي من فريق خدمة العملاء — هيقدر يساعدك أحسن! ⏱️\nلحظة واحدة...",
        message_type: "text",
      });

      await sb
        .from("cs_conversations")
        .update({
          status: "waiting_agent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } else if (csSettings.outside_hours_ai_only) {
      await sb.from("cs_messages").insert({
        conversation_id: conversationId,
        sender_type: "ai",
        sender_name: "سارة",
        message:
          "للأسف ساعات العمل انتهت النهارده 🕐\nفريقنا هيرد عليك الصبح إن شاء الله.\nلو الموضوع مستعجل ابعتلنا التفاصيل وهنرد أول ما نفتح! 💚",
        message_type: "text",
      });

      await sb
        .from("cs_conversations")
        .update({
          status: "waiting_agent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }
    return;
  }

  // Send AI response based on intent
  const response =
    intent !== "unknown"
      ? CS_AI_RESPONSES[intent]
      : "فاهم — ممكن توضحلي أكتر عشان أقدر أساعدك؟ 😊\n\nأو لو عايز تتكلم مع حد من فريقنا قولي \"عايز أتكلم مع موظف\"";

  console.log(`[CS-AI] Sending AI response for intent="${intent}": "${response.substring(0, 80)}..."`);

  const { error: msgError } = await sb.from("cs_messages").insert({
    conversation_id: conversationId,
    sender_type: "ai",
    sender_name: "سارة",
    message: response,
    message_type: "text",
  });

  if (msgError) {
    console.error("[CS-AI] ERROR inserting AI response:", msgError.message);
    return;
  }

  console.log("[CS-AI] AI response saved successfully!");

  // Update conversation to ai_handling and increment ai_message_count
  const { error: updateError } = await sb
    .from("cs_conversations")
    .update({
      status: "ai_handling",
      ai_handled: true,
      ai_message_count: (conv.ai_message_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (updateError) {
    console.error("[CS-AI] Error updating conversation status:", updateError.message);
  }

  console.log("[CS-AI] === handleAIResponse DONE ===");
  } catch (error) {
    console.error("[CS-AI] handleAIResponse CRASHED:", error);
  }
}
