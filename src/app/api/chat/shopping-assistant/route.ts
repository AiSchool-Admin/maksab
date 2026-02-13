/**
 * POST /api/chat/shopping-assistant
 * AI-powered shopping assistant chatbot.
 */

import { NextRequest, NextResponse } from "next/server";
import { shoppingAssistant } from "@/lib/ai/chat-intelligence";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversation_history, user_interests } = body;

    if (!message || typeof message !== "string" || message.length < 2) {
      return NextResponse.json({ error: "اكتب رسالة أطول" }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: "الرسالة طويلة جداً" }, { status: 400 });
    }

    const result = await shoppingAssistant({
      message,
      conversationHistory: conversation_history,
      userInterests: user_interests,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[shopping-assistant] Error:", err);
    const message = err instanceof Error ? err.message : "حصل مشكلة";
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "مساعد التسوق مش مفعل حالياً" }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
