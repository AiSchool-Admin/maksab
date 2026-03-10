/**
 * Dubizzle.com.eg Parser
 * يحلل صفحات القوائم وصفحات التفاصيل من دوبيزل مصر
 *
 * استراتيجية متعددة المستويات:
 * 1. JSON API (الأسرع والأكثر موثوقية)
 * 2. __NEXT_DATA__ من HTML (بديل)
 * 3. HTML regex parsing (آخر محاولة)
 */

export interface ListPageListing {
  url: string;
  title: string;
  price: number | null;
  currency: string;
  thumbnailUrl: string | null;
  location: string;
  dateText: string;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  sellerAvatarUrl: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isFeatured: boolean;
  supportsExchange: boolean;
  isNegotiable: boolean;
  category: string | null;
}

export interface ListingDetails {
  description: string;
  mainImageUrl: string;
  allImageUrls: string[];
  specifications: Record<string, string>;
  condition: string | null;
  paymentMethod: string | null;
  hasWarranty: boolean;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  sellerMemberSince: string | null;
}

// ═══ Request headers that mimic a real browser ═══
export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
};

// API-style headers for JSON requests
export const API_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Referer: "https://www.dubizzle.com.eg/",
  Origin: "https://www.dubizzle.com.eg",
};

/**
 * Build the Dubizzle search API URL from a scope's base URL
 * Dubizzle Egypt uses an internal API that returns JSON
 */
export function buildApiUrl(
  baseUrl: string,
  page: number,
  pageSize: number = 20
): string {
  // Extract category and location from URL
  // e.g., https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/
  const urlObj = new URL(baseUrl);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);

  // Build the API search URL
  // Dubizzle Egypt (OLX) uses various API patterns
  const apiBase = "https://www.dubizzle.com.eg/api/relevance/v4/search/";
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  // Map the path to category filter
  if (pathParts.length > 0) {
    params.set("category", pathParts.join("/"));
  }

  return `${apiBase}?${params.toString()}`;
}

/**
 * Parse a Dubizzle listing page — multi-strategy
 * 1. Try JSON API response
 * 2. Try __NEXT_DATA__ extraction
 * 3. Fall back to HTML regex
 */
export function parseDubizzleList(html: string): ListPageListing[] {
  // Strategy 1: Check if response is JSON (API response)
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseJsonListings(json);
    } catch {
      // Not valid JSON, continue
    }
  }

  // Strategy 2: Extract __NEXT_DATA__ from HTML
  const nextDataMatch = html.match(
    /<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const listings = extractFromNextData(nextData);
      if (listings.length > 0) return listings;
    } catch {
      // Invalid __NEXT_DATA__, continue
    }
  }

  // Strategy 3: Extract JSON-LD structured data
  const jsonLdListings = extractJsonLd(html);
  if (jsonLdListings.length > 0) return jsonLdListings;

  // Strategy 4: HTML regex parsing (legacy fallback)
  return parseHtmlListings(html);
}

/**
 * Parse JSON API response from Dubizzle
 * Expected format: { results: [...], total: N, ... }
 */
