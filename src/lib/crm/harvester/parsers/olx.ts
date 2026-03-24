/**
 * OLX Egypt Parser — olx.com.eg
 * منصة إعلانات عامة — سيارات وعقارات وغيرها
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const OLX_BASE = "https://www.olx.com.eg";

export interface OlxParseDebug {
  htmlLength: number;
  nextDataFound: boolean;
  pagePropsKeys: string[];
  strategyUsed: string;
  listingsFound: number;
  firstItemKeys: string[];
  hrefSamples?: string[];
  httpStatus?: number;
  httpError?: string;
}

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
  return parseOlxListWithDebug(html).listings;
}

export function parseOlxListWithDebug(html: string): { listings: ListPageListing[]; debug: OlxParseDebug } {
  const debug: OlxParseDebug = {
    htmlLength: html.length,
    nextDataFound: false,
    pagePropsKeys: [],
    strategyUsed: "none",
    listingsFound: 0,
    firstItemKeys: [],
  };

  console.error(`[OLX] HTML length: ${html.length}`);

  function done(listings: ListPageListing[], strategy: string) {
    debug.strategyUsed = strategy;
    debug.listingsFound = listings.length;
    if (listings[0]) debug.firstItemKeys = Object.keys(listings[0]);
    return { listings, debug };
  }

  // Try JSON (__NEXT_DATA__ or API response)
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      const result = parseOlxJson(json);
      if (result.length > 0) return done(result, "direct_json");
    } catch { /* fall through to HTML */ }
  }

  // ═══ Strategy 1: __NEXT_DATA__ ═══
  const nextDataMatch =
    html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i) ||
    html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);

  debug.nextDataFound = !!nextDataMatch;
  console.error(`[OLX] __NEXT_DATA__ found: ${debug.nextDataFound}`);

  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const props = nextData?.props?.pageProps || {};
      debug.pagePropsKeys = Object.keys(props);
      console.error(`[OLX] pageProps keys: ${debug.pagePropsKeys.join(", ")}`);

      // Strategy A: known direct keys
      const knownKeys = ['ads', 'listings', 'results', 'data', 'items', 'searchResults',
        'pageData', 'initialData', 'searchData'];
      for (const key of knownKeys) {
        let items = props[key];
        // Handle nested { data: [...] } etc
        if (items && typeof items === 'object' && !Array.isArray(items)) {
          items = items.data || items.ads || items.listings || items.results || items.items;
        }
        if (Array.isArray(items) && items.length > 0) {
          debug.firstItemKeys = Object.keys(items[0] || {});
          console.error(`[OLX] Found ${items.length} items in pageProps.${key}, first keys: ${debug.firstItemKeys.join(", ")}`);
          const mapped = items.map((item: Record<string, unknown>) => parseOlxJsonItem(item)).filter(Boolean) as ListPageListing[];
          if (mapped.length > 0) return done(mapped, `pageProps.${key}`);
        }
      }

      // Strategy B: dehydratedState.queries (React Query)
      const queries = props.dehydratedState?.queries;
      if (Array.isArray(queries)) {
        console.error(`[OLX] dehydratedState.queries count: ${queries.length}`);
        for (const q of queries) {
          const qData = q?.state?.data;
          const items = Array.isArray(qData) ? qData :
            (qData && typeof qData === 'object') ? (qData.data || qData.ads || qData.listings || qData.results) : null;
          if (Array.isArray(items) && items.length > 0) {
            debug.firstItemKeys = Object.keys(items[0] || {});
            console.error(`[OLX] Found ${items.length} in dehydratedState, queryKey: ${JSON.stringify(q.queryKey)}, keys: ${debug.firstItemKeys.join(", ")}`);
            const mapped = items.map((item: Record<string, unknown>) => parseOlxJsonItem(item)).filter(Boolean) as ListPageListing[];
            if (mapped.length > 0) return done(mapped, "dehydratedState");
          }
        }
      }

      // Strategy C: Log + deep search
      for (const [key, val] of Object.entries(props)) {
        if (val && typeof val === 'object') {
          if (Array.isArray(val)) {
            console.error(`[OLX]   pageProps.${key}: Array[${val.length}]${val.length > 0 ? ` first keys: ${Object.keys(val[0] || {}).join(", ")}` : ""}`);
          } else {
            console.error(`[OLX]   pageProps.${key}: Object keys: ${Object.keys(val as object).slice(0, 10).join(", ")}`);
          }
        }
      }

      const deepSearch = (obj: unknown, depth: number): Record<string, unknown>[] | null => {
        if (depth <= 0 || !obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj) && obj.length >= 2) {
          const first = obj[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const keys = Object.keys(first as Record<string, unknown>);
            if (keys.some(k => /title|name|price|url|link|slug/i.test(k))) {
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

      const foundItems = deepSearch(props, 6);
      if (foundItems) {
        console.error(`[OLX] Deep search found ${foundItems.length} items, first keys: ${Object.keys(foundItems[0] || {}).join(", ")}`);
        const mapped = foundItems.map((item: Record<string, unknown>) => parseOlxJsonItem(item)).filter(Boolean) as ListPageListing[];
        if (mapped.length > 0) return done(mapped, "deep_search");
      }

      console.error(`[OLX] __NEXT_DATA__ found but 0 listings extracted`);
    } catch (e) {
      console.error(`[OLX] __NEXT_DATA__ parse error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ═══ Strategy 2: JSON-LD ═══
  const jsonLdMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const jm of jsonLdMatches) {
    try {
      const ld = JSON.parse(jm[1]);
      if (ld["@type"] === "ItemList" && ld.itemListElement) {
        const listings: ListPageListing[] = [];
        for (const elem of ld.itemListElement) {
          const item = elem.item || elem;
          const title = item.name || '';
          const url = item.url || '';
          if (!title || !url) continue;
          listings.push({
            url: url.startsWith('http') ? url : `${OLX_BASE}${url}`,
            title, price: typeof item.offers?.price === 'number' ? item.offers.price : null,
            currency: "EGP", thumbnailUrl: item.image || null,
            location: item.address?.addressLocality || "", dateText: "",
            sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
            isVerified: false, isBusiness: false, isFeatured: false,
            supportsExchange: false, isNegotiable: false, category: null,
            isLikelyBuyRequest: false, detectedBuyerPhone: null,
          });
        }
        if (listings.length > 0) return done(listings, "jsonld");
      }
    } catch { /* skip */ }
  }

  // ═══ Strategy 3: HTML regex ═══
  const listings: ListPageListing[] = [];
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

  if (listings.length > 0) return done(listings, "html_regex");

  // ═══ All strategies failed ═══
  debug.hrefSamples = [...html.matchAll(/href="([^"]{20,100})"/gi)]
    .slice(0, 30).map(m => m[1]);
  console.error(`[OLX] DEBUG href samples:`, JSON.stringify(debug.hrefSamples?.slice(0, 10)));
  console.error(`[OLX] Final: 0 listings from ${html.length} bytes`);
  return done([], "none");
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
