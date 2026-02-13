/**
 * AI Query Engine — understands Egyptian Arabic natural language,
 * detects intent, extracts entities, and produces smart search criteria.
 *
 * This goes far beyond keyword matching:
 * - Understands slang and colloquial Egyptian
 * - Detects purchase intent (buy, exchange, gift, urgent, bargain)
 * - Understands price hints ("مش غالي" = budget)
 * - Handles compound queries ("شقة 3 غرف مدينة نصر تحت مليون")
 * - Cross-category understanding ("هدية لمراتي" → jewelry, bags, perfumes)
 * - Generates human-readable interpretation
 */

import { categoriesConfig, getCategoryById } from "@/lib/categories/categories-config";
import { governorates } from "@/lib/data/governorates";
import type {
  AIParsedQuery,
  SearchIntent,
  PriceIntent,
  ConditionHint,
  SearchRefinement,
  EmptySuggestion,
  CATEGORY_PRICE_RANGES as PriceRangesType,
} from "./ai-search-types";
import { CATEGORY_PRICE_RANGES } from "./ai-search-types";

/* ══════════════════════════════════════════════════════════════════════
   KNOWLEDGE BASE — Egyptian Arabic understanding
   ══════════════════════════════════════════════════════════════════════ */

/** Intent detection patterns */
const INTENT_PATTERNS: { pattern: RegExp; intent: SearchIntent }[] = [
  // Gift intent
  { pattern: /هدي[ةه]|جيفت|gift|لمرات[يى]|لخطيبت[يى]|لأم[يى]|لبنت[يى]|لابن[يى]|لأبو[يى]/i, intent: "gift" },
  // Urgent
  { pattern: /ضرور[يى]|مستعجل|محتاج دلوقت[يى]|عايز[ةه]? النهارد[ةه]|urgent/i, intent: "urgent" },
  // Bargain
  { pattern: /عرض|خصم|تخفيض|أوكازيون|رخيص|ببلاش|أرخص/i, intent: "bargain" },
  // Exchange
  { pattern: /أبدل|تبديل|تبادل|بدل[هاي]?|مقايض[ةه]/i, intent: "exchange" },
  // Compare
  { pattern: /أفضل|أحسن|قارن|مقارن[ةه]|الفرق بين|ولا|أو .* أحسن/i, intent: "compare" },
  // Buy (explicit)
  { pattern: /أشتر[يى]|اشتر[يى]|عايز[ةه]? أجيب|محتاج[ةه]? أجيب/i, intent: "buy" },
];

/** Price intent patterns */
const PRICE_PATTERNS: { pattern: RegExp; intent: PriceIntent }[] = [
  // Budget / cheap
  { pattern: /رخيص|مش غال[يى]|بسعر كويس|اقتصاد[يى]|مناسب|في المتناول|أرخص/i, intent: "budget" },
  // Premium / expensive
  { pattern: /فاخر|لوكس|سوبر لوكس|أصل[يى]|أوريجنال|بريميوم|هاي كوالت[يى]/i, intent: "premium" },
  // Mid range
  { pattern: /متوسط|معقول/i, intent: "mid" },
];

/** Exact price extraction patterns */
const EXACT_PRICE_PATTERNS: { pattern: RegExp; multiplier: number }[] = [
  // "تحت 5000" / "أقل من 5000"
  { pattern: /(?:تحت|أقل من|under|ب?أقل)\s*(\d[\d,]*)\s*(?:جنيه|ج)?/i, multiplier: -1 },
  // "فوق 5000" / "أكتر من 5000"
  { pattern: /(?:فوق|أكتر من|أعلى من|over)\s*(\d[\d,]*)\s*(?:جنيه|ج)?/i, multiplier: 1 },
  // "في حدود 5000" / "حوالي 5000"
  { pattern: /(?:في حدود|حوالي|حوال[يى]|تقريب[اً]|around)\s*(\d[\d,]*)\s*(?:جنيه|ج)?/i, multiplier: 0 },
  // "من 3000 لـ 5000"
  { pattern: /من\s*(\d[\d,]*)\s*(?:ل[ـى]?|إلى|-)\s*(\d[\d,]*)\s*(?:جنيه|ج)?/i, multiplier: 2 },
  // "بـ 5000" / "ب 5000 جنيه"
  { pattern: /ب[ـ ]?(\d[\d,]*)\s*(?:جنيه|ج)\b/i, multiplier: 0 },
];

