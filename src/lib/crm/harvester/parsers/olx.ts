/**
 * OLX Egypt Parser — olx.com.eg
 * منصة إعلانات عامة — سيارات وعقارات وغيرها
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const OLX_BASE = "https://www.olx.com.eg";

export function getOlxListPageUrl(
  baseUrl: string,
  _category: string,
  _governorate: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

export function parseOlxList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON (__NEXT_DATA__ or API response)
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseOlxJson(json);
    } catch { /* fall through to HTML */ }
  }

  // Try __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const items = nextData?.props?.pageProps?.ads || nextData?.props?.pageProps?.listings || [];
      if (items.length > 0) {
        return items.map((item: Record<string, unknown>) => parseOlxJsonItem(item)).filter(Boolean);
      }
    } catch { /* fall through */ }
  }

  // HTML regex patterns for OLX listing cards
  const cardPattern = /href="((?:https?:\/\/www\.olx\.com\.eg)?\/[^"]*item[^"]*|(?:https?:\/\/www\.olx\.com\.eg)?\/[^"]*ad[^"]*\d+[^"]*)"/gi;
  let match;
  const seenUrls = new Set<string>();

  while ((match = cardPattern.exec(html)) !== null) {
    const rawUrl = match[1];
    const url = rawUrl.startsWith("http") ? rawUrl : `${OLX_BASE}${rawUrl}`;

    if (seenUrls.has(url) || url.includes("/search") || url.includes("/filter") || url.includes("/category")) continue;
    seenUrls.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 3000);
    const context = html.slice(start, end);

    const title = extractText(context, [
      /class="[^"]*(?:title|ad-title|listing-title)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
      /title="([^"]+)"/i,
    ]);
    if (!title) continue;

    const priceText = extractText(context, [
      /class="[^"]*price[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i,
    ]);
    const price = priceText ? parsePrice(priceText) : null;

    const location = extractText(context, [
      /class="[^"]*location[^"]*"[^>]*>([^<]+)/i,
      /class="[^"]*area[^"]*"[^>]*>([^<]+)/i,
    ]) || "الإسكندرية";

    const dateText = extractText(context, [
      /class="[^"]*date[^"]*"[^>]*>([^<]+)/i,
      /class="[^"]*time[^"]*"[^>]*>([^<]+)/i,
    ]) || "";

    const thumbnailUrl = extractText(context, [
      /src="(https?:\/\/[^"]*(?:olx|apollo)[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
    ]);

    const sellerName = extractText(context, [
      /class="[^"]*(?:seller|user|owner)[^"]*"[^>]*>([^<]+)/i,
    ]);

    const isBusiness = /(?:شركة|معرض|مكتب|company|dealer|store|shop)/i.test(context);
    const isVerified = /(?:verified|موثق|pro|premium)/i.test(context);
    const isFeatured = /(?:featured|مميز|premium|spotlight)/i.test(context);
    const isNegotiable = /(?:قابل للتفاوض|negotiable)/i.test(context);

    const isLikelyBuyRequest = detectBuyRequest(title + " " + (priceText || ""));

    listings.push({
      url,
      title: title.trim(),
      price,
      currency: "EGP",
      thumbnailUrl: thumbnailUrl || null,
      location: location.trim(),
      dateText: dateText.trim(),
      sellerName: sellerName ? cleanSellerName(sellerName) : null,
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified,
      isBusiness,
      isFeatured,
      supportsExchange: false,
      isNegotiable,
      category: null,
      isLikelyBuyRequest,
      detectedBuyerPhone: null,
    });
  }

  return listings;
}

export function parseOlxDetail(html: string): ListingDetails {
  // Try JSON first
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const ad = nextData?.props?.pageProps?.ad || nextData?.props?.pageProps?.listing || {};
      if (ad.description || ad.title) {
        return {
          description: ad.description || "",
          mainImageUrl: ad.images?.[0]?.url || ad.main_image || "",
          allImageUrls: (ad.images || []).map((img: Record<string, string>) => img.url || img.src).filter(Boolean),
          specifications: ad.parameters?.reduce((acc: Record<string, string>, p: Record<string, string>) => {
            acc[p.key || p.name] = p.value || p.label;
            return acc;
          }, {}) || {},
          condition: null,
          paymentMethod: null,
          hasWarranty: false,
          sellerName: ad.user?.name || null,
          sellerProfileUrl: ad.user?.url || null,
          sellerMemberSince: ad.user?.created || null,
        };
      }
    } catch { /* fall through */ }
  }

  const description = extractText(html, [
    /class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]) || "";

  const mainImageUrl = extractText(html, [
    /class="[^"]*gallery[^"]*"[\s\S]*?src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i,
    /og:image"[^>]*content="([^"]+)"/i,
  ]) || "";

  const allImageUrls: string[] = [];
  const imgPattern = /src="(https?:\/\/[^"]*(?:olx|apollo)[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi;
  let imgMatch;
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    if (!allImageUrls.includes(imgMatch[1])) allImageUrls.push(imgMatch[1]);
  }

  const sellerName = extractText(html, [
    /class="[^"]*(?:seller-name|user-name|owner)[^"]*"[^>]*>([^<]+)/i,
  ]);

  return {
    description: description.replace(/<[^>]+>/g, " ").trim(),
    mainImageUrl,
    allImageUrls,
    specifications: {},
    condition: null,
    paymentMethod: null,
    hasWarranty: false,
    sellerName: sellerName ? cleanSellerName(sellerName) : null,
    sellerProfileUrl: null,
    sellerMemberSince: null,
  };
}

// ─── JSON Helpers ────────────────────────────────────────────

function parseOlxJson(json: Record<string, unknown>): ListPageListing[] {
  const items = (json.data as Record<string, unknown>[]) || (json.ads as Record<string, unknown>[]) || (json.results as Record<string, unknown>[]) || [];
  return items.map(parseOlxJsonItem).filter(Boolean) as ListPageListing[];
}

function parseOlxJsonItem(item: Record<string, unknown>): ListPageListing | null {
  const title = (item.title as string) || (item.name as string) || "";
  if (!title) return null;

  const url = (item.url as string) || (item.link as string) || "";
  const fullUrl = url.startsWith("http") ? url : `${OLX_BASE}${url}`;

  const price = typeof item.price === "number"
    ? item.price
    : typeof item.price === "object" && item.price !== null
      ? (item.price as Record<string, number>).value || null
      : null;

  const user = (item.user as Record<string, unknown>) || {};

  return {
    url: fullUrl,
    title,
    price,
    currency: "EGP",
    thumbnailUrl: ((item.images as Record<string, string>[]) || [])[0]?.url || (item.thumbnail as string) || null,
    location: (item.location as string) || (item.area as string) || "الإسكندرية",
    dateText: (item.created_at as string) || (item.date as string) || "",
    sellerName: (user.name as string) || null,
    sellerProfileUrl: (user.url as string) || null,
    sellerAvatarUrl: (user.avatar as string) || null,
    isVerified: !!(user.verified || user.is_verified),
    isBusiness: !!(user.is_business || user.account_type === "business"),
    isFeatured: !!(item.featured || item.is_featured),
    supportsExchange: false,
    isNegotiable: !!(item.negotiable || item.is_negotiable),
    category: (item.category as string) || null,
    isLikelyBuyRequest: false,
    detectedBuyerPhone: null,
  };
}

// ─── Utility Helpers ─────────────────────────────────────────

function extractText(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      return match[1].replace(/<[^>]+>/g, "").trim();
    }
  }
  return null;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d.,٬]/g, "").replace(/[,٬]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
