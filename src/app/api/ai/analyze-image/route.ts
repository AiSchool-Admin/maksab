/**
 * POST /api/ai/analyze-image
 * Analyze product image(s) with AI vision → return structured listing data.
 * Supports: base64 images or image URLs.
 * Requires authentication + rate limited.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeProductImages } from "@/lib/ai/ai-service";
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
    await recordRateLimit(auth.userId, "ai_request");

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
