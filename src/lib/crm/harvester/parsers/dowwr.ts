/**
 * Dowwr (دوّر) Parser — eg.dowwr.com
 * منصة إعلانات مصرية — موبايلات وإلكترونيات وسيارات وعقارات
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const DOWWR_BASE = "https://eg.dowwr.com";

export function getDowwrListPageUrl(
  baseUrl: string,
  _category: string,
  _governorate: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

export function parseDowwrList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON response first
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseDowwrJson(json);
    } catch { /* fall through */ }
  }

  const seenUrls = new Set<string>();

  // Pattern 1: Dowwr listing links — /ar/listing/ID or /ar/ad/ID or /ar/post/ID
  const cardPattern = /href="((?:https?:\/\/eg\.dowwr\.com)?\/(?:ar\/)?(?:listing|ad|post|item|classifieds?)\/[^"]*\d+[^"]*)"/gi;
  let match;

  while ((match = cardPattern.exec(html)) !== null) {
    const url = match[1].startsWith("http") ? match[1] : `${DOWWR_BASE}${match[1]}`;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 2500);
    const ctx = html.slice(start, end);

    const title = ext(ctx, [
      /class="[^"]*(?:card-title|listing-title|post-title|item-title|ad-title)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
      /title="([^"]+)"/i,
    ]);
    if (!title) continue;

    const priceText = ext(ctx, [
      /class="[^"]*(?:price|listing-price)[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i,
    ]);

    const location = ext(ctx, [
      /class="[^"]*(?:location|city|area)[^"]*"[^>]*>([^<]+)/i,
    ]);

    const dateText = ext(ctx, [
      /class="[^"]*(?:date|time)[^"]*"[^>]*>([^<]+)/i,
      /(?:منذ|ago)\s*([^<]*)/i,
    ]);

    const isLikelyBuyRequest = detectBuyRequest(title, ctx);

    listings.push({
      url,
      title: title.trim(),
      price: priceText ? parsePrice(priceText) : null,
      currency: "EGP",
      thumbnailUrl: extImg(ctx),
      location: location?.trim() || "",
      dateText: dateText?.trim() || "",
      sellerName: ext(ctx, [/class="[^"]*(?:seller|user|member)[^"]*name[^"]*"[^>]*>([^<]+)/i]) || null,
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: ctx.includes("verified") || ctx.includes("موثق"),
      isBusiness: ctx.includes("business") || ctx.includes("متجر") || ctx.includes("تاجر"),
      isFeatured: ctx.includes("featured") || ctx.includes("مميز") || ctx.includes("premium"),
      supportsExchange: ctx.includes("تبادل") || ctx.includes("بدل"),
      isNegotiable: ctx.includes("قابل للتفاوض") || ctx.includes("negotiable"),
      category: null,
      isLikelyBuyRequest,
    });
  }

  // Pattern 2: Broader fallback — any link with numeric ID on dowwr
  if (listings.length === 0) {
    const broadPattern = /href="(https?:\/\/eg\.dowwr\.com\/[^"]*\/\d+[^"]*)"/gi;
    while ((match = broadPattern.exec(html)) !== null) {
      const url = match[1];
      if (seenUrls.has(url) || url.includes("/search") || url.includes("/filter") || url.includes("/category")) continue;
      seenUrls.add(url);

      const start = Math.max(0, match.index - 500);
      const end = Math.min(html.length, match.index + 2000);
      const ctx = html.slice(start, end);

      const title = ext(ctx, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
        /aria-label="([^"]+)"/i,
        /title="([^"]+)"/i,
      ]);
      if (!title) continue;

      const priceText = ext(ctx, [/(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i]);

      listings.push({
        url,
        title: title.trim(),
        price: priceText ? parsePrice(priceText) : null,
        currency: "EGP",
        thumbnailUrl: extImg(ctx),
        location: ext(ctx, [/class="[^"]*location[^"]*"[^>]*>([^<]+)/i]) || "",
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

  // Pattern 3: article-based (like dubizzle)
  if (listings.length === 0) {
    const articles = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || [];
    for (const article of articles) {
      const linkMatch = article.match(/href="([^"]*\d+[^"]*)"/i);
      if (!linkMatch) continue;

      const url = linkMatch[1].startsWith("http") ? linkMatch[1] : `${DOWWR_BASE}${linkMatch[1]}`;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const title = ext(article, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
        /title="([^"]+)"/i,
        /aria-label="([^"]+)"/i,
      ]);
      if (!title) continue;

      const priceText = ext(article, [/(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i]);

      listings.push({
        url,
        title: title.trim(),
        price: priceText ? parsePrice(priceText) : null,
        currency: "EGP",
        thumbnailUrl: extImg(article),
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

export function parseDowwrDetail(html: string): ListingDetails {
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
          for (const [key, val] of Object.entries(json.attributes as Record<string, unknown>)) {
            if (typeof val === "string") result.specifications[key] = val;
          }
        }
        return result;
      }
    } catch { /* fall through */ }
  }

  // HTML: Description
  const descPatterns = [
    /<div[^>]*class="[^"]*(?:description|post-desc|ad-description|content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of descPatterns) {
    const m = html.match(pattern);
    if (m) {
      result.description = m[1].replace(/<[^>]+>/g, "").trim();
      break;
    }
  }

  // Images
  const imgMatches = html.matchAll(/src="(https?:\/\/[^"]*dowwr[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
  for (const m of imgMatches) {
    if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]);
  }
  if (result.allImageUrls.length === 0) {
    const fallback = html.matchAll(/(?:src|data-src)="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
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

  result.condition = result.specifications["الحالة"] || result.specifications["Condition"] || null;
  result.hasWarranty = result.description.includes("ضمان") || result.description.includes("warranty");

  // Seller
  const sellerMatch = html.match(/class="[^"]*(?:seller-name|user-name|member-name)[^"]*"[^>]*>([^<]+)/i);
  if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());

  const profileMatch = html.match(/href="(\/(?:ar\/)?(?:profile|user|member)\/[^"]+)"/i);
  if (profileMatch) result.sellerProfileUrl = `${DOWWR_BASE}${profileMatch[1]}`;

  return result;
}

