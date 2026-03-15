/**
 * OpenSooq (السوق المفتوح) Parser — eg.opensooq.com
 * 60 مليون مستخدم في المنطقة — أولوية قصوى بعد دوبيزل
 *
 * HTML Structure (discovered from reference scraper):
 *   List page: <section id="serpMainContent"> → <a class="block blackColor p-16">
 *   Detail page: <section id="PostViewInformation"> → <li class="postCpsSearchSource ...">
 *                <section id="postViewDescription"> → <p>
 *                <section id="PostViewOwnerCard"> → <a> → <h3>, <span class="ltr inline">
 *                <div class="priceColor bold font-30 width-fit">
 */

import { cleanSellerName, detectBuyRequest, type ListPageListing, type ListingDetails } from "./dubizzle";

const OPENSOOQ_BASE = "https://eg.opensooq.com";

/**
 * Build list page URL for OpenSooq
 */
export function getOpenSooqListPageUrl(
  baseUrl: string,
  _category: string,
  _governorate: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  // OpenSooq uses ?page=N
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

/**
 * Parse OpenSooq listing page HTML
 *
 * Primary pattern: links with class "block blackColor p-16" inside section#serpMainContent
 * These links contain the listing URL with a numeric ID pattern /<id>/
 * Fallback patterns for different page layouts.
 */
export function parseOpenSooqList(html: string): ListPageListing[] {
  const listings: ListPageListing[] = [];

  // Try JSON response first (API)
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseOpenSooqJson(json);
    } catch {
      // Fall through to HTML
    }
  }

  let match;
  const seenUrls = new Set<string>();

  // ═══ Pattern 1 (PRIMARY): "block blackColor p-16" links inside serpMainContent ═══
  // Reference: section#serpMainContent → a.block.blackColor.p-16
  // Extract the serpMainContent section first for tighter matching
  const serpSection = html.match(/<section[^>]*id=["']serpMainContent["'][^>]*>([\s\S]*?)<\/section>/i);
  const searchArea = serpSection ? serpSection[1] : html;

  // Match links that have class containing "block" and "blackColor" and "p-16"
  // The href contains a numeric ID: /ar/.../<numeric_id>/...
  const blockLinkPattern = /<a[^>]*class="[^"]*\bblock\b[^"]*\bblackColor\b[^"]*\bp-16\b[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?(?=<a[^>]*class="[^"]*\bblock\b[^"]*\bblackColor\b|$)/gi;
  // Also match if class order differs
  const blockLinkPattern2 = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*\bblock\b[^"]*\bblackColor\b[^"]*\bp-16\b[^"]*"[^>]*>[\s\S]*?(?=<a[^>]*href="[^"]*"[^>]*class="[^"]*\bblock\b[^"]*\bblackColor\b|$)/gi;

  for (const pattern of [blockLinkPattern, blockLinkPattern2]) {
    if (listings.length > 0) break;

    while ((match = pattern.exec(searchArea)) !== null) {
      const rawUrl = match[1];
      if (!rawUrl || rawUrl.length < 5) continue;

      // Must contain a numeric ID in the path
      const idMatch = rawUrl.match(/\/(\d{4,})\//);
      if (!idMatch) continue;

      // Skip navigation/utility links
      if (/\/(search|filter|category|page|login|register|profile|about|help)\b/i.test(rawUrl)) continue;

      const url = rawUrl.startsWith("http") ? rawUrl : `${OPENSOOQ_BASE}${rawUrl}`;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      // Extract context around this link for metadata
      const linkStart = match.index;
      const context = match[0]; // The entire matched block for this listing

      const title = extractText(context, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
        /aria-label="([^"]+)"/i,
        /title="([^"]+)"/i,
        />([^<]{5,80})</i, // Any text content > 5 chars
      ]);
      if (!title || title.length < 3) continue;

      const priceText = extractText(context, [
        /class="[^"]*(?:price|postPrice|priceColor)[^"]*"[^>]*>([^<]*\d[\d,٬\s]*[^<]*)/i,
        /(\d[\d,٬\s]*)\s*(?:جنيه|ج\.م|EGP|LE|د\.م|دينار|ريال)/,
        /(\d[\d,٬]*)\s*<\/(?:span|div|p)/,
      ]);

      const location = extractText(context, [
        /class="[^"]*(?:location|postLocation|city|geoLocation)[^"]*"[^>]*>([^<]+)/i,
      ]);

      const dateText = extractText(context, [
        /class="[^"]*(?:date|time|postDate|timeAgo)[^"]*"[^>]*>([^<]+)/i,
        /(?:منذ|ago)\s*([^<]*)/i,
      ]);

      const thumbnailUrl = extractImage(context, [
        /src="(https?:\/\/[^"]*opensooq[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
        /data-src="(https?:\/\/[^"]*opensooq[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
        /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
        /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      ]);

      const sellerName = extractText(context, [
        /class="[^"]*(?:member-name|sellerName|userName|card-user|ownerName)[^"]*"[^>]*>([^<]+)/i,
      ]);

      const isLikelyBuyRequest = detectBuyRequest(title, context);

      listings.push({
        url,
        title: title.trim(),
        price: priceText ? parsePrice(priceText) : null,
        currency: "EGP",
        thumbnailUrl,
        location: location?.trim() || "",
        dateText: dateText?.trim() || "",
        sellerName: cleanSellerName(sellerName) || null,
        sellerProfileUrl: null,
        sellerAvatarUrl: null,
        isVerified: context.includes("verified") || context.includes("موثق"),
        isBusiness: context.includes("business") || context.includes("متجر") || context.includes("تاجر"),
        isFeatured: context.includes("featured") || context.includes("مميز") || context.includes("premium"),
        supportsExchange: context.includes("تبادل") || context.includes("بدل"),
        isNegotiable: context.includes("قابل للتفاوض") || context.includes("negotiable"),
        category: null,
        isLikelyBuyRequest,
      });
    }
  }

  // ═══ Pattern 2: Individual <a> links inside serpMainContent with numeric IDs ═══
  // Broader fallback: any link inside serpMainContent that has a numeric ID
  if (listings.length === 0) {
    const linkPattern = /href="(\/ar\/[^"]*\/(\d{4,})\/[^"]*)"/gi;
    const area = serpSection ? serpSection[1] : html;

    while ((match = linkPattern.exec(area)) !== null) {
      const relativeUrl = match[1];
      if (/\/(search|filter|category|page|login|register|profile)\b/i.test(relativeUrl)) continue;

      const url = `${OPENSOOQ_BASE}${relativeUrl}`;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const start = Math.max(0, match.index - 500);
      const end = Math.min(area.length, match.index + 2000);
      const context = area.slice(start, end);

      const title = extractText(context, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
        /aria-label="([^"]+)"/i,
        /title="([^"]+)"/i,
      ]);
      if (!title || title.length < 3) continue;

      const priceText = extractText(context, [
        /class="[^"]*(?:price|postPrice|priceColor)[^"]*"[^>]*>([^<]*\d[\d,٬]*[^<]*)/i,
        /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE|د\.م|دينار|ريال)/,
      ]);

      const thumbnailUrl = extractImage(context, [
        /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
        /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      ]);

      const isLikelyBuyRequest = detectBuyRequest(title, context);

      listings.push({
        url,
        title: title.trim(),
        price: priceText ? parsePrice(priceText) : null,
        currency: "EGP",
        thumbnailUrl,
        location: extractText(context, [/class="[^"]*location[^"]*"[^>]*>([^<]+)/i]) || "",
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
        isLikelyBuyRequest,
      });
    }
  }

  // ═══ Pattern 3: Broader link patterns (any /ar/ path with numeric ID) ═══
  if (listings.length === 0) {
    const patterns = [
      /href="(\/ar\/[^"]*(?:listing|item|post)\/?\d+[^"]*)"/gi,
      /href="(https?:\/\/eg\.opensooq\.com\/[^"]*\/\d{4,}[^"]*)"/gi,
    ];

    for (const cardPattern of patterns) {
      if (listings.length > 0) break;

      while ((match = cardPattern.exec(html)) !== null) {
        const rawUrl = match[1];
        if (/\/(search|filter|category|page|login|register|profile)\b/i.test(rawUrl)) continue;
        const url = rawUrl.startsWith("http") ? rawUrl : `${OPENSOOQ_BASE}${rawUrl}`;

        if (seenUrls.has(url)) continue;
        seenUrls.add(url);

        const start = Math.max(0, match.index - 500);
        const end = Math.min(html.length, match.index + 2000);
        const context = html.slice(start, end);

        const title = extractText(context, [
          /<h[23456][^>]*>([^<]+)<\/h[23456]>/i,
          /aria-label="([^"]+)"/i,
          /title="([^"]+)"/i,
        ]);
        if (!title || title.length < 3) continue;

        const priceText = extractText(context, [
          /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE|د\.م|دينار|ريال)/,
        ]);

        const isLikelyBuyRequest = detectBuyRequest(title, context);

        listings.push({
          url,
          title: title.trim(),
          price: priceText ? parsePrice(priceText) : null,
          currency: "EGP",
          thumbnailUrl: extractImage(context, [
            /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
            /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
          ]),
          location: extractText(context, [/class="[^"]*location[^"]*"[^>]*>([^<]+)/i]) || "",
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
          isLikelyBuyRequest,
        });
      }
    }
  }

  // ═══ Pattern 4: __NEXT_DATA__ extraction (OpenSooq uses Next.js) ═══
  if (listings.length === 0) {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const props = nextData?.props?.pageProps;
        if (props) {
          // Log keys for debugging
          console.log('[OpenSooq] __NEXT_DATA__ pageProps keys:', Object.keys(props));

          // Try known keys first
          const knownKeys = [
            'listings', 'posts', 'ads', 'items', 'results', 'serpData',
            'searchResults', 'initialData', 'postList', 'adsList',
          ];
          for (const key of knownKeys) {
            const val = props[key];
            if (Array.isArray(val) && val.length > 0) {
              console.log(`[OpenSooq] Found array in pageProps.${key}, count: ${val.length}`);
              const parsed = parseOpenSooqJson({ data: val });
              if (parsed.length > 0) return parsed;
            }
            // Check nested .listings / .data / .items inside the key
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              for (const subKey of ['listings', 'data', 'items', 'posts', 'results', 'list']) {
                const subVal = (val as Record<string, unknown>)[subKey];
                if (Array.isArray(subVal) && subVal.length > 0) {
                  console.log(`[OpenSooq] Found array in pageProps.${key}.${subKey}, count: ${subVal.length}`);
                  const parsed = parseOpenSooqJson({ data: subVal });
                  if (parsed.length > 0) return parsed;
                }
              }
            }
          }

          // Deep recursive search: find ANY array of objects with title/name/subject
          const foundArrays = findListingArrays(props, 'pageProps', 3);
          for (const { path, items: foundItems } of foundArrays) {
            console.log(`[OpenSooq] Found listing array at ${path}, count: ${foundItems.length}`);
            const parsed = parseOpenSooqJson({ data: foundItems });
            if (parsed.length > 0) return parsed;
          }
        }

        // Also check outside pageProps (some Next.js apps put data elsewhere)
        if (nextData?.props) {
          const foundArrays = findListingArrays(nextData.props, 'props', 4);
          for (const { path, items: foundItems } of foundArrays) {
            if (path.includes('pageProps')) continue; // Already checked
            console.log(`[OpenSooq] Found listing array at ${path}, count: ${foundItems.length}`);
            const parsed = parseOpenSooqJson({ data: foundItems });
            if (parsed.length > 0) return parsed;
          }
        }
      } catch (e) {
        console.log('[OpenSooq] __NEXT_DATA__ parse error:', e instanceof Error ? e.message : String(e));
      }
    }
  }

  // ═══ Pattern 5: JSON-LD structured data ═══
  if (listings.length === 0) {
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        // Handle both single objects and arrays of JSON-LD
        const ldItems = Array.isArray(ld) ? ld : [ld];

        for (const ldObj of ldItems) {
          // ItemList → itemListElement
          if (ldObj["@type"] === "ItemList" && Array.isArray(ldObj.itemListElement)) {
            for (const item of ldObj.itemListElement) {
              const inner = item.item || item;
              const title = inner.name || inner.headline || "";
              const url = inner.url || "";
              if (!title || !url) continue;

              const fullUrl = url.startsWith("http") ? url : `${OPENSOOQ_BASE}${url}`;
              if (seenUrls.has(fullUrl)) continue;
              seenUrls.add(fullUrl);

              const price = inner.offers?.price || inner.offers?.lowPrice || null;
              const imageUrl = typeof inner.image === "string" ? inner.image :
                Array.isArray(inner.image) ? inner.image[0] : inner.image?.url || null;

              listings.push({
                url: fullUrl,
                title,
                price: price ? parseFloat(String(price)) : null,
                currency: inner.offers?.priceCurrency || "EGP",
                thumbnailUrl: imageUrl,
                location: inner.contentLocation?.name || inner.address?.addressLocality || "",
                dateText: inner.datePublished || inner.dateCreated || "",
                sellerName: inner.seller?.name || inner.author?.name || null,
                sellerProfileUrl: inner.seller?.url || null,
                sellerAvatarUrl: null,
                isVerified: false,
                isBusiness: false,
                isFeatured: false,
                supportsExchange: false,
                isNegotiable: false,
                category: inner.category || null,
                isLikelyBuyRequest: detectBuyRequest(title),
              });
            }
          }

          // Individual Product / Offer / ListItem
          if (['Product', 'Offer', 'Vehicle', 'RealEstateListing', 'Apartment', 'House'].includes(ldObj["@type"])) {
            const title = ldObj.name || ldObj.headline || "";
            const url = ldObj.url || "";
            if (title && url) {
              const fullUrl = url.startsWith("http") ? url : `${OPENSOOQ_BASE}${url}`;
              if (!seenUrls.has(fullUrl)) {
                seenUrls.add(fullUrl);
                const price = ldObj.offers?.price || ldObj.price || null;
                const imageUrl = typeof ldObj.image === "string" ? ldObj.image :
                  Array.isArray(ldObj.image) ? ldObj.image[0] : ldObj.image?.url || null;

                listings.push({
                  url: fullUrl,
                  title,
                  price: price ? parseFloat(String(price)) : null,
                  currency: ldObj.offers?.priceCurrency || ldObj.priceCurrency || "EGP",
                  thumbnailUrl: imageUrl,
                  location: ldObj.contentLocation?.name || ldObj.address?.addressLocality || "",
                  dateText: ldObj.datePublished || "",
                  sellerName: ldObj.seller?.name || null,
                  sellerProfileUrl: null,
                  sellerAvatarUrl: null,
                  isVerified: false,
                  isBusiness: false,
                  isFeatured: false,
                  supportsExchange: false,
                  isNegotiable: false,
                  category: ldObj.category || null,
                  isLikelyBuyRequest: detectBuyRequest(title),
                });
              }
            }
          }
        }
      } catch {
        console.log('[OpenSooq] JSON-LD parse error in one script block');
      }
    }
  }

  return listings;
}

