/**
 * Debug Platform API — تشخيص سريع لمشاكل الـ parsing
 * GET /api/admin/crm/harvester/debug-platform?url=https://eg.opensooq.com/ar/cairo/real-estate
 *
 * يرجع:
 *   - أول 2000 حرف من HTML
 *   - __NEXT_DATA__ keys (لو موجود)
 *   - JSON-LD content (لو موجود)
 *   - CSS classes الموجودة (listing cards)
 *   - عدد <a> tags + <article> tags + <div class="...card...">
 *   - Parser result (عدد الإعلانات المستخرجة)
 */

import { NextRequest, NextResponse } from "next/server";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";
import { getParser, hasPlatformParser } from "@/lib/crm/harvester/parsers/platform-router";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter مطلوب" }, { status: 400 });
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
        headers: Object.fromEntries(response.headers.entries()),
        duration_ms: Date.now() - startTime,
      });
    }

    const html = await response.text();

    // ═══ 1. HTML Preview (first 2000 chars) ═══
    const htmlPreview = html.slice(0, 2000);

    // ═══ 2. __NEXT_DATA__ analysis ═══
    let nextDataInfo: Record<string, unknown> | null = null;
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps || {};
        const pagePropsKeys = Object.keys(pageProps);

        // Analyze each key's type and size
        const keysAnalysis: Record<string, { type: string; length?: number; sample?: unknown }> = {};
        for (const key of pagePropsKeys) {
          const val = pageProps[key];
          if (Array.isArray(val)) {
            keysAnalysis[key] = {
              type: "array",
              length: val.length,
              sample: val.length > 0 ? summarizeObject(val[0]) : null,
            };
          } else if (val && typeof val === "object") {
            const subKeys = Object.keys(val);
            keysAnalysis[key] = {
              type: "object",
              length: subKeys.length,
              sample: subKeys.slice(0, 15),
            };
            // Check for nested arrays
            for (const subKey of subKeys) {
              const subVal = (val as Record<string, unknown>)[subKey];
              if (Array.isArray(subVal) && subVal.length > 0) {
                keysAnalysis[`${key}.${subKey}`] = {
                  type: "array",
                  length: subVal.length,
                  sample: summarizeObject(subVal[0]),
                };
              }
            }
          } else {
            keysAnalysis[key] = {
              type: typeof val,
              sample: typeof val === "string" ? val.slice(0, 100) : val,
            };
          }
        }

        // Find all arrays that look like listings (recursive)
        const listingArrays = findArraysWithTitles(pageProps, "pageProps", 4);

        nextDataInfo = {
          has_next_data: true,
          build_id: nextData?.buildId,
          page: nextData?.page,
          pageProps_keys: pagePropsKeys,
          keys_analysis: keysAnalysis,
          listing_arrays_found: listingArrays,
          raw_json_size: nextDataMatch[1].length,
        };
      } catch (e) {
        nextDataInfo = {
          has_next_data: true,
          parse_error: e instanceof Error ? e.message : String(e),
          raw_json_preview: nextDataMatch[1].slice(0, 500),
        };
      }
    } else {
      nextDataInfo = { has_next_data: false };
    }

    // ═══ 3. JSON-LD content ═══
    const jsonLdItems: unknown[] = [];
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        jsonLdItems.push({
          type: ld["@type"],
          keys: Object.keys(ld).slice(0, 20),
          item_count: ld.itemListElement?.length || ld.numberOfItems || null,
          sample: ld["@type"] === "ItemList" && ld.itemListElement?.[0]
            ? summarizeObject(ld.itemListElement[0])
            : null,
        });
      } catch {
        jsonLdItems.push({ raw_preview: m[1].slice(0, 300), parse_error: true });
      }
    }

    // ═══ 4. HTML structure analysis ═══
    const aTags = (html.match(/<a\b/gi) || []).length;
    const articleTags = (html.match(/<article\b/gi) || []).length;
    const cardDivs = (html.match(/<div[^>]*class="[^"]*card[^"]*"/gi) || []).length;
    const listingDivs = (html.match(/<div[^>]*class="[^"]*listing[^"]*"/gi) || []).length;
    const itemDivs = (html.match(/<div[^>]*class="[^"]*item[^"]*"/gi) || []).length;
    const postDivs = (html.match(/<div[^>]*class="[^"]*post[^"]*"/gi) || []).length;
    const sectionTags = (html.match(/<section\b/gi) || []).length;

    // Extract unique CSS classes that might be listing-related
    const classMatches = html.matchAll(/class="([^"]+)"/gi);
    const listingClasses = new Set<string>();
    for (const cm of classMatches) {
      const classes = cm[1].split(/\s+/);
      for (const cls of classes) {
        if (/(?:listing|card|item|post|product|serp|result|ad-|grid-item|block.*Color)/i.test(cls)) {
          listingClasses.add(cls);
        }
      }
    }

    // Check for serpMainContent
    const hasSerpSection = /id=["']serpMainContent["']/i.test(html);
    const serpContentPreview = hasSerpSection
      ? html.match(/<section[^>]*id=["']serpMainContent["'][^>]*>([\s\S]{0,1000})/i)?.[1]?.slice(0, 500)
      : null;

    // ═══ 5. Try parser ═══
    const platform = detectPlatformFromUrl(url);
    const hasParser = hasPlatformParser(platform.id);
    let parserResult: { count: number; sample_titles: string[]; error?: string } = {
      count: 0,
      sample_titles: [],
    };

    if (hasParser) {
      try {
        const parser = getParser(platform.id);
        const listings = parser.parseList(html);
        parserResult = {
          count: listings.length,
          sample_titles: listings.slice(0, 5).map(l => `${l.title} | ${l.price || 'no price'} | ${l.url?.slice(0, 80)}`),
        };
      } catch (e) {
        parserResult = { count: 0, sample_titles: [], error: e instanceof Error ? e.message : String(e) };
      }
    }

    return NextResponse.json({
      url,
      platform,
      has_parser: hasParser,
      http_status: response.status,
      content_type: response.headers.get("content-type"),
      html_size: html.length,
      html_preview: htmlPreview,
      next_data: nextDataInfo,
      json_ld: jsonLdItems.length > 0 ? jsonLdItems : null,
      html_structure: {
        a_tags: aTags,
        article_tags: articleTags,
        section_tags: sectionTags,
        card_divs: cardDivs,
        listing_divs: listingDivs,
        item_divs: itemDivs,
        post_divs: postDivs,
        has_serp_section: hasSerpSection,
        serp_content_preview: serpContentPreview,
        listing_related_classes: [...listingClasses].slice(0, 50),
      },
      parser_result: parserResult,
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

// ═══ Helpers ═══

function detectPlatformFromUrl(url: string): { id: string; name: string } {
  const map: Record<string, { id: string; name: string }> = {
    "dubizzle.com": { id: "dubizzle", name: "Dubizzle Egypt" },
    "opensooq.com": { id: "opensooq", name: "OpenSooq Egypt" },
    "hatla2ee.com": { id: "hatla2ee", name: "Hatla2ee Egypt" },
    "contactcars.com": { id: "contactcars", name: "ContactCars" },
    "carsemsar.com": { id: "carsemsar", name: "CarSemsar" },
    "aqarmap.com": { id: "aqarmap", name: "Aqarmap" },
    "propertyfinder.eg": { id: "propertyfinder", name: "Property Finder Egypt" },
    "yallamotor.com": { id: "yallamotor", name: "Yallamotor" },
    "dowwr.com": { id: "dowwr", name: "Dowwr" },
  };
  for (const [domain, platform] of Object.entries(map)) {
    if (url.includes(domain)) return platform;
  }
  return { id: "unknown", name: "Unknown" };
}

/**
 * Summarize an object for debug output (truncate long values)
 */
function summarizeObject(obj: unknown): Record<string, string> | unknown {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const summary: Record<string, string> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (val === null || val === undefined) {
      summary[key] = "null";
    } else if (typeof val === "string") {
      summary[key] = val.length > 80 ? `string(${val.length}): ${val.slice(0, 80)}...` : val;
    } else if (typeof val === "number" || typeof val === "boolean") {
      summary[key] = String(val);
    } else if (Array.isArray(val)) {
      summary[key] = `array(${val.length})`;
    } else if (typeof val === "object") {
      summary[key] = `object(${Object.keys(val as Record<string, unknown>).length} keys)`;
    }
  }
  return summary;
}

/**
 * Recursively find arrays that contain objects with title-like fields
 */
function findArraysWithTitles(
  obj: unknown,
  path: string,
  maxDepth: number
): { path: string; count: number; sample_keys: string[] }[] {
  const results: { path: string; count: number; sample_keys: string[] }[] = [];
  if (maxDepth <= 0 || !obj || typeof obj !== "object") return results;

  if (Array.isArray(obj)) {
    if (obj.length >= 2 && obj[0] && typeof obj[0] === "object" && !Array.isArray(obj[0])) {
      const keys = Object.keys(obj[0] as Record<string, unknown>);
      const hasTitle = keys.some(k =>
        /^(title|name|subject|headline|post_title|ad_title)$/i.test(k)
      );
      if (hasTitle) {
        results.push({ path, count: obj.length, sample_keys: keys.slice(0, 20) });
      }
    }
    // Check inside first few elements
    for (let i = 0; i < Math.min(obj.length, 2); i++) {
      results.push(...findArraysWithTitles(obj[i], `${path}[${i}]`, maxDepth - 1));
    }
  } else {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        results.push(...findArraysWithTitles(value, `${path}.${key}`, maxDepth - 1));
      }
    }
  }

  return results;
}
