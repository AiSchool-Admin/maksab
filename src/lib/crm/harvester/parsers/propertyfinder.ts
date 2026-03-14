/**
 * Property Finder Egypt Parser — propertyfinder.eg
 * سوق عقارات
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const BASE = "https://www.propertyfinder.eg";

export function getPropertyFinderListPageUrl(baseUrl: string, _c: string, _g: string, page: number): string {
  if (page === 1) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}page=${page}`;
}

export function parsePropertyFinderList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const trimmed = html.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return parseJson(JSON.parse(trimmed)); } catch { /* fall through */ }
  }

  const cardPattern = /href="((?:https?:\/\/www\.propertyfinder\.eg)?\/en\/(?:property|listing|buy|rent)\/[^"]*\d+[^"]*)"/gi;
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
      /class="[^"]*(?:card-title|property-title|listing-title)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
    ]);
    if (!title) continue;

    const priceText = ext(ctx, [/(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i]);
    const area = ext(ctx, [/(\d[\d,]*)\s*(?:sqft|sqm|م²)/i]);
    const rooms = ext(ctx, [/(\d+)\s*(?:bed|غرف)/i]);

    let enrichedTitle = title.trim();
    if (area && !enrichedTitle.includes("sqm") && !enrichedTitle.includes("م²")) enrichedTitle += ` — ${area} م²`;

    const isLikelyBuyRequest = detectBuyRequest(title, ctx);

    listings.push({
      url, title: enrichedTitle,
      price: priceText ? parsePrice(priceText) : null,
      currency: "EGP",
      thumbnailUrl: extImg(ctx),
      location: ext(ctx, [/class="[^"]*(?:location|address)[^"]*"[^>]*>([^<]+)/i]) || "",
      dateText: ext(ctx, [/class="[^"]*date[^"]*"[^>]*>([^<]+)/i]) || "",
      sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
      isVerified: ctx.includes("verified"), isBusiness: ctx.includes("agent") || ctx.includes("broker"),
      isFeatured: ctx.includes("featured") || ctx.includes("premium"),
      supportsExchange: false, isNegotiable: ctx.includes("negotiable"),
      category: "properties", isLikelyBuyRequest,
    });
  }
  return listings;
}

export function parsePropertyFinderDetail(html: string): ListingDetails {
  const result: ListingDetails = {
    description: "", mainImageUrl: "", allImageUrls: [], specifications: {},
    condition: null, paymentMethod: null, hasWarranty: false,
    sellerName: null, sellerProfileUrl: null, sellerMemberSince: null,
  };

  const dm = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (dm) result.description = dm[1].replace(/<[^>]+>/g, "").trim();

  const imgs = html.matchAll(/src="(https?:\/\/[^"]*propertyfinder[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
  for (const m of imgs) { if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]); }
  if (result.allImageUrls.length === 0) {
    const fallback = html.matchAll(/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
    for (const m of fallback) { if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]); }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  const sp = /<(?:li|tr)[^>]*>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>/gi;
  let sm; while ((sm = sp.exec(html)) !== null) {
    const k = sm[1].trim(); const v = sm[2].trim();
    if (k && v && k !== v) result.specifications[k] = v;
  }

  const sellerMatch = html.match(/class="[^"]*(?:agent-name|broker)[^"]*"[^>]*>([^<]+)/i);
  if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());

  return result;
}

function parseJson(json: Record<string, unknown>): ListPageListing[] {
  const items = (json.data || json.results || json.properties || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];
  return items.filter(i => i.title).map(item => ({
    url: `${BASE}/en/property/${item.id || ""}`, title: (item.title as string) || "",
    price: typeof item.price === "number" ? item.price : null,
    currency: "EGP", thumbnailUrl: (item.image as string) || null,
    location: (item.location as string) || "", dateText: "",
    sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
    isVerified: false, isBusiness: false, isFeatured: false,
    supportsExchange: false, isNegotiable: false, category: "properties",
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
