/**
 * OpenSooq (السوق المفتوح) Parser — eg.opensooq.com
 * 60 مليون مستخدم في المنطقة — أولوية قصوى بعد دوبيزل
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const OPENSOOQ_BASE = "https://eg.opensooq.com";

/**
 * Build list page URL for OpenSooq
 */
export function getOpenSooqListPageUrl(
  baseUrl: string,
  _category: string,
  _governorate: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  // OpenSooq uses ?page=N
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

/**
 * Parse OpenSooq listing page HTML
 */
export function parseOpenSooqList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON response first (API)
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseOpenSooqJson(json);
    } catch {
      // Fall through to HTML
    }
  }

  // OpenSooq uses card-based listing layout
  // Pattern 1: Standard listing cards with links
  const cardPattern = /href="(\/ar\/[^"]*(?:listing|item|post)[^"]*\d+)"/gi;
  let match;
  const seenUrls = new Set<string>();

  while ((match = cardPattern.exec(html)) !== null) {
    const relativeUrl = match[1];
    const url = `${OPENSOOQ_BASE}${relativeUrl}`;

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 2000);
    const context = html.slice(start, end);

    const title = extractText(context, [
      /class="[^"]*(?:post-title|item-title|listing-title|postTitle)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[23][^>]*>([^<]+)<\/h[23]>/i,
    ]);
    if (!title) continue;

    const priceText = extractText(context, [
      /class="[^"]*(?:price|postPrice)[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/,
    ]);

    const location = extractText(context, [
      /class="[^"]*(?:location|postLocation|city)[^"]*"[^>]*>([^<]+)/i,
    ]);

    const dateText = extractText(context, [
      /class="[^"]*(?:date|time|postDate)[^"]*"[^>]*>([^<]+)/i,
      /(?:منذ|ago)\s*([^<]*)/i,
    ]);

    const thumbnailUrl = extractImage(context, [
      /src="(https?:\/\/[^"]*opensooq[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
    ]);

    const sellerName = extractText(context, [
      /class="[^"]*(?:member-name|sellerName|userName)[^"]*"[^>]*>([^<]+)/i,
    ]);

    const isLikelyBuyRequest = detectBuyRequest(title, context);

    listings.push({
      url,
      title: title.trim(),
      price: priceText ? parsePrice(priceText) : null,
      currency: "EGP",
      thumbnailUrl,
      location: location?.trim() || "",
      dateText: dateText?.trim() || "",
      sellerName: cleanSellerName(sellerName) || null,
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: context.includes("verified") || context.includes("موثق"),
      isBusiness: context.includes("business") || context.includes("متجر") || context.includes("تاجر"),
      isFeatured: context.includes("featured") || context.includes("مميز") || context.includes("premium"),
      supportsExchange: context.includes("تبادل") || context.includes("بدل"),
      isNegotiable: context.includes("قابل للتفاوض") || context.includes("negotiable"),
      category: null,
      isLikelyBuyRequest,
    });
  }

  // Pattern 2: Fallback — broader link patterns
  if (listings.length === 0) {
    const broadPattern = /href="(https?:\/\/eg\.opensooq\.com\/[^"]*\/\d+)"/gi;
    while ((match = broadPattern.exec(html)) !== null) {
      const url = match[1];
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const start = Math.max(0, match.index - 500);
      const end = Math.min(html.length, match.index + 2000);
      const context = html.slice(start, end);

      const title = extractText(context, [
        /aria-label="([^"]+)"/i,
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
        /title="([^"]+)"/i,
      ]);
      if (!title) continue;

      const priceText = extractText(context, [
        /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/,
      ]);

      const isLikelyBuyRequest = detectBuyRequest(title, context);

      listings.push({
        url,
        title: title.trim(),
        price: priceText ? parsePrice(priceText) : null,
        currency: "EGP",
        thumbnailUrl: extractImage(context, [/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i]),
        location: extractText(context, [/class="[^"]*location[^"]*"[^>]*>([^<]+)/i]) || "",
        dateText: "",
        sellerName: null,
        sellerProfileUrl: null,
        sellerAvatarUrl: null,
        isVerified: false,
        isBusiness: false,
        isFeatured: false,
        supportsExchange: false,
        isNegotiable: false,
        category: null,
        isLikelyBuyRequest,
      });
    }
  }

  return listings;
}

/**
 * Parse OpenSooq detail page HTML
 */
