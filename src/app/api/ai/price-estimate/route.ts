/**
 * POST /api/ai/price-estimate
 * Get AI-powered price estimate for a product.
 * Combines database market data + AI reasoning.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIPriceEstimate } from "@/lib/ai/ai-service";

export async function POST(req: NextRequest) {
  try {
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
