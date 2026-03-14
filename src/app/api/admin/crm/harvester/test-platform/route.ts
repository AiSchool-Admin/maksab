/**
 * Platform Test API
 * GET /api/admin/crm/harvester/test-platform?url=XXX — اختبار منصة واحدة
 * GET /api/admin/crm/harvester/test-platform?all=true — اختبار كل المنصات
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";
import { getParser, hasPlatformParser } from "@/lib/crm/harvester/parsers/platform-router";

export const maxDuration = 120;

interface PlatformTestResult {
  platform_id: string;
  platform_name: string;
  url: string;
  status: number | null;
  body_length: number;
  content_type: string | null;
  articles_found: number;
  sample_titles: string[];
  has_listing_links: boolean;
  has_parser: boolean;
  needs_javascript: boolean;
  error: string | null;
  duration_ms: number;
  html_structure: {
    has_articles: boolean;
    has_listing_cards: boolean;
    has_pagination: boolean;
    has_json_ld: boolean;
    has_next_data: boolean;
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const testAll = req.nextUrl.searchParams.get("all") === "true";

  if (!url && !testAll) {
    return NextResponse.json(
      { error: "url أو all=true مطلوب" },
      { status: 400 }
    );
  }

  try {
    if (testAll) {
      return await testAllPlatforms();
    } else {
      return await testSingleUrl(url!);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function testSingleUrl(url: string): Promise<NextResponse> {
  const startTime = Date.now();

  const result: PlatformTestResult = {
    platform_id: "unknown",
    platform_name: "Unknown",
    url,
    status: null,
    body_length: 0,
    content_type: null,
    articles_found: 0,
    sample_titles: [],
    has_listing_links: false,
    has_parser: false,
    needs_javascript: false,
    error: null,
    duration_ms: 0,
    html_structure: {
      has_articles: false,
      has_listing_cards: false,
      has_pagination: false,
      has_json_ld: false,
      has_next_data: false,
    },
  };

  // Detect platform from URL
  const platform = detectPlatformFromUrl(url);
  result.platform_id = platform.id;
  result.platform_name = platform.name;
  result.has_parser = hasPlatformParser(platform.id);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);

    result.status = response.status;
    result.content_type = response.headers.get("content-type");

    if (response.ok) {
      const html = await response.text();
      result.body_length = html.length;

      // Analyze HTML structure
      result.html_structure = {
        has_articles: /<article/i.test(html),
        has_listing_cards: /(?:listing|card|item|product|post|ad-card|property-card)/i.test(html),
        has_pagination: /(?:pagination|page=|next-page|load-more|صفحة|التالي)/i.test(html),
        has_json_ld: html.includes("application/ld+json"),
        has_next_data: html.includes("__NEXT_DATA__"),
      };

      // Try to parse listings
      const parser = getParser(platform.id);
      const listings = parser.parseList(html);
      result.articles_found = listings.length;
      result.sample_titles = listings.slice(0, 5).map(l => l.title);
      result.has_listing_links = listings.length > 0;

      // Check if site needs JavaScript rendering
      if (listings.length === 0 && html.length > 1000) {
        const jsIndicators = [
          html.includes("__NEXT_DATA__"),
          html.includes("window.__INITIAL_STATE__"),
          html.includes("React.createElement"),
          html.includes("ng-app"),
          html.includes("data-v-"),
          /<div id="(?:root|app|__next)"[^>]*><\/div>/i.test(html),
        ];
        result.needs_javascript = jsIndicators.filter(Boolean).length >= 2;
      }
    } else {
      result.error = `HTTP ${response.status} ${response.statusText}`;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    if (result.error.includes("abort")) {
      result.error = "Timeout — المنصة لم تستجب خلال 20 ثانية";
    }
  }

  result.duration_ms = Date.now() - startTime;

  return NextResponse.json({
    result,
    summary: {
      reachable: result.status === 200,
      parseable: result.articles_found > 0,
      ready_for_harvest: result.articles_found > 0 && result.has_parser,
      recommendation: getRecommendation(result),
    },
  });
}

async function testAllPlatforms(): Promise<NextResponse> {
  const supabase = getServiceClient();
  const startTime = Date.now();

  // Get all platforms from DB
  const { data: platforms, error } = await supabase
    .from("harvest_platforms")
    .select("*")
    .order("is_active", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: PlatformTestResult[] = [];

  for (const platform of platforms || []) {
    // Skip Facebook (needs auth)
    if (platform.id.startsWith("facebook")) {
      results.push({
        platform_id: platform.id,
        platform_name: platform.name_ar,
        url: platform.base_url,
        status: null,
        body_length: 0,
        content_type: null,
        articles_found: 0,
        sample_titles: [],
        has_listing_links: false,
        has_parser: false,
        needs_javascript: true,
        error: "فيسبوك يحتاج مصادقة — استخدم Bookmarklet أو Paste&Parse",
        duration_ms: 0,
        html_structure: {
          has_articles: false,
          has_listing_cards: false,
          has_pagination: false,
          has_json_ld: false,
          has_next_data: false,
        },
      });
      continue;
    }

    const fetchStart = Date.now();
    const result: PlatformTestResult = {
      platform_id: platform.id,
      platform_name: platform.name_ar,
      url: platform.base_url,
      status: null,
      body_length: 0,
      content_type: null,
      articles_found: 0,
      sample_titles: [],
      has_listing_links: false,
      has_parser: hasPlatformParser(platform.id),
      needs_javascript: platform.needs_javascript || false,
      error: null,
      duration_ms: 0,
      html_structure: {
        has_articles: false,
        has_listing_cards: false,
        has_pagination: false,
        has_json_ld: false,
        has_next_data: false,
      },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(platform.base_url, {
        signal: controller.signal,
        headers: BROWSER_HEADERS,
        redirect: "follow",
      });
      clearTimeout(timeout);

      result.status = response.status;
      result.content_type = response.headers.get("content-type");

      if (response.ok) {
        const html = await response.text();
        result.body_length = html.length;

        result.html_structure = {
          has_articles: /<article/i.test(html),
          has_listing_cards: /(?:listing|card|item|product)/i.test(html),
          has_pagination: /(?:pagination|page=|next-page)/i.test(html),
          has_json_ld: html.includes("application/ld+json"),
          has_next_data: html.includes("__NEXT_DATA__"),
        };

        // Try parsing with the platform parser
        const parser = getParser(platform.id);
        const listings = parser.parseList(html);
        result.articles_found = listings.length;
        result.sample_titles = listings.slice(0, 3).map(l => l.title);
        result.has_listing_links = listings.length > 0;
      } else {
        result.error = `HTTP ${response.status}`;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      if (result.error.includes("abort")) result.error = "Timeout";
    }

    result.duration_ms = Date.now() - fetchStart;
    results.push(result);

    // Update platform last_test info
    await supabase
      .from("harvest_platforms")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: result.articles_found > 0 ? "parseable" :
          result.status === 200 ? "reachable_no_parse" :
          result.status === 403 ? "blocked" :
          result.error ? "error" : "unknown",
      })
      .eq("id", platform.id);

    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }

  const totalDuration = Math.round((Date.now() - startTime) / 1000);

  return NextResponse.json({
    platforms: results,
    summary: {
      total: results.length,
      reachable: results.filter(r => r.status === 200).length,
      parseable: results.filter(r => r.articles_found > 0).length,
      blocked: results.filter(r => r.status === 403).length,
      needs_javascript: results.filter(r => r.needs_javascript).length,
      errors: results.filter(r => r.error && r.status !== 403).length,
      with_parser: results.filter(r => r.has_parser).length,
      ready_for_harvest: results.filter(r => r.articles_found > 0 && r.has_parser).length,
    },
    duration_seconds: totalDuration,
  });
}

// ═══ Helpers ═══

function detectPlatformFromUrl(url: string): { id: string; name: string } {
  const platformMap: Record<string, { id: string; name: string }> = {
    "dubizzle.com": { id: "dubizzle", name: "Dubizzle Egypt" },
    "opensooq.com": { id: "opensooq", name: "OpenSooq Egypt" },
    "hatla2ee.com": { id: "hatla2ee", name: "Hatla2ee Egypt" },
    "contactcars.com": { id: "contactcars", name: "ContactCars" },
    "carsemsar.com": { id: "carsemsar", name: "CarSemsar" },
    "aqarmap.com": { id: "aqarmap", name: "Aqarmap" },
    "propertyfinder.eg": { id: "propertyfinder", name: "Property Finder Egypt" },
    "yallamotor.com": { id: "yallamotor", name: "Yallamotor" },
    "bezaat.com": { id: "bezaat", name: "Bezaat" },
    "soq24.com": { id: "soq24", name: "Soq24" },
    "cairolink.com": { id: "cairolink", name: "CairoLink" },
    "sooqmsr.com": { id: "sooqmsr", name: "SooqMsr" },
    "dowwr.com": { id: "dowwr", name: "Dowwr" },
    "facebook.com": { id: "facebook_marketplace", name: "Facebook" },
  };

  for (const [domain, platform] of Object.entries(platformMap)) {
    if (url.includes(domain)) return platform;
  }

  return { id: "unknown", name: "Unknown" };
}

function getRecommendation(result: PlatformTestResult): string {
  if (result.articles_found > 0 && result.has_parser) {
    return "✅ جاهز للحصاد — يمكن إنشاء نطاقات وبدء الحصاد";
  }
  if (result.articles_found > 0 && !result.has_parser) {
    return "⚠️ قابل للـ parse لكن يحتاج parser مخصص";
  }
  if (result.status === 200 && result.articles_found === 0 && result.needs_javascript) {
    return "🔧 المنصة تحتاج JavaScript rendering — استخدم Bookmarklet";
  }
  if (result.status === 200 && result.articles_found === 0) {
    return "⚠️ المنصة متاحة لكن الـ parser يحتاج تعديل — راجع HTML structure";
  }
  if (result.status === 403) {
    return "🚫 المنصة تحظر server-side fetch (403) — استخدم Bookmarklet";
  }
  if (result.error) {
    return `❌ خطأ: ${result.error}`;
  }
  return "❓ حالة غير معروفة";
}
