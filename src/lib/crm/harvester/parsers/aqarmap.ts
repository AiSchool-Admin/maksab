/**
 * Aqarmap (عقارماب) Parser — aqarmap.com.eg
 * أكبر منصة عقارات في مصر — 2 مليون+ مستخدم
 *
 * Aqarmap is a Next.js SPA — listing data is embedded in __NEXT_DATA__ JSON.
 * The HTML regex approach fails because rendered cards are hydrated client-side.
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

export interface AqarmapParseDebug {
  htmlLength: number;
  nextDataFound: boolean;
  pagePropsKeys: string[];
  strategyUsed: string;
  listingsFound: number;
  firstItemKeys: string[];
  hrefSamples?: string[];
  relevantClasses?: string[];
  httpStatus?: number;
  httpError?: string;
}

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
  return parseAqarmapListWithDebug(html).listings;
}

export function parseAqarmapListWithDebug(html: string): { listings: ListPageListing[]; debug: AqarmapParseDebug } {
  const debug: AqarmapParseDebug = {
    htmlLength: html.length,
    nextDataFound: false,
    pagePropsKeys: [],
    strategyUsed: "none",
    listingsFound: 0,
    firstItemKeys: [],
  };

  // Debug: log HTML sample for troubleshooting
  console.error(`[AqarMap] HTML length: ${html.length}`);
  console.error(`[AqarMap] HTML sample (first 300): ${html.substring(0, 300).replace(/\n/g, " ")}`);

  // Try direct JSON response
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      const result = parseAqarmapJson(json);
      console.error(`[AqarMap] Direct JSON: ${result.length} listings`);
      debug.strategyUsed = "direct_json";
      debug.listingsFound = result.length;
      debug.firstItemKeys = result[0] ? Object.keys(result[0]) : [];
      return { listings: result, debug };
    } catch { /* fall through */ }
  }

  // ═══ Strategy 1: Extract __NEXT_DATA__ JSON (Next.js SSR) ═══
  const nextDataMatch =
    html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i) ||
    html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);

  debug.nextDataFound = !!nextDataMatch;
  console.error(`[AqarMap] __NEXT_DATA__ found: ${debug.nextDataFound}`);

  // Helper to finalize debug and return
  function done(listings: ListPageListing[], strategy: string): { listings: ListPageListing[]; debug: AqarmapParseDebug } {
    debug.strategyUsed = strategy;
    debug.listingsFound = listings.length;
    debug.firstItemKeys = listings[0] ? Object.keys(listings[0]) : [];
    return { listings, debug };
  }

  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const pageProps = data?.props?.pageProps || {};
      debug.pagePropsKeys = Object.keys(pageProps);
      console.error(`[AqarMap] pageProps keys: ${debug.pagePropsKeys.join(", ")}`);

      // Strategy A: pageProps.listings (direct array)
      const directListings = pageProps.listings || pageProps.properties || pageProps.units || pageProps.results;
      if (Array.isArray(directListings) && directListings.length > 0) {
        debug.firstItemKeys = Object.keys(directListings[0]);
        console.error(`[AqarMap] Found ${directListings.length} listings in pageProps, first item keys: ${debug.firstItemKeys.join(", ")}`);
        const mapped = directListings.map(convertAqarmapItem).filter(Boolean) as ListPageListing[];
        if (mapped.length > 0) {
          console.error(`[AqarMap] Mapped ${mapped.length} listings from pageProps`);
          return done(mapped, "pageProps.listings");
        }
      }

      // Strategy B: dehydratedState.queries (React Query / TanStack Query)
      const queries = pageProps.dehydratedState?.queries;
      if (Array.isArray(queries)) {
        console.error(`[AqarMap] dehydratedState.queries count: ${queries.length}`);
        for (const q of queries) {
          const qData = q?.state?.data;
          const items = Array.isArray(qData) ? qData :
            (qData && typeof qData === "object" && Array.isArray((qData as any).data)) ? (qData as any).data :
              (qData && typeof qData === "object" && Array.isArray((qData as any).listings)) ? (qData as any).listings :
                null;
          if (items && items.length > 0) {
            debug.firstItemKeys = Object.keys(items[0]);
            console.error(`[AqarMap] Found ${items.length} in dehydratedState query, key: ${JSON.stringify(q.queryKey)}, first item keys: ${debug.firstItemKeys.join(", ")}`);
            const mapped = items.map(convertAqarmapItem).filter(Boolean) as ListPageListing[];
            if (mapped.length > 0) {
              console.error(`[AqarMap] Mapped ${mapped.length} listings from dehydratedState`);
              return done(mapped, "dehydratedState");
            }
          }
        }
      }

      // Strategy C: recursive search (fallback)
      console.error(`[AqarMap] Direct extraction failed, trying recursive search`);
      for (const [key, val] of Object.entries(pageProps)) {
        if (val && typeof val === "object") {
          if (Array.isArray(val)) {
            console.error(`[AqarMap]   pageProps.${key}: Array[${val.length}]${val.length > 0 ? ` first item keys: ${Object.keys(val[0] || {}).join(", ")}` : ""}`);
          } else {
            console.error(`[AqarMap]   pageProps.${key}: Object keys: ${Object.keys(val as object).slice(0, 10).join(", ")}`);
          }
        }
      }

      const found = extractFromNextData(data);
      if (found.length > 0) {
        console.error(`[AqarMap] Recursive search: ${found.length} listings`);
        return done(found, "recursive");
      }
      console.error(`[AqarMap] __NEXT_DATA__ found but 0 listings extracted`);
    } catch (e) {
      console.error(`[AqarMap] __NEXT_DATA__ parse error: ${e instanceof Error ? e.message : e}`);
      console.error(`[AqarMap] __NEXT_DATA__ raw start: ${nextDataMatch[1].substring(0, 300)}`);
    }
  }

  // ═══ Strategy 2: JSON-LD structured data ═══
  const jsonLdMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const jm of jsonLdMatches) {
    try {
      const ld = JSON.parse(jm[1]);
      if (ld["@type"] === "ItemList" && ld.itemListElement) {
        const listings = parseJsonLdItemList(ld);
        if (listings.length > 0) {
          console.error(`[AqarMap] JSON-LD ItemList: ${listings.length} listings`);
          return done(listings, "jsonld");
        }
      }
    } catch { /* skip */ }
  }

  // ═══ Strategy 3: Embedded JSON from script tags ═══
  const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  for (const sm of scriptMatches) {
    const scriptContent = sm[1].trim();
    const jsonMatch = scriptContent.match(/(?:listings|properties|results|items)\s*[=:]\s*(\[[\s\S]*?\])/i);
    if (jsonMatch) {
      try {
        const arr = JSON.parse(jsonMatch[1]);
        if (Array.isArray(arr) && arr.length > 0 && (arr[0].title || arr[0].name || arr[0].id)) {
          const listings = parseAqarmapJson({ data: arr });
          if (listings.length > 0) {
            console.error(`[AqarMap] Script JSON array: ${listings.length} listings`);
            return done(listings, "script_json");
          }
        }
      } catch { /* skip */ }
    }
  }

  // ═══ Strategy 4: HTML regex (fallback) ═══
  const listings = parseAqarmapHtml(html);
  if (listings.length > 0) {
    console.error(`[AqarMap] HTML regex: ${listings.length} listings`);
    return done(listings, "html_regex");
  }

  // ═══ All strategies failed — dump debug info ═══
  debug.hrefSamples = [...html.matchAll(/href="([^"]{20,100})"/gi)]
    .slice(0, 30)
    .map(m => m[1]);
  console.error(`[AqarMap] DEBUG href samples:`, JSON.stringify(debug.hrefSamples));

  debug.relevantClasses = [...html.matchAll(/class="([^"]{5,80})"/gi)]
    .map(m => m[1])
    .filter(c => /card|list|item|unit|property|result|price|title/i.test(c))
    .slice(0, 20);
  console.error(`[AqarMap] DEBUG relevant classes:`, JSON.stringify(debug.relevantClasses));

  if (html.includes("__NEXT_DATA__")) console.error("[AqarMap] DEBUG: __NEXT_DATA__ tag present but extraction failed");
  if (html.includes("react-root") || html.includes("__next")) console.error("[AqarMap] DEBUG: React/Next.js SPA detected");

  console.error(`[AqarMap] Final result: 0 listings parsed from ${html.length} bytes`);
  return done([], "none");
}

