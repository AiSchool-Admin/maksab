/**
 * Dubizzle.com.eg Parser
 * يحلل صفحات القوائم وصفحات التفاصيل من دوبيزل مصر
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

/**
 * Parse a Dubizzle listing page (search results)
 * Dubizzle uses a React-based SPA, so we parse the JSON data embedded in the page
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
      const results =
        data?.props?.pageProps?.searchResult?.results ||
        data?.props?.pageProps?.listings ||
        [];

      for (const item of results) {
        const listing = parseNextDataListing(item);
        if (listing) listings.push(listing);
      }

      if (listings.length > 0) return listings;
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
    } catch {
      continue;
    }
  }

  if (listings.length > 0) return listings;

  // Strategy 3: Regex-based HTML parsing (fallback)
  return parseHtmlListings(html);
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
  };

  // Try __NEXT_DATA__ first
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const ad =
        data?.props?.pageProps?.ad ||
        data?.props?.pageProps?.listing ||
        data?.props?.pageProps;

      if (ad) {
        result.description = ad.description || ad.body || "";

        // Images
        const images = ad.images || ad.photos || [];
        result.allImageUrls = images.map(
          (img: { url?: string; src?: string }) => img.url || img.src || ""
        );
        result.mainImageUrl = result.allImageUrls[0] || "";

        // Specifications
        const attrs =
          ad.attributes ||
          ad.specifications ||
          ad.details ||
          ad.properties ||
          [];
        if (Array.isArray(attrs)) {
          for (const attr of attrs) {
            const key = attr.label || attr.name || attr.key;
            const value =
              attr.value || attr.value_name || attr.displayValue;
            if (key && value) {
              result.specifications[key] = String(value);
            }
          }
        } else if (typeof attrs === "object") {
          Object.assign(result.specifications, attrs);
        }

        // Condition
        result.condition =
          result.specifications["الحالة"] ||
          result.specifications["Condition"] ||
          ad.condition ||
          null;

        // Seller info
        const seller = ad.seller || ad.user || ad.owner;
        if (seller) {
          result.sellerName = seller.name || seller.display_name || null;
          result.sellerProfileUrl = seller.profile_url || seller.url || null;
          result.sellerMemberSince =
            seller.member_since || seller.created_at || null;
        }

        result.hasWarranty =
          result.description.includes("ضمان") ||
          result.description.includes("warranty");
      }
    } catch {
      // Fall through to HTML parsing
    }
  }

  // Fallback: HTML parsing
  if (!result.description) {
    const descMatch = html.match(
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    result.description = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";
  }

  if (result.allImageUrls.length === 0) {
    const imgMatches = html.matchAll(
      /src="(https:\/\/[^"]*dubizzle[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
    );
    for (const match of imgMatches) {
      if (!result.allImageUrls.includes(match[1])) {
        result.allImageUrls.push(match[1]);
      }
    }
    result.mainImageUrl = result.allImageUrls[0] || "";
  }

  return result;
}

// ═══ Helper Functions ═══

function parseNextDataListing(item: Record<string, unknown>): ListPageListing | null {
  if (!item) return null;

  const url =
    (item.url as string) ||
    (item.absolute_url as string) ||
    (item.link as string) ||
    "";
  const title =
    (item.title as string) || (item.name as string) || "";

  if (!url || !title) return null;

  const fullUrl = url.startsWith("http")
    ? url
    : `https://www.dubizzle.com.eg${url}`;

  const price = item.price as Record<string, unknown> | undefined;
  const seller = item.seller as Record<string, unknown> | undefined;

  return {
    url: fullUrl,
    title,
    price: extractNumericPrice(price?.value ?? item.price),
    currency: "EGP",
    thumbnailUrl:
      (item.thumbnail as string) ||
      (item.image as string) ||
      ((item.images as string[])?.[0]) ||
      null,
    location:
      (item.location as string) ||
      ((item.locations as Record<string, unknown>)?.name as string) ||
      "",
    dateText:
      (item.created_at as string) ||
      (item.date as string) ||
      (item.age as string) ||
      "",
    sellerName:
      (seller?.name as string) ||
      (item.seller_name as string) ||
      null,
    sellerProfileUrl:
      (seller?.url as string) ||
      (seller?.profile_url as string) ||
      null,
    sellerAvatarUrl: (seller?.avatar as string) || null,
    isVerified: !!(seller?.is_verified || item.verified),
    isBusiness: !!(
      seller?.is_business ||
      seller?.is_shop ||
      item.is_business
    ),
    isFeatured: !!(item.is_featured || item.featured || item.is_premium),
    supportsExchange: !!(
      item.exchange ||
      (title + "").includes("تبادل") ||
      (title + "").includes("بدل")
    ),
    isNegotiable: !!(
      item.negotiable ||
      (title + "").includes("قابل للتفاوض") ||
      (title + "").includes("negotiable")
    ),
    category:
      (item.category as string) ||
      ((item.category as Record<string, unknown>)?.name as string) ||
      null,
  };
}

function parseJsonLdListing(
  item: Record<string, unknown>
): ListPageListing | null {
  if (!item) return null;

  const url = (item.url as string) || "";
  const title = (item.name as string) || "";

  if (!url || !title) return null;

  const offers = item.offers as Record<string, unknown> | undefined;

  return {
    url,
    title,
    price: extractNumericPrice(offers?.price),
    currency: (offers?.priceCurrency as string) || "EGP",
    thumbnailUrl: (item.image as string) || null,
    location: "",
    dateText: (item.datePosted as string) || "",
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

  // Look for listing card patterns (common in classified sites)
  const cardPatterns = [
    // Dubizzle-style listing cards
    /<a[^>]*href="(\/[^"]*?)"[^>]*>[\s\S]*?<\/a>/g,
    // aria-label based
    /<div[^>]*aria-label="[^"]*listing[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  // Extract all links that look like listing URLs
  const linkPattern =
    /href="((?:https?:\/\/(?:www\.)?dubizzle\.com\.eg)?\/(?:ar\/)?[a-z\-]+\/[a-z\-]+\/[^"]+)"/g;
  let linkMatch;
  const seenUrls = new Set<string>();

  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const url = linkMatch[1].startsWith("http")
      ? linkMatch[1]
      : `https://www.dubizzle.com.eg${linkMatch[1]}`;

    if (seenUrls.has(url) || url.includes("/search") || url.includes("/login"))
      continue;
    seenUrls.add(url);

    // Try to extract surrounding context
    const start = Math.max(0, linkMatch.index - 500);
    const end = Math.min(html.length, linkMatch.index + 2000);
    const context = html.slice(start, end);

    const title = extractFromContext(context, [
      /aria-label="([^"]+)"/,
      /title="([^"]+)"/,
      /<h[23][^>]*>([^<]+)<\/h[23]>/,
    ]);

    if (!title) continue;

    const priceText = extractFromContext(context, [
      /(\d[\d,]*)\s*(?:جنيه|ج\.م|EGP|LE)/,
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
      isVerified: context.includes("verified") || context.includes("موثق"),
      isBusiness:
        context.includes("business") || context.includes("متجر"),
      isFeatured:
        context.includes("featured") || context.includes("مميز"),
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