/** Condition hint patterns */
const CONDITION_PATTERNS: { pattern: RegExp; hint: ConditionHint }[] = [
  { pattern: /جديد|متبرشم|new|sealed|بالتاج/i, hint: "new" },
  { pattern: /زيرو|زي الجديد|like.?new|مستعمل زيرو|نضيف جداً/i, hint: "like_new" },
  { pattern: /مستعمل|كويس|نضيف|used|مقبول/i, hint: "good" },
];

/** Gift target → suggested categories */
const GIFT_TARGETS: Record<string, string[]> = {
  "مراتي": ["gold", "luxury", "fashion", "phones"],
  "خطيبتي": ["gold", "luxury", "fashion", "phones"],
  "أمي": ["gold", "appliances", "fashion"],
  "بنتي": ["phones", "fashion", "hobbies"],
  "ابني": ["phones", "hobbies", "fashion"],
  "أبويا": ["phones", "tools", "hobbies"],
  "صاحبي": ["phones", "hobbies", "tools"],
  "صاحبتي": ["fashion", "luxury", "gold"],
  "أطفال": ["hobbies", "fashion", "phones"],
  "راجل": ["phones", "tools", "hobbies", "luxury"],
  "ست": ["gold", "luxury", "fashion"],
};

/** Extended brand → category map (supplements smart-parser.ts) */
const EXTENDED_BRANDS: Record<string, { category: string; value: string; model?: string }> = {
  // Cars — models as keywords
  "كورولا": { category: "cars", value: "toyota", model: "كورولا" },
  "كامري": { category: "cars", value: "toyota", model: "كامري" },
  "لانسر": { category: "cars", value: "mitsubishi", model: "لانسر" },
  "سيراتو": { category: "cars", value: "kia", model: "سيراتو" },
  "فيرنا": { category: "cars", value: "hyundai", model: "فيرنا" },
  "أكسنت": { category: "cars", value: "hyundai", model: "أكسنت" },
  "توسان": { category: "cars", value: "hyundai", model: "توسان" },
  "سبورتاج": { category: "cars", value: "kia", model: "سبورتاج" },
  "برادو": { category: "cars", value: "toyota", model: "برادو" },
  "فورتشنر": { category: "cars", value: "toyota", model: "فورتشنر" },
  "بي إم": { category: "cars", value: "bmw" },
  "بي ام": { category: "cars", value: "bmw" },
  "مرسيدس": { category: "cars", value: "mercedes" },
  "تويوتا": { category: "cars", value: "toyota" },
  "هيونداي": { category: "cars", value: "hyundai" },
  "هيونداى": { category: "cars", value: "hyundai" },
  "نيسان": { category: "cars", value: "nissan" },
  "كيا": { category: "cars", value: "kia" },
  "فيات": { category: "cars", value: "fiat" },
  "شيفروليه": { category: "cars", value: "chevrolet" },
  "سكودا": { category: "cars", value: "skoda" },
  "سوزوكي": { category: "cars", value: "suzuki" },
  "هوندا": { category: "cars", value: "honda" },
  "شيري": { category: "cars", value: "chery" },
  "جيلي": { category: "cars", value: "geely" },
  "ام جي": { category: "cars", value: "mg" },
  "بي واي دي": { category: "cars", value: "byd" },
  // Phones
  "آيفون": { category: "phones", value: "apple" },
  "ايفون": { category: "phones", value: "apple" },
  "أيفون": { category: "phones", value: "apple" },
  "iphone": { category: "phones", value: "apple" },
  "سامسونج": { category: "phones", value: "samsung" },
  "samsung": { category: "phones", value: "samsung" },
  "جالاكسي": { category: "phones", value: "samsung" },
  "galaxy": { category: "phones", value: "samsung" },
  "شاومي": { category: "phones", value: "xiaomi" },
  "xiaomi": { category: "phones", value: "xiaomi" },
  "ريدمي": { category: "phones", value: "xiaomi" },
  "أوبو": { category: "phones", value: "oppo" },
  "oppo": { category: "phones", value: "oppo" },
  "ريلمي": { category: "phones", value: "realme" },
  "realme": { category: "phones", value: "realme" },
  "هواوي": { category: "phones", value: "huawei" },
  "huawei": { category: "phones", value: "huawei" },
  "نوكيا": { category: "phones", value: "nokia" },
  "ون بلس": { category: "phones", value: "oneplus" },
  // Appliances
  "توشيبا": { category: "appliances", value: "toshiba" },
  "شارب": { category: "appliances", value: "sharp" },
  "كاريير": { category: "appliances", value: "carrier" },
  "يونيفرسال": { category: "appliances", value: "universal" },
  "فريش": { category: "appliances", value: "fresh" },
  "بيكو": { category: "appliances", value: "beko" },
  "إل جي": { category: "appliances", value: "lg" },
  "ال جي": { category: "appliances", value: "lg" },
  // Luxury
  "لويس فيتون": { category: "luxury", value: "louis_vuitton" },
  "جوتشي": { category: "luxury", value: "gucci" },
  "شانيل": { category: "luxury", value: "chanel" },
  "رولكس": { category: "luxury", value: "rolex" },
  "كارتييه": { category: "luxury", value: "cartier" },
  "ديور": { category: "luxury", value: "dior" },
  "برادا": { category: "luxury", value: "prada" },
  // Tools
  "بوش": { category: "tools", value: "bosch" },
  "ماكيتا": { category: "tools", value: "makita" },
  "ديوالت": { category: "tools", value: "dewalt" },
  // Hobbies
  "بلايستيشن": { category: "hobbies", value: "sony" },
  "ps5": { category: "hobbies", value: "sony" },
  "ps4": { category: "hobbies", value: "sony" },
  "إكسبوكس": { category: "hobbies", value: "microsoft" },
  "xbox": { category: "hobbies", value: "microsoft" },
  "نينتيندو": { category: "hobbies", value: "nintendo" },
};