// ═══ Convert a single Aqarmap item to ListPageListing ═══
function convertAqarmapItem(item: any): ListPageListing | null {
  if (!item || typeof item !== "object") return null;

  const title = String(item.title || item.name || "").trim();
  const id = item.id || item.listing_id;
  if (!title && !id) return null;

  // Build URL
  let url = "";
  if (item.url) url = String(item.url);
  else if (item.link) url = String(item.link);
  else if (item.slug) url = `${AQARMAP_BASE}/ar/${item.slug}`;
  else if (id) url = `${AQARMAP_BASE}/ar/listing/${id}`;
  if (!url) return null;
  if (!url.startsWith("http")) url = `${AQARMAP_BASE}${url}`;

  // Price — could be number, string, or nested { value, currency }
  let price: number | null = null;
  const rawPrice = item.price ?? item.salePrice ?? item.rentPrice;
  if (rawPrice !== undefined && rawPrice !== null) {
    if (typeof rawPrice === "number") price = rawPrice;
    else if (typeof rawPrice === "object") price = parsePrice(String((rawPrice as any).value ?? (rawPrice as any).amount ?? ""));
    else price = parsePrice(String(rawPrice));
  }

  // Location — could be string or nested { city: { name }, area: { name } }
  const cityName = item.city?.name || item.location?.city || item.cityName || "";
  const areaName = item.area?.name || item.neighborhood || item.district || item.areaName || "";
  const location = [areaName, cityName].filter(Boolean).join(", ");

  // Thumbnail — could be in photos array, mainPhoto, or image
  const thumbnailUrl =
    item.photos?.[0]?.url || item.photos?.[0]?.file ||
    item.mainPhoto?.url || item.mainPhoto?.file ||
    (typeof item.mainPhoto === "string" ? item.mainPhoto : null) ||
    item.image || item.thumbnail || item.coverPhoto || null;

  // Enrich title with area/rooms
  let enrichedTitle = title || `عقار #${id}`;
  const space = item.space || item.area_sqm || item.size;
  const rooms = item.rooms || item.bedrooms;
  if (space && !enrichedTitle.includes("م²")) enrichedTitle += ` — ${space} م²`;
  if (rooms && !enrichedTitle.includes("غرف")) enrichedTitle += ` — ${rooms} غرف`;

  // Seller info
  const sellerName = item.user?.name || item.owner?.name || item.agent?.name || null;
  const sellerIsAgent = item.user?.type === "broker" || item.user?.type === "agent" ||
    item.owner?.type === "broker" || !!item.agent;

  return {
    url,
    title: enrichedTitle,
    price,
    currency: "EGP",
    thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : null,
    location,
    dateText: String(item.created_at || item.createdAt || item.publishedAt || item.date || ""),
    sellerName: cleanSellerName(sellerName),
    sellerProfileUrl: null,
    sellerAvatarUrl: null,
    isVerified: !!(item.isVerified || item.is_verified || item.verified || item.user?.isVerified),
    isBusiness: sellerIsAgent || !!(item.is_broker || item.isBroker || item.is_company),
    isFeatured: !!(item.isFeatured || item.is_featured || item.featured || item.isPremium),
    supportsExchange: false,
    isNegotiable: !!(item.isNegotiable || item.is_negotiable || item.negotiable),
    category: "properties",
    isLikelyBuyRequest: detectBuyRequest(enrichedTitle),
    detectedBuyerPhone: null,
  };
}