/**
 * Parse OpenSooq detail page HTML
 *
 * Known structure:
 *   - section#PostViewInformation → li.postCpsSearchSource → p (key) + a (value)
 *   - section#PostViewInformation → li.postCpsSearchSource.width-100 → p + p (extra info)
 *   - div.priceColor.bold.font-30.width-fit → price
 *   - section#postViewDescription → p tags
 *   - section#PostViewOwnerCard → a → h3 (name), span.ltr.inline (member since)
 *   - section#postViewLocation → a (location text)
 */
export function parseOpenSooqDetail(html: string): ListingDetails {
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

  // Try JSON first
  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      if (json.description || json.body) {
        result.description = json.description || json.body || "";
        if (json.images && Array.isArray(json.images)) {
          for (const img of json.images) {
            const url = typeof img === "string" ? img : img?.url || img?.src;
            if (url) result.allImageUrls.push(url);
          }
        }
        result.mainImageUrl = result.allImageUrls[0] || "";
        if (json.attributes && typeof json.attributes === "object") {
          for (const [key, val] of Object.entries(json.attributes)) {
            if (typeof val === "string") result.specifications[key] = val;
          }
        }
        return result;
      }
    } catch {
      // Fall through
    }
  }

  // ═══ Description: section#postViewDescription → p tags ═══
  const descSection = html.match(/<section[^>]*id=["']postViewDescription["'][^>]*>([\s\S]*?)<\/section>/i);
  if (descSection) {
    const pTags = descSection[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    const parts: string[] = [];
    for (const p of pTags) {
      const text = p[1].replace(/<[^>]+>/g, "").trim();
      if (text) parts.push(text);
    }
    result.description = parts.join(" ");
  }
  // Fallback description patterns
  if (!result.description) {
    const descPatterns = [
      /<div[^>]*class="[^"]*(?:description|post-desc|postDescription)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const pattern of descPatterns) {
      const m = html.match(pattern);
      if (m) {
        result.description = m[1].replace(/<[^>]+>/g, "").trim();
        break;
      }
    }
  }

  // ═══ Price: div.priceColor.bold.font-30.width-fit ═══
  const priceMatch = html.match(/class="[^"]*priceColor[^"]*bold[^"]*font-30[^"]*"[^>]*>([^<]+)/i)
    || html.match(/class="[^"]*bold[^"]*priceColor[^"]*font-30[^"]*"[^>]*>([^<]+)/i)
    || html.match(/class="[^"]*priceColor[^"]*"[^>]*>([^<]*\d[\d,٬\s]*[^<]*)/i);
  if (priceMatch) {
    result.specifications["السعر"] = priceMatch[1].replace(/,/g, "،").trim();
  }

  // ═══ Specifications: section#PostViewInformation ═══
  // Pattern 1: li.postCpsSearchSource.flex.flexSpaceBetween.alignItems.radius-8.width-49 → p (key) + a (value)
  const infoSection = html.match(/<section[^>]*id=["']PostViewInformation["'][^>]*>([\s\S]*?)<\/section>/i);
  if (infoSection) {
    const infoHtml = infoSection[1];

    // Standard specs: li with p + a
    const specLis = infoHtml.matchAll(/<li[^>]*class="[^"]*postCpsSearchSource[^"]*width-49[^"]*"[^>]*>([\s\S]*?)<\/li>/gi);
    for (const li of specLis) {
      const keyMatch = li[1].match(/<p[^>]*>([^<]+)<\/p>/i);
      const valMatch = li[1].match(/<a[^>]*>([^<]+)<\/a>/i);
      if (keyMatch && valMatch) {
        const key = keyMatch[1].trim();
        const value = valMatch[1].trim();
        if (key && value) result.specifications[key] = value;
      }
    }

    // Extra info: li.width-100 with multiple p tags
    const extraLis = infoHtml.matchAll(/<li[^>]*class="[^"]*postCpsSearchSource[^"]*width-100[^"]*"[^>]*>([\s\S]*?)<\/li>/gi);
    for (const li of extraLis) {
      const pTags = [...li[1].matchAll(/<p[^>]*>([^<]+)<\/p>/gi)];
      if (pTags.length >= 2) {
        const key = pTags[0][1].trim();
        const value = pTags[1][1].trim();
        if (key && value) result.specifications[key] = value;
      }
    }
  }

  // Fallback spec extraction: generic key-value pairs
  if (Object.keys(result.specifications).length === 0) {
    const specPattern = /<(?:li|tr|div)[^>]*>\s*<(?:span|td|th|label|p)[^>]*>([^<]+)<\/(?:span|td|th|label|p)>\s*<(?:span|td|div|a|p)[^>]*>([^<]+)<\/(?:span|td|div|a|p)>/gi;
    let specMatch;
    while ((specMatch = specPattern.exec(html)) !== null) {
      const key = specMatch[1].replace(/<[^>]+>/g, "").trim();
      const value = specMatch[2].replace(/<[^>]+>/g, "").trim();
      if (key && value && key !== value) {
        result.specifications[key] = value;
      }
    }
  }

  // ═══ Location: section#postViewLocation → a ═══
  const locSection = html.match(/<section[^>]*id=["']postViewLocation["'][^>]*>([\s\S]*?)<\/section>/i);
  if (locSection) {
    const locLink = locSection[1].match(/<a[^>]*>([^<]+)<\/a>/i);
    if (locLink) result.specifications["الموقع"] = locLink[1].trim();
  }

  // ═══ Images ═══
  const imgMatches = html.matchAll(
    /src="(https?:\/\/[^"]*opensooq[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
  );
  for (const m of imgMatches) {
    if (!result.allImageUrls.includes(m[1])) {
      result.allImageUrls.push(m[1]);
    }
  }
  // Also check data-src and background-image
  if (result.allImageUrls.length === 0) {
    const fallback = html.matchAll(/data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi);
    for (const m of fallback) {
      if (!result.allImageUrls.includes(m[1])) {
        result.allImageUrls.push(m[1]);
      }
    }
  }
  result.mainImageUrl = result.allImageUrls[0] || "";

  // ═══ Title from h1 ═══
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) {
    result.specifications["العنوان"] = titleMatch[1].trim();
  }

  // ═══ Seller: section#PostViewOwnerCard ═══
  const ownerSection = html.match(/<section[^>]*id=["']PostViewOwnerCard["'][^>]*>([\s\S]*?)<\/section>/i);
  if (ownerSection) {
    const ownerHtml = ownerSection[1];

    // Owner name: a → h3
    const nameMatch = ownerHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    if (nameMatch) result.sellerName = cleanSellerName(nameMatch[1].trim());

    // Owner profile URL: first a[href]
    const profileMatch = ownerHtml.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
    if (profileMatch) {
      const profileUrl = profileMatch[1];
      result.sellerProfileUrl = profileUrl.startsWith("http") ? profileUrl : `${OPENSOOQ_BASE}${profileUrl}`;
    }

    // Member since: span.ltr.inline
    const sinceMatch = ownerHtml.match(/class="[^"]*\bltr\b[^"]*\binline\b[^"]*"[^>]*>([^<]+)/i)
      || ownerHtml.match(/class="[^"]*\binline\b[^"]*\bltr\b[^"]*"[^>]*>([^<]+)/i);
    if (sinceMatch) result.sellerMemberSince = sinceMatch[1].trim();
  }
  // Fallback seller extraction
  if (!result.sellerName) {
    const sellerMatch = html.match(/class="[^"]*(?:member-name|seller-name|userName|ownerName)[^"]*"[^>]*>([^<]+)/i);
    if (sellerMatch) result.sellerName = cleanSellerName(sellerMatch[1].trim());
  }
  if (!result.sellerProfileUrl) {
    const profileMatch = html.match(/href="(\/ar\/profile\/[^"]+)"/i) || html.match(/href="(\/profile\/[^"]+)"/i);
    if (profileMatch) result.sellerProfileUrl = `${OPENSOOQ_BASE}${profileMatch[1]}`;
  }

  result.condition = result.specifications["الحالة"] || result.specifications["Condition"] || null;
  result.hasWarranty = result.description.includes("ضمان") || result.description.includes("warranty");

  return result;
}

// ═══ Helper Functions ═══

function parseOpenSooqJson(json: Record<string, unknown>): ListPageListing[] {
  const listings: ListPageListing[] = [];
  const items = (json.data || json.results || json.posts || json.items || []) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  for (const item of items) {
    const title = (item.title as string) || (item.name as string) || "";
    if (!title) continue;

    let price: number | null = null;
    if (item.price) {
      if (typeof item.price === "number") price = item.price;
      else price = parsePrice(String(item.price));
    }

    const url = (item.url as string) || (item.link as string) ||
      (item.id ? `${OPENSOOQ_BASE}/ar/listing/${item.id}` : "");
    if (!url) continue;

    const fullUrl = url.startsWith("http") ? url : `${OPENSOOQ_BASE}${url}`;

    let thumbnailUrl: string | null = null;
    if (item.images && Array.isArray(item.images) && (item.images as unknown[]).length > 0) {
      const firstImg = (item.images as Record<string, unknown>[])[0];
      thumbnailUrl = typeof firstImg === "string" ? firstImg : (firstImg?.url as string) || null;
    } else if (item.image) {
      thumbnailUrl = typeof item.image === "string" ? item.image : null;
    }

    const isLikelyBuyRequest = detectBuyRequest(title);

    listings.push({
      url: fullUrl,
      title,
      price,
      currency: "EGP",
      thumbnailUrl,
      location: (item.location as string) || (item.city as string) || "",
      dateText: (item.created_at as string) || (item.date as string) || "",
      sellerName: cleanSellerName((item.user_name as string) || null),
      sellerProfileUrl: null,
      sellerAvatarUrl: null,
      isVerified: !!(item.is_verified || item.verified),
      isBusiness: !!(item.is_business),
      isFeatured: !!(item.is_featured || item.featured || item.is_premium),
      supportsExchange: title.includes("تبادل") || title.includes("بدل"),
      isNegotiable: !!(item.is_negotiable) || title.includes("قابل للتفاوض"),
      category: (item.category_name as string) || null,
      isLikelyBuyRequest,
    });
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

/**
 * Recursively search an object for arrays that look like listing data
 * (arrays of objects with title/name/subject + price/url)
 */
function findListingArrays(
  obj: unknown,
  path: string,
  maxDepth: number
): { path: string; items: Record<string, unknown>[] }[] {
  const results: { path: string; items: Record<string, unknown>[] }[] = [];
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return results;

  if (Array.isArray(obj)) {
    // Check if this array looks like listings (objects with title-like fields)
    if (obj.length >= 2) {
      const first = obj[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        const keys = Object.keys(first as Record<string, unknown>);
        const hasTitle = keys.some(k =>
          /^(title|name|subject|headline|post_title|ad_title)$/i.test(k)
        );
        const hasIdOrUrl = keys.some(k =>
          /^(id|url|link|href|slug|post_id|ad_id)$/i.test(k)
        );
        if (hasTitle && hasIdOrUrl) {
          results.push({ path, items: obj as Record<string, unknown>[] });
        }
      }
    }
    // Also search inside array elements
    for (let i = 0; i < Math.min(obj.length, 3); i++) {
      results.push(...findListingArrays(obj[i], `${path}[${i}]`, maxDepth - 1));
    }
  } else {
    // Search object properties
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        results.push(...findListingArrays(value, `${path}.${key}`, maxDepth - 1));
      }
    }
  }

  return results;
}
