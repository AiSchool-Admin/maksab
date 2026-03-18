/**
 * Waleed AI Chat API
 * POST — Simulate Waleed sales conversation with a seller
 * Uses Claude Sonnet with WALEED_PROMPT system prompt
 */

import { NextRequest, NextResponse } from "next/server";
import { trackInteraction } from "@/lib/ai/tracker";

// ─── Waleed System Prompt (same as ai-responder.ts) ───
function getWaleedSystemPrompt(context?: {
  name?: string;
  category?: string;
  governorate?: string;
  seller_type?: string;
  listings_count?: number;
}): string {
  const customerName = context?.name || "العميل";
  const category = context?.category || "المنتجات";
  const governorate = context?.governorate || "مصر";
  const listingsCount = context?.listings_count || 0;
  const sellerType = context?.seller_type || "individual";

  return `أنتَ وليد — مندوب مبيعات أول في مكسب، عندك 8 سنين خبرة.
هدفك: تقنع البائع يسجّل على مكسب وينشر أول إعلان.
شخصيتك: ودود ومباشر، بتفهم احتياج البائع قبل ما تعرض حاجة.
أسلوبك: عامية مصرية مختصرة، جملتين أو 3، emoji باعتدال 👋 ✅ 💰

═══ ميزات مكسب ═══
✅ مجاني للبداية | ✅ مزادات (مش موجودة في OLX) | ✅ مقايضة
✅ عمولة طوعية بس | ✅ واجهة عربية 100%
- رابط التسجيل: https://maksab.app/join

═══ الاعتراضات الشائعة ═══
- "بشيل على Facebook" → "مكسب بيجيبلك مشترين أكتر بدون إعلانات مدفوعة"
- "خايف من العمولة" → "طوعية تماماً — مفيش عقوبة لو ما دفعتهاش"
- "مش عندي وقت" → "3 دقايق بس وأنا هساعدك"
- "مجربتش قبل كده" → "ابدأ بالمجاني — لو ما عجبكش ما فيش التزام"

═══ بيانات العميل الحالي ═══
- الاسم: ${customerName}
- النوع: ${sellerType === "whale" ? "حوت (تاجر كبير)" : sellerType === "business" ? "تاجر" : "فرد"}
- القسم: ${category}
- المحافظة: ${governorate}
- عدد الإعلانات: ${listingsCount}

═══ القواعد ═══
1. لو العميل سأل سؤال — جاوب بإيجاز ووضوح
2. لو العميل مهتم — شجعه يسجل وابعتله الرابط
3. لو العميل مش مهتم — احترم رأيه وقوله "لو غيرت رأيك كلمنا في أي وقت"
4. لو العميل غضبان — اعتذر بلطف ووقف الرسائل
5. لو العميل عايز يتكلم مع حد — قوله "هوصلك بزميلي"
6. لو العميل مشغول — قوله "مفيش ضغط" واعرض تبعتله بعدين
7. متذكرش أسعار أو أرقام مش متأكد منها
8. متعملش وعود مش هتقدر تنفذها
9. ردودك تكون قصيرة — 2-3 جمل بالكتير
10. لو العميل حوت → ركز على المميزات الحصرية (حساب تاجر مميز، ظهور أولوية)
11. لو العميل تاجر → ركز على زيادة المبيعات والعملاء الجدد
12. لو العميل فرد → ركز على السهولة والمجانية`;
}

// Category Arabic mapping
const CATEGORY_AR: Record<string, string> = {
  phones: "الموبايلات",
  vehicles: "السيارات",
  properties: "العقارات",
  electronics: "الإلكترونيات",
  furniture: "الأثاث",
  fashion: "الملابس",
  gold: "الذهب والفضة",
  luxury: "السلع الفاخرة",
  appliances: "الأجهزة المنزلية",
  hobbies: "الهوايات",
  tools: "العدد والأدوات",
  services: "الخدمات",
  scrap: "الخردة",
  cars: "السيارات",
  real_estate: "العقارات",
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      message,
      conversation_history = [],
      seller_context,
    } = body as {
      message: string;
      conversation_history: Array<{ role: string; content: string }>;
      seller_context?: {
        name?: string;
        phone?: string;
        category?: string;
        governorate?: string;
        seller_type?: string;
        listings_count?: number;
        seller_id?: string;
      };
    };

    if (!message) {
      return NextResponse.json(
        { error: "الرسالة مطلوبة" },
        { status: 400 }
      );
    }

    const categoryAr = CATEGORY_AR[seller_context?.category || ""] || seller_context?.category || "المنتجات";

    const systemPrompt = getWaleedSystemPrompt({
      name: seller_context?.name,
      category: categoryAr,
      governorate: seller_context?.governorate,
      seller_type: seller_context?.seller_type,
      listings_count: seller_context?.listings_count,
    });

    // Build messages array
    const messages = [
      ...conversation_history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const apiKey = process.env.ANTHROPIC_API_KEY;

    let reply: string;
    let modelUsed = "mock";
    let tokensUsed = 0;

    if (apiKey && apiKey !== "NOT_SET") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Waleed Chat] Claude API error:", response.status, errorData);
        return NextResponse.json(
          { error: "خطأ في الاتصال بـ Claude API", details: errorData },
          { status: 502 }
        );
      }

      const data = await response.json();
      reply = data.content?.[0]?.text || "";
      modelUsed = "claude-sonnet-4-20250514";
      tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    } else {
      // Mock fallback for dev/testing
      reply = getMockResponse(message);
      modelUsed = "mock-waleed";
    }

    const responseTimeMs = Date.now() - startTime;

    // Track interaction (fire and forget)
    trackInteraction({
      agent: "waleed",
      source: "admin_simulator",
      user_message: message,
      ai_response: reply,
      model_used: modelUsed,
      tokens_used: tokensUsed,
      response_time_ms: responseTimeMs,
      user_phone: seller_context?.phone,
      city: seller_context?.governorate,
      category: seller_context?.category,
      metadata: {
        seller_id: seller_context?.seller_id,
        seller_name: seller_context?.name,
        conversation_length: conversation_history.length + 1,
      },
    });

    return NextResponse.json({
      reply,
      model_used: modelUsed,
      tokens_used: tokensUsed,
      response_time_ms: responseTimeMs,
    });
  } catch (err) {
    console.error("[Waleed Chat] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("لا") || lower.includes("مش عايز") || lower.includes("مش مهتم"))
    return "تمام — لو غيرت رأيك في أي وقت كلمنا. يوم سعيد! 😊";
  if (lower.includes("سعر") || lower.includes("كام") || lower.includes("عمولة"))
    return "مكسب مجاني بالكامل! العمولة طوعية 1% بس ومفيش أي إجبار عليها 💚";
  if (lower.includes("ايوه") || lower.includes("اه") || lower.includes("تمام") || lower.includes("عايز"))
    return "تمام! 🎉 سجل من هنا في دقيقة واحدة: https://maksab.app/join\nلو محتاج أي مساعدة أنا هنا 💚";
  if (lower.includes("مشغول") || lower.includes("بعدين"))
    return "مفيش ضغط خالص! 😊 هبعتلك تذكير بكرة في وقت يناسبك. يوم سعيد!";
  return "أهلاً بيك! 😊 مكسب هيساعدك توصل لعملاء أكتر وتبيع أسرع. التسجيل مجاني ومش هياخد دقيقة — تحب تجرب؟ 🚀";
}
