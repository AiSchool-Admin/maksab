/**
 * Deep Debug OpenSooq Endpoint — تحليل عميق لهيكل البيانات
 * GET /api/admin/crm/harvester/debug-opensooq-deep?url=https://eg.opensooq.com/ar/cairo/electronics
 *
 * يعمل fetch لصفحة OpenSooq ويرجع تحليل مفصل للـ __NEXT_DATA__ structure
 * مصمم خصيصاً لتشخيص لماذا بعض الفئات ترجع 0 إعلانات
 */

import { NextRequest, NextResponse } from "next/server";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";

export const maxDuration = 60;

interface DeepSearchResult {
  path: string;
  length: number;
  sampleKeys: string[];
  sample: string;
}

interface WidgetDetail {
  label: string;
  type: string;
  itemsCount: number;
  firstItemKeys: string[];
  firstItemSample: string;
}

interface LandingApiDetail {
  type: string;
  isArray: boolean;
  length: number;
  sampleKeys: string[];
  sample: string;
}

function describeValue(val: unknown): LandingApiDetail {
  const type = Array.isArray(val) ? 'array' : typeof val;
  const isArray = Array.isArray(val);
  let length = 0;
  let sampleKeys: string[] = [];
  let sample = '';

  if (isArray) {
    length = (val as unknown[]).length;
    if (length > 0) {
      const first = (val as unknown[])[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        sampleKeys = Object.keys(first as Record<string, unknown>).slice(0, 20);
      }
      try { sample = JSON.stringify(first).substring(0, 300); } catch { sample = '[serialization error]'; }
    }
  } else if (val && typeof val === 'object') {
    sampleKeys = Object.keys(val as Record<string, unknown>).slice(0, 20);
    try { sample = JSON.stringify(val).substring(0, 300); } catch { sample = '[serialization error]'; }
  } else {
    sample = String(val).substring(0, 300);
  }

  return { type, isArray, length, sampleKeys, sample };
}

/**
 * Deep recursive search for arrays containing items with id/price-like fields
 */
function deepSearchListingArrays(
  obj: unknown,
  path: string,
  maxDepth: number,
  results: DeepSearchResult[]
): void {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    if (obj.length >= 2) {
      const first = obj[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        const keys = Object.keys(first as Record<string, unknown>);
        // Check if this looks like listing data
        const hasId = keys.some(k => /^(id|post_id|ad_id|_id)$/i.test(k));
        const hasPrice = keys.some(k => /^(price|amount|asking_price|cost)$/i.test(k));
        const hasUrl = keys.some(k => /^(post_url|url|link|uri|href|detail_url|slug)$/i.test(k));
        const hasTitle = keys.some(k => /^(title|name|highlights|subject|label|post_title|text)$/i.test(k));
        const hasImage = keys.some(k => /^(image|img|photo|thumbnail|picture|media|images)$/i.test(k));

        if ((hasId || hasUrl) && (hasPrice || hasTitle || hasImage)) {
          let sample = '';
          try { sample = JSON.stringify(first).substring(0, 500); } catch { sample = '[error]'; }
          results.push({
            path,
            length: obj.length,
            sampleKeys: keys.slice(0, 25),
            sample,
          });
        }
      }
    }
    // Search inside first few elements
    for (let i = 0; i < Math.min(obj.length, 2); i++) {
      deepSearchListingArrays(obj[i], `${path}[${i}]`, maxDepth - 1, results);
    }
  } else {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        deepSearchListingArrays(value, `${path}.${key}`, maxDepth - 1, results);
      }
    }
  }
}

/**
 * Find all keys containing relevant keywords
 */
