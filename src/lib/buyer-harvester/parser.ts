/**
 * BHE — Buyer Post Parser
 *
 * Parses "مطلوب" (wanted) posts from Facebook groups, WhatsApp, etc.
 * Extracts: product wanted, budget, phone, location, category, condition.
 */

export interface RawPost {
  text: string;
  authorName?: string;
  authorProfileUrl?: string;
  groupName?: string;
  url?: string;
  timestamp?: string;
}

export interface ParsedBuyer {
  type: "buy_request";
  source: string;
  source_group_name: string | null;
  source_url: string | null;

  buyer_name: string | null;
  buyer_profile_url: string | null;
  buyer_phone: string | null;

  product_wanted: string | null;
  category: string | null;
  subcategory: string | null;
  condition_wanted: string | null;
  budget_min: number | null;
  budget_max: number | null;
  governorate: string | null;
  city: string | null;

  original_text: string;
  posted_at: string | null;
  harvested_at: string;
}

// ─── Egyptian governorates + popular areas ───────────────────

const GOVERNORATES = [
  "القاهرة", "الإسكندرية", "الجيزة", "القليوبية", "الشرقية",
  "الدقهلية", "الغربية", "المنوفية", "البحيرة", "المنيا",
  "أسيوط", "سوهاج", "الفيوم", "بورسعيد", "الإسماعيلية",
  "السويس", "دمياط", "الأقصر", "أسوان", "كفر الشيخ",
  "بني سويف", "قنا", "البحر الأحمر", "الوادي الجديد",
  "مطروح", "شمال سيناء", "جنوب سيناء",
];

const POPULAR_AREAS = [
  "مدينة نصر", "المعادي", "مصر الجديدة", "6 أكتوبر", "الشيخ زايد",
  "التجمع", "الرحاب", "العبور", "العاشر من رمضان", "سموحة",
  "سيدي جابر", "المنصورة", "طنطا", "الزقازيق", "الهرم",
  "فيصل", "المقطم", "شبرا", "حلوان", "عين شمس",
];

// ─── "Wanted" detection ──────────────────────────────────────

const BUY_REQUEST_REGEX =
  /مطلوب|عايز اشتر|عاوز اشتر|محتاج|ابحث عن|بدور على|wanted|looking for|wtb/i;

export function isBuyRequest(text: string): boolean {
  return BUY_REQUEST_REGEX.test(text);
}

// ─── Product extraction ──────────────────────────────────────

const PRODUCT_PATTERNS = [
  /مطلوب\s+(.{5,50}?)(?:\n|$|—|–|-|\.|،)/i,
  /عايز\s+(?:اشتري?\s+)?(.{5,50}?)(?:\n|$|—)/i,
  /عاوز\s+(?:اشتري?\s+)?(.{5,50}?)(?:\n|$|—)/i,
  /محتاج\s+(.{5,50}?)(?:\n|$)/i,
  /بدور على\s+(.{5,50}?)(?:\n|$)/i,
  /looking for\s+(.{5,50}?)(?:\n|$)/i,
];