// ═══ Helpers ═══

function parseDowwrJson(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = (json.data || json.results || json.posts || json.ads || json.items || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const title = (item.title as string) || (item.name as string) || "";
    if (!title) continue;

    let price: number | null = null;
    if (item.price) {
      price = typeof item.price === "number" ? item.price : parsePrice(String(item.price));
    }

    const url = (item.url as string) || (item.link as string) ||
      (item.id ? `${DOWWR_BASE}/ar/listing/${item.id}` : "");
    if (!url) continue;

    const fullUrl = url.startsWith("http") ? url : `${DOWWR_BASE}${url}`;

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
      sellerName: cleanSellerName((item.user_name as string) || (item.seller_name as string) || null),
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: !!(item.is_verified || item.verified),
      isBusiness: !!(item.is_business),
      isFeatured: !!(item.is_featured || item.featured),
      supportsExchange: title.includes("تبادل") || title.includes("بدل"),
      isNegotiable: !!(item.is_negotiable) || title.includes("قابل للتفاوض"),
      category: (item.category_name as string) || null,
      isLikelyBuyRequest,
    });
  }

  return listings;
}

function ext(ctx: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = ctx.match(p);
    if (m) return (m[1] || m[0]).replace(/<[^>]+>/g, "").trim();
  }
  return null;
}

function extImg(ctx: string): string | null {
  const m = ctx.match(/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i);
  return m ? m[1] : null;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[,٬\s]/g, "").match(/(\d+)/);
  return cleaned ? parseFloat(cleaned[1]) : null;
}
