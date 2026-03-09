/**
 * Dubizzle.com.eg Parser
 * يحلل صفحات القوائم وصفحات التفاصيل من دوبيزل مصر
 * يدعم 4 استراتيجيات: __NEXT_DATA__ → JSON-LD → inline state → HTML regex
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
  sellerPhone: string | null;
}

/**
 * Parse a Dubizzle listing page (search results)
 * Supports multiple parsing strategies for resilience
 */
export function parseDubizzleList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Strategy 1: Extract from __NEXT_DATA__ JSON (Next.js SSR)
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const pageProps = data?.props?.pageProps;

      // Try multiple possible data paths (dubizzle changes structure)
      const results =
        pageProps?.searchResult?.results ||
        pageProps?.searchResult?.data ||
        pageProps?.listings ||
        pageProps?.ads ||
        pageProps?.searchData?.results ||
        pageProps?.initialData?.results ||
        [];

      // Handle nested arrays
      const adsArray = Array.isArray(results)
        ? results
        : (results?.ads || results?.data || []);

      for (const item of adsArray) {
        const listing = parseNextDataListing(item);
        if (listing) listings.push(listing);
      }

      if (listings.length > 0) return listings;

      // Try dehydrated state (React Query pattern)
      if (pageProps?.dehydratedState?.queries) {
        for (const query of pageProps.dehydratedState.queries) {
          const queryData = query?.state?.data;
          const items =
            queryData?.results || queryData?.ads || queryData?.data || [];
          const queryItems = Array.isArray(items) ? items : [];
          for (const item of queryItems) {
            const listing = parseNextDataListing(item);
            if (listing) listings.push(listing);
          }
        }
        if (listings.length > 0) return listings;
      }
    } catch {
      // Fall through to other strategies
    }
  }

  // Strategy 2: Parse structured data (JSON-LD)
  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  );
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "ItemList" && data.itemListElement) {
        for (const item of data.itemListElement) {
          const listing = parseJsonLdListing(item);
          if (listing) listings.push(listing);
        }
      }
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item["@type"] === "Product" || item["@type"] === "Offer") {
            const listing = parseJsonLdListing(item);
            if (listing) listings.push(listing);
          }
        }
      }
    } catch {
      continue;
    }
  }

  if (listings.length > 0) return listings;

  // Strategy 3: Parse inline JSON state
  const inlineDataPatterns = [
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/,
    /window\.__DATA__\s*=\s*({[\s\S]*?});\s*<\/script>/,
    /window\.searchResults\s*=\s*({[\s\S]*?});\s*<\/script>/,
  ];

  for (const pattern of inlineDataPatterns) {
    const inlineMatch = html.match(pattern);
    if (inlineMatch) {
      try {
        const data = JSON.parse(inlineMatch[1]);
        const items =
          data?.search?.results || data?.listings || data?.ads || [];
        for (const item of items) {
          const listing = parseNextDataListing(item);
          if (listing) listings.push(listing);
        }
        if (listings.length > 0) return listings;
      } catch {
        continue;
      }
    }
  }

  // Strategy 4: Regex-based HTML parsing (fallback)
  return parseHtmlListings(html);
}

/**
 * Parse a JSON API response from Dubizzle
 */
export function parseDubizzleApiResponse(
  json: unknown
): ListPageListing[] {
  const listings: ListPageListing[] = [];

  if (!json || typeof json !== "object") return listings;

  const data = json as Record<string, unknown>;
  const results =
    (data.results as unknown[]) ||
    (data.ads as unknown[]) ||
    (data.data as unknown[]) ||
    ((data.searchResult as Record<string, unknown>)
      ?.results as unknown[]) ||
    [];

  for (const item of results) {
    const listing = parseNextDataListing(item as Record<string, unknown>);
    if (listing) listings.push(listing);
  }

  return listings;
}

