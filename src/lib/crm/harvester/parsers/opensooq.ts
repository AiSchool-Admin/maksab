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

/** Debug info returned alongside listings for diagnostics */
export interface OpenSooqParseDebug {
  htmlLength: number;
  hasNextData: boolean;
  nextDataPagePropsKeys: string[];
  hasLandingApi: boolean;
  landingApiKeys: string[];
  widgetCount: number;
  widgets: { label: string; type: string; itemsCount: number }[];
  firstItemKeys: string[];
  firstItemSample: string | null;
  hasSerpMainContent: boolean;
  serpMainContentLength: number;
  patternsUsed: string[];
  totalFromEachPattern: Record<string, number>;
  filterItemsRemoved: number;
  finalListingCount: number;
  sampleListings: { title: string; url: string; price: number | null }[];
}

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
 * Parse OpenSooq listing page HTML (backward-compatible wrapper)
 */
export function parseOpenSooqList(html: string): ListPageListing[] {
  return parseOpenSooqListWithDebug(html).listings;
}

/**
 * Parse OpenSooq listing page HTML — with full debug info
 *
 * Primary pattern: links with class "block blackColor p-16" inside section#serpMainContent
 * These links contain the listing URL with a numeric ID pattern /<id>/
 * Fallback patterns for different page layouts.
 */