/** Keyword → entity mapping: maps common product keywords to subcategory + type fields.
 *  This makes searches like "شنطة" match the right subcategory and type filter. */
const KEYWORD_ENTITY_MAP: Record<string, {
  category: string;
  subcategory?: string;
  fields?: Record<string, string>;
}> = {
  // Fashion — bags
  "شنطة": { category: "fashion", subcategory: "bags", fields: { type: "bag" } },
  "شنط": { category: "fashion", subcategory: "bags", fields: { type: "bag" } },
  // Fashion — shoes
  "حذاء": { category: "fashion", subcategory: "shoes", fields: { type: "shoes" } },
  "جزمة": { category: "fashion", subcategory: "shoes", fields: { type: "shoes" } },
  // Fashion — types
  "فستان": { category: "fashion", fields: { type: "dress" } },
  "قميص": { category: "fashion", fields: { type: "shirt" } },
  "بنطلون": { category: "fashion", fields: { type: "pants" } },
  "جاكت": { category: "fashion", fields: { type: "jacket" } },
  "كوت": { category: "fashion", fields: { type: "jacket" } },
  "عباية": { category: "fashion", fields: { type: "abaya" } },
  "بيجامة": { category: "fashion", fields: { type: "pajama" } },
  // Appliances
  "غسالة": { category: "appliances", subcategory: "washers", fields: { type: "washer" } },
  "ثلاجة": { category: "appliances", subcategory: "fridges", fields: { type: "fridge" } },
  "تلاجة": { category: "appliances", subcategory: "fridges", fields: { type: "fridge" } },
  "بوتاجاز": { category: "appliances", subcategory: "stoves", fields: { type: "stove" } },
  "مكيف": { category: "appliances", subcategory: "ac", fields: { type: "ac" } },
  "تكييف": { category: "appliances", subcategory: "ac", fields: { type: "ac" } },
  "سخان": { category: "appliances", subcategory: "heaters", fields: { type: "heater" } },
  // Real estate
  "شقة": { category: "real_estate", subcategory: "apartments_sale", fields: { property_type: "apartment" } },
  "شقق": { category: "real_estate", subcategory: "apartments_sale", fields: { property_type: "apartment" } },
  "فيلا": { category: "real_estate", subcategory: "villas", fields: { property_type: "villa" } },
  "محل": { category: "real_estate", subcategory: "shops", fields: { property_type: "shop" } },
  "مكتب": { category: "real_estate", subcategory: "offices", fields: { property_type: "office" } },
  // Furniture
  "غرفة نوم": { category: "furniture", subcategory: "bedrooms" },
  "سفرة": { category: "furniture", subcategory: "dining" },
  "أنتريه": { category: "furniture", subcategory: "living" },
  // Gold
  "خاتم": { category: "gold", fields: { type: "ring" } },
  "دبلة": { category: "gold", fields: { type: "ring" } },
  "محبس": { category: "gold", fields: { type: "ring" } },
  "سلسلة": { category: "gold", fields: { type: "necklace" } },
  "أسورة": { category: "gold", fields: { type: "bracelet" } },
  "غوايش": { category: "gold", fields: { type: "bracelet" } },
  "حلق": { category: "gold", fields: { type: "earring" } },
  "جنيه ذهب": { category: "gold", fields: { type: "gold_pound" } },
  "سبيكة": { category: "gold", fields: { type: "bar" } },
  // Luxury — bags
  "شنط فاخرة": { category: "luxury", subcategory: "luxury-bags", fields: { type: "bag" } },
};

