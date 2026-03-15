/**
 * Debug OpenSooq Endpoint — تشخيص مشاكل الـ parsing
 * GET /api/admin/crm/harvester/debug-opensooq
 *
 * يعمل fetch لصفحة OpenSooq ويرجع تحليل مفصل للـ HTML structure
 * + يختبر URLs بديلة للموبايلات والسيارات
 */

import { NextRequest, NextResponse } from "next/server";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";
import { parseOpenSooqList } from "@/lib/crm/harvester/parsers/opensooq";

export const maxDuration = 60;

const DEFAULT_URL = "https://eg.opensooq.com/ar/cairo/real-estate";

// Alternative URLs to test for phones and cars
const PHONE_URLS = [
  "https://eg.opensooq.com/ar/egypt/mobiles",
  "https://eg.opensooq.com/ar/مصر/موبايلات",
  "https://eg.opensooq.com/ar/cairo/mobiles-tablets",
  "https://eg.opensooq.com/ar/القاهرة/هواتف",
  "https://eg.opensooq.com/ar/القاهرة/موبايلات",
  "https://eg.opensooq.com/ar/cairo/electronics",
  "https://eg.opensooq.com/ar/cairo/mobiles-and-tablets",
  "https://eg.opensooq.com/ar/egypt/electronics/mobile-phones",
];

const CAR_URLS = [
  "https://eg.opensooq.com/ar/cairo/cars",
  "https://eg.opensooq.com/ar/القاهرة/سيارات",
  "https://eg.opensooq.com/ar/cairo/vehicles",
  "https://eg.opensooq.com/ar/egypt/cars",
];

