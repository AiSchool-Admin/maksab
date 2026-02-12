/**
 * POST /api/ai/parse-text
 * Parse voice transcript or free text into structured listing data.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseListingFromText } from "@/lib/ai/ai-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body as { text: string };

    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: "النص قصير أوي. اكتب تفاصيل أكتر" }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ error: "النص طويل أوي. لخص في أقل من 1000 حرف" }, { status: 400 });
    }

    const analysis = await parseListingFromText(text.trim());

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
