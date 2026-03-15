/**
 * Test OpenSooq Category URLs
 * GET /api/admin/crm/harvester/test-opensooq-categories
 *
 * Tests which OpenSooq URLs work for each category,
 * returning status + listing count + full debug info from __NEXT_DATA__
 */

import { NextResponse } from "next/server";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";
import { parseOpenSooqListWithDebug, type OpenSooqParseDebug } from "@/lib/crm/harvester/parsers/opensooq";

export const maxDuration = 60;

interface CategoryTest {
  name: string;
  urls: string[];
}

const CATEGORIES: CategoryTest[] = [
  {
    name: "electronics",
    urls: [
      "https://eg.opensooq.com/ar/cairo/electronics",
      "https://eg.opensooq.com/ar/cairo/computers-accessories",
      "https://eg.opensooq.com/ar/cairo/mobiles-tablets",
      "https://eg.opensooq.com/ar/cairo/tv-audio-video",
    ],
  },
  {
    name: "vehicles",
    urls: [
      "https://eg.opensooq.com/ar/cairo/cars",
      "https://eg.opensooq.com/ar/cairo/vehicles",
      "https://eg.opensooq.com/ar/cairo/cars-vehicles",
      "https://eg.opensooq.com/ar/cairo/motorcycles",
    ],
  },
  {
    name: "furniture",
    urls: [
      "https://eg.opensooq.com/ar/cairo/furniture",
      "https://eg.opensooq.com/ar/cairo/home-furniture",
      "https://eg.opensooq.com/ar/cairo/home-garden",
    ],
  },
  {
    name: "fashion",
    urls: [
      "https://eg.opensooq.com/ar/cairo/fashion",
      "https://eg.opensooq.com/ar/cairo/clothing",
      "https://eg.opensooq.com/ar/cairo/fashion-beauty",
    ],
  },
  {
    name: "services",
    urls: [
      "https://eg.opensooq.com/ar/cairo/services",
      "https://eg.opensooq.com/ar/cairo/jobs",
    ],
  },
  {
    name: "properties",
    urls: [
      "https://eg.opensooq.com/ar/cairo/properties",
      "https://eg.opensooq.com/ar/cairo/properties-for-sale",
      "https://eg.opensooq.com/ar/cairo/properties-for-rent",
      "https://eg.opensooq.com/ar/cairo/real-estate",
    ],
  },
  {
    name: "kids",
    urls: [
      "https://eg.opensooq.com/ar/cairo/kids-baby",
      "https://eg.opensooq.com/ar/cairo/babies-kids",
    ],
  },
  {
    name: "sports",
    urls: [
      "https://eg.opensooq.com/ar/cairo/sports",
      "https://eg.opensooq.com/ar/cairo/sports-fitness",
    ],
  },
  {
    name: "pets",
    urls: [
      "https://eg.opensooq.com/ar/cairo/animals-birds",
      "https://eg.opensooq.com/ar/cairo/pets",
    ],
  },
  {
    name: "industrial",
    urls: [
      "https://eg.opensooq.com/ar/cairo/industrial",
      "https://eg.opensooq.com/ar/cairo/equipment-tools",
    ],
  },
];

interface UrlResult {
  url: string;
  status: number | null;
  listingsCount: number;
  error: string | null;
  patternsUsed: string[];
  htmlLength: number;
  redirectUrl: string | null;
  /** Full debug info when 0 listings — helps diagnose non-property categories */
  debug: OpenSooqParseDebug | null;
}

interface CategoryResult {
  name: string;
  workingUrls: UrlResult[];
  failedUrls: UrlResult[];
}

export async function GET() {
  const startTime = Date.now();
  const results: CategoryResult[] = [];

  for (const category of CATEGORIES) {
    // Time guard
    if (Date.now() - startTime > 50000) break;

    const categoryResult: CategoryResult = {
      name: category.name,
      workingUrls: [],
      failedUrls: [],
    };

    for (const url of category.urls) {
      if (Date.now() - startTime > 50000) break;

      const urlResult: UrlResult = {
        url,
        status: null,
        listingsCount: 0,
        error: null,
        patternsUsed: [],
        htmlLength: 0,
        redirectUrl: null,
        debug: null,
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: BROWSER_HEADERS,
          redirect: "follow",
        });
        clearTimeout(timeout);

        urlResult.status = response.status;
        if (response.redirected) {
          urlResult.redirectUrl = response.url;
        }

        if (response.ok) {
          const html = await response.text();
          urlResult.htmlLength = html.length;

          const { listings, debug } = parseOpenSooqListWithDebug(html);
          urlResult.listingsCount = listings.length;
          urlResult.patternsUsed = debug.patternsUsed;

          // Always include debug for failed URLs (0 listings)
          // For working URLs, include only sample listings
          if (listings.length > 0) {
            urlResult.debug = {
              ...debug,
              // Truncate for successful — keep key fields
              firstItemSample: debug.firstItemSample?.substring(0, 200) || null,
            };
            categoryResult.workingUrls.push(urlResult);
          } else {
            // Full debug for failed — this is key for diagnosing non-property categories
            urlResult.debug = debug;
            urlResult.error = `0 listings parsed (nextData: ${debug.hasNextData}, landingApi: ${debug.hasLandingApi}, widgets: ${debug.widgetCount}, pagePropsKeys: ${debug.nextDataPagePropsKeys.join(",")})`;
            categoryResult.failedUrls.push(urlResult);
          }
        } else {
          urlResult.error = `HTTP ${response.status}`;
          categoryResult.failedUrls.push(urlResult);
        }
      } catch (err) {
        urlResult.error = err instanceof Error ? err.message : String(err);
        categoryResult.failedUrls.push(urlResult);
      }
    }

    results.push(categoryResult);
  }

  // Summary
  const summary = results.map((r) => ({
    category: r.name,
    working: r.workingUrls.length,
    failed: r.failedUrls.length,
    bestUrl: r.workingUrls.length > 0
      ? r.workingUrls.sort((a, b) => b.listingsCount - a.listingsCount)[0]
      : null,
  }));

  return NextResponse.json({
    duration_ms: Date.now() - startTime,
    summary,
    details: results,
  });
}
