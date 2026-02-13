/**
 * Chat Intelligence Service — AI-powered chat features for Maksab.
 * Provides: smart questions, negotiation assistance, product insights, shopping assistant.
 */

import { callAI } from "./ai-service";

// ── Types ────────────────────────────────────────────

export interface SmartQuestion {
  question: string;
  icon: string;
}

export interface NegotiationSuggestion {
  type: "counter_offer" | "accept" | "reject" | "info_request";
  message: string;
  reasoning: string;
  suggestedPrice?: number;
}

export interface ProductInsight {
  title: string;
  icon: string;
  content: string;
  type: "tip" | "warning" | "info" | "market";
}

export interface ShoppingResult {
  response: string;
  suggestedFilters?: Record<string, unknown>;
  actionType?: "search" | "compare" | "info" | "general";
}

// ── Category-specific question templates ─────────────

const CATEGORY_QUESTION_HINTS: Record<string, string[]> = {
  cars: [
    "العربية عليها حوادث؟",
    "الرخصة سارية لحد إمتى؟",
    "كام واحد ملكها قبل كده؟",
    "فيه أي مشاكل في المكينة أو الفتيس؟",
    "أقدر أعاينها فين؟",
    "الكيلومترات حقيقية؟",
  ],
  real_estate: [
    "الشقة مسجلة في الشهر العقاري؟",
    "قيمة المصاريف الشهرية (صيانة، حارس)؟",
    "فيه مشاكل في السباكة أو الكهرباء؟",
    "الجيران والمنطقة إيه؟",
    "أقرب مواصلات عامة؟",
  ],
  phones: [
    "البطارية بتقعد كام ساعة؟",
    "فيه أي خدوش أو كسور؟",
    "الشاشة اتغيرت قبل كده؟",
    "لسه في الضمان؟",
    "معاه الكرتونة والشاحن الأصلي؟",
  ],
  gold: [
    "فيه دمغة (ختم العيار)؟",
    "معاه فاتورة الشراء؟",
    "الوزن بالدقة كام جرام؟",
    "ممكن أعمل فحص عند صايغ؟",
  ],
  appliances: [
    "الجهاز فيه أي أعطال حالية؟",
    "اتصلح قبل كده؟",
    "لسه في الضمان؟",
    "استهلاك الكهرباء عالي؟",
  ],
  furniture: [
    "فيه أي كسور أو خدوش؟",
    "الخشب نوعه إيه بالظبط؟",
    "أقدر أشوفه فين؟",
    "بتفكه ولا بيتنقل كامل؟",
  ],
  fashion: [
    "الماركة أصلية ولا كوبي؟",
    "متلبس كام مرة تقريباً؟",
    "فيه أي عيوب أو بقع؟",
    "المقاس ده يناسب وزن وطول كام؟",
  ],
  luxury: [
    "معاه شهادة أصالة؟",
    "الصندوق والكيس الأصلي معاه؟",
    "اتشريت من فين؟",
    "فيه فاتورة الشراء الأصلية؟",
  ],
};

// ── Smart Questions Generator ────────────────────────

export async function generateSmartQuestions(params: {
  categoryId: string;
  categoryFields: Record<string, unknown>;
  title: string;
  price: number | null;
  saleType: string;
  description?: string;
}): Promise<SmartQuestion[]> {
  const hints = CATEGORY_QUESTION_HINTS[params.categoryId] || [];

  const systemPrompt = `أنت مساعد ذكي في تطبيق "مكسب" — سوق إلكتروني مصري.

مهمتك: اقترح 4-5 أسئلة ذكية يسألها المشتري للبائع قبل ما يشتري المنتج ده.

الأسئلة لازم تكون:
1. مهمة وعملية (مش سطحية)
2. خاصة بالمنتج المعين (مش عامة)
3. بالعربي المصري
4. قصيرة ومباشرة

أمثلة أسئلة لهذا القسم:
${hints.map((h) => `- ${h}`).join("\n")}

أجب بـ JSON فقط:
[
  { "question": "السؤال", "icon": "emoji مناسب" }
]`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `المنتج: ${params.title}
القسم: ${params.categoryId}
السعر: ${params.price ? `${params.price} جنيه` : "غير محدد"}
نوع البيع: ${params.saleType}
التفاصيل: ${JSON.stringify(params.categoryFields)}
${params.description ? `الوصف: ${params.description}` : ""}`,
      },
    ],
    { responseFormat: "json", maxTokens: 600, temperature: 0.5 },
  );

  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    // Fallback to category hints
    return hints.slice(0, 4).map((q) => ({ question: q, icon: "❓" }));
  }
}