function extractProduct(text: string): string | null {
  for (const pattern of PRODUCT_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

// ─── Budget extraction ───────────────────────────────────────

const BUDGET_PATTERNS: Array<{ re: RegExp; type: "single" | "range" }> = [
  { re: /ميزاني[ته]ي?\s*[:=]?\s*([\d,]+)/i, type: "single" },
  { re: /budget\s*[:=]?\s*([\d,]+)/i, type: "single" },
  { re: /بـ?\s*([\d,]+)\s*(?:ج\.?م|جنيه|egp|الف|ألف|k)/i, type: "single" },
  { re: /من\s*([\d,]+)\s*(?:ل|لـ|لحد)\s*([\d,]+)/i, type: "range" },
  { re: /([\d,]+)\s*[-–]\s*([\d,]+)\s*(?:ج|جنيه)?/, type: "range" },
];

function extractBudget(text: string): { min: number | null; max: number | null } {
  for (const { re, type } of BUDGET_PATTERNS) {
    const match = text.match(re);
    if (match) {
      const v1 = parseInt(match[1].replace(/,/g, ""), 10);
      if (type === "range" && match[2]) {
        const v2 = parseInt(match[2].replace(/,/g, ""), 10);
        return { min: v1, max: v2 };
      }
      // Handle "k" suffix (e.g., "40k")
      let adjusted = v1;
      if (/k/i.test(text.substring(match.index ?? 0, (match.index ?? 0) + match[0].length + 5))) {
        adjusted = v1 * 1000;
      }
      return { min: adjusted, max: adjusted };
    }
  }
  return { min: null, max: null };
}

// ─── Phone extraction ────────────────────────────────────────

const PHONE_REGEX = /01[0-2,5][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g;

function extractPhone(text: string): string | null {
  const matches = text.match(PHONE_REGEX);
  if (!matches) return null;
  return matches[0].replace(/[\s.\-]/g, "");
}

// ─── Location extraction ─────────────────────────────────────

function extractLocation(text: string): { governorate: string | null; city: string | null } {
  // Check popular areas first (more specific)
  for (const area of POPULAR_AREAS) {
    if (text.includes(area)) {
      // Try to find parent governorate
      if (["مدينة نصر", "مصر الجديدة", "المقطم", "شبرا", "حلوان", "عين شمس"].includes(area)) {
        return { governorate: "القاهرة", city: area };
      }
      if (["الهرم", "فيصل", "6 أكتوبر", "الشيخ زايد"].includes(area)) {
        return { governorate: "الجيزة", city: area };
      }
      if (["سموحة", "سيدي جابر"].includes(area)) {
        return { governorate: "الإسكندرية", city: area };
      }
      if (["التجمع", "الرحاب", "العبور", "العاشر من رمضان"].includes(area)) {
        return { governorate: "القاهرة", city: area };
      }
      return { governorate: null, city: area };
    }
  }

  // Then check governorates
  for (const gov of GOVERNORATES) {
    if (text.includes(gov)) {
      return { governorate: gov, city: null };
    }
  }

  return { governorate: null, city: null };
}

// ─── Category detection ──────────────────────────────────────

export function detectCategory(text: string): string | null {
  if (/آيفون|ايفون|iphone|سامسونج|samsung|موبايل|هاتف|phone|شاومي|xiaomi|هواوي|أوبو|ريلمي|ريدمي|نوت\s*\d/i.test(text))
    return "phones";
  if (/سيارة|عربية|car|bmw|مرسيدس|تويوتا|هيونداي|كيا|نيسان|شيفروليه|فيات/i.test(text))
    return "vehicles";
  if (/شقة|فيلا|أرض|محل|إيجار|apartment|villa|عقار|دوبلكس/i.test(text))
    return "properties";
  if (/لابتوب|laptop|تابلت|tablet|بلايستيشن|playstation|تلفزيون|شاشة|كمبيوتر/i.test(text))
    return "electronics";
  if (/أثاث|غرفة|سرير|كنبة|furniture|مطبخ|أنتريه|سفرة/i.test(text))
    return "furniture";
  if (/ذهب|فضة|خاتم|سلسلة|عيار|gold|silver/i.test(text))
    return "gold";
  if (/غسالة|ثلاجة|بوتاجاز|مكيف|تكييف|سخان/i.test(text))
    return "appliances";
  return "general";
}

// ─── Condition detection ─────────────────────────────────────

function detectCondition(text: string): string | null {
  if (/جديد|new|زيرو|zero|متبرشم/i.test(text)) return "new";
  if (/مستعمل|used|مستخدم|second\s*hand/i.test(text)) return "used";
  return null;
}

// ─── Main parser ─────────────────────────────────────────────

export function parseBuyerPost(
  post: RawPost,
  source: string = "facebook_group"
): ParsedBuyer | null {
  const text = post.text || "";

  if (!isBuyRequest(text)) return null;

  const product = extractProduct(text);
  const budget = extractBudget(text);
  const phone = extractPhone(text);
  const location = extractLocation(text);
  const category = detectCategory(text);
  const condition = detectCondition(text);

  return {
    type: "buy_request",
    source,
    source_group_name: post.groupName || null,
    source_url: post.url || null,

    buyer_name: post.authorName || null,
    buyer_profile_url: post.authorProfileUrl || null,
    buyer_phone: phone,

    product_wanted: product,
    category,
    subcategory: null,
    condition_wanted: condition,
    budget_min: budget.min,
    budget_max: budget.max,
    governorate: location.governorate,
    city: location.city,

    original_text: text,
    posted_at: post.timestamp || null,
    harvested_at: new Date().toISOString(),
  };
}

/**
 * Parse multiple posts from a raw text dump (e.g., copy-pasted from Facebook group).
 * Splits on common post separators and parses each.
 */
export function parseMultiplePosts(
  rawText: string,
  source: string = "facebook_group",
  groupName?: string
): ParsedBuyer[] {
  // Split on common separators: multiple newlines, horizontal rules, "---"
  const chunks = rawText.split(/\n{3,}|─{3,}|-{3,}|═{3,}/).filter((c) => c.trim().length > 10);

  const buyers: ParsedBuyer[] = [];
  for (const chunk of chunks) {
    const result = parseBuyerPost(
      { text: chunk.trim(), groupName },
      source
    );
    if (result) buyers.push(result);
  }

  return buyers;
}
