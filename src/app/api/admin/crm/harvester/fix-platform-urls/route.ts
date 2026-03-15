/**
 * Fix Platform URLs — اختبار وإصلاح URLs المنصات المكسورة (404)
 * GET /api/admin/crm/harvester/fix-platform-urls
 *
 * يختبر عدة URLs لكل منصة ويحدّث harvest_platforms.base_url
 * لو كل URLs فشلت → يعلّم المنصة is_active = false
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";
import { getParser, hasPlatformParser } from "@/lib/crm/harvester/parsers/platform-router";

export const maxDuration = 60;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface PlatformTestUrls {
  platform: string;
  name: string;
  urls: string[];
}

const PLATFORMS_TO_TEST: PlatformTestUrls[] = [
  {
    platform: "propertyfinder",
    name: "PropertyFinder",
    urls: [
      "https://www.propertyfinder.eg/en/search?c=1&l=2",
      "https://www.propertyfinder.eg/en/buy/properties-for-sale-in-cairo.html",
      "https://www.propertyfinder.eg/en/buy/apartment-for-sale-in-cairo.html",
      "https://www.propertyfinder.eg/en/search?c=2&ob=mr&page=1",
      "https://www.propertyfinder.eg/en/plp/buy-in-cairo.html",
    ],
  },
  {
    platform: "carsemsar",
    name: "CarSemsar",
    urls: [
      "https://carsemsar.com/en/cars",
      "https://carsemsar.com/en/used-cars",
      "https://carsemsar.com/ar/cars",
      "https://carsemsar.com/search",
      "https://carsemsar.com/used-cars-for-sale",
    ],
  },
  {
    platform: "cairolink",
    name: "CairoLink",
    urls: [
      "https://cairolink.com/category/cars",
      "https://cairolink.com/اعلانات/سيارات",
      "https://cairolink.com/ads/cars",
      "https://cairolink.com/سيارات",
      "https://cairolink.com/category/عقارات",
    ],
  },
  {
    platform: "soq24",
    name: "Soq24",
    urls: [
      "http://soq24.com/adsCountry/2",
      "http://soq24.com/ads/egypt",
      "http://soq24.com/category/موبايلات",
      "http://soq24.com/adsCategory/22",
      "http://soq24.com/ads/mobiles",
    ],
  },
  {
    platform: "bezaat",
    name: "Bezaat",
    urls: [
      "https://www.bezaat.com/egypt/cairo",
      "https://bezaat.com/egypt",
      "http://bezaat.com/egypt/cairo",
      "https://www.bezaat.com/مصر",
    ],
  },
];

interface UrlTestResult {
  url: string;
  status: number;
  bodyLength: number;
  articlesFound: number;
  parsedListings: number;
  sampleTitles: string[];
  error?: string;
  redirectedTo?: string;
}

interface PlatformResult {
  platform: string;
  name: string;
  urlResults: UrlTestResult[];
  bestUrl: string | null;
  bestUrlListings: number;
  action: "fixed" | "still_broken" | "skipped";
}

async function testUrl(
  url: string,
  platformId: string,
  timeoutMs = 12000
): Promise<UrlTestResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);

    const finalUrl = response.url;
    const redirectedTo = finalUrl !== url ? finalUrl : undefined;

    if (!response.ok) {
      return {
        url,
        status: response.status,
        bodyLength: 0,
        articlesFound: 0,
        parsedListings: 0,
        sampleTitles: [],
        error: `HTTP ${response.status} ${response.statusText}`,
        redirectedTo,
      };
    }

    const html = await response.text();
    const articlesFound = (html.match(/<article\b/gi) || []).length;

    let parsedListings = 0;
    let sampleTitles: string[] = [];

    if (hasPlatformParser(platformId)) {
      try {
        const parser = getParser(platformId);
        const listings = parser.parseList(html);
        parsedListings = listings.length;
        sampleTitles = listings.slice(0, 3).map((l) => l.title.slice(0, 60));
      } catch {
        // parser error — still count HTML features
      }
    }

    // Fallback: count title-like elements
    if (parsedListings === 0) {
      const titleMatches = html.matchAll(/<h[23456][^>]*>([^<]{5,80})<\/h[23456]>/gi);
      for (const m of titleMatches) {
        sampleTitles.push(m[1].trim().slice(0, 60));
        if (sampleTitles.length >= 3) break;
      }
    }

    return {
      url,
      status: response.status,
      bodyLength: html.length,
      articlesFound,
      parsedListings,
      sampleTitles,
      redirectedTo,
    };
  } catch (err) {
    return {
      url,
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
  const platformFilter = req.nextUrl.searchParams.get("platform");
  const autoFix = req.nextUrl.searchParams.get("auto_fix") !== "false";
  const startTime = Date.now();

  const supabase = getServiceClient();
  const results: PlatformResult[] = [];
  const fixed: string[] = [];
  const stillBroken: string[] = [];

  const platformsToTest = platformFilter
    ? PLATFORMS_TO_TEST.filter((p) => p.platform === platformFilter)
    : PLATFORMS_TO_TEST;

  for (const platform of platformsToTest) {
    // Timeout guard
    if (Date.now() - startTime > 50000) {
      results.push({
        platform: platform.platform,
        name: platform.name,
        urlResults: [],
        bestUrl: null,
        bestUrlListings: 0,
        action: "skipped",
      });
      continue;
    }

    // Test URLs in parallel (max 3 concurrent)
    const urlResults: UrlTestResult[] = [];
    const chunks: string[][] = [];
    for (let i = 0; i < platform.urls.length; i += 3) {
      chunks.push(platform.urls.slice(i, i + 3));
    }

    for (const chunk of chunks) {
      if (Date.now() - startTime > 48000) break;
      const batch = await Promise.all(
        chunk.map((url) => testUrl(url, platform.platform))
      );
      urlResults.push(...batch);
    }

    // Find best URL (most parsed listings, then most articles, then 200 with content)
    let bestUrl: string | null = null;
    let bestScore = 0;

    for (const r of urlResults) {
      if (r.status !== 200) continue;
      const score = r.parsedListings * 100 + r.articlesFound * 10 + (r.bodyLength > 5000 ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestUrl = r.url;
      }
    }

    // If no URL had listings, pick any 200 with substantial content
    if (!bestUrl) {
      for (const r of urlResults) {
        if (r.status === 200 && r.bodyLength > 5000) {
          bestUrl = r.url;
          break;
        }
      }
    }

    const bestUrlListings = urlResults.find((r) => r.url === bestUrl)?.parsedListings || 0;

    // Auto-fix in database
    let action: "fixed" | "still_broken" | "skipped" = "still_broken";
    if (autoFix && bestUrl) {
      try {
        await supabase
          .from("harvest_platforms")
          .update({
            base_url: bestUrl,
            is_active: true,
            last_test_at: new Date().toISOString(),
            last_test_status: `OK — ${bestUrlListings} listings`,
          })
          .eq("id", platform.platform);
        action = "fixed";
        fixed.push(platform.platform);
      } catch {
        action = "still_broken";
        stillBroken.push(platform.platform);
      }
    } else if (!bestUrl) {
      if (autoFix) {
        try {
          await supabase
            .from("harvest_platforms")
            .update({
              is_active: false,
              last_test_at: new Date().toISOString(),
              last_test_status: "ALL URLs FAILED — deactivated",
            })
            .eq("id", platform.platform);
        } catch {
          // ignore
        }
      }
      stillBroken.push(platform.platform);
    } else {
      fixed.push(platform.platform);
    }

    results.push({
      platform: platform.platform,
      name: platform.name,
      urlResults,
      bestUrl,
      bestUrlListings,
      action,
    });
  }

  return NextResponse.json({
    summary: {
      fixed,
      still_broken: stillBroken,
      total_tested: platformsToTest.length,
    },
    details: results,
    duration_ms: Date.now() - startTime,
  });
}