export function parseOpenSooqDetail(html: string): ListingDetails {
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

  // Try JSON
  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      if (json.description || json.body) {
        result.description = json.description || json.body || "";
        if (json.images && Array.isArray(json.images)) {
          for (const img of json.images) {
            const url = typeof img === "string" ? img : img?.url || img?.src;
            if (url) result.allImageUrls.push(url);
          }
        }
        result.mainImageUrl = result.allImageUrls[0] || "";
        if (json.attributes && typeof json.attributes === "object") {
          for (const [key, val] of Object.entries(json.attributes)) {
            if (typeof val === "string") result.specifications[key] = val;
          }
        }
        return result;
      }
    } catch {
      // Fall through
    }
  }

  // HTML: Extract description
  const descPatterns = [
    /<div[^>]*class="[^"]*(?:description|post-desc|postDescription)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of descPatterns) {
    const m = html.match(pattern);
    if (m) {
      result.description = m[1].replace(/<[^>]+>/g, "").trim();
      break;
    }
  }

  // Extract images
  const imgMatches = html.matchAll(
    /src="(https?:\/\/[^"]*opensooq[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
  );
  for (const m of imgMatches) {
    if (!result.allImageUrls.includes(m[1])) {
      result.allImageUrls.push(m[1]);
    }
  }
  // Fallback images
  if (result.allImageUrls.length === 0) {
    const fallback = html.matchAll(/data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
    for (const m of fallback) {
      if (!result.allImageUrls.includes(m[1])) {
        result.allImageUrls.push(m[1]);
      }
    }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // Extract specifications
  const specPattern = /<(?:li|tr|div)[^>]*>\s*<(?:span|td|th|label)[^>]*>([^<]+)<\/(?:span|td|th|label)>\s*<(?:span|td|div)[^>]*>([^<]+)<\/(?:span|td|div)>/gi;
  let specMatch;
  while ((specMatch = specPattern.exec(html)) !== null) {
    const key = specMatch[1].replace(/<[^>]+>/g, "").trim();
    const value = specMatch[2].replace(/<[^>]+>/g, "").trim();
    if (key && value && key !== value) {
      result.specifications[key] = value;
    }
  }

  result.condition = result.specifications["الحالة"] || result.specifications["Condition"] || null;
  result.hasWarranty = result.description.includes("ضمان") || result.description.includes("warranty");

  // Extract seller
  const sellerMatch = html.match(/class="[^"]*(?:member-name|seller-name|userName)[^"]*"[^>]*>([^<]+)/i);
  if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());

  const profileMatch = html.match(/href="(\/ar\/profile\/[^"]+)"/i) || html.match(/href="(\/profile\/[^"]+)"/i);
  if (profileMatch) result.sellerProfileUrl = `${OPENSOOQ_BASE}${profileMatch[1]}`;

  return result;
}

// ═══ Helper Functions ═══

function parseOpenSooqJson(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = (json.data || json.results || json.posts || json.items || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const title = (item.title as string) || (item.name as string) || "";
    if (!title) continue;

    let price: number | null = null;
    if (item.price) {
      if (typeof item.price === "number") price = item.price;
      else price = parsePrice(String(item.price));
    }

    const url = (item.url as string) || (item.link as string) ||
      (item.id ? `${OPENSOOQ_BASE}/ar/listing/${item.id}` : "");
    if (!url) continue;

    const fullUrl = url.startsWith("http") ? url : `${OPENSOOQ_BASE}${url}`;

    let thumbnailUrl: string | null = null;
    if (item.images && Array.isArray(item.images) && (item.images as unknown[]).length > 0) {
      const firstImg = (item.images as Record<string, unknown>[])[0];
      thumbnailUrl = typeof firstImg === "string" ? firstImg : (firstImg?.url as string) || null;
    } else if (item.image) {
      thumbnailUrl = typeof item.image === "string" ? item.image : null;
    }

    const isLikelyBuyRequest = detectBuyRequest(title);

    listings.push({
      url: fullUrl,
      title,
      price,
      currency: "EGP",
      thumbnailUrl,
      location: (item.location as string) || (item.city as string) || "",
      dateText: (item.created_at as string) || (item.date as string) || "",
      sellerName: cleanSellerName((item.user_name as string) || null),
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: !!(item.is_verified || item.verified),
      isBusiness: !!(item.is_business),
      isFeatured: !!(item.is_featured || item.featured || item.is_premium),
      supportsExchange: title.includes("تبادل") || title.includes("بدل"),
      isNegotiable: !!(item.is_negotiable) || title.includes("قابل للتفاوض"),
      category: (item.category_name as string) || null,
      isLikelyBuyRequest,
    });
  }

  return listings;
}

function extractText(context: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = context.match(pattern);
    if (m) return (m[1] || m[0]).replace(/<[^>]+>/g, "").trim();
  }
  return null;
}

function extractImage(context: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = context.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[,٬\s]/g, "").match(/(\d+)/);
  return cleaned ? parseFloat(cleaned[1]) : null;
}
