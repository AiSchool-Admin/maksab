/**
 * POST /api/chatbot
 * Smart AI-powered chatbot for Maksab.
 * Capabilities:
 * - Search & recommend ads based on user intent
 * - Price analysis ("السعر ده كويس؟")
 * - Market insights ("متوسط سعر آيفون 15 كام؟")
 * - App help & FAQ (keyword-based)
 * - Suggest cheaper/better alternatives
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ═══════════════════════════════════════════
// Knowledge Base (FAQ)
// ═══════════════════════════════════════════
const knowledgeBase: { keywords: string[]; response: string }[] = [
  {
    keywords: ["مكسب", "التطبيق", "ايه", "اي", "شرح"],
    response:
      "مكسب هو سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة. شعارنا \"كل صفقة مكسب\" — يعني كل اللي بيتعاملوا معانا كسبانين!",
  },
  {
    keywords: ["اضف", "اعلان", "انشر", "بيع", "ازاي ابيع"],
    response:
      "عشان تضيف إعلان:\n1. اضغط على زر \"+\" أضف إعلان من الشريط السفلي\n2. اختار القسم المناسب\n3. املأ التفاصيل المطلوبة\n4. حدد السعر وارفع الصور\n5. اختار موقعك واضغط \"نشر الإعلان\"\n\nالموضوع مش بياخد أكتر من دقيقة!",
  },
  {
    keywords: ["مزاد", "مزايدة", "ازاي ازايد", "كيف ازايد"],
    response:
      "المزاد في مكسب:\n• البائع بيحدد سعر افتتاح ومدة (24/48/72 ساعة)\n• زايد بالمبلغ اللي عايزه (لازم أعلى من الحد الأدنى)\n• لو حد زايد في آخر 5 دقائق، المزاد بيتمدد 5 دقائق\n• ممكن تشتري فوراً بسعر \"اشتري الآن\" لو البائع حدده",
  },
  {
    keywords: ["مباشر", "بث", "لايف", "live"],
    response:
      "المزاد المباشر ميزة حصرية في مكسب! البائع بيعمل بث مباشر بالكاميرا ويعرض المنتج للمشاهدين. المشاهدين بيزايدوا وهما بيتفرجوا في الوقت الحقيقي.\n\nرسوم: 50 جنيه + 2% من سعر البيع.",
  },
  {
    keywords: ["تبديل", "تبادل", "بدل"],
    response:
      "ميزة التبديل بتسمحلك تعرض سلعتك للتبديل بسلعة تانية. اختار \"تبديل\" كنوع البيع واكتب إيه اللي عايز تبدل بيه. التطبيق هيقترحلك إعلانات ممكن تتبدل معاها!",
  },
  {
    keywords: ["رسوم", "عمولة", "فلوس", "مجاني", "تكلفة"],
    response:
      "مكسب تطبيق مجاني بالكامل! مفيش رسوم على نشر الإعلانات أو البيع.\nبعد الصفقة بنسألك لو حابب تساهم بعمولة بسيطة (اختيارية 100%).\nالاستثناء: المزاد المباشر عليه 50 جنيه + 2%.",
  },
  {
    keywords: ["تسجيل", "حساب", "دخول", "لوجن", "رقم", "موبايل"],
    response:
      "التسجيل سهل — بس محتاج رقم موبايلك المصري (01XXXXXXXXX). هنبعتلك كود SMS وبكده حسابك جاهز!\nمش محتاج تسجل عشان تتصفح. التسجيل مطلوب بس لإضافة إعلان أو رسالة أو مزايدة.",
  },
  {
    keywords: ["خريطة", "قريب", "مكان", "موقع", "gps"],
    response:
      "مكسب فيه خريطة تفاعلية! 🗺️\nمن الصفحة الرئيسية اضغط على أيقونة الخريطة وهتشوف كل الإعلانات على خريطة مصر.\nممكن تفلتر بالمسافة من موقعك (5/10/25/50/100 كم) وتشوف أقرب الإعلانات ليك.",
  },
  {
    keywords: ["سعر", "اسعار", "غالي", "رخيص", "متوسط", "كام"],
    response:
      "مكسب فيه نظام ذكاء أسعار! 📊\nعلى أي إعلان هتلاقي تحليل السعر — هل هو كويس ولا غالي مقارنة بالسوق.\nكمان بنعرضلك متوسط الأسعار واتجاه السوق.\n\nلو عايز تعرف سعر حاجة معينة قولي اسمها!",
  },
  {
    keywords: ["اقسام", "قسم", "فئات"],
    response:
      "مكسب فيه 12 قسم:\n🚗 سيارات\n🏠 عقارات\n📱 موبايلات وتابلت\n👗 موضة\n♻️ خردة\n💰 ذهب وفضة\n💎 سلع فاخرة\n🏠 أجهزة منزلية\n🪑 أثاث وديكور\n🎮 هوايات\n🔧 عدد وأدوات\n🛠️ خدمات",
  },
  {
    keywords: ["المفضلة", "حفظ", "قلب"],
    response:
      "عشان تحفظ إعلان في المفضلة، اضغط على أيقونة القلب ♡ على أي إعلان. هتلاقي كل الإعلانات المحفوظة في صفحة حسابك.",
  },
  {
    keywords: ["دفع", "تحويل", "فودافون", "انستاباي", "instapay"],
    response:
      "حالياً التعامل المالي بيكون بين البائع والمشتري مباشرة.\nالطرق الشائعة: كاش عند الاستلام، فودافون كاش، إنستاباي، أو تحويل بنكي.\nنصيحة: استخدم طريقة دفع آمنة ومعاين السلعة قبل الدفع.",
  },
  {
    keywords: ["شكوى", "مشكلة", "بلاغ", "نصب", "احتيال"],
    response:
      "لو واجهتك مشكلة:\n• استخدم زر \"إبلاغ\" في صفحة الإعلان\n• تجنب الدفع مقدماً قبل معاينة السلعة\n• قابل البائع في مكان عام\n• اتأكد من حالة السلعة قبل الشراء\n\nسلامتك أهم حاجة عندنا!",
  },
  {
    keywords: ["بحث", "ابحث", "دور", "الاقي"],
    response:
      "عشان تلاقي اللي بتدور عليه:\n1. استخدم شريط البحث في الصفحة الرئيسية\n2. اكتب اللي عايزه بالعربي\n3. استخدم الفلاتر لتحديد السعر والموقع والحالة\n4. رتب النتائج حسب الأحدث أو الأقرب ليك\n5. أو اسألني هنا وأنا هدورلك!",
  },
];

// ═══════════════════════════════════════════
// Smart Intent Detection
// ═══════════════════════════════════════════
type Intent =
  | "search_product"
  | "price_check"
  | "price_quality"
  | "find_alternative"
  | "faq"
  | "greeting"
  | "thanks"
  | "unknown";

interface DetectedIntent {
  intent: Intent;
  category?: string;
  brand?: string;
  model?: string;
  maxPrice?: number;
  keywords: string[];
}

const brandMap: Record<string, { category: string; brand: string }> = {
  "ايفون": { category: "phones", brand: "آيفون" },
  "آيفون": { category: "phones", brand: "آيفون" },
  "iphone": { category: "phones", brand: "آيفون" },
  "سامسونج": { category: "phones", brand: "سامسونج" },
  "samsung": { category: "phones", brand: "سامسونج" },
  "شاومي": { category: "phones", brand: "شاومي" },
  "اوبو": { category: "phones", brand: "أوبو" },
  "ريلمي": { category: "phones", brand: "ريلمي" },
  "هواوي": { category: "phones", brand: "هواوي" },
  "تويوتا": { category: "cars", brand: "تويوتا" },
  "هيونداي": { category: "cars", brand: "هيونداي" },
  "شيفروليه": { category: "cars", brand: "شيفروليه" },
  "نيسان": { category: "cars", brand: "نيسان" },
  "كيا": { category: "cars", brand: "كيا" },
  "بي ام": { category: "cars", brand: "بي إم دبليو" },
  "مرسيدس": { category: "cars", brand: "مرسيدس" },
  "فيات": { category: "cars", brand: "فيات" },
  "سكودا": { category: "cars", brand: "سكودا" },
  "mg": { category: "cars", brand: "MG" },
  "بلايستيشن": { category: "hobbies", brand: "بلايستيشن" },
  "ps5": { category: "hobbies", brand: "بلايستيشن" },
  "اكس بوكس": { category: "hobbies", brand: "إكسبوكس" },
  "توشيبا": { category: "appliances", brand: "توشيبا" },
  "شارب": { category: "appliances", brand: "شارب" },
};

const categoryKeywords: Record<string, string[]> = {
  cars: ["عربية", "سيارة", "سيارات", "موتور", "موتوسيكل"],
  real_estate: ["شقة", "شقق", "فيلا", "ارض", "أرض", "محل", "مكتب", "عقار"],
  phones: ["موبايل", "تليفون", "تابلت", "جوال"],
  fashion: ["هدوم", "ملابس", "جزم", "شنط", "حذاء"],
  gold: ["ذهب", "فضة", "دهب", "خاتم", "سلسلة", "دبلة", "محبس"],
  appliances: ["غسالة", "ثلاجة", "بوتاجاز", "مكيف", "سخان"],
  furniture: ["أثاث", "اثاث", "سفرة", "انتريه", "غرفة نوم", "مطبخ"],
};

function detectIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase().trim();
  const result: DetectedIntent = { intent: "unknown", keywords: [] };

  // Greetings
  if (["سلام", "اهلا", "مرحبا", "هاي", "صباح", "مساء", "ازيك", "عامل"].some((g) => lower.includes(g))) {
    result.intent = "greeting";
    return result;
  }

  // Thanks
  if (["شكرا", "شكر", "تسلم", "ميرسي", "thanks"].some((t) => lower.includes(t))) {
    result.intent = "thanks";
    return result;
  }

  // Extract price
  const priceMatch = lower.match(/(\d[\d,]*)\s*(الف|ألف|جنيه|ك|k)/);
  if (priceMatch) {
    let num = parseInt(priceMatch[1].replace(/,/g, ""));
    if (["الف", "ألف", "ك", "k"].includes(priceMatch[2])) num *= 1000;
    result.maxPrice = num;
  }

  // Extract brand
  for (const [key, val] of Object.entries(brandMap)) {
    if (lower.includes(key)) {
      result.brand = val.brand;
      result.category = val.category;
      result.keywords.push(key);
      break;
    }
  }

  // Extract category
  if (!result.category) {
    for (const [catId, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((k) => lower.includes(k))) {
        result.category = catId;
        break;
      }
    }
  }

  // Determine intent
  const priceCheckWords = ["سعر", "اسعار", "كام", "بكام", "متوسط", "ثمن"];
  const priceQualityWords = ["كويس", "غالي", "رخيص", "مناسب", "معقول"];
  const searchWords = ["عايز", "ابحث", "دور", "محتاج", "فين", "الاقي", "عندك"];
  const alternativeWords = ["ارخص", "أرخص", "أحسن", "بديل", "غيره", "تاني"];

  if (alternativeWords.some((w) => lower.includes(w))) {
    result.intent = "find_alternative";
  } else if (priceQualityWords.some((w) => lower.includes(w)) && result.brand) {
    result.intent = "price_quality";
  } else if (priceCheckWords.some((w) => lower.includes(w))) {
    result.intent = "price_check";
  } else if (searchWords.some((w) => lower.includes(w)) || result.brand || result.category) {
    result.intent = "search_product";
  } else {
    result.intent = "faq";
  }

  return result;
}

// ═══════════════════════════════════════════
// Search ads in database
// ═══════════════════════════════════════════
async function searchAds(params: {
  category?: string;
  brand?: string;
  maxPrice?: number;
  limit?: number;
}): Promise<Array<{ id: string; title: string; price: number; saleType: string; governorate: string }>> {
  try {
    let query = supabase
      .from("ads" as never)
      .select("id, title, price, sale_type, governorate, category_fields")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(params.limit || 5);

    if (params.category) query = query.eq("category_id", params.category);
    if (params.maxPrice) query = query.lte("price", params.maxPrice);

    const { data } = await query;
    if (!data) return [];

    let results = data as Array<{
      id: string; title: string; price: number; sale_type: string;
      governorate: string; category_fields: Record<string, unknown>;
    }>;

    if (params.brand) {
      const brandLower = params.brand.toLowerCase();
      results = results.filter((ad) => {
        const fields = ad.category_fields || {};
        const adBrand = (String(fields.brand || "")).toLowerCase();
        return adBrand.includes(brandLower) || ad.title.toLowerCase().includes(brandLower);
      });
    }

    return results.map((ad) => ({
      id: ad.id,
      title: ad.title,
      price: Number(ad.price) || 0,
      saleType: ad.sale_type,
      governorate: ad.governorate || "",
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// Get price stats
// ═══════════════════════════════════════════
async function getPriceStats(category: string, brand?: string): Promise<{
  avg: number; min: number; max: number; count: number;
} | null> {
  try {
    const query = supabase
      .from("ads" as never)
      .select("price, category_fields")
      .eq("category_id", category)
      .eq("status", "active")
      .not("price", "is", null)
      .gt("price", 0)
      .limit(100);

    const { data } = await query;
    if (!data || data.length === 0) return null;

    let ads = data as Array<{ price: number; category_fields: Record<string, unknown> }>;

    if (brand) {
      const bl = brand.toLowerCase();
      ads = ads.filter((ad) => {
        const fields = ad.category_fields || {};
        return (String(fields.brand || "")).toLowerCase().includes(bl);
      });
    }

    if (ads.length === 0) return null;
    const prices = ads.map((a) => Number(a.price)).sort((a, b) => a - b);
    return {
      avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      min: prices[0],
      max: prices[prices.length - 1],
      count: prices.length,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// Generate smart responses
// ═══════════════════════════════════════════
async function generateResponse(message: string, history?: ChatMessage[]): Promise<string> {
  const intent = detectIntent(message);

  switch (intent.intent) {
    case "greeting":
      return "أهلاً بيك في مكسب! 💚\nأنا المساعد الذكي — ممكن أساعدك تلاقي أي حاجة بتدور عليها.\n\nجرب تقولي:\n• \"عايز آيفون 15 بأقل من 20 ألف\"\n• \"متوسط سعر تويوتا كورولا 2020 كام؟\"\n• \"فيه شقق في مدينة نصر؟\"";

    case "thanks":
      return "العفو! 💚 لو محتاج أي حاجة تانية أنا موجود. كل صفقة مكسب!";

    case "search_product": {
      const ads = await searchAds({
        category: intent.category,
        brand: intent.brand,
        maxPrice: intent.maxPrice,
        limit: 5,
      });

      if (ads.length === 0) {
        return `مش لاقي نتائج دلوقتي${intent.brand ? ` لـ ${intent.brand}` : ""}${intent.maxPrice ? ` بأقل من ${intent.maxPrice.toLocaleString("en-US")} جنيه` : ""}.\n\nجرب:\n• وسّع نطاق البحث\n• غيّر الميزانية\n• ابحث بكلمات مختلفة`;
      }

      let response = `لقيتلك ${ads.length} إعلان${intent.brand ? ` لـ ${intent.brand}` : ""}${intent.maxPrice ? ` بأقل من ${intent.maxPrice.toLocaleString("en-US")} جنيه` : ""}:\n\n`;

      ads.forEach((ad, i) => {
        const icon = ad.saleType === "auction" ? "🔥" : ad.saleType === "exchange" ? "🔄" : "💰";
        response += `${i + 1}. ${icon} ${ad.title}\n`;
        if (ad.price) response += `   💰 ${ad.price.toLocaleString("en-US")} جنيه`;
        if (ad.governorate) response += ` · 📍 ${ad.governorate}`;
        response += "\n";
      });

      if (intent.category && intent.brand) {
        const stats = await getPriceStats(intent.category, intent.brand);
        if (stats) {
          response += `\n📊 معلومة: متوسط سعر ${intent.brand} في السوق ${stats.avg.toLocaleString("en-US")} جنيه (من ${stats.count} إعلان)`;
        }
      }

      response += "\n\nعايز تعرف تفاصيل أكتر؟ أو أدورلك على حاجة تانية؟";
      return response;
    }

    case "price_check": {
      if (!intent.category || !intent.brand) {
        return "عشان أقدر أقولك السعر، قولي اسم المنتج بالظبط.\nمثلاً: \"سعر آيفون 15 برو\" أو \"سعر تويوتا كورولا 2020\"";
      }

      const stats = await getPriceStats(intent.category, intent.brand);
      if (!stats) {
        return `مش لاقي بيانات كافية عن ${intent.brand} دلوقتي.\nجرب تبحث في التطبيق — ممكن تلاقي إعلانات جديدة.`;
      }

      let response = `📊 تحليل أسعار ${intent.brand} في مكسب:\n\n`;
      response += `💰 متوسط السعر: ${stats.avg.toLocaleString("en-US")} جنيه\n`;
      response += `📉 أقل سعر: ${stats.min.toLocaleString("en-US")} جنيه\n`;
      response += `📈 أعلى سعر: ${stats.max.toLocaleString("en-US")} جنيه\n`;
      response += `📋 عدد الإعلانات: ${stats.count}\n`;

      if (intent.maxPrice) {
        const pct = ((intent.maxPrice - stats.avg) / stats.avg) * 100;
        if (pct <= -15) response += `\n🔥 ميزانيتك (${intent.maxPrice.toLocaleString("en-US")} جنيه) أقل من المتوسط — ده سعر ممتاز لو لقيت!`;
        else if (pct <= 10) response += `\n✅ ميزانيتك معقولة — هتلاقي خيارات كويسة.`;
        else response += `\n💡 ميزانيتك أعلى من المتوسط — هتلاقي خيارات كتير بسهولة.`;
      }

      return response;
    }

    case "price_quality": {
      if (intent.brand && intent.maxPrice) {
        const stats = await getPriceStats(intent.category || "", intent.brand);
        if (stats) {
          const pct = ((intent.maxPrice - stats.avg) / stats.avg) * 100;
          if (pct <= -20) return `🔥 السعر ده ممتاز! أقل من المتوسط بـ ${Math.abs(Math.round(pct))}%. لو الحالة كويسة — خدها فوراً!`;
          if (pct <= -10) return `✅ السعر كويس — أقل من المتوسط بـ ${Math.abs(Math.round(pct))}%.`;
          if (pct <= 10) return `👍 السعر ده عادل — قريب من متوسط السوق (${stats.avg.toLocaleString("en-US")} جنيه).`;
          if (pct <= 25) return `⚠️ السعر أعلى من المتوسط بـ ${Math.round(pct)}%. حاول تفاوض ولا شوف إعلانات تانية.`;
          return `💸 السعر ده مرتفع — أعلى من المتوسط بـ ${Math.round(pct)}%. أنصحك تدور على عروض أحسن.`;
        }
      }
      return "عشان أقيّم السعر، قولي اسم المنتج والسعر.\nمثلاً: \"آيفون 15 بـ 20 ألف كويس؟\"";
    }

    case "find_alternative": {
      if (!intent.category) {
        return "قولي بتدور على بديل لإيه وأنا هدور لك على خيارات أرخص أو أحسن.";
      }

      const ads = await searchAds({
        category: intent.category,
        maxPrice: intent.maxPrice ? Math.round(intent.maxPrice * 0.8) : undefined,
        limit: 5,
      });

      if (ads.length === 0) return "مش لاقي بدائل دلوقتي. جرب توسّع الميزانية أو تبحث في قسم تاني.";

      let response = "🔍 لقيتلك بدائل ممكن تعجبك:\n\n";
      ads.forEach((ad, i) => {
        const icon = ad.saleType === "auction" ? "🔥" : ad.saleType === "exchange" ? "🔄" : "💰";
        response += `${i + 1}. ${icon} ${ad.title}\n`;
        if (ad.price) response += `   💰 ${ad.price.toLocaleString("en-US")} جنيه\n`;
      });
      return response;
    }

    case "faq": {
      const lower = message.toLowerCase();
      let bestMatch = { score: 0, response: "" };
      for (const entry of knowledgeBase) {
        let score = 0;
        for (const kw of entry.keywords) {
          if (lower.includes(kw)) score += kw.length;
        }
        if (score > bestMatch.score) bestMatch = { score, response: entry.response };
      }
      if (bestMatch.score > 0) return bestMatch.response;

      return "مش متأكد إني فهمت سؤالك. ممكن تجرب:\n• \"عايز آيفون 15 بأقل من 20 ألف\"\n• \"سعر تويوتا كورولا 2020 كام؟\"\n• \"فيه شقق في مدينة نصر؟\"\n• \"إزاي أضيف إعلان؟\"\n\nأو اكتب سؤالك بطريقة تانية!";
    }

    default:
      return "أهلاً! 💚 أنا المساعد الذكي بتاع مكسب.\nممكن أساعدك تلاقي أي حاجة أو أحللك الأسعار.\n\nجرب تقولي إيه اللي محتاجه!";
  }
}

// ═══════════════════════════════════════════
// API Handler
// ═══════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = body as { message: string; history?: ChatMessage[] };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "الرسالة فاضية" }, { status: 400 });
    }

    const response = await generateResponse(message.trim(), history);
    return NextResponse.json({ response, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "حصلت مشكلة. جرب تاني" }, { status: 500 });
  }
}