// ═══ __NEXT_DATA__ recursive extractor (fallback) ═══
function extractFromNextData(nextData: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Recursively search for arrays of listing-like objects
  function findListings(obj: unknown, depth = 0): void {
    if (depth > 10 || listings.length > 100) return;
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      // Check if this looks like a listings array
      if (obj.length > 0 && isLikelyListing(obj[0])) {
        for (const item of obj) {
          const listing = convertAqarmapItem(item);
          if (listing) listings.push(listing);
        }
        return;
      }
      // Recurse into array items
      for (const item of obj) {
        findListings(item, depth + 1);
      }
      return;
    }

    // Object — check known keys first
    const record = obj as Record<string, unknown>;
    const knownKeys = ["listings", "properties", "results", "items", "data", "units",
      "searchResults", "listingCards", "pageProps", "dehydratedState", "queries"];
    for (const key of knownKeys) {
      if (record[key]) {
        findListings(record[key], depth + 1);
        if (listings.length > 0) return;
      }
    }

    // Recurse into all keys
    for (const [key, value] of Object.entries(record)) {
      if (knownKeys.includes(key)) continue; // Already checked
      if (typeof value === "object" && value !== null) {
        findListings(value, depth + 1);
        if (listings.length > 0) return;
      }
    }
  }

  try {
    // Start from pageProps (Next.js standard)
    const props = (nextData as any)?.props?.pageProps;
    if (props) {
      console.error(`[AqarMap] pageProps keys: ${Object.keys(props).join(", ")}`);
      findListings(props);
    }
    if (listings.length === 0) {
      // Try full nextData
      findListings(nextData);
    }
  } catch (e) {
    console.error(`[AqarMap] __NEXT_DATA__ traversal error: ${e}`);
  }

  return listings;
}

