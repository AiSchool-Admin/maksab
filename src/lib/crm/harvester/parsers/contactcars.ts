/**
 * ContactCars Parser — contactcars.com
 * سوق سيارات مصري
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const BASE = "https://contactcars.com";

export function getContactCarsListPageUrl(baseUrl: string, _c: string, _g: string, page: number): string {
  if (page === 1) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}page=${page}`;
}

export function parseContactCarsList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const trimmed = html.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return parseJson(JSON.parse(trimmed)); } catch { /* fall through */ }
  }

  const cardPattern = /href="((?:https?:\/\/contactcars\.com)?\/en\/(?:car|cars|listing)\/[^"]*\d+[^"]*)"/gi;
  let match;
  const seen = new Set<string>();

  while ((match = cardPattern.exec(html)) !== null) {
    const url = match[1].startsWith("http") ? match[1] : `${BASE}${match[1]}`;
    if (seen.has(url)) continue;
    seen.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 2500);
    const ctx = html.slice(start, end);

    const title = ext(ctx, [
      /class="[^"]*(?:car-title|listing-title|title)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
    ]);
    if (!title) continue;

    const priceText = ext(ctx, [/(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i]);
    const isLikelyBuyRequest = detectBuyRequest(title, ctx);

    listings.push({
      url, title: title.trim(),
      price: priceText ? parsePrice(priceText) : null,
      currency: "EGP",
      thumbnailUrl: extImg(ctx),
      location: ext(ctx, [/class="[^"]*location[^"]*"[^>]*>([^<]+)/i]) || "",
      dateText: ext(ctx, [/class="[^"]*date[^"]*"[^>]*>([^<]+)/i]) || "",
      sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
      isVerified: ctx.includes("verified"), isBusiness: ctx.includes("dealer") || ctx.includes("معرض"),
      isFeatured: ctx.includes("featured") || ctx.includes("مميز"),
      supportsExchange: false, isNegotiable: ctx.includes("قابل للتفاوض"),
      category: "vehicles", isLikelyBuyRequest,
    });
  }
  return listings;
}

export function parseContactCarsDetail(html: string): ListingDetails {
  const result: ListingDetails = {
    description: "", mainImageUrl: "", allImageUrls: [], specifications: {},
    condition: null, paymentMethod: null, hasWarranty: false,
    sellerName: null, sellerProfileUrl: null, sellerMemberSince: null,
  };

  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed);
      if (j.description) { result.description = j.description; return result; }
    } catch { /* fall through */ }
  }

  const dm = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (dm) result.description = dm[1].replace(/<[^>]+>/g, "").trim();

  const imgs = html.matchAll(/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
  for (const m of imgs) { if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]); }
  result.mainImageUrl = result.allImageUrls[0] || "";

  const sp = /<(?:li|tr)[^>]*>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>/gi;
  let sm; while ((sm = sp.exec(html)) !== null) { const k = sm[1].trim(); const v = sm[2].trim(); if (k && v && k !== v) result.specifications[k] = v; }

  result.condition = result.specifications["الحالة"] || result.specifications["Condition"] || null;
  return result;
}

function parseJson(json: Record<string, unknown>): ListPageListing[] {
  const items = (json.data || json.results || json.cars || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];
  return items.filter(i => i.title).map(item => ({
    url: `${BASE}/en/car/${item.id || ""}`, title: (item.title as string) || "",
    price: typeof item.price === "number" ? item.price : null,
    currency: "EGP", thumbnailUrl: (item.image as string) || null,
    location: (item.location as string) || "", dateText: (item.created_at as string) || "",
    sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
    isVerified: false, isBusiness: false, isFeatured: false,
    supportsExchange: false, isNegotiable: false, category: "vehicles",
    isLikelyBuyRequest: detectBuyRequest((item.title as string) || ""),
  }));
}

function ext(ctx: string, patterns: RegExp[]): string | null {
  for (const p of patterns) { const m = ctx.match(p); if (m) return (m[1] || m[0]).replace(/<[^>]+>/g, "").trim(); } return null;
}
function extImg(ctx: string): string | null {
  const m = ctx.match(/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i); return m ? m[1] : null;
}
function parsePrice(t: string): number | null {
  const c = t.replace(/[,٬\s]/g, "").match(/(\d+)/); return c ? parseFloat(c[1]) : null;
}