function findRelevantKeys(
  obj: unknown,
  path: string,
  maxDepth: number,
  results: string[]
): void {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < Math.min(obj.length, 2); i++) {
      findRelevantKeys(obj[i], `${path}[${i}]`, maxDepth - 1, results);
    }
  } else {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (/listing|post|item|ad|product|search|result|serp|card/i.test(key)) {
        const type = Array.isArray(value) ? `array(${(value as unknown[]).length})` : typeof value;
        results.push(`${path}.${key} [${type}]`);
      }
      if (value && typeof value === 'object') {
        findRelevantKeys(value, `${path}.${key}`, maxDepth - 1, results);
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({
        error: `HTTP ${response.status} ${response.statusText}`,
        url,
        duration_ms: Date.now() - startTime,
      });
    }

    const html = await response.text();

    // ═══ Extract __NEXT_DATA__ ═══
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    const hasNextData = !!nextDataMatch;
    let pagePropsKeys: string[] = [];
    let hasLandingApi = false;
    let landingApiKeys: string[] = [];
    const landingApiDetails: Record<string, LandingApiDetail> = {};
    let widgetCount = 0;
    const widgetDetails: WidgetDetail[] = [];
    const deepSearch: DeepSearchResult[] = [];
    const relevantKeys: string[] = [];

    // Also track categories/subcategories for mobile URL discovery
    let categoriesData: unknown = null;

    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const props = nextData?.props?.pageProps;
        if (props) {
          pagePropsKeys = Object.keys(props);

          // Check for categories data (for mobile URL discovery)
          // Search broadly for any category-related data
          for (const key of Object.keys(props)) {
            if (/categor|subcat|nav|menu|sidebar|breadcrumb|sections/i.test(key)) {
              try {
                const sample = JSON.stringify(props[key]).substring(0, 3000);
                categoriesData = categoriesData || {};
                (categoriesData as Record<string, unknown>)[key] = {
                  type: Array.isArray(props[key]) ? `array(${(props[key] as unknown[]).length})` : typeof props[key],
                  sample,
                };
              } catch { /* */ }
            }
          }
          // Also search in landingApiResponse for category data
          const la = props.landingApiResponse;
          if (la && typeof la === 'object') {
            for (const key of Object.keys(la as Record<string, unknown>)) {
              if (/categor|subcat|nav|filter|facet/i.test(key)) {
                try {
                  const sample = JSON.stringify((la as Record<string, unknown>)[key]).substring(0, 3000);
                  categoriesData = categoriesData || {};
                  (categoriesData as Record<string, unknown>)[`landingApi.${key}`] = {
                    type: Array.isArray((la as Record<string, unknown>)[key]) ?
                      `array(${((la as Record<string, unknown>)[key] as unknown[]).length})` :
                      typeof (la as Record<string, unknown>)[key],
                    sample,
                  };
                } catch { /* */ }
              }
            }
          }

          // ═══ Analyze landingApiResponse ═══
          const landingApi = props.landingApiResponse;
          hasLandingApi = !!landingApi;

          if (landingApi && typeof landingApi === 'object') {
            landingApiKeys = Object.keys(landingApi as Record<string, unknown>);

            // Detail for each key
            for (const [key, val] of Object.entries(landingApi as Record<string, unknown>)) {
              landingApiDetails[key] = describeValue(val);
            }

            // ═══ Widget analysis ═══
            if ((landingApi as Record<string, unknown>).listings && Array.isArray((landingApi as Record<string, unknown>).listings)) {
              const widgets = (landingApi as Record<string, unknown>).listings as Record<string, unknown>[];
              widgetCount = widgets.length;

              for (const widget of widgets) {
                const items = widget.items as unknown[] | undefined;
                const detail: WidgetDetail = {
                  label: (widget.label as string) || (widget.title as string) || '(no label)',
                  type: (widget.type as string) || (widget.widget_type as string) || '(no type)',
                  itemsCount: Array.isArray(items) ? items.length : 0,
                  firstItemKeys: [],
                  firstItemSample: '',
                };

                if (Array.isArray(items) && items.length > 0) {
                  const first = items[0];
                  if (first && typeof first === 'object') {
                    detail.firstItemKeys = Object.keys(first as Record<string, unknown>).slice(0, 25);
                    try { detail.firstItemSample = JSON.stringify(first).substring(0, 500); } catch { /* */ }
                  }
                }

                widgetDetails.push(detail);
              }
            }
          }

          // ═══ Deep search for listing arrays ═══
          deepSearchListingArrays(props, 'pageProps', 6, deepSearch);

          // ═══ Find relevant keys ═══
          findRelevantKeys(props, 'pageProps', 5, relevantKeys);
        }
      } catch (e) {
        return NextResponse.json({
          url,
          error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
          htmlLength: html.length,
          hasNextData: true,
          duration_ms: Date.now() - startTime,
        });
      }
    }

    // ═══ Also check for category/subcategory links in the HTML ═══
    const categoryLinks: string[] = [];
    const catLinkRe = /href="(\/ar\/[^"]*(?:mobil|phone|هواتف|موبايل|جوال|electronic|سيار|car|vehicle|أثاث|furni|home-garden|fashion|أزياء)[^"]*)"/gi;
    let m;
    while ((m = catLinkRe.exec(html)) !== null) {
      if (!categoryLinks.includes(m[1])) categoryLinks.push(m[1]);
    }

    // ═══ Run the actual parser and report results ═══
    let parserResult: {
      listingsCount: number;
      patternsUsed: string[];
      totalFromEachPattern: Record<string, number>;
      sampleListings: { title: string; url: string; price: number | null }[];
      rejectedItemsSample: { keys: string[]; sample: string; reason: string }[];
      deepSearchResults: { path: string; length: number; sampleKeys: string[] }[];
      relevantKeys: string[];
    } | null = null;
    try {
      const { parseOpenSooqListWithDebug } = await import("@/lib/crm/harvester/parsers/opensooq");
      const result = parseOpenSooqListWithDebug(html);
      parserResult = {
        listingsCount: result.listings.length,
        patternsUsed: result.debug.patternsUsed,
        totalFromEachPattern: result.debug.totalFromEachPattern,
        sampleListings: result.debug.sampleListings,
        rejectedItemsSample: result.debug.rejectedItemsSample,
        deepSearchResults: result.debug.deepSearchResults,
        relevantKeys: result.debug.relevantKeys,
      };
    } catch { /* parser error */ }

    return NextResponse.json({
      url,
      htmlLength: html.length,
      hasNextData,
      pagePropsKeys,
      hasLandingApi,
      landingApiKeys,
      landingApiDetails,
      widgetCount,
      widgetDetails,
      deepSearch,
      relevantKeys,
      categoriesData,
      categoryLinks: categoryLinks.slice(0, 20),
      parserResult,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    return NextResponse.json({
      url,
      error: err instanceof Error ? err.message : String(err),
      duration_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}
