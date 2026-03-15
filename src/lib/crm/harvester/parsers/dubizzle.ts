/**
 * Dubizzle.com.eg Parser — نسخة مبسطة
 * HTML parsing فقط — بدون __NEXT_DATA__ أو JSON-LD أو استراتيجيات متعددة
 *
 * ملاحظة: سيرفرات Vercel محظورة من WAF دوبيزل (403).
 * لذلك هذا الملف يُستخدم فقط كـ fallback.
 * الحل الأساسي هو Bookmarklet من متصفح الموظف.
 */

/**
 * Clean seller name — removes "User photo" prefix, duplicate first char, etc.
 */
export function cleanSellerName(name: string | null): string | null {
  if (!name) return null;
  let cleaned = name
    .replace(/User\s*photo/gi, '')
    .replace(/صورة المستخدم/g, '')
    .replace(/مستخدم خاص/g, '')
    .replace(/مستخدم/g, '')
    .replace(/مدرجة من قبل/g, '')
    .trim();

  // Remove duplicate first character (Arabic or English)
  if (cleaned.length > 2 && cleaned[0] === cleaned[1]) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.length < 2) return null;
  return cleaned;
}

// ═══ Buy request detection from listing title/card ═══
export const BUY_KEYWORDS = new RegExp([
  // كلمات شراء مباشرة
  'مطلوب', 'نشتري', 'بنشتري', 'نشترى', 'بنشترى',
  'هنشتري', 'هنشترى', 'نشتريها', 'بنشتريها', 'بنشتريه', 'نشتريه',
  'اشتري', 'اشترى', 'شراء', 'للشراء', 'مطلوب للشراء',
  // كلمات طلب
  'عايز اشتري', 'عايز أشتري', 'عاوز اشتري',
  'عايز تبيع', 'عاوز تبيع',
  'محتاج', 'محتاجه', 'محتاجين',
  'ابحث عن', 'بدور على', 'بدور ع', 'دور على',
  // كلمات استهداف البائع
  'لو عندك', 'لو معاك', 'عندك', 'معاك',
  'لو بتفكر تبيع', 'بتفكر تبيع', 'بتفكر تبدل',
  'عايز تبدل', 'عاوز تبدل',
  'كلمنا بنشتري', 'كلمنا', 'كلمني', 'تواصل', 'ابعتلنا', 'ابعتلي',
  // كلمات سعر شراء
  'بأفضل سعر', 'بافضل سعر', 'بأعلى سعر', 'باعلى سعر', 'بأحسن سعر', 'باحسن سعر',
  // كلمات تجار الشراء
  'بنجيلك', 'هنجيلك', 'نجيلك لحد البيت', 'بنوصلك',
  // إنجليزي
  'wanted', 'wtb', 'looking for', 'we buy', 'will buy',
].join('|'), 'i');

export function detectBuyRequest(title: string, cardText?: string, description?: string): boolean {
  // 1. Buy keyword in title → definite buyer
  if (BUY_KEYWORDS.test(title)) return true;

  // 2. Buy keyword in description/snippet → definite buyer
  if (description && BUY_KEYWORDS.test(description)) return true;

  // 3. Buy keyword anywhere in card text → buyer
  //    (card text includes title + description + badges + everything visible)
  if (cardText) {
    const hasBuyKeyword = BUY_KEYWORDS.test(cardText);
    if (hasBuyKeyword) {
      // Phone number in card = trade buyer (very likely)
      const hasPhoneInCard = /01[0-2,5]\d{8}/.test(cardText);
      if (hasPhoneInCard) return true;

      // Barter badge + buy keyword = likely buyer
      const hasBarterBadge = cardText.includes('متوفر التبادل') ||
        cardText.includes('قابل للتبديل') ||
        cardText.includes('قابل للتبادل');
      if (hasBarterBadge) return true;

      // Buy keyword in card text alone (could be from description snippet)
      return true;
    }
  }

  return false;
}

export interface ListPageListing {
  url: string;
  title: string;
  price: number | null;
  currency: string;
  thumbnailUrl: string | null;
  location: string;
  dateText: string;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  sellerAvatarUrl: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isFeatured: boolean;
  supportsExchange: boolean;
  isNegotiable: boolean;
  category: string | null;
  isLikelyBuyRequest: boolean;
  detectedBuyerPhone: string | null;
}

export interface ListingDetails {
  description: string;
  mainImageUrl: string;
  allImageUrls: string[];
  specifications: Record<string, string>;
  condition: string | null;
  paymentMethod: string | null;
  hasWarranty: boolean;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  sellerMemberSince: string | null;
}

