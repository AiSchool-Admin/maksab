/**
 * سمسار مصر Parser — semsarmasr.com
 * منصة عقارات مصرية — بيع وإيجار
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const SEMSAR_BASE = "https://www.semsarmasr.com";

export function getSemsarMasrListPageUrl(
  baseUrl: string,
  _category: string,
  _governorate: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

export function parseSemsarMasrList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseSemsarJson(json);
    } catch { /* fall through */ }
  }

  // Try __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const items = nextData?.props?.pageProps?.listings || nextData?.props?.pageProps?.properties || [];
      if (items.length > 0) {
        return items.map((item: Record<string, unknown>) => parseSemsarJsonItem(item)).filter(Boolean);
      }
    } catch { /* fall through */ }
  }

  // HTML patterns for semsarmasr listing cards
  const cardPattern = /href="((?:https?:\/\/www\.semsarmasr\.com)?\/(?:property|listing|عقار)[^"]*)"/gi;
  let match;
  const seenUrls = new Set<string>();

  while ((match = cardPattern.exec(html)) !== null) {
    const rawUrl = match[1];
    const url = rawUrl.startsWith("http") ? rawUrl : `${SEMSAR_BASE}${rawUrl}`;

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + 3000);
    const context = html.slice(start, end);

    const title = extractText(context, [
      /class="[^"]*(?:property-title|listing-title|card-title)[^"]*"[^>]*>([^<]+)/i,
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
      /class="[^"]*(?:location|address|area)[^"]*"[^>]*>([^<]+)/i,
    ]) || "الإسكندرية";

    const dateText = extractText(context, [
      /class="[^"]*date[^"]*"[^>]*>([^<]+)/i,
      /class="[^"]*time[^"]*"[^>]*>([^<]+)/i,
    ]) || "";

    const thumbnailUrl = extractText(context, [
      /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
    ]);

    const sellerName = extractText(context, [
      /class="[^"]*(?:agent|broker|seller|owner)[^"]*"[^>]*>([^<]+)/i,
    ]);

    const isAgent = /(?:سمسار|وسيط|broker|agent|مكتب عقاري)/i.test(context);
    const isDeveloper = /(?:شركة تطوير|developer|مطور)/i.test(context);
    const isBusiness = isAgent || isDeveloper;
    const isVerified = /(?:verified|موثق|premium)/i.test(context);
    const isFeatured = /(?:featured|مميز|premium)/i.test(context);

    // Extract area (sqm)
    const areaText = extractText(context, [
      /(\d+)\s*(?:م²|م2|sqm|متر)/i,
    ]);

    // Extract rooms
    const roomsText = extractText(context, [
      /(\d+)\s*(?:غرف|غرفة|rooms?|bed)/i,
    ]);

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
      isNegotiable: /(?:قابل للتفاوض|negotiable)/i.test(context),
      category: "عقارات",
      isLikelyBuyRequest: detectBuyRequest(title),
      detectedBuyerPhone: null,
    });
  }

  return listings;
}