function parseJsonListings(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // OLX/Dubizzle API returns { data: [...] } or { results: [...] }
  const items =
    (json.data as unknown[]) ||
    (json.results as unknown[]) ||
    (json.ads as unknown[]) ||
    (json.items as unknown[]) ||
    [];

  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const ad = item as Record<string, unknown>;
    if (!ad) continue;

    const title =
      (ad.title as string) ||
      (ad.name as string) ||
      ((ad.display_title as string) || "");
    if (!title) continue;

    // Extract price
    let price: number | null = null;
    if (ad.price) {
      if (typeof ad.price === "number") {
        price = ad.price;
      } else if (typeof ad.price === "object") {
        const priceObj = ad.price as Record<string, unknown>;
        price =
          (priceObj.value as number) ||
          (priceObj.amount as number) ||
          parseFloat(String(priceObj.display || "0").replace(/[,٬]/g, "")) ||
          null;
      } else {
        price = parseFloat(String(ad.price).replace(/[,٬]/g, "")) || null;
      }
    }

    // Extract URL
    const adUrl =
      (ad.url as string) ||
      (ad.absolute_url as string) ||
      (ad.slug ? `https://www.dubizzle.com.eg/${ad.slug}` : "") ||
      (ad.id
        ? `https://www.dubizzle.com.eg/listing/${ad.id}`
        : "");
    if (!adUrl) continue;

    const fullUrl = adUrl.startsWith("http")
      ? adUrl
      : `https://www.dubizzle.com.eg${adUrl}`;

    // Extract thumbnail
    let thumbnailUrl: string | null = null;
    if (ad.images && Array.isArray(ad.images) && (ad.images as unknown[]).length > 0) {
      const firstImg = (ad.images as Record<string, unknown>[])[0];
      thumbnailUrl =
        (firstImg?.url as string) ||
        (firstImg?.src as string) ||
        (firstImg?.thumbnail as string) ||
        (firstImg as unknown as string) ||
        null;
    } else if (ad.image) {
      const img = ad.image as Record<string, unknown>;
      thumbnailUrl =
        (typeof img === "string" ? img : null) ||
        (img?.url as string) ||
        (img?.src as string) ||
        null;
    } else if (ad.thumbnail) {
      thumbnailUrl = ad.thumbnail as string;
    } else if (ad.main_photo) {
      thumbnailUrl = ad.main_photo as string;
    }

    // Extract location
    let location = "";
    if (ad.locations_resolved) {
      const locs = ad.locations_resolved as Record<string, unknown>;
      const names = Object.values(locs)
        .map((l) => (l as Record<string, unknown>)?.name_ar || (l as Record<string, unknown>)?.name)
        .filter(Boolean);
      location = names.join("، ");
    } else if (ad.location) {
      if (typeof ad.location === "string") {
        location = ad.location;
      } else {
        const loc = ad.location as Record<string, unknown>;
        location =
          (loc.region_name_ar as string) ||
          (loc.city_name_ar as string) ||
          (loc.name as string) ||
          "";
      }
    }

    // Extract date
    let dateText = "";
    if (ad.created_at || ad.date) {
      dateText = (ad.created_at as string) || (ad.date as string) || "";
    } else if (ad.display_date) {
      dateText = ad.display_date as string;
    }

    // Extract seller info
    let sellerName: string | null = null;
    let sellerProfileUrl: string | null = null;
    let isVerified = false;
    let isBusiness = false;

    if (ad.user) {
      const user = ad.user as Record<string, unknown>;
      sellerName = (user.name as string) || (user.display_name as string) || null;
      if (user.id) {
        sellerProfileUrl = `https://www.dubizzle.com.eg/profile/${user.id}`;
      }
      isVerified = !!(user.is_verified || user.verified);
      isBusiness = !!(
        user.is_business ||
        user.account_type === "business" ||
        user.is_dealer
      );
    }

    listings.push({
      url: fullUrl,
      title,
      price,
      currency: "EGP",
      thumbnailUrl,
      location,
      dateText,
      sellerName,
      sellerProfileUrl,
      sellerAvatarUrl: null,
      isVerified,
      isBusiness,
      isFeatured: !!(ad.is_featured || ad.featured || ad.is_promoted),
      supportsExchange:
        title.includes("تبادل") ||
        title.includes("بدل") ||
        !!(ad.exchange_enabled),
      isNegotiable:
        !!(ad.is_negotiable || ad.negotiable) ||
        title.includes("قابل للتفاوض"),
      category: (ad.category_name as string) || null,
    });
  }

  return listings;
}

/**
 * Extract listings from __NEXT_DATA__ (Next.js server-rendered pages)
 */
