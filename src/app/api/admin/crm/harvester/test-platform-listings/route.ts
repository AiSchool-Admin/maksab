/**
 * Platform Listings Test API — المرحلة 1+2+3
 * GET /api/admin/crm/harvester/test-platform-listings
 *
 * يختبر URLs إعلانات فعلية (مش الصفحة الرئيسية)
 * + يكشف أرقام تليفونات وأسعار في الصفحة
 * + يجرّب User-Agents مختلفة للمنصات المحظورة
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { getParser, hasPlatformParser } from "@/lib/crm/harvester/parsers/platform-router";

export const maxDuration = 300; // 5 minutes — lots of URLs to test

// ═══ Listing URLs to test ═══
const LISTING_URLS = [
  // OpenSooq — أولوية قصوى
  { id: "opensooq_phones", platform: "opensooq", url: "https://eg.opensooq.com/ar/cairo/mobiles", category: "phones" },
  { id: "opensooq_vehicles", platform: "opensooq", url: "https://eg.opensooq.com/ar/cairo/cars", category: "vehicles" },
  { id: "opensooq_properties", platform: "opensooq", url: "https://eg.opensooq.com/ar/cairo/real-estate", category: "properties" },

  // Aqarmap — عقارات
  { id: "aqarmap_sale", platform: "aqarmap", url: "https://aqarmap.com.eg/en/for-sale/apartment/cairo/", category: "properties" },
  { id: "aqarmap_rent", platform: "aqarmap", url: "https://aqarmap.com.eg/en/for-rent/apartment/cairo/", category: "properties" },

  // PropertyFinder — عقارات
  { id: "pf_sale", platform: "propertyfinder", url: "https://www.propertyfinder.eg/en/buy/apartments-for-sale-in-cairo.html", category: "properties" },
  { id: "pf_rent", platform: "propertyfinder", url: "https://www.propertyfinder.eg/en/rent/apartments-for-rent-in-cairo.html", category: "properties" },

  // CarSemsar — سيارات
  { id: "carsemsar", platform: "carsemsar", url: "https://carsemsar.com/cars", category: "vehicles" },

  // CairoLink
  { id: "cairolink_cars", platform: "cairolink", url: "https://cairolink.com/cars", category: "vehicles" },
  { id: "cairolink_properties", platform: "cairolink", url: "https://cairolink.com/properties", category: "properties" },

  // Soq24 — شغال بالفعل
  { id: "soq24_phones", platform: "soq24", url: "http://soq24.com/adsCategory/22/موبايلات", category: "phones" },

  // Dowwr — شغال بالفعل
  { id: "dowwr_phones", platform: "dowwr", url: "https://eg.dowwr.com/ads/mobiles", category: "phones" },

  // المحظورين — جرّب URLs مختلفة
  { id: "hatla2ee_cars", platform: "hatla2ee", url: "https://eg.hatla2ee.com/en/car", category: "vehicles", blocked: true },
  { id: "hatla2ee_ar", platform: "hatla2ee", url: "https://eg.hatla2ee.com/ar/car", category: "vehicles", blocked: true },
  { id: "contactcars_used", platform: "contactcars", url: "https://contactcars.com/used-cars", category: "vehicles", blocked: true },
];

// ═══ User-Agents for blocked platforms ═══
const USER_AGENTS: { name: string; value: string }[] = [
  { name: "Chrome Desktop", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
  { name: "iPhone Safari", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  { name: "Android Chrome", value: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36" },
  { name: "Googlebot", value: "Googlebot/2.1 (+http://www.google.com/bot.html)" },
  { name: "curl", value: "curl/8.4.0" },
  { name: "Edge Desktop", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0" },
];

interface ListingTestResult {
  id: string;
  platform: string;
  url: string;
  category: string;
  status: number | null;
  body_length: number;
  articles_found: number;
  sample_titles: string[];
  has_listing_links: boolean;
  has_parser: boolean;
  has_phone_numbers: boolean;
  phone_numbers_found: string[];
  has_prices: boolean;
  prices_found: string[];
  error: string | null;
  duration_ms: number;
  // Phase 3: blocked platform UA test
  blocked_ua_results?: { ua_name: string; status: number | null; body_length: number; articles_found: number; error: string | null }[];
  working_ua?: string | null;
}

export async function GET(req: NextRequest) {
  const onlyBlocked = req.nextUrl.searchParams.get("blocked") === "true";
  const platformFilter = req.nextUrl.searchParams.get("platform");

  const startTime = Date.now();
  const results: ListingTestResult[] = [];

  let urlsToTest = LISTING_URLS;
  if (onlyBlocked) {
    urlsToTest = urlsToTest.filter(u => (u as any).blocked);
  }
  if (platformFilter) {
    urlsToTest = urlsToTest.filter(u => u.platform === platformFilter);
  }

  // ═══ Phase 1: Test each listing URL ═══
  for (const listing of urlsToTest) {
    const result = await testListingUrl(listing);
    results.push(result);

    // Small delay between requests
    await new Promise(r => setTimeout(r, 800));
  }

  // ═══ Phase 3: For blocked URLs (403), try different User-Agents ═══
  const blockedResults = results.filter(r => r.status === 403 || (r.status === null && r.error));
  for (const blocked of blockedResults) {
    blocked.blocked_ua_results = [];
    for (const ua of USER_AGENTS) {
      const uaResult = await testWithUserAgent(blocked.url, blocked.platform, ua);
      blocked.blocked_ua_results.push(uaResult);

      if (uaResult.status === 200 && uaResult.articles_found > 0) {
        blocked.working_ua = ua.name;
        // Don't test more UAs — found a working one
        break;
      }
      if (uaResult.status === 200) {
        // Got 200 but no articles — still note it
        if (!blocked.working_ua) {
          blocked.working_ua = `${ua.name} (200 لكن بدون articles)`;
        }
      }

      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Sort by articles_found descending
  results.sort((a, b) => b.articles_found - a.articles_found);

  // ═══ Phase 2: Identify platforms ready for activation ═══
  const readyPlatforms = results
    .filter(r => r.status === 200 && r.articles_found > 0)
    .reduce((acc, r) => {
      if (!acc.find(p => p.platform === r.platform)) {
        acc.push({ platform: r.platform, has_parser: r.has_parser, sample_url: r.url, articles: r.articles_found });
      }
      return acc;
    }, [] as { platform: string; has_parser: boolean; sample_url: string; articles: number }[]);

  const totalDuration = Math.round((Date.now() - startTime) / 1000);

  return NextResponse.json({
    results,
    summary: {
      total_tested: results.length,
      reachable_200: results.filter(r => r.status === 200).length,
      with_articles: results.filter(r => r.articles_found > 0).length,
      with_phones: results.filter(r => r.has_phone_numbers).length,
      with_prices: results.filter(r => r.has_prices).length,
      blocked_403: results.filter(r => r.status === 403).length,
      errors: results.filter(r => r.error && r.status !== 403).length,
      with_working_ua: blockedResults.filter(r => r.working_ua && !r.working_ua.includes("بدون")).length,
    },
    ready_for_activation: readyPlatforms,
    blocked_with_ua_results: blockedResults.map(r => ({
      id: r.id,
      platform: r.platform,
      url: r.url,
      working_ua: r.working_ua,
      ua_details: r.blocked_ua_results,
    })),
    duration_seconds: totalDuration,
  });
}

// ═══ Test a single listing URL ═══
async function testListingUrl(listing: { id: string; platform: string; url: string; category: string }): Promise<ListingTestResult> {
  const startTime = Date.now();
  const result: ListingTestResult = {
    id: listing.id,
    platform: listing.platform,
    url: listing.url,
    category: listing.category,
    status: null,
    body_length: 0,
    articles_found: 0,
    sample_titles: [],
    has_listing_links: false,
    has_parser: hasPlatformParser(listing.platform),
    has_phone_numbers: false,
    phone_numbers_found: [],
    has_prices: false,
    prices_found: [],
    error: null,
    duration_ms: 0,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(listing.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ar,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    result.status = response.status;

    if (response.ok) {
      const html = await response.text();
      result.body_length = html.length;

      // Try parser
      const parser = getParser(listing.platform);
      const listings = parser.parseList(html);
      result.articles_found = listings.length;
      result.sample_titles = listings.slice(0, 5).map(l => l.title);
      result.has_listing_links = listings.length > 0;

      // Extract phone numbers (01XXXXXXXXX pattern)
      const phoneRegex = /\b(01[0125]\d{8})\b/g;
      const phones = Array.from(new Set(html.match(phoneRegex) || []));
      result.has_phone_numbers = phones.length > 0;
      result.phone_numbers_found = phones.slice(0, 10);

      // Extract prices (numbers followed by ج.م or EGP or جنيه)
      const priceRegex = /(\d[\d,\.]{2,})\s*(?:ج\.م|جنيه|EGP|egp|LE|le|جم)/g;
      const prices: string[] = [];
      let match;
      while ((match = priceRegex.exec(html)) !== null && prices.length < 10) {
        prices.push(match[0]);
      }
      // Also check for "EGP X,XXX" pattern
      const priceRegex2 = /(?:EGP|LE)\s*(\d[\d,\.]{2,})/g;
      while ((match = priceRegex2.exec(html)) !== null && prices.length < 10) {
        prices.push(match[0]);
      }
      result.has_prices = prices.length > 0;
      result.prices_found = Array.from(new Set(prices)).slice(0, 10);
    } else {
      result.error = `HTTP ${response.status} ${response.statusText}`;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    if (result.error.includes("abort")) {
      result.error = "Timeout — 20 ثانية";
    }
  }

  result.duration_ms = Date.now() - startTime;
  return result;
}

// ═══ Phase 3: Test blocked URL with specific User-Agent ═══
async function testWithUserAgent(
  url: string,
  platform: string,
  ua: { name: string; value: string }
): Promise<{ ua_name: string; status: number | null; body_length: number; articles_found: number; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": ua.value,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ar,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    let articles = 0;
    let bodyLength = 0;

    if (response.ok) {
      const html = await response.text();
      bodyLength = html.length;

      const parser = getParser(platform);
      const listings = parser.parseList(html);
      articles = listings.length;
    }

    return {
      ua_name: ua.name,
      status: response.status,
      body_length: bodyLength,
      articles_found: articles,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ua_name: ua.name,
      status: null,
      body_length: 0,
      articles_found: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ═══ POST: Phase 2 — Activate platforms that work ═══
export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    const body = await req.json();
    const { platforms_to_activate } = body as { platforms_to_activate: string[] };

    if (!platforms_to_activate || !Array.isArray(platforms_to_activate) || platforms_to_activate.length === 0) {
      return NextResponse.json(
        { error: "platforms_to_activate مطلوب — array من platform IDs" },
        { status: 400 }
      );
    }

    const results: { platform: string; action: string; success: boolean; error?: string }[] = [];

    for (const platformId of platforms_to_activate) {
      // 1. Check if platform exists in harvest_platforms
      const { data: existing } = await supabase
        .from("harvest_platforms")
        .select("id, is_active")
        .eq("id", platformId)
        .maybeSingle();

      if (!existing) {
        // Create the platform entry
        const platformNames: Record<string, { name_ar: string; name_en: string; base_url: string }> = {
          opensooq: { name_ar: "السوق المفتوح", name_en: "OpenSooq", base_url: "https://eg.opensooq.com" },
          aqarmap: { name_ar: "عقارماب", name_en: "Aqarmap", base_url: "https://aqarmap.com.eg" },
          propertyfinder: { name_ar: "بروبرتي فايندر", name_en: "PropertyFinder", base_url: "https://www.propertyfinder.eg" },
          carsemsar: { name_ar: "كارسمسار", name_en: "CarSemsar", base_url: "https://carsemsar.com" },
          cairolink: { name_ar: "كايرو لينك", name_en: "CairoLink", base_url: "https://cairolink.com" },
          soq24: { name_ar: "سوق24", name_en: "Soq24", base_url: "http://soq24.com" },
          dowwr: { name_ar: "دوّر", name_en: "Dowwr", base_url: "https://eg.dowwr.com" },
          hatla2ee: { name_ar: "هتلاقي", name_en: "Hatla2ee", base_url: "https://eg.hatla2ee.com" },
          contactcars: { name_ar: "كونتاكت كارز", name_en: "ContactCars", base_url: "https://contactcars.com" },
        };

        const info = platformNames[platformId];
        if (!info) {
          results.push({ platform: platformId, action: "skip", success: false, error: "منصة غير معروفة" });
          continue;
        }

        const { error: insertError } = await supabase
          .from("harvest_platforms")
          .insert({
            id: platformId,
            name_ar: info.name_ar,
            name_en: info.name_en,
            base_url: info.base_url,
            is_active: true,
            is_testable: true,
          });

        if (insertError) {
          results.push({ platform: platformId, action: "create", success: false, error: insertError.message });
          continue;
        }

        results.push({ platform: platformId, action: "created_and_activated", success: true });
      } else if (!existing.is_active) {
        // Activate existing platform
        const { error: updateError } = await supabase
          .from("harvest_platforms")
          .update({ is_active: true, is_testable: true, updated_at: new Date().toISOString() })
          .eq("id", platformId);

        if (updateError) {
          results.push({ platform: platformId, action: "activate", success: false, error: updateError.message });
          continue;
        }

        results.push({ platform: platformId, action: "activated", success: true });
      } else {
        results.push({ platform: platformId, action: "already_active", success: true });
      }

      // 2. Check if category/governorate mappings exist for this platform
      const { data: catMappings } = await supabase
        .from("ahe_category_mappings")
        .select("id")
        .eq("source_platform", platformId)
        .limit(1);

      if (!catMappings || catMappings.length === 0) {
        results.push({
          platform: platformId,
          action: "needs_mappings",
          success: true,
          error: "المنصة مفعلة لكن تحتاج category + governorate mappings لإنشاء scopes",
        });
      }
    }

    return NextResponse.json({
      results,
      message: `تم معالجة ${platforms_to_activate.length} منصة`,
      next_step: "شغّل POST /api/admin/sales/scopes/generate-all لإنشاء النطاقات",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