export function parseSemsarMasrDetail(html: string): ListingDetails {
  // Try __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const prop = nextData?.props?.pageProps?.property || nextData?.props?.pageProps?.listing || {};
      if (prop.description || prop.title) {
        return {
          description: prop.description || "",
          mainImageUrl: (prop.images || [])[0]?.url || prop.main_image || "",
          allImageUrls: (prop.images || []).map((img: Record<string, string>) => img.url || img.src).filter(Boolean),
          specifications: extractPropertySpecs(prop),
          condition: null,
          paymentMethod: prop.payment_method || null,
          hasWarranty: false,
          sellerName: prop.agent?.name || prop.seller?.name || null,
          sellerProfileUrl: prop.agent?.url || null,
          sellerMemberSince: null,
        };
      }
    } catch { /* fall through */ }
  }

  const description = extractText(html, [
    /class="[^"]*(?:description|details)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]) || "";

  const mainImageUrl = extractText(html, [
    /class="[^"]*gallery[^"]*"[\s\S]*?src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i,
    /og:image"[^>]*content="([^"]+)"/i,
  ]) || "";

  const allImageUrls: string[] = [];
  const imgPattern = /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi;
  let imgMatch;
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    if (!allImageUrls.includes(imgMatch[1]) && !imgMatch[1].includes("logo") && !imgMatch[1].includes("icon")) {
      allImageUrls.push(imgMatch[1]);
    }
  }

  const specifications: Record<string, string> = {};

  // Extract common property specs
  const specPatterns: [string, RegExp][] = [
    ["المساحة", /(\d+)\s*(?:م²|م2|sqm|متر مربع)/i],
    ["الغرف", /(\d+)\s*(?:غرف|غرفة|bedroom)/i],
    ["الحمامات", /(\d+)\s*(?:حمام|حمامات|bathroom)/i],
    ["الطابق", /(?:الطابق|الدور|floor)\s*[:\s]*(\d+|أرضي|ground)/i],
    ["التشطيب", /(?:التشطيب|finishing)\s*[:\s]*([\u0600-\u06FF\s]+)/i],
  ];

  for (const [key, pattern] of specPatterns) {
    const matchSpec = pattern.exec(html);
    if (matchSpec) specifications[key] = matchSpec[1].trim();
  }

  const sellerName = extractText(html, [
    /class="[^"]*(?:agent|broker|seller|contact)[^"]*"[^>]*>([^<]+)/i,
  ]);

  const contactPhone = extractText(html, [
    /class="[^"]*(?:phone|contact-phone|tel)[^"]*"[^>]*>([^<]*01\d{9}[^<]*)/i,
    /href="tel:(\+?20?1\d{9})"/i,
    /(01[0125]\d{8})/,
  ]);

  return {
    description: description.replace(/<[^>]+>/g, " ").trim(),
    mainImageUrl,
    allImageUrls,
    specifications,
    condition: null,
    paymentMethod: null,
    hasWarranty: false,
    sellerName: sellerName ? cleanSellerName(sellerName) : null,
    sellerProfileUrl: null,
    sellerMemberSince: null,
  };
}

// ─── JSON Helpers ────────────────────────────────────────────

function parseSemsarJson(json: Record<string, unknown>): ListPageListing[] {
  const items = (json.data as Record<string, unknown>[]) || (json.listings as Record<string, unknown>[]) || (json.results as Record<string, unknown>[]) || [];
  return items.map(parseSemsarJsonItem).filter(Boolean) as ListPageListing[];
}

function parseSemsarJsonItem(item: Record<string, unknown>): ListPageListing | null {
  const title = (item.title as string) || (item.name as string) || "";
  if (!title) return null;

  const url = (item.url as string) || (item.link as string) || "";
  const fullUrl = url.startsWith("http") ? url : `${SEMSAR_BASE}${url}`;

  const price = typeof item.price === "number" ? item.price : null;

  return {
    url: fullUrl,
    title,
    price,
    currency: "EGP",
    thumbnailUrl: (item.image as string) || (item.thumbnail as string) || null,
    location: (item.location as string) || (item.area as string) || "الإسكندرية",
    dateText: (item.created_at as string) || (item.date as string) || "",
    sellerName: (item.agent_name as string) || (item.seller_name as string) || null,
    sellerProfileUrl: (item.agent_url as string) || null,
    sellerAvatarUrl: null,
    isVerified: !!(item.verified),
    isBusiness: !!(item.is_agent || item.is_developer),
    isFeatured: !!(item.featured),
    supportsExchange: false,
    isNegotiable: !!(item.negotiable),
    category: "عقارات",
    isLikelyBuyRequest: false,
    detectedBuyerPhone: null,
  };
}

function extractPropertySpecs(prop: Record<string, unknown>): Record<string, string> {
  const specs: Record<string, string> = {};
  if (prop.area) specs["المساحة"] = `${prop.area} م²`;
  if (prop.bedrooms) specs["الغرف"] = String(prop.bedrooms);
  if (prop.bathrooms) specs["الحمامات"] = String(prop.bathrooms);
  if (prop.floor) specs["الطابق"] = String(prop.floor);
  if (prop.finishing) specs["التشطيب"] = String(prop.finishing);
  if (prop.furnished) specs["مفروش"] = String(prop.furnished);
  if (prop.property_type) specs["النوع"] = String(prop.property_type);
  return specs;
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