async function fetchUrl(url: string, timeoutMs = 15000): Promise<{
  status: number;
  bodyLength: number;
  articlesFound: number;
  parsedListings: number;
  sampleTitles: string[];
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        status: response.status,
        bodyLength: 0,
        articlesFound: 0,
        parsedListings: 0,
        sampleTitles: [],
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();
    const articlesFound = (html.match(/<article\b/gi) || []).length;

    let parsedListings = 0;
    let sampleTitles: string[] = [];
    try {
      const listings = parseOpenSooqList(html);
      parsedListings = listings.length;
      sampleTitles = listings.slice(0, 3).map((l) => l.title);
    } catch {
      // parser error
    }

    return {
      status: response.status,
      bodyLength: html.length,
      articlesFound,
      parsedListings,
      sampleTitles,
    };
  } catch (err) {
    return {
      status: 0,
      bodyLength: 0,
      articlesFound: 0,
      parsedListings: 0,
      sampleTitles: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || DEFAULT_URL;
  const testAlternatives = req.nextUrl.searchParams.get("test_alternatives") !== "false";
  const startTime = Date.now();

  try {
    // ═══ 1. Fetch and analyze the main URL ═══
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

    // ═══ 2. __NEXT_DATA__ analysis ═══
    let hasNextData = false;
    let nextDataKeys: string[] = [];
    const nextDataArrays: { key: string; length: number; sampleKeys: string[] }[] = [];

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      hasNextData = true;
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps || {};
        nextDataKeys = Object.keys(pageProps);

        // Find arrays recursively
        function findArrays(obj: Record<string, unknown>, prefix: string, depth: number) {
          if (depth <= 0) return;
          for (const [key, val] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (Array.isArray(val) && val.length > 0) {
              const sampleKeys =
                val[0] && typeof val[0] === "object" && !Array.isArray(val[0])
                  ? Object.keys(val[0] as Record<string, unknown>).slice(0, 15)
                  : [];
              nextDataArrays.push({ key: fullKey, length: val.length, sampleKeys });
            } else if (val && typeof val === "object" && !Array.isArray(val)) {
              findArrays(val as Record<string, unknown>, fullKey, depth - 1);
            }
          }
        }
        findArrays(pageProps, "", 4);
      } catch {
        // parse error
      }
    }

    // ═══ 3. JSON-LD types ═══
    const jsonLdTypes: string[] = [];
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item["@type"]) jsonLdTypes.push(item["@type"]);
        }
      } catch {
        // skip
      }
    }

    // ═══ 4. Article count ═══
    const articleCount = (html.match(/<article\b/gi) || []).length;

    // ═══ 5. Link patterns ═══
    const linkPatterns: { pattern: string; count: number }[] = [];
    // Count links with /ar/ + numeric IDs (listing links)
    const arNumericLinks = (html.match(/href="\/ar\/[^"]*\/\d{4,}\//gi) || []).length;
    linkPatterns.push({ pattern: '/ar/.../NUMERIC_ID/', count: arNumericLinks });
    // Links with "block blackColor p-16" class
    const blockLinks = (html.match(/class="[^"]*\bblock\b[^"]*\bblackColor\b[^"]*\bp-16\b[^"]*"/gi) || []).length;
    linkPatterns.push({ pattern: 'class="block blackColor p-16"', count: blockLinks });
    // Links with opensooq listing pattern
    const opensooqListingLinks = (html.match(/href="[^"]*opensooq\.com[^"]*\/\d{4,}\//gi) || []).length;
    linkPatterns.push({ pattern: "opensooq.com/.../{id}/", count: opensooqListingLinks });
    // All <a> tags
    const allLinks = (html.match(/<a\b/gi) || []).length;
    linkPatterns.push({ pattern: "<a> (total)", count: allLinks });

    // ═══ 6. serpMainContent ═══
    const serpMatch = html.match(/<section[^>]*id=["']serpMainContent["'][^>]*>([\s\S]*?)<\/section>/i);
    const serpMainContent = serpMatch ? serpMatch[1].slice(0, 500) : "NOT FOUND";

    // ═══ 7. Listing card classes ═══
    const listingCardClasses: string[] = [];
    const classMatches = html.matchAll(/class="([^"]+)"/gi);
    const seenClasses = new Set<string>();
    for (const cm of classMatches) {
      const cls = cm[1];
      if (/(?:card|listing|post|serp|product|grid-item|block.*Color|postItem)/i.test(cls)) {
        const normalized = cls.replace(/\s+/g, " ").trim();
        if (!seenClasses.has(normalized) && normalized.length < 200) {
          seenClasses.add(normalized);
          listingCardClasses.push(normalized);
        }
      }
    }

    // ═══ 8. Sample listing HTML ═══
    // Find first listing-like element
    let sampleListingHtml = "";
    // Try to get first <li> or <div> that looks like a listing card in serpMainContent
    const serpArea = serpMatch ? serpMatch[1] : html;
    const listingCardMatch = serpArea.match(
      /<(?:li|div|article)[^>]*class="[^"]*(?:postItem|listing|card|block\s+blackColor)[^"]*"[^>]*>[\s\S]*?<\/(?:li|div|article)>/i
    );
    if (listingCardMatch) {
      sampleListingHtml = listingCardMatch[0].slice(0, 1500);
    } else {
      // Fallback: first <a> with numeric ID in serp
      const firstListingLink = serpArea.match(
        /<a[^>]*href="\/ar\/[^"]*\/\d{4,}\/[^"]*"[^>]*>[\s\S]*?<\/a>/i
      );
      if (firstListingLink) {
        sampleListingHtml = firstListingLink[0].slice(0, 1500);
      }
    }

    // ═══ 9. Parser result ═══
    let parserResult: { count: number; sampleTitles: string[] } = { count: 0, sampleTitles: [] };
    try {
      const listings = parseOpenSooqList(html);
      parserResult = {
        count: listings.length,
        sampleTitles: listings.slice(0, 5).map((l) => `${l.title} | ${l.price || "no price"} | ${l.url?.slice(0, 80)}`),
      };
    } catch {
      // parser error
    }

    // ═══ 10. Test alternative URLs (phones + cars) ═══
    let alternativeUrlResults: Record<string, Awaited<ReturnType<typeof fetchUrl>>> | undefined;
    if (testAlternatives) {
      const allAltUrls = [
        ...PHONE_URLS.map((u) => ({ url: u, category: "phones" })),
        ...CAR_URLS.map((u) => ({ url: u, category: "cars" })),
      ];

      // Test them in parallel (max 6 concurrent)
      const results: Record<string, Awaited<ReturnType<typeof fetchUrl>>> = {};
      const chunks: typeof allAltUrls[] = [];
      for (let i = 0; i < allAltUrls.length; i += 6) {
        chunks.push(allAltUrls.slice(i, i + 6));
      }
      for (const chunk of chunks) {
        if (Date.now() - startTime > 45000) break; // timeout guard
        const batch = await Promise.all(
          chunk.map(async ({ url: testUrl, category }) => {
            const result = await fetchUrl(testUrl, 10000);
            return { key: `[${category}] ${testUrl}`, result };
          })
        );
        for (const { key, result } of batch) {
          results[key] = result;
        }
      }
      alternativeUrlResults = results;
    }

    return NextResponse.json({
      url,
      htmlLength: html.length,
      hasNextData,
      nextDataKeys,
      nextDataArrays,
      jsonLdTypes,
      articleCount,
      linkPatterns,
      serpMainContent,
      listingCardClasses: listingCardClasses.slice(0, 30),
      sampleListingHtml,
      parserResult,
      alternativeUrlResults,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    return NextResponse.json(
      {
        url,
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
