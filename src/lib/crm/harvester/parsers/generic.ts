/**
 * Generic Parser — parser عام للمنصات الصغيرة
 * يتعامل مع HTML بسيط — Bezaat, Soq24, CairoLink, SooqMsr, Dowwr
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

/**
 * Generic list page parser — يحاول استخراج الإعلانات من أي HTML
 */
export function parseGenericList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON first
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseGenericJson(json);
    } catch { /* fall through */ }
  }

  // Strategy 1: Look for structured listing cards with common patterns
  const linkPattern = /href="(https?:\/\/[^"]*(?:listing|item|ad|product|post|details|view)\/[^"]*\d+[^"]*)"/gi;
  let match;
  const seenUrls = new Set<string>();

  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    if (seenUrls.has(url) || url.includes("/search") || url.includes("/login") || url.includes("/register")) continue;
    seenUrls.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 2000);
    const context = html.slice(start, end);

    const title = extractText(context, [
      /aria-label="([^"]+)"/i,
      /title="([^"]+)"/i,
      /class="[^"]*(?:title|name|heading)[^"]*"[^>]*>([^<]+)/i,
      /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
    ]);
    if (!title || title.length < 3) continue;

    const priceText = extractText(context, [
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE|L\.E)/,
      /class="[^"]*price[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
    ]);

    const locationText = extractText(context, [
      /class="[^"]*(?:location|address|area|city)[^"]*"[^>]*>([^<]+)/i,
    ]);

    const dateText = extractText(context, [
      /class="[^"]*(?:date|time)[^"]*"[^>]*>([^<]+)/i,
      /(?:منذ|ago)\s*([^<]*)/i,
    ]);

    const thumbnailUrl = extractImage(context);
    const isLikelyBuyRequest = detectBuyRequest(title, context);

    listings.push({
      url,
      title: title.trim(),
      price: priceText ? parsePrice(priceText) : null,
      currency: "EGP",
      thumbnailUrl,
      location: locationText?.trim() || "",
      dateText: dateText?.trim() || "",
      sellerName: null,
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: context.includes("verified") || context.includes("موثق"),
      isBusiness: context.includes("business") || context.includes("متجر") || context.includes("dealer"),
      isFeatured: context.includes("featured") || context.includes("مميز"),
      supportsExchange: context.includes("تبادل") || context.includes("بدل"),
      isNegotiable: context.includes("قابل للتفاوض") || context.includes("negotiable"),
      category: null,
      isLikelyBuyRequest,
    });
  }

  // Strategy 2: If no listings found, try broader approach with any link that has a number ID
  if (listings.length === 0) {
    const broadPattern = /href="(\/[^"]*\/\d{4,}[^"]*)"/gi;
    while ((match = broadPattern.exec(html)) !== null) {
      const url = match[1];
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const start = Math.max(0, match.index - 400);
      const end = Math.min(html.length, match.index + 1500);
      const context = html.slice(start, end);

      const title = extractText(context, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
        /aria-label="([^"]+)"/i,
        /title="([^"]+)"/i,
      ]);
      if (!title || title.length < 3) continue;

      listings.push({
        url,
        title: title.trim(),
        price: null,
        currency: "EGP",
        thumbnailUrl: extractImage(context),
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
        category: null,
        isLikelyBuyRequest: detectBuyRequest(title),
      });
    }
  }

  return listings;
}

/**
 * Generic detail page parser
 */
export function parseGenericDetail(html: string): ListingDetails {
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
      if (json.description) {
        result.description = json.description;
        return result;
      }
    } catch { /* fall through */ }
  }

  // Description
  const descPatterns = [
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="description"[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];
  for (const pattern of descPatterns) {
    const m = html.match(pattern);
    if (m) {
      result.description = m[1].replace(/<[^>]+>/g, "").trim();
      break;
    }
  }

  // Images
  const imgMatches = html.matchAll(/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
  for (const m of imgMatches) {
    if (!result.allImageUrls.includes(m[1]) && !m[1].includes("logo") && !m[1].includes("icon")) {
      result.allImageUrls.push(m[1]);
    }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // Specifications
  const specPattern = /<(?:li|tr)[^>]*>\s*<(?:span|td|th)[^>]*>([^<]+)<\/(?:span|td|th)>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>/gi;
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

  // Seller
  const sellerMatch = html.match(/class="[^"]*(?:seller|dealer|agent|broker)[^"]*name[^"]*"[^>]*>([^<]+)/i);
  if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());

  return result;
}

// ═══ Helpers ═══

function parseGenericJson(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = (json.data || json.results || json.items || json.listings || json.ads || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const title = (item.title as string) || (item.name as string) || "";
    if (!title) continue;

    let price: number | null = null;
    if (item.price) {
      price = typeof item.price === "number" ? item.price : parsePrice(String(item.price));
    }

    const url = (item.url as string) || (item.link as string) || "";
    if (!url) continue;

    listings.push({
      url,
      title,
      price,
      currency: "EGP",
      thumbnailUrl: (item.image as string) || (item.thumbnail as string) || null,
      location: (item.location as string) || "",
      dateText: (item.date as string) || (item.created_at as string) || "",
      sellerName: cleanSellerName((item.seller_name as string) || null),
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: false,
      isBusiness: false,
      isFeatured: !!(item.featured),
      supportsExchange: false,
      isNegotiable: false,
      category: null,
      isLikelyBuyRequest: detectBuyRequest(title),
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

function extractImage(context: string): string | null {
  const m = context.match(/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i);
  return m ? m[1] : null;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[,٬\s]/g, "").match(/(\d+)/);
  return cleaned ? parseFloat(cleaned[1]) : null;
}