// ── Negotiation Assistant ────────────────────────────

export async function getNegotiationSuggestion(params: {
  categoryId: string;
  title: string;
  listingPrice: number;
  lastMessage: string;
  isUserBuyer: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
  marketEstimate?: number;
}): Promise<NegotiationSuggestion[]> {
  const systemPrompt = `أنت خبير تفاوض في السوق المصري. مهمتك تساعد ${params.isUserBuyer ? "المشتري" : "البائع"} يتفاوض بذكاء.

المنتج: ${params.title}
السعر المعروض: ${params.listingPrice} جنيه
${params.marketEstimate ? `السعر السوقي التقديري: ${params.marketEstimate} جنيه` : ""}

قواعد مهمة:
- اقترح 2-3 ردود تفاوضية مختلفة (عرض مضاد، طلب معلومات، قبول)
- العروض لازم تكون واقعية ومحترمة
- لو السعر كويس قول كده بصراحة
- الردود بالعربي المصري
- خلي الردود قصيرة وطبيعية زي ما الناس بتتكلم في الشات

أجب بـ JSON:
[
  {
    "type": "counter_offer" أو "accept" أو "reject" أو "info_request",
    "message": "الرسالة المقترحة",
    "reasoning": "ليه ده عرض كويس",
    "suggestedPrice": رقم أو null
  }
]`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation context
  if (params.conversationHistory?.length) {
    const recent = params.conversationHistory.slice(-6);
    for (const msg of recent) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  messages.push({
    role: "user",
    content: `الرسالة الأخيرة من الطرف التاني: "${params.lastMessage}"
اقترح ردود مناسبة:`,
  });

  const result = await callAI(messages, {
    responseFormat: "json",
    maxTokens: 800,
    temperature: 0.6,
  });

  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

// ── Product Insights Generator ───────────────────────

export async function generateProductInsights(params: {
  categoryId: string;
  categoryFields: Record<string, unknown>;
  title: string;
  price: number | null;
  saleType: string;
  description?: string;
  governorate?: string;
}): Promise<ProductInsight[]> {
  const systemPrompt = `أنت خبير منتجات في السوق المصري. مهمتك تقدم معلومات ذكية ومفيدة عن المنتج ده للمشتري.

اعطي 4-6 نصائح/معلومات عن المنتج. كل نصيحة لازم تكون:
1. مفيدة وعملية
2. خاصة بالمنتج المعين
3. بالعربي المصري
4. قصيرة (جملة أو اتنين)

أنواع المعلومات:
- "tip": نصيحة شراء
- "warning": تحذير أو حاجة لازم تاخد بالك منها
- "info": معلومة عامة عن المنتج
- "market": معلومة عن السوق أو السعر

أجب بـ JSON:
[
  { "title": "عنوان قصير", "icon": "emoji", "content": "المحتوى", "type": "tip|warning|info|market" }
]`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `المنتج: ${params.title}
القسم: ${params.categoryId}
السعر: ${params.price ? `${params.price} جنيه` : "غير محدد"}
نوع البيع: ${params.saleType}
التفاصيل: ${JSON.stringify(params.categoryFields)}
${params.description ? `الوصف: ${params.description}` : ""}
${params.governorate ? `الموقع: ${params.governorate}` : ""}`,
      },
    ],
    { responseFormat: "json", maxTokens: 1000, temperature: 0.5 },
  );

  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

// ── Shopping Assistant ───────────────────────────────

