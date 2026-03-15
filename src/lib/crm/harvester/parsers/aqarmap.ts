/**
 * Aqarmap (عقارماب) Parser — aqarmap.com.eg
 * أكبر منصة عقارات في مصر — 2 مليون+ مستخدم
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const AQARMAP_BASE = "https://aqarmap.com.eg";

export function getAqarmapListPageUrl(
  baseUrl: string,
  _category: string,
  _governorate: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

export function parseAqarmapList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseAqarmapJson(json);
    } catch { /* fall through */ }
  }

  // HTML: Aqarmap property cards
  const cardPattern = /href="((?:https?:\/\/aqarmap\.com\.eg)?\/en\/(?:listing|property|for-sale|for-rent)\/[^"]*\d+[^"]*)"/gi;
  let match;
  const seenUrls = new Set<string>();

  while ((match = cardPattern.exec(html)) !== null) {
    const url = match[1].startsWith("http") ? match[1] : `${AQARMAP_BASE}${match[1]}`;
    if (seenUrls.has(url) || url.includes("/search") || url.includes("/filter")) continue;
    seenUrls.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 2500);
    const context = html.slice(start, end);

    const title = extractText(context, [
      /class="[^"]*(?:listing-title|property-title|card-title)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
    ]);
    if (!title) continue;

    const priceText = extractText(context, [
      /class="[^"]*(?:price|listing-price)[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i,
    ]);

    const location = extractText(context, [
      /class="[^"]*(?:location|address|area-name)[^"]*"[^>]*>([^<]+)/i,
    ]);

    // Property-specific data
    const area = extractText(context, [
      /(\d[\d,]*)\s*(?:م²|sqm|m²|متر)/i,
    ]);

    const rooms = extractText(context, [
      /(\d+)\s*(?:غرف|rooms|bedrooms|غرفة)/i,
    ]);

    const bathrooms = extractText(context, [
      /(\d+)\s*(?:حمام|bathrooms|bath)/i,
    ]);

    const thumbnailUrl = extractImage(context, [
      /src="(https?:\/\/[^"]*aqarmap[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
    ]);

    // Build enriched title
    let enrichedTitle = title.trim();
    if (area && !enrichedTitle.includes("م²") && !enrichedTitle.includes("sqm")) {
      enrichedTitle += ` — ${area} م²`;
    }
    if (rooms && !enrichedTitle.includes("غرف") && !enrichedTitle.includes("room")) {
      enrichedTitle += ` — ${rooms} غرف`;
    }

    const isLikelyBuyRequest = detectBuyRequest(title, context);

    listings.push({
      url,
      title: enrichedTitle,
      price: priceText ? parsePrice(priceText) : null,
      currency: "EGP",
      thumbnailUrl,
      location: location?.trim() || "",
      dateText: extractText(context, [/class="[^"]*date[^"]*"[^>]*>([^<]+)/i]) || "",
      sellerName: extractText(context, [/class="[^"]*(?:agent|broker|seller)[^"]*name[^"]*"[^>]*>([^<]+)/i]) || null,
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: context.includes("verified") || context.includes("موثق"),
      isBusiness: context.includes("broker") || context.includes("agent") || context.includes("company") || context.includes("شركة"),
      isFeatured: context.includes("featured") || context.includes("premium") || context.includes("مميز"),
      supportsExchange: false,
      isNegotiable: context.includes("قابل للتفاوض") || context.includes("negotiable"),
      category: "properties",
      isLikelyBuyRequest,
      detectedBuyerPhone: null,
    });
  }

  // Broader fallback
  if (listings.length === 0) {
    const broadPattern = /href="(https?:\/\/aqarmap\.com\.eg\/[^"]*\/\d+)"/gi;
    while ((match = broadPattern.exec(html)) !== null) {
      const url = match[1];
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const start = Math.max(0, match.index - 500);
      const end = Math.min(html.length, match.index + 2000);
      const context = html.slice(start, end);

      const title = extractText(context, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
        /aria-label="([^"]+)"/i,
      ]);
      if (!title) continue;

      listings.push({
        url,
        title: title.trim(),
        price: null,
        currency: "EGP",
        thumbnailUrl: extractImage(context, [/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i]),
        location: "",
        dateText: "",
        sellerName: null,
        sellerProfileUrl: null,
        sellerAvatarUrl: null,
        isVerified: false,
        isBusiness: false,
        isFeatured: false,
        supportsExchange: false,
        isNegotiable: false,
        category: "properties",
        isLikelyBuyRequest: detectBuyRequest(title),
        detectedBuyerPhone: null,
      });
    }
  }

  return listings;
}