/** Extended category keywords (slang, colloquial) */
const EXTENDED_CATEGORY_KEYWORDS: Record<string, string[]> = {
  cars: ["عربية", "عربيات", "سيارة", "سيارات", "موتوسيكل", "موتور", "تاكسي", "ميكروباص", "نص نقل", "ربع نقل"],
  real_estate: ["شقة", "شقق", "عقار", "فيلا", "أرض", "محل", "مكتب", "دور", "طابق", "روف", "بنتهاوس", "دوبلكس", "استوديو", "إيجار", "تمليك"],
  phones: ["موبايل", "موبايلات", "تليفون", "تلفون", "فون", "تابلت", "آيباد", "ipad"],
  fashion: ["لبس", "ملابس", "هدوم", "قميص", "بنطلون", "فستان", "جاكت", "كوت", "عباية", "حجاب", "حذاء", "جزمة", "شنطة", "بيجامة"],
  scrap: ["خردة", "سكراب", "حديد قديم", "نحاس قديم", "ألمونيوم"],
  gold: ["ذهب", "فضة", "دهب", "دبلة", "محبس", "خاتم", "سلسلة", "غوايش", "حلق", "سبيكة", "جنيه ذهب"],
  luxury: ["ماركة", "ماركات", "أوريجنال", "برفان", "عطر", "ساعة سويسري"],
  appliances: ["غسالة", "تلاجة", "ثلاجة", "بوتاجاز", "مكيف", "تكييف", "سخان", "ميكروويف", "ديب فريزر", "خلاط", "مكواة"],
  furniture: ["أثاث", "موبيليا", "غرفة نوم", "سفرة", "أنتريه", "صالون", "نيش", "بوفيه", "مطبخ", "سجاد", "ستائر"],
  hobbies: ["كاميرا", "دراجة", "عجلة", "كتاب", "كتب", "جيتار", "بيانو", "أورج"],
  tools: ["شنيور", "دريل", "صاروخ", "جلاخة", "عدة", "عدد", "كمبروسر", "مولد"],
  services: ["سباك", "كهربائي", "نقاش", "نجار", "سيراميك", "حداد", "نقل عفش", "نقل أثاث", "دروس", "صيانة"],
};