function isLikelyListing(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  // Must have at least a title/name and some property-related field
  const hasTitle = !!(obj.title || obj.name || obj.slug);
  const hasProperty = !!(obj.price || obj.area || obj.rooms || obj.bedrooms ||
    obj.location || obj.address || obj.id || obj.listing_id ||
    obj.propertyType || obj.property_type);
  return hasTitle || hasProperty;
}

// ═══ JSON-LD parser ═══
function parseJsonLdItemList(ld: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = ld.itemListElement as Array<Record<string, unknown>>;
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const actual = (item.item || item) as Record<string, unknown>;
    const title = String(actual.name || actual.title || "").trim();
    const url = String(actual.url || actual["@id"] || "");
    if (!title || !url) continue;

    let price: number | null = null;
    const offers = actual.offers as Record<string, unknown>;
    if (offers?.price) price = parsePrice(String(offers.price));

    const address = actual.address as Record<string, unknown>;
    const location = address ? String(address.addressLocality || address.streetAddress || "") : "";

    const image = actual.image;
    const thumbnailUrl = typeof image === "string" ? image :
      Array.isArray(image) ? image[0] : (image as any)?.url || null;

    listings.push({
      url: url.startsWith("http") ? url : `${AQARMAP_BASE}${url}`,
      title,
      price,
      currency: "EGP",
      thumbnailUrl,
      location,
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

  return listings;
}

// ═══ HTML regex parser (fallback) ═══
function parseAqarmapHtml(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Match any aqarmap property URL pattern
  const cardPattern = /href="((?:https?:\/\/aqarmap\.com\.eg)?\/(?:ar|en)\/(?:listing|property|for-sale|for-rent|sale|rent|عقارات|شقق|فيلات)[^"]*\d+[^"]*)"/gi;
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
      /class="[^"]*(?:listing-title|property-title|card-title|unit-title|search-card-title|listing__title)[^"]*"[^>]*>([^<]+)/i,
      /data-testid="[^"]*title[^"]*"[^>]*>([^<]+)/i,
      /aria-label="([^"]+)"/i,
      /<h[234][^>]*class="[^"]*"[^>]*>([^<]+)<\/h[234]>/i,
      /<h[234][^>]*>([^<]+)<\/h[234]>/i,
      /title="([^"]{10,})"/i,
    ]);
    if (!title) continue;

    const priceText = extractText(context, [
      /class="[^"]*(?:price|listing-price|unit-price|search-card-price|listing__price)[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
      /data-testid="[^"]*price[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/i,
    ]);

    const location = extractText(context, [
      /class="[^"]*(?:location|address|area-name|unit-location|search-card-location|listing__location)[^"]*"[^>]*>([^<]+)/i,
      /data-testid="[^"]*location[^"]*"[^>]*>([^<]+)/i,
    ]);

    const area = extractText(context, [/(\d[\d,]*)\s*(?:م²|sqm|m²|متر)/i]);
    const rooms = extractText(context, [/(\d+)\s*(?:غرف|rooms|bedrooms|غرفة)/i]);

    const thumbnailUrl = extractImage(context, [
      /src="(https?:\/\/[^"]*aqarmap[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
    ]);

    let enrichedTitle = title.trim();
    if (area && !enrichedTitle.includes("م²") && !enrichedTitle.includes("sqm")) enrichedTitle += ` — ${area} م²`;
    if (rooms && !enrichedTitle.includes("غرف") && !enrichedTitle.includes("room")) enrichedTitle += ` — ${rooms} غرف`;

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
      isLikelyBuyRequest: detectBuyRequest(title, context),
      detectedBuyerPhone: null,
    });
  }

  // Broader fallback — any aqarmap link with a numeric ID
  if (listings.length === 0) {
    const broadPattern = /href="((?:https?:\/\/aqarmap\.com\.eg)?\/[^"]*\/\d+[^"]*)"/gi;
    while ((match = broadPattern.exec(html)) !== null) {
      const rawUrl = match[1];
      const url = rawUrl.startsWith("http") ? rawUrl : `${AQARMAP_BASE}${rawUrl}`;
      if (seenUrls.has(url) || !url.includes("aqarmap")) continue;
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

  // Try __NEXT_DATA__ for detail page too
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const props = nextData?.props?.pageProps;
      if (props) {
        const listing = props.listing || props.property || props.unit || props;
        if (listing.description) result.description = String(listing.description);
        if (listing.images && Array.isArray(listing.images)) {
          for (const img of listing.images) {
            const url = typeof img === "string" ? img : img?.url || img?.src || img?.file;
            if (url) result.allImageUrls.push(String(url));
          }
        }
        if (listing.photos && Array.isArray(listing.photos)) {
          for (const p of listing.photos) {
            const url = typeof p === "string" ? p : p?.url || p?.file;
            if (url) result.allImageUrls.push(String(url));
          }
        }
        result.mainImageUrl = result.allImageUrls[0] || "";
        const specFields = ["area", "rooms", "bedrooms", "bathrooms", "floor", "finishing", "type", "payment_method", "propertyType"];
        for (const field of specFields) {
          if (listing[field]) result.specifications[field] = String(listing[field]);
        }
        if (listing.agent || listing.seller) {
          const agent = listing.agent || listing.seller;
          result.sellerName = cleanSellerName(String(agent.name || agent.displayName || ""));
          result.sellerProfileUrl = agent.url || agent.profileUrl || null;
        }
        return result;
      }
    } catch { /* fall through */ }
  }

  // HTML fallback
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

  const profileMatch = html.match(/href="(\/(?:ar|en)\/(?:agent|broker|company)\/[^"]+)"/i);
  if (profileMatch) result.sellerProfileUrl = `${AQARMAP_BASE}${profileMatch[1]}`;

  return result;
}

// ═══ Helpers ═══

function parseAqarmapJson(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = (json.data || json.results || json.properties || json.listings || json.units || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const listing = convertAqarmapItem(item);
    if (listing) listings.push(listing);
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