export function parseOpenSooqListWithDebug(html: string): {
  listings: ListPageListing[];
  debug: OpenSooqParseDebug;
} {
  const listings: ListPageListing[] = [];
  const debug: OpenSooqParseDebug = {
    htmlLength: html.length,
    hasNextData: false,
    nextDataPagePropsKeys: [],
    hasLandingApi: false,
    landingApiKeys: [],
    widgetCount: 0,
    widgets: [],
    firstItemKeys: [],
    firstItemSample: null,
    hasSerpMainContent: false,
    serpMainContentLength: 0,
    patternsUsed: [],
    totalFromEachPattern: {},
    filterItemsRemoved: 0,
    finalListingCount: 0,
    sampleListings: [],
  };

  // Try JSON response first (API)
  const trimmed = html.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      const parsed = parseOpenSooqJson(json);
      if (parsed.length > 0) {
        debug.patternsUsed.push('json_api');
        debug.totalFromEachPattern['json_api'] = parsed.length;
        debug.finalListingCount = parsed.length;
        debug.sampleListings = parsed.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
        return { listings: parsed, debug };
      }
    } catch {
      // Fall through to HTML
    }
  }

  let match;
  const seenUrls = new Set<string>();

  // ═══ Extract serpMainContent ═══
  let searchArea = html;
  const serpStart = html.search(/<section[^>]*id=["']serpMainContent["']/i);
  if (serpStart !== -1) {
    debug.hasSerpMainContent = true;
    let depth = 0;
    let foundEnd = -1;
    const sectionOpenRe = /<section\b/gi;
    const sectionCloseRe = /<\/section>/gi;
    const tags: { pos: number; isOpen: boolean }[] = [];
    sectionOpenRe.lastIndex = serpStart;
    let m;
    while ((m = sectionOpenRe.exec(html)) !== null) {
      tags.push({ pos: m.index, isOpen: true });
    }
    sectionCloseRe.lastIndex = serpStart;
    while ((m = sectionCloseRe.exec(html)) !== null) {
      tags.push({ pos: m.index, isOpen: false });
    }
    tags.sort((a, b) => a.pos - b.pos);
    for (const tag of tags) {
      if (tag.isOpen) depth++;
      else depth--;
      if (depth === 0) {
        foundEnd = tag.pos + '</section>'.length;
        break;
      }
    }
    if (foundEnd > serpStart) {
      searchArea = html.slice(serpStart, foundEnd);
      debug.serpMainContentLength = searchArea.length;
    }
  }

  // ═══ Pattern 0: <article> elements ═══
  const articlePattern = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let p0Count = 0;
  while ((match = articlePattern.exec(searchArea)) !== null) {
    const context = match[1];
    const linkMatch = context.match(/href="((?:\/ar\/|https?:\/\/eg\.opensooq\.com\/)[^"]*\/\d{4,}[^"]*)"/i);
    if (!linkMatch) continue;
    const rawUrl = linkMatch[1];
    if (/\/(search|filter|category|page|login|register|profile|about|help)\b/i.test(rawUrl)) continue;
    const url = rawUrl.startsWith("http") ? rawUrl : `${OPENSOOQ_BASE}${rawUrl}`;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    const title = extractText(context, [
      /<h[23456][^>]*>([^<]+)<\/h[23456]>/i, /aria-label="([^"]+)"/i,
      /title="([^"]+)"/i, />([^<]{5,80})</i,
    ]);
    if (!title || title.length < 3) continue;
    const priceText = extractText(context, [
      /class="[^"]*(?:price|postPrice|priceColor)[^"]*"[^>]*>([^<]*\d[\d,٬\s]*[^<]*)/i,
      /(\d[\d,٬\s]*)\s*(?:جنيه|ج\.م|EGP|LE|د\.م|دينار|ريال|JOD|KWD)/i,
      /(\d[\d,٬]*)\s*<\/(?:span|div|p)/,
    ]);
    const location = extractText(context, [
      /class="[^"]*(?:location|postLocation|city|geoLocation|geo)[^"]*"[^>]*>([^<]+)/i,
      /class="[^"]*(?:address|area)[^"]*"[^>]*>([^<]+)/i,
    ]);
    const dateText = extractText(context, [
      /class="[^"]*(?:date|time|postDate|timeAgo|created)[^"]*"[^>]*>([^<]+)/i,
      /(?:منذ|ago)\s*([^<]*)/i,
    ]);
    const thumbnailUrl = extractImage(context, [
      /src="(https?:\/\/[^"]*opensooq[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*opensooq[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      /style="[^"]*background-image:\s*url\(\s*'?(https?:\/\/[^"')]+)'?\s*\)/i,
    ]);
    const sellerName = extractText(context, [
      /class="[^"]*(?:member-name|sellerName|userName|card-user|ownerName)[^"]*"[^>]*>([^<]+)/i,
    ]);
    const isLikelyBuyRequest = detectBuyRequest(title, context);
    listings.push({
      url, title: title.trim(), price: priceText ? parsePrice(priceText) : null,
      currency: "EGP", thumbnailUrl, location: location?.trim() || "",
      dateText: dateText?.trim() || "",
      sellerName: cleanSellerName(sellerName) || null,
      sellerProfileUrl: null, sellerAvatarUrl: null,
      isVerified: context.includes("verified") || context.includes("موثق"),
      isBusiness: context.includes("business") || context.includes("متجر") || context.includes("تاجر"),
      isFeatured: context.includes("featured") || context.includes("مميز") || context.includes("premium"),
      supportsExchange: context.includes("تبادل") || context.includes("بدل"),
      isNegotiable: context.includes("قابل للتفاوض") || context.includes("negotiable"),
      category: null, isLikelyBuyRequest,
    });
    p0Count++;
  }
  if (p0Count > 0) {
    debug.patternsUsed.push('p0_article');
    debug.totalFromEachPattern['p0_article'] = p0Count;
  }

  // ═══ Pattern 1: "block blackColor p-16" links ═══
  if (listings.length < 5) {
    let p1Count = 0;
    const allListingLinks = searchArea.matchAll(
      /href="(\/ar\/[^"]*\/(\d{4,})\/[^"]*)"/gi
    );
    for (const linkMatch of allListingLinks) {
      const rawUrl = linkMatch[1];
      if (/\/(search|filter|category|page|login|register|profile|about|help)\b/i.test(rawUrl)) continue;
      const url = `${OPENSOOQ_BASE}${rawUrl}`;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      const start = Math.max(0, linkMatch.index! - 800);
      const end = Math.min(searchArea.length, linkMatch.index! + 1500);
      const context = searchArea.slice(start, end);
      const title = extractText(context, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i, /aria-label="([^"]+)"/i, /title="([^"]+)"/i,
      ]);
      if (!title || title.length < 3) continue;
      const priceText = extractText(context, [
        /class="[^"]*(?:price|postPrice|priceColor)[^"]*"[^>]*>([^<]*\d[\d,٬\s]*[^<]*)/i,
        /(\d[\d,٬\s]*)\s*(?:جنيه|ج\.م|EGP|LE|د\.م|دينار|ريال|JOD|KWD)/i,
        /(\d[\d,٬]*)\s*<\/(?:span|div|p)/,
      ]);
      const thumbnailUrl = extractImage(context, [
        /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
        /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
      ]);
      const isLikelyBuyRequest = detectBuyRequest(title, context);
      listings.push({
        url, title: title.trim(), price: priceText ? parsePrice(priceText) : null,
        currency: "EGP", thumbnailUrl,
        location: extractText(context, [/class="[^"]*(?:location|city|geo)[^"]*"[^>]*>([^<]+)/i]) || "",
        dateText: extractText(context, [
          /class="[^"]*(?:date|time|postDate|timeAgo)[^"]*"[^>]*>([^<]+)/i, /(?:منذ|ago)\s*([^<]*)/i,
        ]) || "",
        sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
        isVerified: false, isBusiness: false, isFeatured: false,
        supportsExchange: false, isNegotiable: false, category: null, isLikelyBuyRequest,
      });
      p1Count++;
    }
    if (p1Count > 0) {
      debug.patternsUsed.push('p1_serp_links');
      debug.totalFromEachPattern['p1_serp_links'] = p1Count;
    }
  }

  // ═══ Pattern 2: Full-page link scan ═══
  if (listings.length < 5) {
    let p2Count = 0;
    const fullPageLinks = html.matchAll(
      /href="((?:\/ar\/|https?:\/\/eg\.opensooq\.com\/)[^"]*\/\d{4,}[^"]*)"/gi
    );
    for (const linkMatch of fullPageLinks) {
      const rawUrl = linkMatch[1];
      if (/\/(search|filter|category|page|login|register|profile|about|help)\b/i.test(rawUrl)) continue;
      const url = rawUrl.startsWith("http") ? rawUrl : `${OPENSOOQ_BASE}${rawUrl}`;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      const start = Math.max(0, linkMatch.index! - 500);
      const end = Math.min(html.length, linkMatch.index! + 2000);
      const context = html.slice(start, end);
      const title = extractText(context, [
        /<h[23456][^>]*>([^<]+)<\/h[23456]>/i, /aria-label="([^"]+)"/i, /title="([^"]+)"/i,
      ]);
      if (!title || title.length < 3) continue;
      const priceText = extractText(context, [
        /(\d[\d,٬]*)\s*(?:جنيه|ج\.م|EGP|LE|د\.م|دينار|ريال|JOD|KWD)/i,
      ]);
      const isLikelyBuyRequest = detectBuyRequest(title, context);
      listings.push({
        url, title: title.trim(), price: priceText ? parsePrice(priceText) : null,
        currency: "EGP",
        thumbnailUrl: extractImage(context, [
          /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
          /data-src="(https?:\/\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i,
        ]),
        location: extractText(context, [/class="[^"]*location[^"]*"[^>]*>([^<]+)/i]) || "",
        dateText: "", sellerName: null, sellerProfileUrl: null, sellerAvatarUrl: null,
        isVerified: false, isBusiness: false, isFeatured: false,
        supportsExchange: false, isNegotiable: false, category: null, isLikelyBuyRequest,
      });
      p2Count++;
    }
    if (p2Count > 0) {
      debug.patternsUsed.push('p2_fullpage_links');
      debug.totalFromEachPattern['p2_fullpage_links'] = p2Count;
    }
  }

  // ═══ Pattern 3: __NEXT_DATA__ extraction (OpenSooq uses Next.js) ═══
  if (listings.length < 5) {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    debug.hasNextData = !!nextDataMatch;

    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const props = nextData?.props?.pageProps;
        if (props) {
          debug.nextDataPagePropsKeys = Object.keys(props);

          // ═══ PRIMARY: landingApiResponse.listings = array of widgets ═══
          // Each widget has items[] with real listing data (id, price, post_url, highlights, etc.)
          // This MUST run first and takes priority over all other patterns
          const landingApi = props.landingApiResponse;
          debug.hasLandingApi = !!landingApi;
          if (landingApi) {
            debug.landingApiKeys = Object.keys(landingApi);
          }

          if (landingApi?.listings && Array.isArray(landingApi.listings)) {
            debug.widgetCount = landingApi.listings.length;
            const widgetListings: ListPageListing[] = [];

            for (let wi = 0; wi < landingApi.listings.length; wi++) {
              const widget = landingApi.listings[wi];
              const widgetInfo = {
                label: widget.label || widget.title || '(no label)',
                type: widget.type || widget.widget_type || '(no type)',
                itemsCount: Array.isArray(widget.items) ? widget.items.length : 0,
              };
              // Keep first 10 widgets in debug (more for non-property diagnosis)
              if (wi < 10) debug.widgets.push(widgetInfo);

              if (!widget.items || !Array.isArray(widget.items) || widget.items.length === 0) continue;
              // For non-property categories: widget types may differ (e.g., "horizontal-cards", "grid", etc.)
              // Only skip known non-listing widget types
              const skipTypes = ['banner', 'ad', 'promotion', 'filter', 'category-filter', 'age-selector', 'download-app'];
              if (widget.type && typeof widget.type === 'string' && skipTypes.some(t => widget.type.toLowerCase().includes(t))) continue;

              for (const item of widget.items as Record<string, unknown>[]) {
                // Capture first item debug info
                if (!debug.firstItemSample) {
                  debug.firstItemKeys = Object.keys(item);
                  debug.firstItemSample = JSON.stringify(item).substring(0, 300);
                }

                const parsed = parseOpenSooqNextDataItem(item, seenUrls);
                if (!parsed) {
                  // Fallback: if item has no standard title but has widget label, try with label as title
                  if (!item.title && !item.highlights && !item.name && widget.label) {
                    const itemWithLabel = { ...item, title: widget.label };
                    const parsedWithLabel = parseOpenSooqNextDataItem(itemWithLabel, seenUrls);
                    if (parsedWithLabel) widgetListings.push(parsedWithLabel);
                  }
                  continue;
                }
                widgetListings.push(parsed);
              }
            }

            // Filter out category filter items (age selectors, etc.)
            const beforeFilter = widgetListings.length;
            const filtered = widgetListings.filter(l => {
              if (!l.title) return false;
              if (/^\d+\s*[-–]\s*\d+\s*(شهر|سنوات|سنة|أشهر)/.test(l.title)) return false;
              if (/^\d+\+\s*(شهر|سنة|سنوات|أشهر)/.test(l.title)) return false;
              return true;
            });
            debug.filterItemsRemoved = beforeFilter - filtered.length;

            if (filtered.length > 0) {
              debug.patternsUsed.push('p3_landing_api_widgets');
              debug.totalFromEachPattern['p3_landing_api_widgets'] = filtered.length;
              const combined = [...listings, ...filtered];
              debug.finalListingCount = combined.length;
              debug.sampleListings = combined.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
              // If we got 10+ listings from widgets, this is authoritative — return immediately
              return { listings: combined, debug };
            }
          }

          // ═══ FALLBACK A: Search ALL landingApiResponse keys for listing-like arrays ═══
          // Non-property categories may store listings under different keys
          if (landingApi && typeof landingApi === 'object') {
            for (const [laKey, laVal] of Object.entries(landingApi as Record<string, unknown>)) {
              if (laKey === 'listings') continue; // Already processed above
              if (Array.isArray(laVal) && laVal.length > 0) {
                // Check if items look like listings (have id/post_url)
                const first = laVal[0] as Record<string, unknown> | null;
                if (first && typeof first === 'object') {
                  const keys = Object.keys(first);
                  const looksLikeListing = keys.some(k => /^(id|post_url|post_id|url|link)$/i.test(k)) &&
                    keys.some(k => /^(title|name|highlights|subject|price)$/i.test(k));
                  if (looksLikeListing) {
                    debug.patternsUsed.push(`p3_landingApi_${laKey}`);
                    const fallbackWidgetListings: ListPageListing[] = [];
                    for (const item of laVal as Record<string, unknown>[]) {
                      const parsed = parseOpenSooqNextDataItem(item, seenUrls);
                      if (parsed) fallbackWidgetListings.push(parsed);
                    }
                    if (fallbackWidgetListings.length > 0) {
                      debug.totalFromEachPattern[`p3_landingApi_${laKey}`] = fallbackWidgetListings.length;
                      const combined = [...listings, ...fallbackWidgetListings];
                      debug.finalListingCount = combined.length;
                      debug.sampleListings = combined.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
                      return { listings: combined, debug };
                    }
                  }
                }
              }
              // Also check nested objects: landingApi.someKey.items/data/listings
              if (laVal && typeof laVal === 'object' && !Array.isArray(laVal)) {
                for (const [subKey, subVal] of Object.entries(laVal as Record<string, unknown>)) {
                  if (Array.isArray(subVal) && subVal.length >= 2) {
                    const first = subVal[0] as Record<string, unknown> | null;
                    if (first && typeof first === 'object') {
                      const keys = Object.keys(first);
                      const looksLikeListing = keys.some(k => /^(id|post_url|post_id|url|link)$/i.test(k));
                      if (looksLikeListing) {
                        const fallbackItems: ListPageListing[] = [];
                        for (const item of subVal as Record<string, unknown>[]) {
                          const parsed = parseOpenSooqNextDataItem(item, seenUrls);
                          if (parsed) fallbackItems.push(parsed);
                        }
                        if (fallbackItems.length > 0) {
                          debug.patternsUsed.push(`p3_landingApi_${laKey}.${subKey}`);
                          debug.totalFromEachPattern[`p3_landingApi_${laKey}.${subKey}`] = fallbackItems.length;
                          const combined = [...listings, ...fallbackItems];
                          debug.finalListingCount = combined.length;
                          debug.sampleListings = combined.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
                          return { listings: combined, debug };
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // ═══ FALLBACK B: Try known flat keys in pageProps ═══
          // Only if landing API widgets didn't produce results
          const knownKeys = [
            'listings', 'posts', 'ads', 'items', 'results', 'serpData',
            'searchResults', 'initialData', 'postList', 'adsList',
          ];
          for (const key of knownKeys) {
            const val = props[key];
            if (Array.isArray(val) && val.length > 0) {
              const parsed = parseOpenSooqJson({ data: val });
              if (parsed.length > 0) {
                debug.patternsUsed.push(`p3_flat_${key}`);
                debug.totalFromEachPattern[`p3_flat_${key}`] = parsed.length;
                debug.finalListingCount = parsed.length;
                debug.sampleListings = parsed.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
                return { listings: parsed, debug };
              }
            }
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              for (const subKey of ['listings', 'data', 'items', 'posts', 'results', 'list']) {
                const subVal = (val as Record<string, unknown>)[subKey];
                if (Array.isArray(subVal) && subVal.length > 0) {
                  const parsed = parseOpenSooqJson({ data: subVal });
                  if (parsed.length > 0) {
                    debug.patternsUsed.push(`p3_nested_${key}.${subKey}`);
                    debug.totalFromEachPattern[`p3_nested_${key}.${subKey}`] = parsed.length;
                    debug.finalListingCount = parsed.length;
                    debug.sampleListings = parsed.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
                    return { listings: parsed, debug };
                  }
                }
              }
            }
          }

          // ═══ FALLBACK C: Search all pageProps for arrays with id + price (broader) ═══
          // For non-property categories where data may be in unexpected keys
          const allArrays = findAllObjectArrays(props, 'pageProps', 4);
          for (const { path, items: foundItems } of allArrays) {
            // Skip known non-listing paths
            if (/translations|ageSelect|filter|facet|menu|navigation|breadcrumb|seo|meta/i.test(path)) continue;
            // Check if items have id + price or id + post_url
            const sample = foundItems[0] as Record<string, unknown>;
            const sampleKeys = Object.keys(sample);
            const hasIdLike = sampleKeys.some(k => /^(id|post_id)$/i.test(k));
            const hasPriceLike = sampleKeys.some(k => /^(price|amount|asking_price)$/i.test(k));
            const hasUrlLike = sampleKeys.some(k => /^(post_url|url|link|uri|href)$/i.test(k));

            if (hasIdLike && (hasPriceLike || hasUrlLike)) {
              const parsedItems: ListPageListing[] = [];
              for (const item of foundItems as Record<string, unknown>[]) {
                const parsed = parseOpenSooqNextDataItem(item, seenUrls);
                if (parsed) parsedItems.push(parsed);
              }
              if (parsedItems.length > 0) {
                debug.patternsUsed.push(`p3_broad_${path}`);
                debug.totalFromEachPattern[`p3_broad_${path}`] = parsedItems.length;
                const combined = [...listings, ...parsedItems];
                debug.finalListingCount = combined.length;
                debug.sampleListings = combined.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
                return { listings: combined, debug };
              }
            }
          }

          // Deep recursive search — but exclude known non-listing paths
          const foundArrays = findListingArrays(props, 'pageProps', 3);
          for (const { path, items: foundItems } of foundArrays) {
            // Skip translation/filter arrays that contain age selectors, not listings
            if (/translations|ageSelect|filter|facet/i.test(path)) continue;
            const parsed = parseOpenSooqJson({ data: foundItems });
            if (parsed.length > 0) {
              debug.patternsUsed.push(`p3_deep_${path}`);
              debug.totalFromEachPattern[`p3_deep_${path}`] = parsed.length;
              debug.finalListingCount = parsed.length;
              debug.sampleListings = parsed.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
              return { listings: parsed, debug };
            }
          }
        }

        // Check outside pageProps — but exclude translation/filter paths
        if (nextData?.props) {
          const foundArrays = findListingArrays(nextData.props, 'props', 4);
          for (const { path, items: foundItems } of foundArrays) {
            if (path.includes('pageProps')) continue;
            // Skip translation/filter arrays
            if (/translations|ageSelect|filter|facet/i.test(path)) continue;
            const parsed = parseOpenSooqJson({ data: foundItems });
            if (parsed.length > 0) {
              debug.patternsUsed.push(`p3_outside_${path}`);
              debug.totalFromEachPattern[`p3_outside_${path}`] = parsed.length;
              debug.finalListingCount = parsed.length;
              debug.sampleListings = parsed.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));
              return { listings: parsed, debug };
            }
          }
        }
      } catch (e) {
        debug.patternsUsed.push('p3_error: ' + (e instanceof Error ? e.message : String(e)));
      }
    }
  }

  // ═══ Pattern 4: JSON-LD structured data ═══
  if (listings.length < 5) {
    let p4Count = 0;
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const ldItems = Array.isArray(ld) ? ld : [ld];

        for (const ldObj of ldItems) {
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
                url: fullUrl, title,
                price: price ? parseFloat(String(price)) : null,
                currency: inner.offers?.priceCurrency || "EGP",
                thumbnailUrl: imageUrl,
                location: inner.contentLocation?.name || inner.address?.addressLocality || "",
                dateText: inner.datePublished || inner.dateCreated || "",
                sellerName: inner.seller?.name || inner.author?.name || null,
                sellerProfileUrl: inner.seller?.url || null, sellerAvatarUrl: null,
                isVerified: false, isBusiness: false, isFeatured: false,
                supportsExchange: false, isNegotiable: false,
                category: inner.category || null,
                isLikelyBuyRequest: detectBuyRequest(title),
              });
              p4Count++;
            }
          }

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
                  url: fullUrl, title,
                  price: price ? parseFloat(String(price)) : null,
                  currency: ldObj.offers?.priceCurrency || ldObj.priceCurrency || "EGP",
                  thumbnailUrl: imageUrl,
                  location: ldObj.contentLocation?.name || ldObj.address?.addressLocality || "",
                  dateText: ldObj.datePublished || "",
                  sellerName: ldObj.seller?.name || null, sellerProfileUrl: null, sellerAvatarUrl: null,
                  isVerified: false, isBusiness: false, isFeatured: false,
                  supportsExchange: false, isNegotiable: false,
                  category: ldObj.category || null,
                  isLikelyBuyRequest: detectBuyRequest(title),
                });
                p4Count++;
              }
            }
          }
        }
      } catch {
        // JSON-LD parse error
      }
    }
    if (p4Count > 0) {
      debug.patternsUsed.push('p4_json_ld');
      debug.totalFromEachPattern['p4_json_ld'] = p4Count;
    }
  }

  debug.finalListingCount = listings.length;
  debug.sampleListings = listings.slice(0, 3).map(l => ({ title: l.title, url: l.url, price: l.price }));

  return { listings, debug };
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