/** City → governorate mapping (extended) */
const CITY_MAP: Record<string, string> = {
  "مدينة نصر": "القاهرة", "مصر الجديدة": "القاهرة", "المعادي": "القاهرة",
  "الزمالك": "القاهرة", "التجمع الخامس": "القاهرة", "التجمع": "القاهرة",
  "الرحاب": "القاهرة", "مدينتي": "القاهرة", "الشروق": "القاهرة",
  "المقطم": "القاهرة", "حلوان": "القاهرة", "شبرا": "القاهرة",
  "وسط البلد": "القاهرة", "عين شمس": "القاهرة", "المرج": "القاهرة",
  "دار السلام": "القاهرة", "منشية ناصر": "القاهرة", "حدائق القبة": "القاهرة",
  "العباسية": "القاهرة", "الحسين": "القاهرة", "عابدين": "القاهرة",
  "6 أكتوبر": "الجيزة", "أكتوبر": "الجيزة", "الشيخ زايد": "الجيزة",
  "الدقي": "الجيزة", "المهندسين": "الجيزة", "فيصل": "الجيزة",
  "الهرم": "الجيزة", "العجوزة": "الجيزة", "بولاق": "الجيزة",
  "حدائق الأهرام": "الجيزة", "الحوامدية": "الجيزة",
  "سموحة": "الإسكندرية", "ستانلي": "الإسكندرية", "المنشية": "الإسكندرية",
  "سيدي بشر": "الإسكندرية", "سيدي جابر": "الإسكندرية",
  "جليم": "الإسكندرية", "كليوباترا": "الإسكندرية", "العجمي": "الإسكندرية",
  "المنصورة": "الدقهلية", "الزقازيق": "الشرقية", "طنطا": "الغربية",
  "شبرا الخيمة": "القليوبية", "بنها": "القليوبية",
  "المحلة": "الغربية", "المحلة الكبرى": "الغربية",
  "دمنهور": "البحيرة", "الفيوم": "الفيوم", "بني سويف": "بني سويف",
  "المنيا": "المنيا", "أسيوط": "أسيوط", "سوهاج": "سوهاج",
  "أسوان": "أسوان", "الأقصر": "الأقصر",
  "بورسعيد": "بورسعيد", "الإسماعيلية": "الإسماعيلية", "السويس": "السويس",
  "العاشر من رمضان": "الشرقية", "العاشر": "الشرقية",
  "العبور": "القليوبية", "الساحل الشمالي": "مرسى مطروح",
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN PARSE FUNCTION
   ══════════════════════════════════════════════════════════════════════ */

export function aiParseQuery(query: string): AIParsedQuery {
  const original = query.trim();
  let remaining = original;
  const result: AIParsedQuery = {
    originalQuery: original,
    cleanQuery: original,
    intent: "browse",
    priceIntent: "any",
    conditionHint: "any",
    categories: [],
    extractedFields: {},
    confidence: 0.5,
    alternativeQueries: [],
    interpretation: "",
  };

  if (!remaining) return result;

  // ── 1. Detect Intent ──
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(remaining)) {
      result.intent = intent;
      if (intent === "exchange") {
        result.saleType = "exchange";
      }
      break;
    }
  }

  // ── 2. Gift target detection ──
  if (result.intent === "gift") {
    for (const [target, cats] of Object.entries(GIFT_TARGETS)) {
      if (remaining.includes(target)) {
        result.giftTarget = target;
        result.categories = cats;
        result.primaryCategory = cats[0];
        remaining = remaining.replace(new RegExp(target, "g"), "").trim();
        break;
      }
    }
  }

  // ── 3. Detect Price Intent & Extract Exact Prices ──
  for (const { pattern, intent } of PRICE_PATTERNS) {
    if (pattern.test(remaining)) {
      result.priceIntent = intent;
      remaining = remaining.replace(pattern, "").trim();
      break;
    }
  }

  for (const { pattern, multiplier } of EXACT_PRICE_PATTERNS) {
    const match = remaining.match(pattern);
    if (match) {
      const num1 = parseInt(match[1].replace(/,/g, ""));
      if (multiplier === -1) {
        result.priceMax = num1;
        result.priceIntent = "exact";
      } else if (multiplier === 1) {
        result.priceMin = num1;
        result.priceIntent = "exact";
      } else if (multiplier === 0) {
        result.priceMin = Math.round(num1 * 0.7);
        result.priceMax = Math.round(num1 * 1.3);
        result.priceIntent = "exact";
      } else if (multiplier === 2 && match[2]) {
        result.priceMin = num1;
        result.priceMax = parseInt(match[2].replace(/,/g, ""));
        result.priceIntent = "exact";
      }
      remaining = remaining.replace(match[0], "").trim();
      break;
    }
  }

  // ── 4. Detect Condition ──
  for (const { pattern, hint } of CONDITION_PATTERNS) {
    if (pattern.test(remaining)) {
      result.conditionHint = hint;
      break;
    }
  }

  // ── 5. Extract Gold Karat ──
  const karatMatch = remaining.match(/عيار\s*(24|21|18|14)/);
  if (karatMatch) {
    result.extractedFields.karat = karatMatch[1];
    if (!result.primaryCategory) result.primaryCategory = "gold";
    result.categories = [...new Set([...result.categories, "gold"])];
    remaining = remaining.replace(karatMatch[0], "").trim();
  }
  const silverMatch = remaining.match(/فضة\s*(925|900)/);
  if (silverMatch) {
    result.extractedFields.karat = `silver_${silverMatch[1]}`;
    if (!result.primaryCategory) result.primaryCategory = "gold";
    result.categories = [...new Set([...result.categories, "gold"])];
    remaining = remaining.replace(silverMatch[0], "").trim();
  }

  // ── 6. Extract Year ──
  const yearMatch = remaining.match(/\b(199\d|20[0-2]\d)\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1]);
    remaining = remaining.replace(yearMatch[0], "").trim();
  }

  // ── 7. Extract Real Estate specifics ──
  const roomsMatch = remaining.match(/(\d+)\s*غرف?[ةه]?/);
  if (roomsMatch) {
    result.extractedFields.rooms = roomsMatch[1];
    if (!result.primaryCategory) result.primaryCategory = "real_estate";
    result.categories = [...new Set([...result.categories, "real_estate"])];
    remaining = remaining.replace(roomsMatch[0], "").trim();
  }

  const areaMatch = remaining.match(/(\d+)\s*(?:متر|م²|م\b)/);
  if (areaMatch) {
    result.extractedFields.area = areaMatch[1];
    if (!result.primaryCategory) result.primaryCategory = "real_estate";
    remaining = remaining.replace(areaMatch[0], "").trim();
  }

  // ── 8. Extract Phone storage ──
  const storageMatch = remaining.match(/(\d+)\s*(?:جيجا|جيجابايت|GB|gb|تيرا|TB)/i);
  if (storageMatch) {
    const gb = parseInt(storageMatch[1]);
    const val = storageMatch[0].toLowerCase().includes("تيرا") || storageMatch[0].toLowerCase().includes("tb")
      ? "1024" : String(gb);
    result.extractedFields.storage = val;
    if (!result.primaryCategory) result.primaryCategory = "phones";
    remaining = remaining.replace(storageMatch[0], "").trim();
  }

  // ── 9. Extract Brand (longest match first) ──
  const sortedBrands = Object.keys(EXTENDED_BRANDS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedBrands) {
    if (remaining.toLowerCase().includes(keyword.toLowerCase())) {
      const brand = EXTENDED_BRANDS[keyword];
      result.brand = brand.value;
      result.extractedFields.brand = brand.value;
      if (brand.model) {
        result.model = brand.model;
        result.extractedFields.model = brand.model;
      }
      if (!result.primaryCategory) result.primaryCategory = brand.category;
      result.categories = [...new Set([...result.categories, brand.category])];
      remaining = remaining.replace(new RegExp(keyword, "i"), "").trim();
      break;
    }
  }

  // ── 10. Extract City → Governorate ──
  const sortedCities = Object.keys(CITY_MAP).sort((a, b) => b.length - a.length);
  for (const city of sortedCities) {
    if (remaining.includes(city)) {
      result.city = city;
      result.governorate = CITY_MAP[city];
      remaining = remaining.replace(city, "").trim();
      break;
    }
  }
  if (!result.governorate) {
    for (const gov of governorates) {
      if (remaining.includes(gov)) {
        result.governorate = gov;
        remaining = remaining.replace(gov, "").trim();
        break;
      }
    }
  }

  // ── 11. Extract Category + Subcategory + Type from keywords ──
  // First try the entity map (longest keyword first) for subcategory + type detection
  const sortedEntityKeys = Object.keys(KEYWORD_ENTITY_MAP).sort((a, b) => b.length - a.length);
  for (const kw of sortedEntityKeys) {
    if (remaining.includes(kw)) {
      const entity = KEYWORD_ENTITY_MAP[kw];
      if (!result.primaryCategory) {
        result.primaryCategory = entity.category;
        result.categories = [...new Set([...result.categories, entity.category])];
      }
      if (entity.subcategory && !result.subcategory) {
        result.subcategory = entity.subcategory;
      }
      if (entity.fields) {
        result.extractedFields = { ...result.extractedFields, ...entity.fields };
      }
      remaining = remaining.replace(kw, "").trim();
      break;
    }
  }
  // Fallback: detect category from extended keywords (without entity details)
  if (!result.primaryCategory) {
    outer: for (const [catId, keywords] of Object.entries(EXTENDED_CATEGORY_KEYWORDS)) {
      const sorted = [...keywords].sort((a, b) => b.length - a.length);
      for (const kw of sorted) {
        if (remaining.includes(kw)) {
          result.primaryCategory = catId;
          result.categories = [...new Set([...result.categories, catId])];
          remaining = remaining.replace(kw, "").trim();
          break outer;
        }
      }
    }
  }

  // ── 12. Apply price range from intent ──
  if (result.priceIntent !== "exact" && result.priceIntent !== "any" && result.primaryCategory) {
    const ranges = CATEGORY_PRICE_RANGES[result.primaryCategory];
    if (ranges) {
      const range = ranges[result.priceIntent as keyof typeof ranges];
      if (range) {
        result.priceMin = range[0];
        result.priceMax = range[1];
      }
    }
  }

  // ── 13. Clean remaining text ──
  result.cleanQuery = remaining
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s—،\-:؟?!]+|[\s—،\-:؟?!]+$/g, "")
    .trim();

  // ── 14. Calculate Confidence ──
  let confidence = 0.3;
  if (result.primaryCategory) confidence += 0.2;
  if (result.brand) confidence += 0.15;
  if (result.governorate) confidence += 0.1;
  if (result.priceIntent !== "any") confidence += 0.1;
  if (result.conditionHint !== "any") confidence += 0.05;
  if (result.year) confidence += 0.05;
  if (Object.keys(result.extractedFields).length > 2) confidence += 0.05;
  result.confidence = Math.min(confidence, 1);

  // ── 15. Generate Interpretation ──
  result.interpretation = generateInterpretation(result);

  // ── 16. Generate Alternative Queries ──
  result.alternativeQueries = generateAlternatives(result);

  return result;
}