function extractFromNextData(nextData: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];

  try {
    // Navigate the __NEXT_DATA__ structure
    const props = nextData.props as Record<string, unknown>;
    if (!props) return [];

    const pageProps = props.pageProps as Record<string, unknown>;
    if (!pageProps) return [];

    // Look for listing data in various possible locations
    const possibleKeys = [
      "listings",
      "ads",
      "results",
      "searchResults",
      "data",
      "items",
      "initialData",
      "dehydratedState",
    ];

    let items: unknown[] = [];

    for (const key of possibleKeys) {
      const value = pageProps[key];
      if (Array.isArray(value) && value.length > 0) {
        items = value;
        break;
      }
      if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        // Check nested data
        for (const subKey of ["data", "results", "items", "ads"]) {
          if (Array.isArray(obj[subKey])) {
            items = obj[subKey] as unknown[];
            break;
          }
        }
        if (items.length > 0) break;
      }
    }

    // Also check dehydratedState (React Query)
    if (items.length === 0 && pageProps.dehydratedState) {
      const dehydrated = pageProps.dehydratedState as Record<string, unknown>;
      const queries = dehydrated.queries as unknown[];
      if (Array.isArray(queries)) {
        for (const query of queries) {
          const q = query as Record<string, unknown>;
          const state = q.state as Record<string, unknown>;
          if (state?.data) {
            const data = state.data as Record<string, unknown>;
            const possibleArrays = [data.data, data.results, data.items, data.ads];
            for (const arr of possibleArrays) {
              if (Array.isArray(arr) && arr.length > 0) {
                items = arr;
                break;
              }
            }
          }
          if (items.length > 0) break;
        }
      }
    }

    // Parse items using the same JSON parser
    if (items.length > 0) {
      return parseJsonListings({ data: items });
    }
  } catch {
    // Failed to extract
  }

  return listings;
}

/**
 * Extract JSON-LD structured data
 */
function extractJsonLd(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  const jsonLdPattern =
    /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonLd = JSON.parse(match[1]);

      // ItemList schema
      if (jsonLd["@type"] === "ItemList" && Array.isArray(jsonLd.itemListElement)) {
        for (const item of jsonLd.itemListElement) {
          const product = item.item || item;
          if (!product.name) continue;

          listings.push({
            url: product.url || "",
            title: product.name,
            price: product.offers?.price
              ? parseFloat(String(product.offers.price))
              : null,
            currency: product.offers?.priceCurrency || "EGP",
            thumbnailUrl: product.image || null,
            location: product.contentLocation?.name || "",
            dateText: product.datePublished || "",
            sellerName: product.seller?.name || null,
            sellerProfileUrl: null,
            sellerAvatarUrl: null,
            isVerified: false,
            isBusiness: false,
            isFeatured: false,
            supportsExchange: false,
            isNegotiable: false,
            category: null,
          });
        }
      }

      // Array of Product schemas
      if (Array.isArray(jsonLd)) {
        for (const item of jsonLd) {
          if (item["@type"] === "Product" && item.name) {
            listings.push({
              url: item.url || item["@id"] || "",
              title: item.name,
              price: item.offers?.price
                ? parseFloat(String(item.offers.price))
                : null,
              currency: item.offers?.priceCurrency || "EGP",
              thumbnailUrl: item.image || null,
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
            });
          }
        }
      }
    } catch {
      // Invalid JSON-LD
    }
  }

  return listings;
}

/**
 * Parse a Dubizzle detail page — HTML only
 */