/**
 * Parse a single item from OpenSooq __NEXT_DATA__ into a listing.
 * Works with both property and non-property category item formats.
 */
function parseOpenSooqNextDataItem(
  item: Record<string, unknown>,
  seenUrls: Set<string>
): ListPageListing | null {
  const OPENSOOQ = "https://eg.opensooq.com";

  // Skip items without id or post_url (not real listings)
  if (!item.id && !item.post_url && !item.url && !item.link) return null;

  // Title: try multiple field names
  const title = (item.highlights as string) || (item.title as string) || (item.name as string) ||
    (item.label as string) || (item.subject as string) || (item.post_title as string) || '';
  if (!title || title.length < 3) return null;

  // URL
  let url = '';
  for (const key of ['post_url', 'uri', 'url', 'link', 'href', 'detail_url']) {
    if (item[key]) {
      const rawUrl = item[key] as string;
      url = rawUrl.startsWith('http') ? rawUrl : `${OPENSOOQ}${rawUrl}`;
      break;
    }
  }
  if (!url && item.id) {
    url = `${OPENSOOQ}/ar/post/${item.id}`;
  }
  if (!url) return null;
  if (seenUrls.has(url)) return null;
  seenUrls.add(url);

  // Price
  let price: number | null = null;
  const rawPrice = item.price ?? item.amount ?? item.asking_price;
  if (rawPrice !== undefined && rawPrice !== null) {
    if (typeof rawPrice === 'number') price = rawPrice;
    else price = parsePrice(String(rawPrice));
  }

  // Image
  let thumbnailUrl: string | null = null;
  if (item.image) {
    const imgStr = typeof item.image === 'string' ? item.image :
      (item.image as Record<string, unknown>)?.url as string || null;
    if (imgStr) {
      thumbnailUrl = imgStr.startsWith('http') ? imgStr :
        `https://opensooq-images.os-cdn.com/previews/700x0/${imgStr}`;
    }
  } else if (item.img) {
    thumbnailUrl = item.img as string;
  } else if (item.photo) {
    thumbnailUrl = item.photo as string;
  } else if (item.thumbnail) {
    thumbnailUrl = item.thumbnail as string;
  } else if (item.images && Array.isArray(item.images) && (item.images as unknown[]).length > 0) {
    const firstImg = (item.images as Record<string, unknown>[])[0];
    thumbnailUrl = typeof firstImg === 'string' ? firstImg : (firstImg?.url as string) || null;
  }

  // Location
  const locationParts = [
    item.nhood_reporting as string,
    item.city_reporting as string,
    item.city_name as string,
    item.city as string,
    item.location as string,
    item.neighborhood as string,
    item.area as string,
  ].filter(Boolean);
  const location = Array.from(new Set(locationParts)).join(', ');

  const isLikelyBuyRequest = detectBuyRequest(title);
  const sellerName = cleanSellerName(
    (item.member_name as string) || (item.owner_name as string) || (item.seller as string) || null
  );

  const category = (item.cat2_code as string) || (item.cat1_code as string) ||
    (item.category_name as string) || (item.category as string) || null;

  return {
    url, title: title.trim(), price, currency: 'EGP', thumbnailUrl, location,
    dateText: (item.created_at as string) || (item.date as string) || (item.post_date as string) || '',
    sellerName,
    sellerProfileUrl: item.member_id ? `${OPENSOOQ}/ar/profile/${item.member_id}` : null,
    sellerAvatarUrl: (item.member_image as string) || null,
    isVerified: !!(item.is_verified || item.verified),
    isBusiness: !!(item.is_business),
    isFeatured: !!(item.is_featured || item.featured || item.is_premium),
    supportsExchange: title.includes('تبادل') || title.includes('بدل'),
    isNegotiable: !!(item.is_negotiable) || title.includes('قابل للتفاوض'),
    category,
    isLikelyBuyRequest,
  };
}

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
 * Recursively search an object for ANY arrays of objects (broader than findListingArrays).
 * Used as a fallback for non-property categories where data structure differs.
 */
function findAllObjectArrays(
  obj: unknown,
  path: string,
  maxDepth: number
): { path: string; items: Record<string, unknown>[] }[] {
  const results: { path: string; items: Record<string, unknown>[] }[] = [];
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return results;

  if (Array.isArray(obj)) {
    if (obj.length >= 3) { // At least 3 items to be a useful listing array
      const first = obj[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        const keys = Object.keys(first as Record<string, unknown>);
        // Must have at least 3 fields to look like real data
        if (keys.length >= 3) {
          results.push({ path, items: obj as Record<string, unknown>[] });
        }
      }
    }
    for (let i = 0; i < Math.min(obj.length, 2); i++) {
      results.push(...findAllObjectArrays(obj[i], `${path}[${i}]`, maxDepth - 1));
    }
  } else {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        results.push(...findAllObjectArrays(value, `${path}.${key}`, maxDepth - 1));
      }
    }
  }

  return results;
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