/* ══════════════════════════════════════════════════════════════════════
   INTERPRETATION GENERATOR
   ══════════════════════════════════════════════════════════════════════ */

function generateInterpretation(parsed: AIParsedQuery): string {
  const parts: string[] = [];

  // Intent prefix
  switch (parsed.intent) {
    case "gift": parts.push(`بتدور على هدية${parsed.giftTarget ? " لـ" + parsed.giftTarget : ""}`); break;
    case "urgent": parts.push("محتاج دلوقتي"); break;
    case "bargain": parts.push("بتدور على عرض كويس"); break;
    case "exchange": parts.push("عايز تبدل"); break;
    case "compare": parts.push("بتقارن بين"); break;
    default: parts.push("بتدور على"); break;
  }

  // Category
  if (parsed.primaryCategory) {
    const cat = getCategoryById(parsed.primaryCategory);
    if (cat) parts.push(cat.icon + " " + cat.name);
  }

  // Brand + model
  if (parsed.brand) {
    const brandLabel = getBrandLabel(parsed.brand, parsed.primaryCategory);
    parts.push(brandLabel);
    if (parsed.model) parts.push(parsed.model);
  }

  // Condition
  if (parsed.conditionHint !== "any") {
    const condLabels: Record<ConditionHint, string> = { new: "جديد", like_new: "زيرو", good: "مستعمل كويس", any: "" };
    parts.push(condLabels[parsed.conditionHint]);
  }

  // Price
  if (parsed.priceMin != null && parsed.priceMax != null) {
    parts.push(`من ${formatNum(parsed.priceMin)} لـ ${formatNum(parsed.priceMax)} جنيه`);
  } else if (parsed.priceMax != null) {
    parts.push(`تحت ${formatNum(parsed.priceMax)} جنيه`);
  } else if (parsed.priceMin != null) {
    parts.push(`فوق ${formatNum(parsed.priceMin)} جنيه`);
  } else if (parsed.priceIntent === "budget") {
    parts.push("بسعر كويس");
  } else if (parsed.priceIntent === "premium") {
    parts.push("فاخر");
  }

  // Location
  if (parsed.city) {
    parts.push(`في ${parsed.city}`);
  } else if (parsed.governorate) {
    parts.push(`في ${parsed.governorate}`);
  }

  // Specific fields
  if (parsed.extractedFields.rooms) {
    parts.push(`${parsed.extractedFields.rooms} غرف`);
  }
  if (parsed.extractedFields.storage) {
    parts.push(`${parsed.extractedFields.storage}GB`);
  }
  if (parsed.year) {
    parts.push(`موديل ${parsed.year}`);
  }

  return parts.filter(Boolean).join(" — ");
}