export function parseDubizzleDetail(html: string): ListingDetails {
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

  // Check for __NEXT_DATA__ first
  const nextDataMatch = html.match(
    /<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const detailFromNext = extractDetailFromNextData(nextData);
      if (detailFromNext) return detailFromNext;
    } catch {
      // Fall through to HTML parsing
    }
  }

  // Check for JSON response
  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      const detailFromJson = extractDetailFromJson(json);
      if (detailFromJson) return detailFromJson;
    } catch {
      // Fall through
    }
  }

  // HTML fallback — Extract description
  const descPatterns = [
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*data-testid="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
  ];
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match) {
      result.description = match[1].replace(/<[^>]+>/g, "").trim();
      break;
    }
  }

  // Extract images
  const imgMatches = html.matchAll(
    /src="(https:\/\/images\.dubizzle\.com\.eg\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
  );
  for (const match of imgMatches) {
    if (!result.allImageUrls.includes(match[1])) {
      result.allImageUrls.push(match[1]);
    }
  }

  if (result.allImageUrls.length === 0) {
    const fallbackImgs = html.matchAll(
      /src="(https?:\/\/[^"]*(?:dubizzle|olx|classistatic)[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
    );
    for (const match of fallbackImgs) {
      if (!result.allImageUrls.includes(match[1])) {
        result.allImageUrls.push(match[1]);
      }
    }
  }

  result.mainImageUrl = result.allImageUrls[0] || "";

  // Extract specifications table
  const specPatterns = [
    /<(?:li|tr)[^>]*>\s*<(?:span|td|th)[^>]*>([^<]+)<\/(?:span|td|th)>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>/gi,
    /<[^>]*data-testid="[^"]*spec[^"]*"[^>]*>\s*<[^>]*>([^<]+)<\/[^>]*>\s*<[^>]*>([^<]+)<\/[^>]*>/gi,
  ];
  for (const pattern of specPatterns) {
    let specMatch;
    while ((specMatch = pattern.exec(html)) !== null) {
      const key = specMatch[1].replace(/<[^>]+>/g, "").trim();
      const value = specMatch[2].replace(/<[^>]+>/g, "").trim();
      if (key && value && key !== value) {
        result.specifications[key] = value;
      }
    }
  }

  result.condition =
    result.specifications["الحالة"] ||
    result.specifications["Condition"] ||
    null;

  // Extract seller
  const sellerNamePatterns = [
    /<[^>]*class="[^"]*seller[^"]*name[^"]*"[^>]*>([^<]+)</i,
    /<[^>]*data-testid="[^"]*seller[^"]*"[^>]*>([^<]+)</i,
  ];
  for (const pattern of sellerNamePatterns) {
    const match = html.match(pattern);
    if (match) {
      result.sellerName = match[1].trim();
      break;
    }
  }

  const profileMatch = html.match(/href="(\/(?:ar\/)?profile\/[^"]+)"/i);
  if (profileMatch) {
    result.sellerProfileUrl = `https://www.dubizzle.com.eg${profileMatch[1]}`;
  }

  const memberMatch = html.match(/(?:عضو منذ|member since)[^<]*(\d{4})/i);
  if (memberMatch) result.sellerMemberSince = memberMatch[1];

  result.hasWarranty =
    result.description.includes("ضمان") ||
    result.description.includes("warranty") ||
    result.specifications["الضمان"] === "نعم";

  return result;
}

/**
 * Extract detail from __NEXT_DATA__
 */
function extractDetailFromNextData(
  nextData: Record<string, unknown>
): ListingDetails | null {
  try {
    const props = nextData.props as Record<string, unknown>;
    const pageProps = props?.pageProps as Record<string, unknown>;
    if (!pageProps) return null;

    const ad =
      (pageProps.ad as Record<string, unknown>) ||
      (pageProps.listing as Record<string, unknown>) ||
      (pageProps.data as Record<string, unknown>);
    if (!ad) return null;

    return extractDetailFromJson(ad);
  } catch {
    return null;
  }
}

/**
 * Extract detail from JSON object
 */
