/**
 * POST /api/chat/product-insights
 * Generate AI-powered product insights for a listing.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateProductInsights } from "@/lib/ai/chat-intelligence";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category_id, category_fields, title, price, sale_type, description, governorate } = body;

    if (!category_id || !title) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const insights = await generateProductInsights({
      categoryId: category_id,
      categoryFields: category_fields || {},
      title,
      price: price ?? null,
      saleType: sale_type || "cash",
      description,
      governorate,
    });

    return NextResponse.json({ success: true, insights });
  } catch (err) {
    console.error("[product-insights] Error:", err);
    const message = err instanceof Error ? err.message : "حصل مشكلة";
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "الخدمة مش مفعلة حالياً" }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
