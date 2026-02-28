/**
 * POST /api/chat/shopping-assistant
 * AI-powered shopping assistant chatbot.
 * Requires authentication + rate limited.
 */

import { NextRequest, NextResponse } from "next/server";
import { shoppingAssistant } from "@/lib/ai/chat-intelligence";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, recordRateLimit } from "@/lib/rate-limit/rate-limit-service";

export async function POST(req: NextRequest) {
  try {
    // Auth required — AI endpoints cost money
    const auth = requireAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Rate limit: 20 AI requests per hour per user
    const rateCheck = await checkRateLimit(auth.userId, "ai_request");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "عديت الحد المسموح. جرب تاني بعد شوية" },
        { status: 429 },
      );
    }

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
    await recordRateLimit(auth.userId, "ai_request");

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[shopping-assistant] Error:", err);
    const errMsg = err instanceof Error ? err.message : "حصل مشكلة";
    if (errMsg.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "مساعد التسوق مش مفعل حالياً" }, { status: 503 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
