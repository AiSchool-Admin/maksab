/**
 * Dubizzle.com.eg Parser
 * يحلل صفحات القوائم وصفحات التفاصيل من دوبيزل مصر
 * HTML parsing فقط — مبني على فحص حقيقي لصفحات دوبيزل
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
 * Parse a Dubizzle listing page (search results) — HTML only
 * Confirmed data from real Dubizzle pages:
 * - Title: h2 or a text
 * - Price: text containing "ج.م"
 * - Image: images.dubizzle.com.eg/thumbnails/{ID}-400x300.jpeg
 * - Location: area and governorate text
 * - Date: "منذ X ساعات/أيام"
 * - Seller name + verification badge
 * - "متوفر التبادل"
 * - Seller profile link
 * - Pagination: ?page=N
 */
export function parseDubizzleList(html: string): ListPageListing[] {
  return parseHtmlListings(html);
}

/**
 * Parse a Dubizzle detail page — HTML only
 * Confirmed data:
 * - Full description text
 * - Large image: {ID}-800x600.jpeg
 * - Specifications table
 * - Phone: Regex from description text only
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

  // Extract description
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

  // Extract images (dubizzle image URLs — 800x600 for detail)
  const imgMatches = html.matchAll(
    /src="(https:\/\/images\.dubizzle\.com\.eg\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
  );
  for (const match of imgMatches) {
    if (!result.allImageUrls.includes(match[1])) {
      result.allImageUrls.push(match[1]);
    }
  }

  // Also capture other image hosting patterns
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
    // <li> or <tr> based spec layout
    /<(?:li|tr)[^>]*>\s*<(?:span|td|th)[^>]*>([^<]+)<\/(?:span|td|th)>\s*<(?:span|td)[^>]*>([^<]+)<\/(?:span|td)>/gi,
    // data-testid specs
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

  // Extract condition from specs
  result.condition =
    result.specifications["الحالة"] ||
    result.specifications["Condition"] ||
    result.specifications["condition"] ||
    null;

  // Extract seller name
  const sellerNamePatterns = [
    /<[^>]*class="[^"]*seller[^"]*name[^"]*"[^>]*>([^<]+)</i,
    /<[^>]*data-testid="[^"]*seller[^"]*"[^>]*>([^<]+)</i,
    /<[^>]*class="[^"]*owner[^"]*"[^>]*>([^<]+)</i,
  ];
  for (const pattern of sellerNamePatterns) {
    const match = html.match(pattern);
    if (match) {
      result.sellerName = match[1].trim();
      break;
    }
  }

  // Extract seller profile URL
  const profileMatch = html.match(
    /href="(\/(?:ar\/)?profile\/[^"]+)"/i
  );
  if (profileMatch) {
    result.sellerProfileUrl = `https://www.dubizzle.com.eg${profileMatch[1]}`;
  }

  // Extract member since
  const memberMatch = html.match(/(?:عضو منذ|member since)[^<]*(\d{4})/i);
  if (memberMatch) {
    result.sellerMemberSince = memberMatch[1];
  }

  // Warranty detection from description
  result.hasWarranty =
    (typeof result.description === "string" &&
      (result.description.includes("ضمان") ||
        result.description.includes("warranty"))) ||
    result.specifications["الضمان"] === "نعم" ||
    false;

  return result;
}

// ═══ Helper Functions ═══

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

    // Get surrounding HTML context for this listing
    const start = Math.max(0, linkMatch.index - 500);
    const end = Math.min(html.length, linkMatch.index + 2000);
    const context = html.slice(start, end);

    // Extract title from h2, a text, or aria-label
    const title = extractFromContext(context, [
      /aria-label="([^"]+)"/,
      /title="([^"]+)"/,
      /<h2[^>]*>([^<]+)<\/h2>/,
      /<h3[^>]*>([^<]+)<\/h3>/,
      /data-testid="[^"]*title[^"]*"[^>]*>([^<]+)</i,
    ]);

    if (!title) continue;

    // Extract price (text containing "ج.م" or EGP)
    const priceText = extractFromContext(context, [
      /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE)/,
      /price[^>]*>([^<]*\d[^<]*)</i,
      /data-testid="[^"]*price[^"]*"[^>]*>([^<]+)</i,
    ]);

    // Extract location
    const locationText = extractFromContext(context, [
      /location[^>]*>([^<]+)</i,
      /address[^>]*>([^<]+)</i,
      /data-testid="[^"]*location[^"]*"[^>]*>([^<]+)</i,
    ]);

    // Extract date ("منذ X ساعات/أيام")
    const dateText = extractFromContext(context, [
      /(?:منذ|ago)[^<]*/i,
      /time[^>]*>([^<]+)</i,
      /data-testid="[^"]*date[^"]*"[^>]*>([^<]+)</i,
    ]);

    // Extract seller name
    const sellerName = extractFromContext(context, [
      /seller[^>]*name[^>]*>([^<]+)</i,
      /data-testid="[^"]*seller[^"]*"[^>]*>([^<]+)</i,
    ]);

    // Extract seller profile URL
    let sellerProfileUrl: string | null = null;
    const profileUrlMatch = context.match(
      /href="(\/(?:ar\/)?profile\/[^"]+)"/i
    );
    if (profileUrlMatch) {
      sellerProfileUrl = `https://www.dubizzle.com.eg${profileUrlMatch[1]}`;
    }

    // Extract thumbnail (images.dubizzle.com.eg/thumbnails/{ID}-400x300.jpeg)
    const thumbnailUrl = extractImageFromContext(context);

    listings.push({
      url,
      title,
      price: priceText ? parseFloat(priceText.replace(/[,٬]/g, "")) : null,
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
  // Prefer dubizzle thumbnails
  const dubizzleMatch = context.match(
    /src="(https:\/\/images\.dubizzle\.com\.eg\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i
  );
  if (dubizzleMatch) return dubizzleMatch[1];

  // Fallback to any image
  const match = context.match(
    /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i
  );
  return match ? match[1] : null;
}
