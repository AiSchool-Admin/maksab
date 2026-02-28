/**
 * POST /api/chat/smart-questions
 * Generate AI-powered smart questions for a product in chat.
 * Requires authentication + rate limited.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSmartQuestions } from "@/lib/ai/chat-intelligence";
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
    const { category_id, category_fields, title, price, sale_type, description } = body;

    if (!category_id || !title) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const questions = await generateSmartQuestions({
      categoryId: category_id,
      categoryFields: category_fields || {},
      title,
      price: price ?? null,
      saleType: sale_type || "cash",
      description,
    });
    await recordRateLimit(auth.userId, "ai_request");

    return NextResponse.json({ success: true, questions });
  } catch (err) {
    console.error("[smart-questions] Error:", err);
    const message = err instanceof Error ? err.message : "حصل مشكلة";
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "الخدمة مش مفعلة حالياً" }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
