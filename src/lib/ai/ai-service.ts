/**
 * AI Service — Central AI engine for Maksab.
 * Supports OpenAI GPT-4o (vision + text) with fallback.
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | AIContentPart[];
}

type AIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" } };

interface AIOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "json" | "text";
}

/**
 * Call AI model with messages (supports text + vision).
 */
export async function callAI(
  messages: AIMessage[],
  options: AIOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const {
    model = "gpt-4o-mini",
    maxTokens = 2000,
    temperature = 0.3,
    responseFormat = "text",
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  if (responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error("[AI] API error:", response.status, errData);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Analyze image(s) with AI vision — extract product details.
 */
export async function analyzeProductImages(
  imageUrls: string[],
  additionalContext?: string,
): Promise<ProductAnalysis> {
  const imageContent: AIContentPart[] = imageUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url, detail: "high" as const },
  }));

  const systemPrompt = `أنت مساعد ذكي في تطبيق "مكسب" — سوق إلكتروني مصري لبيع وشراء السلع الجديدة والمستعملة.

مهمتك: تحليل صور المنتجات واستخراج كل التفاصيل الممكنة.

الأقسام المتاحة (اختار الأنسب):
- cars: سيارات (brand, model, year, mileage, color, fuel, transmission, condition)
- real_estate: عقارات (type, area, rooms, floor, finishing)
- phones: موبايلات وتابلت (brand, model, storage, condition, color)
- fashion: موضة (type, brand, size, condition, material, color)
- scrap: خردة (type, weight, condition)
- gold: ذهب وفضة (type, karat, weight, condition)
- luxury: سلع فاخرة (type, brand, condition, authentic)
- appliances: أجهزة منزلية (type, brand, condition, purchase_year)
- furniture: أثاث وديكور (type, condition, material, color)
- hobbies: هوايات (type, condition, brand)
- tools: عدد وأدوات (type, condition, brand)
- services: خدمات (service_type, pricing, experience)

أجب بـ JSON فقط بالشكل ده:
{
  "category_id": "القسم",
  "subcategory_id": "القسم الفرعي أو null",
  "category_fields": {
    "field_id": "value"
  },
  "suggested_title": "عنوان مقترح بالعربي",
  "suggested_description": "وصف مقترح بالعربي",
  "condition_assessment": "تقييم الحالة",
  "confidence": 0.0-1.0,
  "detected_items": ["قائمة بالأشياء المكتشفة في الصورة"]
}

قواعد مهمة:
- العنوان والوصف لازم يكونوا بالعربي المصري
- استخدم أسماء الماركات بالعربي أو الإنجليزي حسب الشائع
- قدّر الحالة من الصورة (جديد، مستعمل ممتاز، مستعمل جيد، إلخ)
- لو مش متأكد من حاجة، حط confidence أقل
- category_fields لازم تطابق الحقول المتاحة للقسم المختار`;

  const userContent: AIContentPart[] = [
    ...imageContent,
    {
      type: "text" as const,
      text: additionalContext
        ? `تحليل المنتج ده. معلومات إضافية من المستخدم: "${additionalContext}"`
        : "حلل المنتج ده واستخرج كل التفاصيل الممكنة.",
    },
  ];

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    { model: "gpt-4o-mini", responseFormat: "json", maxTokens: 1500, temperature: 0.2 },
  );

  try {
    return JSON.parse(result) as ProductAnalysis;
  } catch {
    console.error("[AI] Failed to parse response:", result);
    throw new Error("فشل في تحليل الصورة");
  }
}

/**
 * Parse voice/text input into structured listing data.
 */
export async function parseListingFromText(
  text: string,
): Promise<ProductAnalysis> {
  const systemPrompt = `أنت مساعد ذكي في تطبيق "مكسب" — سوق إلكتروني مصري.

مهمتك: تحويل كلام المستخدم (بالمصري) لبيانات إعلان منظمة.

المستخدم ممكن يقول حاجة زي:
- "عندي آيفون 15 برو 256 جيجا أسود مستعمل زيرو عايز أبيعه بـ 30 ألف"
- "غسالة توشيبا 10 كيلو شغالة تمام عايز 5000"
- "شقة في مدينة نصر 120 متر 3 أوض تشطيب سوبر لوكس"

الأقسام: cars, real_estate, phones, fashion, scrap, gold, luxury, appliances, furniture, hobbies, tools, services

أجب بـ JSON بالشكل ده:
{
  "category_id": "القسم",
  "subcategory_id": "القسم الفرعي أو null",
  "category_fields": { "field_id": "value" },
  "suggested_title": "عنوان بالعربي",
  "suggested_description": "وصف بالعربي",
  "suggested_price": number أو null,
  "sale_type": "cash" أو "auction" أو "exchange",
  "governorate": "المحافظة لو اتذكرت أو null",
  "city": "المدينة لو اتذكرت أو null",
  "confidence": 0.0-1.0
}

لو المستخدم ذكر سعر، حطه في suggested_price.
لو قال "عايز أبدل" sale_type = "exchange".
لو قال "مزاد" sale_type = "auction".
غير كده sale_type = "cash".`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `المستخدم قال: "${text}"` },
    ],
    { model: "gpt-4o-mini", responseFormat: "json", maxTokens: 1000, temperature: 0.2 },
  );

  try {
    return JSON.parse(result) as ProductAnalysis;
  } catch {
    console.error("[AI] Failed to parse text response:", result);
    throw new Error("فشل في تحليل النص");
  }
}

/**
 * Get AI-powered price estimate for a product.
 */
export async function getAIPriceEstimate(params: {
  categoryId: string;
  categoryFields: Record<string, unknown>;
  title: string;
  governorate?: string;
}): Promise<PriceEstimate> {
  const systemPrompt = `أنت خبير أسعار في السوق المصري. مهمتك تقدير سعر منتج بناءً على تفاصيله.

أجب بـ JSON:
{
  "estimated_price": number,
  "price_range": { "min": number, "max": number },
  "quick_sale_price": number,
  "confidence": 0.0-1.0,
  "reasoning": "السبب بالعربي",
  "market_trend": "up" | "down" | "stable",
  "estimated_sell_days": number
}

اعتمد على معرفتك بالسوق المصري الحالي. الأسعار بالجنيه المصري.`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `قدر سعر المنتج ده:
القسم: ${params.categoryId}
العنوان: ${params.title}
التفاصيل: ${JSON.stringify(params.categoryFields)}
${params.governorate ? `الموقع: ${params.governorate}` : ""}`,
      },
    ],
    { model: "gpt-4o-mini", responseFormat: "json", maxTokens: 500, temperature: 0.3 },
  );

  try {
    return JSON.parse(result) as PriceEstimate;
  } catch {
    throw new Error("فشل في تقدير السعر");
  }
}

// ── Types ────────────────────────────────────────────

export interface ProductAnalysis {
  category_id: string;
  subcategory_id: string | null;
  category_fields: Record<string, unknown>;
  suggested_title: string;
  suggested_description: string;
  suggested_price?: number | null;
  sale_type?: string;
  governorate?: string | null;
  city?: string | null;
  condition_assessment?: string;
  confidence: number;
  detected_items?: string[];
}

export interface PriceEstimate {
  estimated_price: number;
  price_range: { min: number; max: number };
  quick_sale_price: number;
  confidence: number;
  reasoning: string;
  market_trend: "up" | "down" | "stable";
  estimated_sell_days: number;
}
