/**
 * Hatla2ee Alternative Access Methods
 * GET /api/admin/crm/harvester/test-hatla2ee-alternatives
 *
 * Tests multiple approaches to bypass Hatla2ee blocking:
 * 1. Direct API endpoints
 * 2. Google Cache
 * 3. Different request methods
 */

import { NextResponse } from "next/server";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";
import { parseHatla2eeList } from "@/lib/crm/harvester/parsers/hatla2ee";

export const maxDuration = 60;

interface TestResult {
  method: string;
  url: string;
  status: number | null;
  contentLength: number;
  listingsCount: number;
  contentType: string | null;
  error: string | null;
  snippet: string;
}

export async function GET() {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // ═══ Method 1: Direct API endpoints ═══
  const apiUrls = [
    "https://eg.hatla2ee.com/api/cars",
    "https://eg.hatla2ee.com/api/v1/cars",
    "https://api.hatla2ee.com/cars",
    "https://eg.hatla2ee.com/api/search?type=car",
    "https://eg.hatla2ee.com/api/v1/search?type=car",
    "https://eg.hatla2ee.com/api/listings",
    "https://eg.hatla2ee.com/api/v1/listings",
    // Mobile API patterns
    "https://eg.hatla2ee.com/api/mobile/cars",
    "https://eg.hatla2ee.com/mobile-api/cars",
    "https://m.hatla2ee.com/api/cars",
    // GraphQL
    "https://eg.hatla2ee.com/graphql",
  ];

  const apiHeaders: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36",
    "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8",
    Origin: "https://eg.hatla2ee.com",
    Referer: "https://eg.hatla2ee.com/en/car",
  };

  for (const url of apiUrls) {
    if (Date.now() - startTime > 45000) break;

    const result: TestResult = {
      method: "api",
      url,
      status: null,
      contentLength: 0,
      listingsCount: 0,
      contentType: null,
      error: null,
      snippet: "",
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: apiHeaders,
        redirect: "follow",
      });
      clearTimeout(timeout);

      result.status = response.status;
      result.contentType = response.headers.get("content-type");

      const text = await response.text();
      result.contentLength = text.length;
      result.snippet = text.substring(0, 200);

      // Try to parse as JSON
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        try {
          const json = JSON.parse(text);
          const items = json.data || json.results || json.cars || json.items || [];
          if (Array.isArray(items)) {
            result.listingsCount = items.length;
          }
        } catch { /* not JSON */ }
      }

      // Try as HTML
      if (result.listingsCount === 0 && text.includes("<html")) {
        const listings = parseHatla2eeList(text);
        result.listingsCount = listings.length;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    results.push(result);
  }

  // ═══ Method 2: Google Cache ═══
  const googleCacheUrls = [
    "https://webcache.googleusercontent.com/search?q=cache:eg.hatla2ee.com/en/car",
    "https://webcache.googleusercontent.com/search?q=cache:eg.hatla2ee.com/en/car/used-cars-for-sale",
  ];

  for (const url of googleCacheUrls) {
    if (Date.now() - startTime > 50000) break;

    const result: TestResult = {
      method: "google_cache",
      url,
      status: null,
      contentLength: 0,
      listingsCount: 0,
      contentType: null,
      error: null,
      snippet: "",
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          ...BROWSER_HEADERS,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      result.status = response.status;
      result.contentType = response.headers.get("content-type");

      const text = await response.text();
      result.contentLength = text.length;
      result.snippet = text.substring(0, 300).replace(/\n/g, "\\n");

      // Try parsing cached HTML
      const listings = parseHatla2eeList(text);
      result.listingsCount = listings.length;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    results.push(result);
  }

  // ═══ Method 3: Direct with different headers ═══
  const directUrls = [
    "https://eg.hatla2ee.com/en/car/used-cars-for-sale",
    "https://eg.hatla2ee.com/en/car",
  ];

  const headerVariants: { name: string; headers: Record<string, string> }[] = [
    {
      name: "mobile_ua",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ar-EG,ar;q=0.9",
      },
    },
    {
      name: "googlebot",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
    },
  ];

  for (const directUrl of directUrls) {
    for (const variant of headerVariants) {
      if (Date.now() - startTime > 52000) break;

      const result: TestResult = {
        method: `direct_${variant.name}`,
        url: directUrl,
        status: null,
        contentLength: 0,
        listingsCount: 0,
        contentType: null,
        error: null,
        snippet: "",
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(directUrl, {
          signal: controller.signal,
          headers: variant.headers,
          redirect: "follow",
        });
        clearTimeout(timeout);

        result.status = response.status;
        result.contentType = response.headers.get("content-type");

        const text = await response.text();
        result.contentLength = text.length;
        result.snippet = text.substring(0, 200).replace(/\n/g, "\\n");

        const listings = parseHatla2eeList(text);
        result.listingsCount = listings.length;
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err);
      }

      results.push(result);
    }
  }

  // Summary
  const working = results.filter((r) => r.listingsCount > 0);
  const apiResults = results.filter((r) => r.method === "api");
  const cacheResults = results.filter((r) => r.method === "google_cache");

  return NextResponse.json({
    duration_ms: Date.now() - startTime,
    summary: {
      total_tested: results.length,
      working_methods: working.length,
      best_method: working.length > 0
        ? working.sort((a, b) => b.listingsCount - a.listingsCount)[0]
        : null,
      api_attempts: apiResults.length,
      cache_attempts: cacheResults.length,
    },
    results,
  });
}
