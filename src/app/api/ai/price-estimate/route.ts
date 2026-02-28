/**
 * POST /api/ai/price-estimate
 * Get AI-powered price estimate for a product.
 * Combines database market data + AI reasoning.
 * Requires authentication + rate limited.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIPriceEstimate } from "@/lib/ai/ai-service";
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
    const { category_id, category_fields, title, governorate } = body;

    if (!category_id || !title) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const estimate = await getAIPriceEstimate({
      categoryId: category_id,
      categoryFields: category_fields || {},
      title,
      governorate,
    });
    await recordRateLimit(auth.userId, "ai_request");

    return NextResponse.json({
      success: true,
      estimate,
    });
  } catch (err) {
    console.error("[ai/price-estimate] Error:", err);
    const message = err instanceof Error ? err.message : "حصل مشكلة";

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "خاصية تقدير السعر مش مفعلة حالياً" },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
