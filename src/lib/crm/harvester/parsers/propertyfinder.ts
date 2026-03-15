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

  const seen = new Set<string>();

  // ═══ Pattern 0: __NEXT_DATA__ (PropertyFinder uses Next.js) ═══
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const props = nextData?.props?.pageProps;
      if (props) {
        // Try known keys for property listings
        const knownKeys = ['listings', 'properties', 'searchResults', 'results', 'hits', 'data'];
        for (const key of knownKeys) {
          const items = props[key];
          if (Array.isArray(items) && items.length > 0) {
            for (const item of items as Record<string, unknown>[]) {
              const title = (item.title as string) || (item.name as string) || (item.heading as string) || '';
              if (!title) continue;

              let url = '';
              if (item.url) {
                const rawUrl = item.url as string;
                url = rawUrl.startsWith('http') ? rawUrl : `${BASE}${rawUrl}`;
              } else if (item.slug) {
                url = `${BASE}/en/property/${item.slug}`;
              } else if (item.id) {
                url = `${BASE}/en/property/${item.id}`;
              } else if (item.externalID || item.reference) {
                url = `${BASE}/en/property/${item.externalID || item.reference}`;
              }
              if (!url || seen.has(url)) continue;
              seen.add(url);

              let price: number | null = null;
              if (item.price !== undefined) {
                if (typeof item.price === 'number') price = item.price;
                else if (typeof item.price === 'string') price = parsePrice(item.price);
                else if (typeof item.price === 'object' && item.price) {
                  const po = item.price as Record<string, unknown>;
                  price = typeof po.value === 'number' ? po.value : null;
                }
              }

              let thumbnailUrl: string | null = null;
              if (item.coverPhoto) {
                const cp = item.coverPhoto as Record<string, unknown>;
                thumbnailUrl = (cp.url as string) || (cp.main as string) || null;
              } else if (item.photo) {
                thumbnailUrl = typeof item.photo === 'string' ? item.photo : (item.photo as Record<string, unknown>)?.url as string || null;
              } else if (item.image) {
                thumbnailUrl = typeof item.image === 'string' ? item.image : null;
              }

              const locationParts = [
                (item.location as Record<string, unknown>)?.name as string,
                item.area as string,
                item.city as string,
              ].filter(Boolean);

              const area = item.area_sqft || item.area_sqm || item.size || null;
              let enrichedTitle = title.trim();
              if (area && !enrichedTitle.includes("sqm") && !enrichedTitle.includes("م²")) {
                enrichedTitle += ` — ${area} م²`;
              }

              listings.push({
                url, title: enrichedTitle, price, currency: "EGP", thumbnailUrl,
                location: locationParts.join(', '),
                dateText: (item.createdAt as string) || (item.added_on as string) || '',
                sellerName: (item.agency as Record<string, unknown>)?.name as string || null,
                sellerProfileUrl: null, sellerAvatarUrl: null,
                isVerified: !!(item.isVerified || item.verified),
                isBusiness: !!(item.agency || item.broker),
                isFeatured: !!(item.isFeatured || item.featured || item.premium),
                supportsExchange: false, isNegotiable: false,
                category: "properties",
                isLikelyBuyRequest: detectBuyRequest(title),
              });
            }

            if (listings.length > 0) return listings;
          }
        }

        // Deep search for listing arrays
        const deepSearch = (obj: unknown, depth: number): Record<string, unknown>[] | null => {
          if (depth <= 0 || !obj || typeof obj !== 'object') return null;
          if (Array.isArray(obj) && obj.length >= 2) {
            const first = obj[0];
            if (first && typeof first === 'object' && !Array.isArray(first)) {
              const keys = Object.keys(first as Record<string, unknown>);
              if (keys.some(k => /title|name|heading/i.test(k))) {
                return obj as Record<string, unknown>[];
              }
            }
          }
          if (!Array.isArray(obj)) {
            for (const val of Object.values(obj as Record<string, unknown>)) {
              if (val && typeof val === 'object') {
                const found = deepSearch(val, depth - 1);
                if (found) return found;
              }
            }
          }
          return null;
        };

        const foundItems = deepSearch(props, 4);
        if (foundItems) {
          const parsed = parseJson({ data: foundItems });
          if (parsed.length > 0) return parsed;
        }
      }
    } catch {
      // __NEXT_DATA__ parse error — fall through to HTML
    }
  }

  // ═══ Pattern 1: <article> elements ═══
  const articlePattern = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = articlePattern.exec(html)) !== null) {
    const ctx = match[1];
    const linkMatch = ctx.match(/href="((?:\/en\/)?[^"]*(?:property|listing|buy|rent)\/[^"]*\d+[^"]*)"/i);
    if (!linkMatch) continue;
    const rawUrl = linkMatch[1];
    const url = rawUrl.startsWith("http") ? rawUrl : `${BASE}${rawUrl}`;
    if (seen.has(url)) continue;
    seen.add(url);

    const title = ext(ctx, [
      /class="[^"]*(?:card-title|property-title|listing-title)[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
    ]);
    if (!title) continue;

    const priceText = ext(ctx, [
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i,
      /class="[^"]*price[^"]*"[^>]*>([^<]*\d[\d,]*[^<]*)/i,
    ]);

    const area = ext(ctx, [/(\d[\d,]*)\s*(?:sqft|sqm|م²|ft²)/i]);
    let enrichedTitle = title.trim();
    if (area && !enrichedTitle.includes("sqm") && !enrichedTitle.includes("م²")) enrichedTitle += ` — ${area} م²`;

    listings.push({
      url, title: enrichedTitle,
      price: priceText ? parsePrice(priceText) : null,
      currency: "EGP", thumbnailUrl: extImg(ctx),
      location: ext(ctx, [/class="[^"]*(?:location|address)[^"]*"[^>]*>([^<]+)/i]) || "",
      dateText: ext(ctx, [/class="[^"]*date[^"]*"[^>]*>([^<]+)/i]) || "",
      sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
      isVerified: ctx.includes("verified"), isBusiness: ctx.includes("agent") || ctx.includes("broker"),
      isFeatured: ctx.includes("featured") || ctx.includes("premium"),
      supportsExchange: false, isNegotiable: ctx.includes("negotiable"),
      category: "properties", isLikelyBuyRequest: detectBuyRequest(title, ctx),
    });
  }

  if (listings.length > 0) return listings;

  // ═══ Pattern 2: Fallback link-based parsing ═══
  const cardPattern = /href="((?:https?:\/\/www\.propertyfinder\.eg)?\/en\/(?:property|listing|buy|rent)\/[^"]*\d+[^"]*)"/gi;

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
  const items = (json.data || json.results || json.properties || json.hits || json.listings || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];
  return items.filter(i => i.title || i.name || i.heading).map(item => {
    const title = (item.title as string) || (item.name as string) || (item.heading as string) || "";
    let url = '';
    if (item.url) {
      const rawUrl = item.url as string;
      url = rawUrl.startsWith('http') ? rawUrl : `${BASE}${rawUrl}`;
    } else if (item.slug) {
      url = `${BASE}/en/property/${item.slug}`;
    } else {
      url = `${BASE}/en/property/${item.id || item.externalID || ""}`;
    }
    let price: number | null = null;
    if (typeof item.price === "number") price = item.price;
    else if (typeof item.price === "object" && item.price) {
      price = typeof (item.price as Record<string, unknown>).value === 'number'
        ? (item.price as Record<string, unknown>).value as number : null;
    }
    let thumbnailUrl: string | null = null;
    if (item.coverPhoto) {
      const cp = item.coverPhoto as Record<string, unknown>;
      thumbnailUrl = (cp.url as string) || (cp.main as string) || null;
    } else {
      thumbnailUrl = (item.image as string) || (item.thumbnail as string) || null;
    }
    return {
      url, title, price, currency: "EGP", thumbnailUrl,
      location: typeof item.location === 'string' ? item.location :
        (item.location as Record<string, unknown>)?.name as string || "",
      dateText: (item.createdAt as string) || "",
      sellerName: (item.agency as Record<string, unknown>)?.name as string || null,
      sellerProfileUrl: null, sellerAvatarUrl: null,
      isVerified: !!(item.isVerified), isBusiness: !!(item.agency),
      isFeatured: !!(item.isFeatured || item.featured),
      supportsExchange: false, isNegotiable: false, category: "properties",
      isLikelyBuyRequest: detectBuyRequest(title),
    };
  });
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
