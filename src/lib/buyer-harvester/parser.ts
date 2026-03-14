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
  "المهندسين", "الدقي",
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

  // Fallback: use first non-empty line (trimmed to 50 chars) if it contains recognizable product terms
  const firstLine = text.split("\n").find((l) => l.trim().length > 5)?.trim();
  if (firstLine && detectCategory(firstLine) !== "general") {
    // Strip price/phone/location info, keep product part
    const cleaned = firstLine
      .replace(/\d{5,}/g, "")
      .replace(/[—\-]\s*[\d,]+\s*(?:ج\.?م|جنيه)/g, "")
      .replace(/📍|🔥|💰|🟡/g, "")
      .trim();
    if (cleaned.length > 3) return cleaned.substring(0, 60);
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
  // ─── Pre-check: handle "مليون" and "نص مليون" patterns first ───
  const millionMatch = text.match(/نص\s*مليون/i);
  if (millionMatch) return { min: 500000, max: 500000 };

  const quarterMillionMatch = text.match(/ربع\s*مليون/i);
  if (quarterMillionMatch) return { min: 250000, max: 250000 };

  const millionNumMatch = text.match(/([\d,]+(?:\.\d+)?)\s*مليون/i);
  if (millionNumMatch) {
    const val = parseFloat(millionNumMatch[1].replace(/,/g, "")) * 1000000;
    return { min: val, max: val };
  }

  // ─── Handle "X ألف" standalone pattern FIRST (highest priority for Arabic) ───
  // Match "40 ألف" or "من 30 لـ 40 ألف" range with ألف
  const rangeAlfMatch = text.match(/من\s*([\d,]+)\s*(?:ل|لـ|لحد|-|–)\s*([\d,]+)\s*(?:ألف|الف|k)\b/i);
  if (rangeAlfMatch) {
    const v1 = parseInt(rangeAlfMatch[1].replace(/,/g, ""), 10) * 1000;
    const v2 = parseInt(rangeAlfMatch[2].replace(/,/g, ""), 10) * 1000;
    return { min: v1, max: v2 };
  }

  const alfMatch = text.match(/([\d,]+)\s*(?:ألف|الف|k)\b/i);
  if (alfMatch) {
    const val = parseInt(alfMatch[1].replace(/,/g, ""), 10) * 1000;
    // Check for range before this: "30-40 ألف" or "30 - 40 ألف"
    const beforeAlf = text.substring(0, alfMatch.index ?? 0);
    const rangeBefore = beforeAlf.match(/([\d,]+)\s*[-–]\s*$/);
    if (rangeBefore) {
      const v1 = parseInt(rangeBefore[1].replace(/,/g, ""), 10) * 1000;
      return { min: v1, max: val };
    }
    return { min: val, max: val };
  }

  // ─── Standard patterns ───
  for (const { re, type } of BUDGET_PATTERNS) {
    const match = text.match(re);
    if (match) {
      let v1 = parseInt(match[1].replace(/,/g, ""), 10);
      if (type === "range" && match[2]) {
        let v2 = parseInt(match[2].replace(/,/g, ""), 10);
        // Check if range values need ×1000 (e.g., "من 15 لـ 25 ألف")
        const afterRange = text.substring((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 15);
        if (/ألف|الف|k/i.test(afterRange) || (v1 < 200 && v2 < 200)) {
          v1 *= 1000;
          v2 *= 1000;
        }
        return { min: v1, max: v2 };
      }
      // Handle "ألف/الف/k" suffix — check matched text and surrounding chars
      const matchedAndAfter = text.substring(match.index ?? 0, (match.index ?? 0) + match[0].length + 15);
      if (/ألف|الف|k/i.test(matchedAndAfter)) {
        v1 *= 1000;
      }
      // Heuristic: if number is suspiciously small (< 200), likely in thousands
      if (v1 < 200 && v1 > 0) {
        v1 *= 1000;
      }
      return { min: v1, max: v1 };
    }
  }

  // Fallback: standalone large number (not a phone)
  const phoneNumbers: string[] = text.match(/01[0-2,5]\d{8}/g) || [];
  const numMatches = text.match(/\b(\d{4,7})\b/g);
  if (numMatches) {
    for (const n of numMatches) {
      const val = parseInt(n, 10);
      if (val >= 1000 && val <= 50000000 && !phoneNumbers.includes(n)) {
        return { min: val, max: val };
      }
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
      if (["الهرم", "فيصل", "6 أكتوبر", "الشيخ زايد", "المهندسين", "الدقي"].includes(area)) {
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
  source: string = "facebook_group",
  lenient: boolean = false
): ParsedBuyer | null {
  const text = post.text || "";

  // In lenient mode (multi-block parsing), accept blocks with phone or recognizable product
  if (!lenient && !isBuyRequest(text)) return null;
  if (lenient && !isBuyRequest(text)) {
    // Still need some signal — phone number or recognizable category
    const hasPhone = /01[0-2,5]\d{8}/.test(text);
    const hasProduct = detectCategory(text) !== "general";
    if (!hasPhone && !hasProduct) return null;
  }

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
/**
 * Split raw text into individual buyer blocks.
 * Strategy:
 * 1. Try splitting on double blank lines (2+ newlines)
 * 2. If only 1 block, try splitting on horizontal rules (─── or === or ---)
 * 3. If still 1 block, try splitting on buy-request keywords (مطلوب, عايز, محتاج, etc.)
 * 4. If still 1 block, try line-by-line — each line with a phone or buy keyword is a buyer
 */
function splitIntoBuyerBlocks(text: string): string[] {
  // Step 1: Split on blank lines (1+ empty lines between blocks)
  let blocks = text.split(/\n\s*\n/).filter((b) => b.trim().length > 10);

  if (blocks.length > 1) return blocks;

  // Step 2: Split on horizontal rules
  blocks = text.split(/─{3,}|-{3,}|═{3,}/).filter((b) => b.trim().length > 10);

  if (blocks.length > 1) return blocks;

  // Step 3: Split on buy-request keywords (lookahead so keyword stays in block)
  // Also match keywords that appear mid-line (e.g., "أحمد: مطلوب آيفون")
  blocks = text
    .split(/(?=(?:^|\n).*?(?:مطلوب|عايز\s+(?:اشتري?)?|عاوز\s+(?:اشتري?)?|محتاج|ابحث عن|بدور على))/m)
    .filter((b) => b.trim().length > 10);

  if (blocks.length > 1) return blocks;

  // Step 4: Line-by-line split — each line with a phone number OR buy keyword is a separate buyer
  const lines = text.split("\n").filter((l) => l.trim().length > 10);
  if (lines.length > 1) {
    const lineBlocks: string[] = [];
    let currentBlock = "";

    for (const line of lines) {
      const hasPhone = /01[0-2,5]\d{8}/.test(line);
      const hasBuyKeyword = BUY_REQUEST_REGEX.test(line);
      const hasProduct = detectCategory(line) !== "general";

      if ((hasPhone || hasBuyKeyword || hasProduct) && currentBlock.trim().length > 0) {
        // Check if current line is a continuation or a new buyer
        const currentHasPhone = /01[0-2,5]\d{8}/.test(currentBlock);
        if (currentHasPhone && (hasPhone || hasBuyKeyword)) {
          // Current block already has a phone → this is a new buyer
          lineBlocks.push(currentBlock.trim());
          currentBlock = line;
        } else {
          // Append to current block
          currentBlock += "\n" + line;
        }
      } else if (currentBlock.trim().length === 0 && (hasPhone || hasBuyKeyword || hasProduct)) {
        currentBlock = line;
      } else {
        currentBlock += "\n" + line;
      }
    }
    if (currentBlock.trim().length > 10) {
      lineBlocks.push(currentBlock.trim());
    }

    if (lineBlocks.length > 1) return lineBlocks;
  }

  return blocks.length > 0 ? blocks : [text];
}

export function parseMultiplePosts(
  rawText: string,
  source: string = "facebook_group",
  groupName?: string
): ParsedBuyer[] {
  const chunks = splitIntoBuyerBlocks(rawText);
  const isMultiBlock = chunks.length > 1;

  const buyers: ParsedBuyer[] = [];
  for (const chunk of chunks) {
    // In multi-block mode, be lenient — accept blocks with phone/product even without explicit "مطلوب"
    const result = parseBuyerPost(
      { text: chunk.trim(), groupName },
      source,
      isMultiBlock
    );
    if (result) buyers.push(result);
  }

  return buyers;
}