function extractDetailFromJson(
  ad: Record<string, unknown>
): ListingDetails | null {
  if (!ad.title && !ad.description && !ad.name) return null;

  const result: ListingDetails = {
    description: (ad.description as string) || (ad.body as string) || "",
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

  // Images
  if (ad.images && Array.isArray(ad.images)) {
    for (const img of ad.images as Record<string, unknown>[]) {
      const url =
        (typeof img === "string" ? img : null) ||
        (img?.url as string) ||
        (img?.src as string) ||
        (img?.full as string);
      if (url) result.allImageUrls.push(url);
    }
  }
  if (ad.photos && Array.isArray(ad.photos)) {
    for (const photo of ad.photos as Record<string, unknown>[]) {
      const url =
        (typeof photo === "string" ? photo : null) ||
        (photo?.url as string) ||
        (photo?.src as string);
      if (url) result.allImageUrls.push(url);
    }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // Specifications
  if (ad.parameters && Array.isArray(ad.parameters)) {
    for (const param of ad.parameters as Record<string, unknown>[]) {
      const key = (param.label as string) || (param.name as string);
      const val = (param.value_label as string) || (param.value as string);
      if (key && val) result.specifications[key] = val;
    }
  }
  if (ad.attributes && typeof ad.attributes === "object") {
    const attrs = ad.attributes as Record<string, unknown>;
    for (const [key, val] of Object.entries(attrs)) {
      if (typeof val === "string") result.specifications[key] = val;
    }
  }

  result.condition =
    result.specifications["الحالة"] ||
    result.specifications["Condition"] ||
    (ad.condition as string) ||
    null;

  // Seller
  if (ad.user) {
    const user = ad.user as Record<string, unknown>;
    result.sellerName =
      (user.name as string) || (user.display_name as string) || null;
    if (user.id) {
      result.sellerProfileUrl = `https://www.dubizzle.com.eg/profile/${user.id}`;
    }
    result.sellerMemberSince = (user.created as string) || null;
  }

  result.hasWarranty =
    result.description.includes("ضمان") ||
    result.specifications["الضمان"] === "نعم";

  return result;
}

// ═══ Legacy HTML Parser (Fallback) ═══

function parseHtmlListings(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Match listing links — dubizzle URL pattern
  const linkPattern =
    /href="((?:https?:\/\/(?:www\.)?dubizzle\.com\.eg)?\/(?:ar\/)?[a-z\-]+\/[a-z\-]+\/[^"]+)"/g;
  let linkMatch;
  const seenUrls = new Set<string>();

  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const url = linkMatch[1].startsWith("http")
      ? linkMatch[1]
      : `https://www.dubizzle.com.eg${linkMatch[1]}`;

    if (
      seenUrls.has(url) ||
      url.includes("/search") ||
      url.includes("/login") ||
      url.includes("/signup")
    )
      continue;
    seenUrls.add(url);

    const start = Math.max(0, linkMatch.index - 500);
    const end = Math.min(html.length, linkMatch.index + 2000);
    const context = html.slice(start, end);

    const title = extractFromContext(context, [
      /aria-label="([^"]+)"/,
      /title="([^"]+)"/,
      /<h2[^>]*>([^<]+)<\/h2>/,
      /<h3[^>]*>([^<]+)<\/h3>/,
      /data-testid="[^"]*title[^"]*"[^>]*>([^<]+)</i,
    ]);

    if (!title) continue;

    const priceText = extractFromContext(context, [
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/,
      /price[^>]*>([^<]*\d[^<]*)</i,
    ]);

    const locationText = extractFromContext(context, [
      /location[^>]*>([^<]+)</i,
      /address[^>]*>([^<]+)</i,
    ]);

    const dateText = extractFromContext(context, [
      /(?:منذ|ago)[^<]*/i,
      /time[^>]*>([^<]+)</i,
    ]);

    const sellerName = extractFromContext(context, [
      /seller[^>]*name[^>]*>([^<]+)</i,
    ]);

    let sellerProfileUrl: string | null = null;
    const profileUrlMatch = context.match(
      /href="(\/(?:ar\/)?profile\/[^"]+)"/i
    );
    if (profileUrlMatch) {
      sellerProfileUrl = `https://www.dubizzle.com.eg${profileUrlMatch[1]}`;
    }

    const thumbnailUrl = extractImageFromContext(context);

    listings.push({
      url,
      title,
      price: priceText
        ? parseFloat(priceText.replace(/[,٬]/g, ""))
        : null,
      currency: "EGP",
      thumbnailUrl,
      location: locationText || "",
      dateText: dateText || "",
      sellerName: sellerName || null,
      sellerProfileUrl,
      sellerAvatarUrl: null,
      isVerified:
        context.includes("verified") || context.includes("موثق"),
      isBusiness:
        context.includes("business") || context.includes("متجر"),
      isFeatured:
        context.includes("featured") ||
        context.includes("مميز") ||
        context.includes("promoted"),
      supportsExchange:
        context.includes("متوفر التبادل") ||
        context.includes("تبادل") ||
        context.includes("بدل"),
      isNegotiable:
        context.includes("قابل للتفاوض") ||
        context.includes("negotiable"),
      category: null,
    });
  }

  return listings;
}

function extractFromContext(
  context: string,
  patterns: RegExp[]
): string | null {
  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) {
      return (match[1] || match[0]).replace(/<[^>]+>/g, "").trim();
    }
  }
  return null;
}

function extractImageFromContext(context: string): string | null {
  const dubizzleMatch = context.match(
    /src="(https:\/\/images\.dubizzle\.com\.eg\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i
  );
  if (dubizzleMatch) return dubizzleMatch[1];

  const match = context.match(
    /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i
  );
  return match ? match[1] : null;
}
