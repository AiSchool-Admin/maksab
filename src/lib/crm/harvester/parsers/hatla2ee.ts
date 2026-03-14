/**
 * Hatla2ee (هتلاقي) Parser — eg.hatla2ee.com
 * أكبر منصة سيارات في مصر — بيانات غنية
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const HATLA2EE_BASE = "https://eg.hatla2ee.com";

export function getHatla2eeListPageUrl(
  baseUrl: string,
  _category: string,
  _governorate: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

export function parseHatla2eeList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseHatla2eeJson(json);
    } catch { /* fall through */ }
  }

  // HTML: Hatla2ee car listing cards
  // Pattern: links to car detail pages
  const cardPattern = /href="((?:https?:\/\/eg\.hatla2ee\.com)?\/en\/car\/[^"]*\d+[^"]*)"/gi;
  let match;
  const seenUrls = new Set<string>();

  while ((match = cardPattern.exec(html)) !== null) {
    const url = match[1].startsWith("http") ? match[1] : `${HATLA2EE_BASE}${match[1]}`;

    if (seenUrls.has(url) || url.includes("/search") || url.includes("/filter")) continue;
    seenUrls.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 2500);
    const context = html.slice(start, end);

    // Car listings typically have: Brand Model Year
    const title = extractText(context, [
      /class="[^"]*(?:car-title|listing-title|newCarListingCard_title|carTitle)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
      /title="([^"]+)"/i,
    ]);
    if (!title) continue;

    const priceText = extractText(context, [
      /class="[^"]*(?:price|carPrice)[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE|L\.E)/i,
    ]);

    const location = extractText(context, [
      /class="[^"]*(?:location|carLocation|area)[^"]*"[^>]*>([^<]+)/i,
    ]);

    const year = extractText(context, [
      /class="[^"]*(?:year|model-year)[^"]*"[^>]*>(\d{4})/i,
      /(\d{4})\s*(?:model|موديل)/i,
    ]);

    const mileage = extractText(context, [
      /class="[^"]*(?:mileage|km|kilometer)[^"]*"[^>]*>([^<]+)/i,
      /(\d[\d,]*)\s*(?:km|كم)/i,
    ]);

    const thumbnailUrl = extractImage(context, [
      /src="(https?:\/\/[^"]*hatla2ee[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
    ]);

    // Enrich title with year/mileage if not already in title
    let enrichedTitle = title.trim();
    if (year && !enrichedTitle.includes(year)) {
      enrichedTitle += ` ${year}`;
    }
    if (mileage && !enrichedTitle.toLowerCase().includes("km") && !enrichedTitle.includes("كم")) {
      enrichedTitle += ` — ${mileage}`;
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
      sellerName: extractText(context, [/class="[^"]*(?:dealer|seller)[^"]*name[^"]*"[^>]*>([^<]+)/i]) || null,
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: context.includes("verified") || context.includes("dealer"),
      isBusiness: context.includes("dealer") || context.includes("showroom") || context.includes("معرض"),
      isFeatured: context.includes("featured") || context.includes("premium") || context.includes("مميز"),
      supportsExchange: context.includes("تبادل") || context.includes("exchange"),
      isNegotiable: context.includes("قابل للتفاوض") || context.includes("negotiable"),
      category: "vehicles",
      isLikelyBuyRequest,
    });
  }

  return listings;
}

export function parseHatla2eeDetail(html: string): ListingDetails {
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
        // Car-specific specs
        const specFields = ["brand", "model", "year", "mileage", "color", "fuel", "transmission", "engine_cc", "body_type"];
        for (const field of specFields) {
          if (json[field]) result.specifications[field] = String(json[field]);
        }
        return result;
      }
    } catch { /* fall through */ }
  }

  // HTML: Description
  const descPatterns = [
    /<div[^>]*class="[^"]*(?:description|car-description|details-description)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="description"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of descPatterns) {
    const m = html.match(pattern);
    if (m) {
      result.description = m[1].replace(/<[^>]+>/g, "").trim();
      break;
    }
  }

  // Extract images
  const imgPatterns = [
    /src="(https?:\/\/[^"]*hatla2ee[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi,
    /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi,
  ];
  for (const pattern of imgPatterns) {
    const matches = html.matchAll(pattern);
    for (const m of matches) {
      if (!result.allImageUrls.includes(m[1])) {
        result.allImageUrls.push(m[1]);
      }
    }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // Extract car specifications
  const specPattern = /<(?:li|tr|div)[^>]*>\s*<(?:span|td|th|dt|label)[^>]*>([^<]+)<\/(?:span|td|th|dt|label)>\s*<(?:span|td|dd|div)[^>]*>([^<]+)<\/(?:span|td|dd|div)>/gi;
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

  // Seller info
  const sellerMatch = html.match(/class="[^"]*(?:dealer-name|seller-name|showroom)[^"]*"[^>]*>([^<]+)/i);
  if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());

  const profileMatch = html.match(/href="(\/en\/(?:dealer|showroom|profile)\/[^"]+)"/i);
  if (profileMatch) result.sellerProfileUrl = `${HATLA2EE_BASE}${profileMatch[1]}`;

  return result;
}

// ═══ Helpers ═══

function parseHatla2eeJson(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = (json.data || json.results || json.cars || json.items || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const brand = (item.brand as string) || "";
    const model = (item.model as string) || "";
    const year = item.year ? String(item.year) : "";
    const title = (item.title as string) || `${brand} ${model} ${year}`.trim();
    if (!title) continue;

    let price: number | null = null;
    if (item.price) {
      price = typeof item.price === "number" ? item.price : parsePrice(String(item.price));
    }

    const url = (item.url as string) || (item.link as string) ||
      (item.id ? `${HATLA2EE_BASE}/en/car/${item.id}` : "");
    if (!url) continue;

    const fullUrl = url.startsWith("http") ? url : `${HATLA2EE_BASE}${url}`;
    const isLikelyBuyRequest = detectBuyRequest(title);

    listings.push({
      url: fullUrl,
      title,
      price,
      currency: "EGP",
      thumbnailUrl: (item.image as string) || (item.thumbnail as string) || null,
      location: (item.location as string) || (item.city as string) || "",
      dateText: (item.created_at as string) || "",
      sellerName: cleanSellerName((item.dealer_name as string) || (item.seller_name as string) || null),
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: !!(item.is_dealer),
      isBusiness: !!(item.is_dealer || item.dealer_id),
      isFeatured: !!(item.is_featured || item.featured),
      supportsExchange: false,
      isNegotiable: !!(item.is_negotiable),
      category: "vehicles",
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