/* ══════════════════════════════════════════════════════════════════════
   ALTERNATIVE QUERY GENERATOR
   ══════════════════════════════════════════════════════════════════════ */

function generateAlternatives(parsed: AIParsedQuery): string[] {
  const alts: string[] = [];

  if (parsed.primaryCategory && parsed.brand) {
    // Suggest related brands
    const cat = getCategoryById(parsed.primaryCategory);
    if (cat) {
      const brandField = cat.fields.find((f) => f.id === "brand");
      if (brandField?.options) {
        const otherBrands = brandField.options
          .filter((o) => o.value !== parsed.brand && o.value !== "other")
          .slice(0, 3);
        for (const b of otherBrands) {
          alts.push(`${b.label}${parsed.model ? " " + parsed.model : ""}`);
        }
      }
    }
  }

  // Suggest broader search (remove brand)
  if (parsed.brand && parsed.primaryCategory) {
    const cat = getCategoryById(parsed.primaryCategory);
    if (cat) alts.push(cat.name);
  }

  // Suggest nearby location
  if (parsed.governorate === "القاهرة") {
    alts.push(parsed.originalQuery.replace("القاهرة", "الجيزة"));
  }

  return alts.slice(0, 4);
}

/* ══════════════════════════════════════════════════════════════════════
   SMART REFINEMENTS GENERATOR
   ══════════════════════════════════════════════════════════════════════ */