/**
 * Parse a Dubizzle detail page
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
    sellerPhone: null,
  };

  // Try __NEXT_DATA__ first
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const pageProps = data?.props?.pageProps;
      const ad =
        pageProps?.ad ||
        pageProps?.listing ||
        pageProps?.adDetail ||
        pageProps?.item ||
        pageProps;

      // Also check dehydrated state
      const dehydratedAd =
        pageProps?.dehydratedState?.queries?.[0]?.state?.data;

      const source = ad?.id ? ad : dehydratedAd || ad;

      if (source) {
        result.description =
          source.description || source.body || source.text || "";

        // Images
        const images =
          source.images ||
          source.photos ||
          source.gallery ||
          source.media ||
          [];
        if (Array.isArray(images)) {
          result.allImageUrls = images
            .map((img: unknown) => {
              if (typeof img === "string") return img;
              if (typeof img === "object" && img !== null) {
                const o = img as Record<string, unknown>;
                return (o.url ||
                  o.src ||
                  o.uri ||
                  o.image ||
                  o.original ||
                  o.large ||
                  "") as string;
              }
              return "";
            })
            .filter((u: string) => u.length > 0);
        }
        result.mainImageUrl = result.allImageUrls[0] || "";

        // Specifications
        const attrs =
          source.attributes ||
          source.specifications ||
          source.details ||
          source.properties ||
          source.params ||
          source.extra_fields ||
          [];
        if (Array.isArray(attrs)) {
          for (const attr of attrs) {
            if (!attr) continue;
            const key = attr.label || attr.name || attr.key || attr.title;
            const value =
              attr.value || attr.value_name || attr.displayValue || attr.text;
            if (key && value) {
              result.specifications[String(key)] = String(value);
            }
          }
        } else if (typeof attrs === "object" && attrs !== null) {
          const attrsObj = attrs as Record<string, unknown>;
          for (const [k, v] of Object.entries(attrsObj)) {
            if (v !== null && v !== undefined) {
              result.specifications[k] = String(v);
            }
          }
        }

        // Condition
        result.condition =
          result.specifications["الحالة"] ||
          result.specifications["Condition"] ||
          result.specifications["condition"] ||
          source.condition ||
          null;

        // Seller info
        const seller =
          source.seller || source.user || source.owner || source.contact;
        if (seller && typeof seller === "object") {
          const s = seller as Record<string, unknown>;
          result.sellerName =
            (s.name || s.display_name || s.username || null) as string | null;
          result.sellerProfileUrl =
            (s.profile_url || s.url || s.link || null) as string | null;
          result.sellerMemberSince =
            (s.member_since ||
              s.created_at ||
              s.join_date ||
              null) as string | null;
          result.sellerPhone =
            (s.phone || s.mobile || s.phone_number || null) as string | null;
        }

        result.hasWarranty =
          (typeof result.description === "string" &&
            (result.description.includes("ضمان") ||
              result.description.includes("warranty"))) ||
          result.specifications["الضمان"] === "نعم" ||
          false;
      }
    } catch {
      // Fall through to HTML parsing
    }
  }

  // Fallback: HTML parsing for description
  if (!result.description) {
    const descPatterns = [
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*data-testid="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<section[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    ];
    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match) {
        result.description = match[1].replace(/<[^>]+>/g, "").trim();
        break;
      }
    }
  }

  // Fallback: HTML parsing for images
  if (result.allImageUrls.length === 0) {
    const imgMatches = html.matchAll(
      /src="(https:\/\/[^"]*(?:dubizzle|olx|classistatic)[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
    );
    for (const match of imgMatches) {
      if (!result.allImageUrls.includes(match[1])) {
        result.allImageUrls.push(match[1]);
      }
    }
    result.mainImageUrl = result.allImageUrls[0] || "";
  }

  // Fallback: extract seller phone from page
  if (!result.sellerPhone) {
    const phonePatterns = [
      /data-phone="(\+?2?0?1[0-25]\d{8})"/,
      /tel:(\+?2?0?1[0-25]\d{8})"/,
      /"phone"\s*:\s*"(\+?2?0?1[0-25]\d{8})"/,
    ];
    for (const pattern of phonePatterns) {
      const match = html.match(pattern);
      if (match) {
        result.sellerPhone = match[1];
        break;
      }
    }
  }

  return result;
}

// ═══ Helper Functions ═══

function parseNextDataListing(
  item: Record<string, unknown>
): ListPageListing | null {
  if (!item) return null;

  // Handle nested item structure
  const actualItem = (item.item || item.ad || item) as Record<
    string,
    unknown
  >;

  const url =
    (actualItem.url as string) ||
    (actualItem.absolute_url as string) ||
    (actualItem.link as string) ||
    (actualItem.href as string) ||
    (actualItem.slug ? `/${actualItem.slug}` : "") ||
    "";
  const title =
    (actualItem.title as string) ||
    (actualItem.name as string) ||
    (actualItem.subject as string) ||
    "";

  if (!url || !title) return null;

  const fullUrl = url.startsWith("http")
    ? url
    : `https://www.dubizzle.com.eg${url.startsWith("/") ? "" : "/"}${url}`;

  // Handle price
  const priceField = actualItem.price;
  let price: number | null = null;
  if (typeof priceField === "number") {
    price = priceField;
  } else if (typeof priceField === "string") {
    price = extractNumericPrice(priceField);
  } else if (typeof priceField === "object" && priceField !== null) {
    const p = priceField as Record<string, unknown>;
    price = extractNumericPrice(p.value ?? p.amount ?? p.price ?? p.raw);
  }

  // Seller info
  const seller = actualItem.seller as Record<string, unknown> | undefined;
  const user = actualItem.user as Record<string, unknown> | undefined;
  const sellerInfo = seller || user;

  // Location
  let location = "";
  const locationField =
    actualItem.location || actualItem.locations || actualItem.area;
  if (typeof locationField === "string") {
    location = locationField;
  } else if (typeof locationField === "object" && locationField !== null) {
    const loc = locationField as Record<string, unknown>;
    location = (loc.name || loc.city || loc.area || loc.display || "") as string;
    if (loc.parent && typeof loc.parent === "object") {
      const parent = loc.parent as Record<string, unknown>;
      if (parent.name) location = `${location}, ${parent.name}`;
    }
  }

  // Date
  const dateText =
    (actualItem.created_at as string) ||
    (actualItem.date as string) ||
    (actualItem.age as string) ||
    (actualItem.published_at as string) ||
    (actualItem.created as string) ||
    "";

  // Thumbnail
  let thumbnailUrl: string | null = null;
  const imageField =
    actualItem.thumbnail || actualItem.image || actualItem.cover || actualItem.photo;
  if (typeof imageField === "string") {
    thumbnailUrl = imageField;
  } else if (typeof imageField === "object" && imageField !== null) {
    const img = imageField as Record<string, unknown>;
    thumbnailUrl = (img.url || img.src || img.uri || "") as string;
  }
  if (!thumbnailUrl && Array.isArray(actualItem.images)) {
    const first = actualItem.images[0];
    thumbnailUrl =
      typeof first === "string"
        ? first
        : ((first as Record<string, unknown>)?.url as string) || null;
  }

  return {
    url: fullUrl,
    title,
    price,
    currency: "EGP",
    thumbnailUrl,
    location,
    dateText,
    sellerName:
      (sellerInfo?.name as string) ||
      (sellerInfo?.display_name as string) ||
      (actualItem.seller_name as string) ||
      null,
    sellerProfileUrl:
      (sellerInfo?.url as string) ||
      (sellerInfo?.profile_url as string) ||
      null,
    sellerAvatarUrl:
      (sellerInfo?.avatar as string) ||
      (sellerInfo?.image as string) ||
      null,
    isVerified: !!(
      sellerInfo?.is_verified ||
      sellerInfo?.verified ||
      actualItem.verified
    ),
    isBusiness: !!(
      sellerInfo?.is_business ||
      sellerInfo?.is_shop ||
      sellerInfo?.account_type === "business" ||
      actualItem.is_business
    ),
    isFeatured: !!(
      actualItem.is_featured ||
      actualItem.featured ||
      actualItem.is_premium ||
      actualItem.is_promoted
    ),
    supportsExchange: !!(
      actualItem.exchange ||
      actualItem.supports_exchange ||
      (title + "").includes("تبادل") ||
      (title + "").includes("بدل")
    ),
    isNegotiable: !!(
      actualItem.negotiable ||
      actualItem.is_negotiable ||
      (title + "").includes("قابل للتفاوض") ||
      (title + "").includes("negotiable")
    ),
    category:
      (actualItem.category as string) ||
      ((actualItem.category as Record<string, unknown>)?.name as string) ||
      ((actualItem.category as Record<string, unknown>)?.slug as string) ||
      null,
  };
}

function parseJsonLdListing(
  item: Record<string, unknown>
): ListPageListing | null {
  if (!item) return null;

  const actualItem = (item.item || item) as Record<string, unknown>;

  const url = (actualItem.url as string) || "";
  const title = (actualItem.name as string) || "";

  if (!url || !title) return null;

  const offers = actualItem.offers as Record<string, unknown> | undefined;

  return {
    url: url.startsWith("http")
      ? url
      : `https://www.dubizzle.com.eg${url}`,
    title,
    price: extractNumericPrice(offers?.price),
    currency: (offers?.priceCurrency as string) || "EGP",
    thumbnailUrl: (actualItem.image as string) || null,
    location: "",
    dateText: (actualItem.datePosted as string) || "",
    sellerName: null,
    sellerProfileUrl: null,
    sellerAvatarUrl: null,
    isVerified: false,
    isBusiness: false,
    isFeatured: false,
    supportsExchange: false,
    isNegotiable: false,
    category: null,
  };
}

function parseHtmlListings(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

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
      /<h[23][^>]*>([^<]+)<\/h[23]>/,
      /data-testid="[^"]*title[^"]*"[^>]*>([^<]+)</i,
    ]);

    if (!title) continue;

    const priceText = extractFromContext(context, [
      /(\d[\d,]*)\s*(?:جنيه|ج\.م|EGP|LE)/,
      /price[^>]*>([^<]*\d[^<]*)</i,
      /data-testid="[^"]*price[^"]*"[^>]*>([^<]+)</i,
    ]);

    const locationText = extractFromContext(context, [
      /location[^>]*>([^<]+)</i,
      /address[^>]*>([^<]+)</i,
      /data-testid="[^"]*location[^"]*"[^>]*>([^<]+)</i,
    ]);

    const dateText = extractFromContext(context, [
      /(?:منذ|ago)[^<]*/i,
      /time[^>]*>([^<]+)</i,
      /data-testid="[^"]*date[^"]*"[^>]*>([^<]+)</i,
    ]);

    listings.push({
      url,
      title,
      price: priceText ? parseFloat(priceText.replace(/,/g, "")) : null,
      currency: "EGP",
      thumbnailUrl: extractImageFromContext(context),
      location: locationText || "",
      dateText: dateText || "",
      sellerName: null,
      sellerProfileUrl: null,
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
        context.includes("تبادل") || context.includes("بدل"),
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
  const match = context.match(
    /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i
  );
  return match ? match[1] : null;
}

function extractNumericPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}
