/**
 * POST /api/chat/negotiation-assist
 * Get AI-powered negotiation suggestions.
 * Requires authentication + rate limited.
 */

import { NextRequest, NextResponse } from "next/server";
import { getNegotiationSuggestion } from "@/lib/ai/chat-intelligence";
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
    const {
      category_id,
      title,
      listing_price,
      last_message,
      is_buyer,
      conversation_history,
      market_estimate,
    } = body;

    if (!title || !listing_price || !last_message) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const suggestions = await getNegotiationSuggestion({
      categoryId: category_id || "",
      title,
      listingPrice: listing_price,
      lastMessage: last_message,
      isUserBuyer: is_buyer !== false,
      conversationHistory: conversation_history,
      marketEstimate: market_estimate,
    });
    await recordRateLimit(auth.userId, "ai_request");

    return NextResponse.json({ success: true, suggestions });
  } catch (err) {
    console.error("[negotiation-assist] Error:", err);
    const message = err instanceof Error ? err.message : "حصل مشكلة";
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "الخدمة مش مفعلة حالياً" }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