// ═══ Simple browser headers ═══
export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
};

/**
 * Parse a Dubizzle listing page — HTML regex only
 * If response is JSON (e.g. from bookmarklet), parse that instead.
 */
export function parseDubizzleList(html: string): ListPageListing[] {
  // If response is JSON (from API or bookmarklet), try parsing
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseJsonListings(json);
    } catch {
      // Not valid JSON, continue to HTML
    }
  }

  // HTML regex parsing
  return parseHtmlListings(html);
}

/**
 * Parse JSON API/bookmarklet response
 */
function parseJsonListings(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];

  const items =
    (json.data as unknown[]) ||
    (json.results as unknown[]) ||
    (json.ads as unknown[]) ||
    (json.items as unknown[]) ||
    (json.listings as unknown[]) ||
    [];

  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const ad = item as Record<string, unknown>;
    if (!ad) continue;

    const title =
      (ad.title as string) || (ad.name as string) || "";
    if (!title) continue;

    // Extract price
    let price: number | null = null;
    if (ad.price) {
      if (typeof ad.price === "number") {
        price = ad.price;
      } else if (typeof ad.price === "object") {
        const priceObj = ad.price as Record<string, unknown>;
        price =
          (priceObj.value as number) ||
          (priceObj.amount as number) ||
          parseFloat(String(priceObj.display || "0").replace(/[,٬]/g, "")) ||
          null;
      } else {
        price = parseFloat(String(ad.price).replace(/[,٬]/g, "")) || null;
      }
    }

    // Extract URL
    const adUrl =
      (ad.url as string) ||
      (ad.absolute_url as string) ||
      (ad.slug ? `https://www.dubizzle.com.eg/${ad.slug}` : "") ||
      (ad.id ? `https://www.dubizzle.com.eg/listing/${ad.id}` : "");
    if (!adUrl) continue;

    const fullUrl = adUrl.startsWith("http")
      ? adUrl
      : `https://www.dubizzle.com.eg${adUrl}`;

    // Extract thumbnail
    let thumbnailUrl: string | null = null;
    if (ad.images && Array.isArray(ad.images) && (ad.images as unknown[]).length > 0) {
      const firstImg = (ad.images as Record<string, unknown>[])[0];
      thumbnailUrl =
        (firstImg?.url as string) ||
        (firstImg?.src as string) ||
        (firstImg?.thumbnail as string) ||
        (typeof firstImg === "string" ? firstImg : null) ||
        null;
    } else if (ad.image) {
      thumbnailUrl =
        typeof ad.image === "string"
          ? ad.image
          : (ad.image as Record<string, unknown>)?.url as string || null;
    } else if (ad.thumbnail) {
      thumbnailUrl = ad.thumbnail as string;
    }

    // Extract location
    let location = "";
    if (ad.location) {
      if (typeof ad.location === "string") {
        location = ad.location;
      } else {
        const loc = ad.location as Record<string, unknown>;
        location =
          (loc.region_name_ar as string) ||
          (loc.city_name_ar as string) ||
          (loc.name as string) ||
          "";
      }
    }

    // Extract date
    const dateText =
      (ad.created_at as string) ||
      (ad.date as string) ||
      (ad.display_date as string) ||
      "";

    // Extract seller info
    let sellerName: string | null = null;
    let sellerProfileUrl: string | null = null;
    let isVerified = false;
    let isBusiness = false;

    if (ad.user) {
      const user = ad.user as Record<string, unknown>;
      sellerName = cleanSellerName((user.name as string) || (user.display_name as string) || null);
      if (user.id) {
        sellerProfileUrl = `https://www.dubizzle.com.eg/profile/${user.id}`;
      }
      isVerified = !!(user.is_verified || user.verified);
      isBusiness = !!(user.is_business || user.account_type === "business");
    }

    // Build full card text from all available fields for buy request detection
    const descriptionSnippet = (ad.description as string) || (ad.subtitle as string) || (ad.snippet as string) || "";
    const fullCardText = [title, descriptionSnippet, location].filter(Boolean).join(" ");

    const isLikelyBuyRequest = detectBuyRequest(title, fullCardText, descriptionSnippet);

    // Extract phone from card text (trade buyers often put their numbers)
    const phoneInCard = fullCardText.match(/01[0-2,5]\d{8}/);
    const detectedBuyerPhone = phoneInCard ? phoneInCard[0] : null;

    if (isLikelyBuyRequest) {
      const source = BUY_KEYWORDS.test(title) ? '(title)' : BUY_KEYWORDS.test(descriptionSnippet) ? '(desc)' : '(card)';
      console.log('[BHE-Card] 🔥 BUY request detected', source, '→ BUYER :', title.substring(0, 40),
        detectedBuyerPhone ? `📞 ${detectedBuyerPhone}` : '');
    }

    listings.push({
      url: fullUrl,
      title,
      price,
      currency: "EGP",
      thumbnailUrl,
      location,
      dateText,
      sellerName,
      sellerProfileUrl,
      sellerAvatarUrl: null,
      isVerified,
      isBusiness,
      isFeatured: !!(ad.is_featured || ad.featured || ad.is_promoted),
      supportsExchange:
        title.includes("تبادل") || title.includes("بدل") || !!(ad.exchange_enabled),
      isNegotiable:
        !!(ad.is_negotiable || ad.negotiable) || title.includes("قابل للتفاوض"),
      category: (ad.category_name as string) || null,
      isLikelyBuyRequest,
      detectedBuyerPhone,
    });
  }

  return listings;
}

