/**
 * Property Finder Egypt Parser — propertyfinder.eg
 * سوق عقارات
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const BASE = "https://www.propertyfinder.eg";

export interface PFParseDebug {
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

export function getPropertyFinderListPageUrl(baseUrl: string, _c: string, _g: string, page: number): string {
  if (page === 1) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}page=${page}`;
}

export function parsePropertyFinderList(html: string): ListPageListing[] {
  return parsePropertyFinderListWithDebug(html).listings;
}

export function parsePropertyFinderListWithDebug(html: string): { listings: ListPageListing[]; debug: PFParseDebug } {
  const debug: PFParseDebug = {
    htmlLength: html.length,
    nextDataFound: false,
    pagePropsKeys: [],
    strategyUsed: "none",
    listingsFound: 0,
    firstItemKeys: [],
  };

  console.error(`[PF] HTML length: ${html.length}`);

  function done(listings: ListPageListing[], strategy: string) {
    debug.strategyUsed = strategy;
    debug.listingsFound = listings.length;
    if (listings[0]) debug.firstItemKeys = Object.keys(listings[0]);
    return { listings, debug };
  }

  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const result = parseJson(JSON.parse(trimmed));
      if (result.length > 0) return done(result, "direct_json");
    } catch { /* fall through */ }
  }

  const seen = new Set<string>();

  // ═══ Strategy 1: __NEXT_DATA__ (PropertyFinder uses Next.js) ═══
  const nextDataMatch =
    html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i) ||
    html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);

  debug.nextDataFound = !!nextDataMatch;
  console.error(`[PF] __NEXT_DATA__ found: ${debug.nextDataFound}`);

  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const props = nextData?.props?.pageProps || {};
      debug.pagePropsKeys = Object.keys(props);
      console.error(`[PF] pageProps keys: ${debug.pagePropsKeys.join(", ")}`);

      // Strategy A: known direct keys
      const knownKeys = ['listings', 'properties', 'searchResults', 'results', 'hits', 'data',
        'pageData', 'initialData', 'items', 'ads', 'searchData'];
      for (const key of knownKeys) {
        let items = props[key];
        // Handle nested { data: [...] } or { listings: [...] } or { results: [...] }
        if (items && typeof items === 'object' && !Array.isArray(items)) {
          items = items.data || items.listings || items.results || items.hits || items.items;
        }
        if (Array.isArray(items) && items.length > 0) {
          debug.firstItemKeys = Object.keys(items[0] || {});
          console.error(`[PF] Found ${items.length} items in pageProps.${key}, first keys: ${debug.firstItemKeys.join(", ")}`);
          const mapped = mapPFItems(items, seen);
          if (mapped.length > 0) return done(mapped, `pageProps.${key}`);
        }
      }

      // Strategy B: dehydratedState.queries (React Query)
      const queries = props.dehydratedState?.queries;
      if (Array.isArray(queries)) {
        console.error(`[PF] dehydratedState.queries count: ${queries.length}`);
        for (const q of queries) {
          const qData = q?.state?.data;
          const items = Array.isArray(qData) ? qData :
            (qData && typeof qData === 'object') ? (qData.data || qData.listings || qData.results || qData.hits || qData.items) : null;
          if (Array.isArray(items) && items.length > 0) {
            debug.firstItemKeys = Object.keys(items[0] || {});
            console.error(`[PF] Found ${items.length} in dehydratedState, queryKey: ${JSON.stringify(q.queryKey)}, keys: ${debug.firstItemKeys.join(", ")}`);
            const mapped = mapPFItems(items, seen);
            if (mapped.length > 0) return done(mapped, "dehydratedState");
          }
        }
      }

      // Strategy C: Log all pageProps arrays/objects for debugging, then deep search
      for (const [key, val] of Object.entries(props)) {
        if (val && typeof val === 'object') {
          if (Array.isArray(val)) {
            console.error(`[PF]   pageProps.${key}: Array[${val.length}]${val.length > 0 ? ` first keys: ${Object.keys(val[0] || {}).join(", ")}` : ""}`);
          } else {
            console.error(`[PF]   pageProps.${key}: Object keys: ${Object.keys(val as object).slice(0, 10).join(", ")}`);
          }
        }
      }

      const deepSearch = (obj: unknown, depth: number): Record<string, unknown>[] | null => {
        if (depth <= 0 || !obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj) && obj.length >= 2) {
          const first = obj[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const keys = Object.keys(first as Record<string, unknown>);
            if (keys.some(k => /title|name|heading|price|location|area|slug/i.test(k))) {
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
        console.error(`[PF] Deep search found array of ${foundItems.length} items, first keys: ${Object.keys(foundItems[0] || {}).join(", ")}`);
        const mapped = mapPFItems(foundItems, seen);
        if (mapped.length > 0) return done(mapped, "deep_search");
      }

      console.error(`[PF] __NEXT_DATA__ found but 0 listings extracted`);
    } catch (e) {
      console.error(`[PF] __NEXT_DATA__ parse error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ═══ Strategy 2: JSON-LD structured data ═══
  const jsonLdMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const jm of jsonLdMatches) {
    try {
      const ld = JSON.parse(jm[1]);
      if (ld["@type"] === "ItemList" && ld.itemListElement) {
        const listings: ListPageListing[] = [];
        for (const elem of ld.itemListElement) {
          const item = elem.item || elem;
          const title = item.name || item.headline || '';
          const url = item.url || '';
          if (!title || !url || seen.has(url)) continue;
          seen.add(url);
          listings.push({
            url: url.startsWith('http') ? url : `${BASE}${url}`,
            title, price: null, currency: "EGP", thumbnailUrl: item.image || null,
            location: item.address?.addressLocality || "", dateText: "",
            sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
            isVerified: false, isBusiness: false, isFeatured: false,
            supportsExchange: false, isNegotiable: false, category: "properties",
            isLikelyBuyRequest: false, detectedBuyerPhone: null,
          });
        }
        if (listings.length > 0) return done(listings, "jsonld");
      }
    } catch { /* skip */ }
  }

  const listings: ListPageListing[] = [];

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
      category: "properties", isLikelyBuyRequest: detectBuyRequest(title, ctx), detectedBuyerPhone: null,
    });
  }

  if (listings.length > 0) return done(listings, "html_article");

  // ═══ Strategy 4: Fallback link-based parsing ═══
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
      category: "properties", isLikelyBuyRequest, detectedBuyerPhone: null,
    });
  }

  if (listings.length > 0) return done(listings, "html_links");

  // ═══ All strategies failed — dump debug ═══
  debug.hrefSamples = [...html.matchAll(/href="([^"]{20,100})"/gi)]
    .slice(0, 30).map(m => m[1]);
  console.error(`[PF] DEBUG href samples:`, JSON.stringify(debug.hrefSamples?.slice(0, 10)));
  console.error(`[PF] Final: 0 listings from ${html.length} bytes`);
  return done([], "none");
}

// ═══ Map JSON items (from __NEXT_DATA__) to ListPageListing[] ═══
function mapPFItems(items: Record<string, unknown>[], seen: Set<string>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  for (const item of items) {
    const title = String(item.title || item.name || item.heading || '').trim();
    if (!title) continue;

    let url = '';
    if (item.url) {
      const rawUrl = String(item.url);
      url = rawUrl.startsWith('http') ? rawUrl : `${BASE}${rawUrl}`;
    } else if (item.slug) {
      url = `${BASE}/en/property/${item.slug}`;
    } else if (item.id) {
      url = `${BASE}/en/property/${item.id}`;
    } else if (item.externalID || item.reference || item.referenceNumber) {
      url = `${BASE}/en/property/${item.externalID || item.reference || item.referenceNumber}`;
    }
    if (!url || seen.has(url)) continue;
    seen.add(url);

    let price: number | null = null;
    const rawPrice = item.price ?? item.salePrice ?? item.rentPrice;
    if (rawPrice !== undefined && rawPrice !== null) {
      if (typeof rawPrice === 'number') price = rawPrice;
      else if (typeof rawPrice === 'string') price = parsePrice(rawPrice);
      else if (typeof rawPrice === 'object') {
        const po = rawPrice as Record<string, unknown>;
        price = typeof po.value === 'number' ? po.value : typeof po.amount === 'number' ? po.amount : parsePrice(String(po.value ?? po.amount ?? ''));
      }
    }

    let thumbnailUrl: string | null = null;
    if (item.coverPhoto) {
      const cp = item.coverPhoto as Record<string, unknown>;
      thumbnailUrl = String(cp.url || cp.main || cp.src || '');
    } else if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
      const p = item.photos[0] as Record<string, unknown>;
      thumbnailUrl = String(p?.url || p?.src || p?.main || '');
    } else if (item.photo) {
      thumbnailUrl = typeof item.photo === 'string' ? item.photo : String((item.photo as Record<string, unknown>)?.url || '');
    } else if (item.image) {
      thumbnailUrl = typeof item.image === 'string' ? item.image : String((item.image as Record<string, unknown>)?.url || '');
    } else if (item.thumbnail) {
      thumbnailUrl = String(item.thumbnail);
    }
    if (!thumbnailUrl) thumbnailUrl = null;

    const locationParts = [
      typeof item.location === 'object' ? (item.location as Record<string, unknown>)?.name as string : null,
      item.area as string,
      item.city as string,
      typeof item.location === 'string' ? item.location : null,
      item.district as string,
      item.neighborhood as string,
    ].filter(Boolean);

    const area = item.area_sqft || item.area_sqm || item.size || item.area_size || null;
    let enrichedTitle = title;
    if (area && !enrichedTitle.includes("sqm") && !enrichedTitle.includes("م²")) {
      enrichedTitle += ` — ${area} م²`;
    }

    const sellerName = (item.agency as Record<string, unknown>)?.name as string
      || (item.broker as Record<string, unknown>)?.name as string
      || (item.agent as Record<string, unknown>)?.name as string
      || null;

    listings.push({
      url, title: enrichedTitle, price, currency: "EGP", thumbnailUrl,
      location: locationParts.join(', '),
      dateText: String(item.createdAt || item.created_at || item.added_on || item.publishedAt || ''),
      sellerName,
      sellerProfileUrl: null, sellerAvatarUrl: null,
      isVerified: !!(item.isVerified || item.verified),
      isBusiness: !!(item.agency || item.broker || item.agent),
      isFeatured: !!(item.isFeatured || item.featured || item.premium),
      supportsExchange: false, isNegotiable: false,
      category: "properties",
      isLikelyBuyRequest: detectBuyRequest(title),
      detectedBuyerPhone: null,
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

  // Strategy 1: __NEXT_DATA__
  const nextMatch = html.match(/<script\s*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch) {
    try {
      const nd = JSON.parse(nextMatch[1]);
      const props = nd?.props?.pageProps || {};
      const listing = props.listing || props.property || props.ad || props.data || props;

      if (listing.description) result.description = String(listing.description);

      const imgs = listing.images || listing.photos || listing.gallery || [];
      for (const img of (Array.isArray(imgs) ? imgs : [])) {
        const url = typeof img === "string" ? img : (img?.url || img?.src);
        if (url) result.allImageUrls.push(String(url));
      }

      // Specs from known fields
      const specFields = ["area", "rooms", "bedrooms", "bathrooms", "floor", "finishing",
        "type", "property_type", "propertyType", "payment_method", "furnishing", "view"];
      for (const f of specFields) {
        if (listing[f]) result.specifications[f] = String(listing[f]);
      }

      // Specs from parameters array
      const params = listing.parameters || listing.specifications || listing.details || [];
      if (Array.isArray(params)) {
        for (const p of params) {
          const k = String(p.label || p.name || p.key || "");
          const v = String(p.value || p.value_label || "");
          if (k && v && k !== v) result.specifications[k] = v;
        }
      }

      const agent = listing.agent || listing.agency || listing.broker || listing.seller;
      if (agent) result.sellerName = cleanSellerName(String(agent.name || ""));

      console.error(`[PF Detail] __NEXT_DATA__: ${Object.keys(result.specifications).length} specs`);
      if (Object.keys(result.specifications).length > 0) {
        result.mainImageUrl = result.allImageUrls[0] || "";
        return result;
      }
    } catch { /* fall through */ }
  }

  // Strategy 2: HTML fallback
  const dm = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (dm) result.description = dm[1].replace(/<[^>]+>/g, "").trim();

  const imgMatches = html.matchAll(/src="(https?:\/\/[^"]*propertyfinder[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
  for (const m of imgMatches) { if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]); }
  if (result.allImageUrls.length === 0) {
    const fallback = html.matchAll(/src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
    for (const m of fallback) { if (!result.allImageUrls.includes(m[1])) result.allImageUrls.push(m[1]); }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // Multiple spec patterns
  const specPatterns = [
    /<(?:li|tr)[^>]*>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>/gi,
    /<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/gi,
  ];
  for (const sp of specPatterns) {
    let sm; while ((sm = sp.exec(html)) !== null) {
      const k = sm[1].trim(); const v = sm[2].trim();
      if (k && v && k !== v && k.length < 50) result.specifications[k] = v;
    }
  }

  const sellerMatch = html.match(/class="[^"]*(?:agent-name|broker|agency)[^"]*"[^>]*>([^<]+)/i);
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
      detectedBuyerPhone: null,
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
