/**
 * POST /api/ai/analyze-image
 * Analyze product image(s) with AI vision → return structured listing data.
 * Supports: base64 images or image URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeProductImages } from "@/lib/ai/ai-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, context } = body as {
      images: string[];  // base64 data URLs or https URLs
      context?: string;  // optional user-provided context
    };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "لازم ترفع صورة واحدة على الأقل" }, { status: 400 });
    }

    if (images.length > 3) {
      return NextResponse.json({ error: "الحد الأقصى 3 صور للتحليل" }, { status: 400 });
    }

    // Validate that images are valid URLs or base64
    for (const img of images) {
      if (!img.startsWith("data:image/") && !img.startsWith("http")) {
        return NextResponse.json({ error: "صيغة الصورة مش صحيحة" }, { status: 400 });
      }
    }

    const analysis = await analyzeProductImages(images, context);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err) {
    console.error("[ai/analyze-image] Error:", err);
    const message = err instanceof Error ? err.message : "حصل مشكلة في التحليل";

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "خاصية الذكاء الاصطناعي مش مفعلة حالياً. جرب الطريقة اليدوية." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