/**
 * Parse detail page — HTML only
 */
export function parseDubizzleDetail(html: string): ListingDetails {
  const result: ListingDetails = {
    description: "",
    mainImageUrl: "",
    allImageUrls: [],
    specifications: {},
    condition: null,
    paymentMethod: null,
    hasWarranty: false,
    sellerName: null,
    sellerProfileUrl: null,
    sellerMemberSince: null,
  };

  // Check for JSON response (from bookmarklet)
  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      if (json.description || json.title) {
        result.description = (json.description as string) || "";
        if (json.images && Array.isArray(json.images)) {
          for (const img of json.images as Record<string, unknown>[]) {
            const url = typeof img === "string" ? img : (img?.url as string) || (img?.src as string);
            if (url) result.allImageUrls.push(url);
          }
        }
        result.mainImageUrl = result.allImageUrls[0] || "";
        if (json.parameters && Array.isArray(json.parameters)) {
          for (const p of json.parameters as Record<string, unknown>[]) {
            const key = (p.label as string) || (p.name as string);
            const val = (p.value_label as string) || (p.value as string);
            if (key && val) result.specifications[key] = val;
          }
        }
        result.condition = result.specifications["الحالة"] || null;
        result.hasWarranty = result.description.includes("ضمان");
        return result;
      }
    } catch {
      // Fall through to HTML
    }
  }

  // HTML — Extract description
  const descPatterns = [
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*data-testid="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
  ];
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match) {
      result.description = match[1].replace(/<[^>]+>/g, "").trim();
      break;
    }
  }

  // Extract images
  const imgMatches = html.matchAll(
    /src="(https:\/\/images\.dubizzle\.com\.eg\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
  );
  for (const match of imgMatches) {
    if (!result.allImageUrls.includes(match[1])) {
      result.allImageUrls.push(match[1]);
    }
  }
  if (result.allImageUrls.length === 0) {
    const fallbackImgs = html.matchAll(
      /src="(https?:\/\/[^"]*(?:dubizzle|olx|classistatic)[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
    );
    for (const match of fallbackImgs) {
      if (!result.allImageUrls.includes(match[1])) {
        result.allImageUrls.push(match[1]);
      }
    }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // Extract specifications
  const specPattern =
    /<(?:li|tr)[^>]*>\s*<(?:span|td|th)[^>]*>([^<]+)<\/(?:span|td|th)>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>/gi;
  let specMatch;
  while ((specMatch = specPattern.exec(html)) !== null) {
    const key = specMatch[1].replace(/<[^>]+>/g, "").trim();
    const value = specMatch[2].replace(/<[^>]+>/g, "").trim();
    if (key && value && key !== value) {
      result.specifications[key] = value;
    }
  }

  result.condition = result.specifications["الحالة"] || result.specifications["Condition"] || null;

  // Extract seller
  const sellerMatch = html.match(/<[^>]*class="[^"]*seller[^"]*name[^"]*"[^>]*>([^<]+)</i);
  if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());

  const profileMatch = html.match(/href="(\/(?:ar\/)?profile\/[^"]+)"/i);
  if (profileMatch) result.sellerProfileUrl = `https://www.dubizzle.com.eg${profileMatch[1]}`;

  const memberMatch = html.match(/(?:عضو منذ|member since)[^<]*(\d{4})/i);
  if (memberMatch) result.sellerMemberSince = memberMatch[1];

  result.hasWarranty =
    result.description.includes("ضمان") ||
    result.specifications["الضمان"] === "نعم";

  return result;
}