export function parseAqarmapDetail(html: string): ListingDetails {
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
      if (json.description || json.title) {
        result.description = json.description || "";
        if (json.images && Array.isArray(json.images)) {
          for (const img of json.images) {
            const url = typeof img === "string" ? img : img?.url || img?.src;
            if (url) result.allImageUrls.push(url);
          }
        }
        result.mainImageUrl = result.allImageUrls[0] || "";
        const specFields = ["area", "rooms", "bathrooms", "floor", "finishing", "type", "payment_method"];
        for (const field of specFields) {
          if (json[field]) result.specifications[field] = String(json[field]);
        }
        return result;
      }
    } catch { /* fall through */ }
  }

  // HTML
  const descPatterns = [
    /<div[^>]*class="[^"]*(?:description|property-description|listing-desc)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of descPatterns) {
    const m = html.match(pattern);
    if (m) {
      result.description = m[1].replace(/<[^>]+>/g, "").trim();
      break;
    }
  }

  // Images
  const imgMatches = html.matchAll(/src="(https?:\/\/[^"]*aqarmap[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
  for (const m of imgMatches) {
    if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]);
  }
  if (result.allImageUrls.length === 0) {
    const fallback = html.matchAll(/data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
    for (const m of fallback) {
      if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]);
    }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // Specifications
  const specPattern = /<(?:li|tr|div)[^>]*>\s*<(?:span|td|th|dt|label)[^>]*>([^<]+)<\/(?:span|td|th|dt|label)>\s*<(?:span|td|dd|div)[^>]*>([^<]+)<\/(?:span|td|dd|div)>/gi;
  let specMatch;
  while ((specMatch = specPattern.exec(html)) !== null) {
    const key = specMatch[1].replace(/<[^>]+>/g, "").trim();
    const value = specMatch[2].replace(/<[^>]+>/g, "").trim();
    if (key && value && key !== value) result.specifications[key] = value;
  }

  result.condition = result.specifications["التشطيب"] || result.specifications["Finishing"] || null;
  result.paymentMethod = result.specifications["طريقة الدفع"] || result.specifications["Payment"] || null;

  // Seller
  const sellerMatch = html.match(/class="[^"]*(?:agent-name|broker-name|company-name)[^"]*"[^>]*>([^<]+)/i);
  if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());

  const profileMatch = html.match(/href="(\/en\/(?:agent|broker|company)\/[^"]+)"/i);
  if (profileMatch) result.sellerProfileUrl = `${AQARMAP_BASE}${profileMatch[1]}`;

  return result;
}

// ═══ Helpers ═══

function parseAqarmapJson(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = (json.data || json.results || json.properties || json.listings || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const title = (item.title as string) || (item.name as string) || "";
    if (!title) continue;

    let price: number | null = null;
    if (item.price) {
      price = typeof item.price === "number" ? item.price : parsePrice(String(item.price));
    }

    const url = (item.url as string) || (item.link as string) ||
      (item.id ? `${AQARMAP_BASE}/en/listing/${item.id}` : "");
    if (!url) continue;

    const fullUrl = url.startsWith("http") ? url : `${AQARMAP_BASE}${url}`;

    listings.push({
      url: fullUrl,
      title,
      price,
      currency: "EGP",
      thumbnailUrl: (item.image as string) || (item.thumbnail as string) || null,
      location: (item.location as string) || (item.area as string) || "",
      dateText: (item.created_at as string) || "",
      sellerName: cleanSellerName((item.agent_name as string) || null),
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: !!(item.is_verified),
      isBusiness: !!(item.is_broker || item.is_company),
      isFeatured: !!(item.is_featured || item.featured),
      supportsExchange: false,
      isNegotiable: !!(item.is_negotiable),
      category: "properties",
      isLikelyBuyRequest: detectBuyRequest(title),
      detectedBuyerPhone: null,
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