export function generateRefinements(parsed: AIParsedQuery): SearchRefinement[] {
  const refinements: SearchRefinement[] = [];

  // Suggest category if not set
  if (!parsed.primaryCategory && parsed.categories.length > 0) {
    for (const catId of parsed.categories.slice(0, 3)) {
      const cat = getCategoryById(catId);
      if (cat) {
        refinements.push({
          label: cat.name,
          type: "category",
          value: catId,
          icon: cat.icon,
        });
      }
    }
  }

  // Suggest popular governorates if not set
  if (!parsed.governorate) {
    for (const gov of ["القاهرة", "الجيزة", "الإسكندرية"]) {
      refinements.push({
        label: `في ${gov}`,
        type: "location",
        value: gov,
        icon: "📍",
      });
    }
  }

  // Suggest price ranges if not set
  if (parsed.priceIntent === "any" && parsed.primaryCategory) {
    const ranges = CATEGORY_PRICE_RANGES[parsed.primaryCategory];
    if (ranges) {
      refinements.push({
        label: "سعر اقتصادي",
        type: "price",
        value: `${ranges.budget[0]}-${ranges.budget[1]}`,
        icon: "💚",
      });
      refinements.push({
        label: "سعر متوسط",
        type: "price",
        value: `${ranges.mid[0]}-${ranges.mid[1]}`,
        icon: "💰",
      });
    }
  }

  // Suggest sale types
  if (!parsed.saleType) {
    refinements.push({ label: "تبديل فقط", type: "saleType", value: "exchange", icon: "🔄" });
    refinements.push({ label: "مزادات فقط", type: "saleType", value: "auction", icon: "🔨" });
  }

  // Suggest condition
  if (parsed.conditionHint === "any") {
    refinements.push({ label: "جديد فقط", type: "condition", value: "new", icon: "✨" });
    refinements.push({ label: "مستعمل", type: "condition", value: "used", icon: "♻️" });
  }

  return refinements.slice(0, 8);
}

/* ══════════════════════════════════════════════════════════════════════
   EMPTY STATE SUGGESTIONS
   ══════════════════════════════════════════════════════════════════════ */

export function generateEmptySuggestions(parsed: AIParsedQuery): EmptySuggestion[] {
  const suggestions: EmptySuggestion[] = [];

  // Broader category search
  if (parsed.primaryCategory) {
    const cat = getCategoryById(parsed.primaryCategory);
    if (cat) {
      suggestions.push({
        text: `كل ${cat.name}`,
        query: cat.name,
        icon: cat.icon,
      });
    }
  }

  // Remove location constraint
  if (parsed.governorate) {
    suggestions.push({
      text: "في كل المحافظات",
      query: parsed.originalQuery.replace(parsed.governorate, "").replace(parsed.city || "", "").trim(),
      icon: "🌍",
    });
  }

  // Remove price constraint
  if (parsed.priceMin != null || parsed.priceMax != null) {
    suggestions.push({
      text: "بدون تحديد سعر",
      query: parsed.originalQuery
        .replace(/(?:تحت|أقل من|فوق|أكتر من|في حدود|حوالي|من \d+ ل \d+)\s*\d[\d,]*/g, "")
        .trim(),
      icon: "💰",
    });
  }

  // Suggest alternative brands
  for (const alt of parsed.alternativeQueries.slice(0, 2)) {
    suggestions.push({
      text: alt,
      query: alt,
      icon: "🔍",
    });
  }

  // Always suggest saving as wish
  suggestions.push({
    text: "حفظ كـ \"دوّر لي\" — هنبلغك لما يتوفر",
    query: "__SAVE_WISH__",
    icon: "🔔",
  });

  return suggestions.slice(0, 5);
}

/* ══════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════ */

function getBrandLabel(brandValue: string, categoryId?: string): string {
  if (!categoryId) return brandValue;
  const cat = getCategoryById(categoryId);
  if (!cat) return brandValue;
  const field = cat.fields.find((f) => f.id === "brand");
  const option = field?.options?.find((o) => o.value === brandValue);
  return option?.label || brandValue;
}

function formatNum(n: number): string {
  return n.toLocaleString("ar-EG");
}
