/**
 * POST /api/ai/parse-text
 * Parse voice transcript or free text into structured listing data.
 * Requires authentication + rate limited.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseListingFromText } from "@/lib/ai/ai-service";
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
    const { text } = body as { text: string };

    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: "النص قصير أوي. اكتب تفاصيل أكتر" }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ error: "النص طويل أوي. لخص في أقل من 1000 حرف" }, { status: 400 });
    }

    const analysis = await parseListingFromText(text.trim());
    await recordRateLimit(auth.userId, "ai_request");

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err) {
    console.error("[ai/parse-text] Error:", err);
    const message = err instanceof Error ? err.message : "حصل مشكلة";

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "خاصية الذكاء الاصطناعي مش مفعلة حالياً" },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