export async function shoppingAssistant(params: {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userInterests?: Record<string, unknown>;
}): Promise<ShoppingResult> {
  const systemPrompt = `أنت "مكسب بوت" — مساعد التسوق الذكي في تطبيق مكسب.

مهمتك مساعدة المستخدم يلاقي اللي بيدور عليه. أنت بتفهم العربي المصري كويس.

لو المستخدم عايز يشتري حاجة:
1. افهم إيه اللي عايزه بالظبط
2. اقترح فلاتر بحث مناسبة
3. قدم نصائح شراء

لو المستخدم بيسأل عن سعر:
1. قدر السعر من معرفتك بالسوق المصري
2. اقترح ميزانية واقعية

لو المستخدم عنده سؤال عام:
1. جاوب بمعلومات مفيدة
2. وجهه للخطوة الجاية

الأقسام المتاحة: cars, real_estate, phones, fashion, scrap, gold, luxury, appliances, furniture, hobbies, tools, services

أجب بـ JSON:
{
  "response": "الرد بالعربي المصري",
  "suggestedFilters": { "category": "", "brand": "", "price_min": 0, "price_max": 0 } أو null,
  "actionType": "search" | "compare" | "info" | "general"
}`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (params.conversationHistory?.length) {
    const recent = params.conversationHistory.slice(-8);
    for (const msg of recent) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  messages.push({ role: "user", content: params.message });

  const result = await callAI(messages, {
    responseFormat: "json",
    maxTokens: 800,
    temperature: 0.6,
  });

  try {
    return JSON.parse(result) as ShoppingResult;
  } catch {
    return {
      response: "معلش، مفهمتش. ممكن تقولي تاني إيه اللي بتدور عليه؟",
      actionType: "general",
    };
  }
}

// ── Smart Auto Price Drop ────────────────────────────

export interface PriceDropSuggestion {
  shouldDrop: boolean;
  suggestedNewPrice: number;
  dropPercent: number;
  reasoning: string;
  estimatedDaysToSell: number;
}

export async function calculateSmartPriceDrop(params: {
  currentPrice: number;
  originalPrice: number;
  daysListed: number;
  viewsCount: number;
  favoritesCount: number;
  categoryId: string;
  categoryFields: Record<string, unknown>;
  title: string;
}): Promise<PriceDropSuggestion> {
  // Heuristic-based calculation (no AI call needed for speed)
  const { currentPrice, daysListed, viewsCount, favoritesCount } = params;

  // Views-to-favorites ratio indicates demand
  const interestRatio = viewsCount > 0 ? favoritesCount / viewsCount : 0;
  const isLowInterest = interestRatio < 0.02 && viewsCount > 20;
  const isVeryLowInterest = interestRatio < 0.01 && viewsCount > 50;

  // Time-based urgency
  let dropPercent = 0;
  let shouldDrop = false;

  if (daysListed >= 21 && isVeryLowInterest) {
    dropPercent = 15;
    shouldDrop = true;
  } else if (daysListed >= 14 && isLowInterest) {
    dropPercent = 10;
    shouldDrop = true;
  } else if (daysListed >= 7 && isLowInterest) {
    dropPercent = 5;
    shouldDrop = true;
  }

  // Cap: never drop more than 30% from original
  const minAllowed = params.originalPrice * 0.7;
  let suggestedNewPrice = Math.round(currentPrice * (1 - dropPercent / 100));
  if (suggestedNewPrice < minAllowed) {
    suggestedNewPrice = Math.round(minAllowed);
    dropPercent = Math.round((1 - minAllowed / currentPrice) * 100);
  }

  // Estimated days based on new price
  const estimatedDaysToSell = shouldDrop
    ? Math.max(1, Math.round((30 - daysListed) * (1 - dropPercent / 100)))
    : Math.round(30 - daysListed);

  let reasoning = "";
  if (!shouldDrop) {
    reasoning = "الإعلان لسه جديد أو الاهتمام كويس. خليه شوية كمان.";
  } else if (dropPercent <= 5) {
    reasoning = `الإعلان عليه ${viewsCount} مشاهدة بس ${favoritesCount} مفضلة. تخفيض بسيط ${dropPercent}% ممكن يزود الاهتمام.`;
  } else if (dropPercent <= 10) {
    reasoning = `بعد ${daysListed} يوم، نسبة الاهتمام ضعيفة. تخفيض ${dropPercent}% هيساعد يتباع أسرع.`;
  } else {
    reasoning = `الإعلان عليه مشاهدات كتير بس اهتمام قليل. السعر ممكن يكون عالي شوية. تخفيض ${dropPercent}% هيخليه أنافس أحسن.`;
  }

  return {
    shouldDrop,
    suggestedNewPrice,
    dropPercent,
    reasoning,
    estimatedDaysToSell,
  };
}