// ═══ HTML Parser ═══

function parseHtmlListings(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  const linkPattern =
    /href="((?:https?:\/\/(?:www\.)?dubizzle\.com\.eg)?\/(?:ar\/)?[a-z\-]+\/[a-z\-]+\/[^"]+)"/g;
  let linkMatch;
  const seenUrls = new Set<string>();

  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const url = linkMatch[1].startsWith("http")
      ? linkMatch[1]
      : `https://www.dubizzle.com.eg${linkMatch[1]}`;

    if (seenUrls.has(url) || url.includes("/search") || url.includes("/login")) continue;
    seenUrls.add(url);

    const start = Math.max(0, linkMatch.index - 500);
    const end = Math.min(html.length, linkMatch.index + 2000);
    const context = html.slice(start, end);

    const title = extractFromContext(context, [
      /aria-label="([^"]+)"/,
      /title="([^"]+)"/,
      /<h2[^>]*>([^<]+)<\/h2>/,
      /<h3[^>]*>([^<]+)<\/h3>/,
    ]);
    if (!title) continue;

    const priceText = extractFromContext(context, [
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/,
    ]);

    const locationText = extractFromContext(context, [
      /location[^>]*>([^<]+)</i,
      /address[^>]*>([^<]+)</i,
    ]);

    const dateText = extractFromContext(context, [
      /(?:منذ|ago)[^<]*/i,
      /time[^>]*>([^<]+)</i,
    ]);

    const sellerName = extractFromContext(context, [
      /seller[^>]*name[^>]*>([^<]+)</i,
    ]);

    let sellerProfileUrl: string | null = null;
    const profileUrlMatch = context.match(/href="(\/(?:ar\/)?profile\/[^"]+)"/i);
    if (profileUrlMatch) {
      sellerProfileUrl = `https://www.dubizzle.com.eg${profileUrlMatch[1]}`;
    }

    const thumbnailUrl = extractImageFromContext(context);

    // Strip HTML tags to get clean card text for buy request detection
    const cleanCardText = context.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const isLikelyBuyRequest = detectBuyRequest(title, cleanCardText);

    // Extract phone from card text (trade buyers often put their numbers)
    const phoneInCard = cleanCardText.match(/01[0-2,5]\d{8}/);
    const detectedBuyerPhone = phoneInCard ? phoneInCard[0] : null;

    if (isLikelyBuyRequest) {
      const source = BUY_KEYWORDS.test(title) ? '(title)' :
        (cleanCardText !== title && BUY_KEYWORDS.test(cleanCardText)) ? '(card)' : '(context)';
      const hasBarterBadge = cleanCardText.includes('متوفر التبادل') || cleanCardText.includes('قابل للتبديل');
      console.log('[BHE-Card]',
        `🔥 BUY request detected ${source}`,
        hasBarterBadge ? '🔄 Barter' : '',
        '→ BUYER :', title.substring(0, 40),
        detectedBuyerPhone ? `📞 ${detectedBuyerPhone}` : '');
    }

    listings.push({
      url,
      title,
      price: priceText ? parseFloat(priceText.replace(/[,٬]/g, "")) : null,
      currency: "EGP",
      thumbnailUrl,
      location: locationText || "",
      dateText: dateText || "",
      sellerName: cleanSellerName(sellerName) || null,
      sellerProfileUrl,
      sellerAvatarUrl: null,
      isVerified: context.includes("verified") || context.includes("موثق"),
      isBusiness: context.includes("business") || context.includes("متجر"),
      isFeatured: context.includes("featured") || context.includes("مميز"),
      supportsExchange: context.includes("تبادل") || context.includes("بدل"),
      isNegotiable: context.includes("قابل للتفاوض"),
      category: null,
      isLikelyBuyRequest,
      detectedBuyerPhone,
    });
  }

  return listings;
}

function extractFromContext(context: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) return (match[1] || match[0]).replace(/<[^>]+>/g, "").trim();
  }
  return null;
}

function extractImageFromContext(context: string): string | null {
  const dubizzleMatch = context.match(
    /src="(https:\/\/images\.dubizzle\.com\.eg\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i
  );
  if (dubizzleMatch) return dubizzleMatch[1];

  const match = context.match(
    /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i
  );
  return match ? match[1] : null;
}
