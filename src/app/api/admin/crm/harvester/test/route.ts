/**
 * AHE Dry-Run Test API
 * POST — يجلب ويحلل صفحة واحدة أو أكتر من scope معين
 * ⚠️ لا يكتب في قاعدة البيانات — فقط fetch + parse + dedup + عرض
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { parseDubizzleList, parseDubizzleDetail } from "@/lib/crm/harvester/parsers/dubizzle";
import { extractPhone } from "@/lib/crm/harvester/parsers/phone-extractor";
import { parseRelativeDate } from "@/lib/crm/harvester/parsers/date-parser";
import { mapLocation } from "@/lib/crm/harvester/parsers/location-mapper";
import type { AheScope } from "@/lib/crm/harvester/types";

export const maxDuration = 60; // Vercel Hobby plan max

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface TestListingResult {
  url: string;
  title: string;
  price: number | null;
  location: string;
  mappedLocation: { governorate: string | null; city: string | null; area: string | null };
  dateText: string;
  estimatedDate: string | null;
  sellerName: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isFeatured: boolean;
  supportsExchange: boolean;
  isNegotiable: boolean;
  thumbnailUrl: string | null;
  // Detail enrichment (if enabled)
  description: string | null;
  extractedPhone: string | null;
  specifications: Record<string, string>;
  imageCount: number;
  // Dedup
  isDuplicate: boolean;
}

interface TestResult {
  scope: {
    code: string;
    name: string;
    base_url: string;
    governorate: string;
    maksab_category: string;
  };
  pages_fetched: number;
  total_listings: number;
  new_listings: number;
  duplicate_listings: number;
  phones_extracted: number;
  sample_listings: TestListingResult[];
  errors: string[];
  duration_seconds: number;
  fetch_details_enabled: boolean;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const { scope_code, max_pages, fetch_details } = await req.json();

    if (!scope_code) {
      return NextResponse.json({ error: "scope_code مطلوب" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. Verify engine is stopped
    const { data: engineStatus } = await supabase
      .from("ahe_engine_status")
      .select("status")
      .eq("id", 1)
      .single();

    if (engineStatus && engineStatus.status === "running") {
      return NextResponse.json(
        { error: "المحرك يعمل حالياً — أوقفه أولاً قبل الاختبار اليدوي" },
        { status: 409 }
      );
    }

    // 2. Get scope by code
    const { data: scope, error: scopeError } = await supabase
      .from("ahe_scopes")
      .select("*")
      .eq("code", scope_code)
      .single();

    if (scopeError || !scope) {
      return NextResponse.json(
        { error: `النطاق '${scope_code}' غير موجود` },
        { status: 404 }
      );
    }

    const typedScope = scope as AheScope;
    const pagesToFetch = Math.min(max_pages || 2, typedScope.max_pages_per_harvest, 5);
    const shouldFetchDetails = fetch_details !== undefined ? fetch_details : typedScope.detail_fetch_enabled;

    // ═══ PHASE 1: FETCH LIST PAGES ═══
    const allListings: TestListingResult[] = [];
    let page = 1;
    let shouldStop = false;

    while (page <= pagesToFetch && !shouldStop) {
      try {
        const pageUrl = page === 1
          ? typedScope.base_url
          : typedScope.base_url + typedScope.pagination_pattern.replace("{page}", page.toString());

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(pageUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html",
            "Accept-Language": "ar,en",
          },
          redirect: "follow",
        });
        clearTimeout(timeout);

        if (!response.ok) {
          errors.push(`صفحة ${page}: HTTP ${response.status} ${response.statusText}`);
          break;
        }

        const html = await response.text();
        const listings = parseDubizzleList(html);

        if (listings.length === 0) {
          if (page === 1) {
            errors.push("لم يتم العثور على إعلانات في الصفحة الأولى — تحقق من الـ URL أو الـ parser");
          }
          shouldStop = true;
          break;
        }

        for (const listing of listings) {
          const estimatedDate = parseRelativeDate(listing.dateText, new Date());
          const mapped = mapLocation(listing.location || "", typedScope.source_platform);

          allListings.push({
            url: listing.url,
            title: listing.title,
            price: listing.price,
            location: listing.location,
            mappedLocation: mapped,
            dateText: listing.dateText,
            estimatedDate: estimatedDate?.toISOString() || null,
            sellerName: listing.sellerName,
            isVerified: listing.isVerified,
            isBusiness: listing.isBusiness,
            isFeatured: listing.isFeatured,
            supportsExchange: listing.supportsExchange,
            isNegotiable: listing.isNegotiable,
            thumbnailUrl: listing.thumbnailUrl,
            description: null,
            extractedPhone: null,
            specifications: {},
            imageCount: 0,
            isDuplicate: false,
          });
        }

        page++;

        // Delay between pages (polite)
        if (page <= pagesToFetch && !shouldStop) {
          await delay(typedScope.delay_between_requests_ms);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        errors.push(`صفحة ${page}: ${errMsg}`);
        shouldStop = true;
      }
    }

    // ═══ PHASE 2: DEDUP (check DB for existing URLs) ═══
    let duplicateCount = 0;

    for (const listing of allListings) {
      try {
        const { data: existing } = await supabase
          .from("ahe_listings")
          .select("id")
          .eq("source_listing_url", listing.url)
          .eq("is_duplicate", false)
          .maybeSingle();

        if (existing) {
          listing.isDuplicate = true;
          duplicateCount++;
        }
      } catch {
        // If table doesn't exist, skip dedup
      }
    }

    // ═══ PHASE 3: FETCH DETAILS (for first 5 new listings only) ═══
    const newListings = allListings.filter((l) => !l.isDuplicate);
    let phonesExtracted = 0;

    if (shouldFetchDetails && newListings.length > 0) {
      const detailLimit = Math.min(5, newListings.length);

      for (let i = 0; i < detailLimit; i++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(newListings[i].url, {
            signal: controller.signal,
            headers: {
              "User-Agent": USER_AGENT,
              "Accept": "text/html",
              "Accept-Language": "ar,en",
            },
            redirect: "follow",
          });
          clearTimeout(timeout);

          if (!response.ok) {
            errors.push(`تفاصيل ${i + 1}: HTTP ${response.status}`);
            continue;
          }

          const detailHtml = await response.text();
          const details = parseDubizzleDetail(detailHtml);

          newListings[i].description = details.description || null;
          newListings[i].specifications = details.specifications;
          newListings[i].imageCount = details.allImageUrls.length;

          // Extract phone from description
          const phone = extractPhone(details.description || "");
          if (phone) {
            newListings[i].extractedPhone = phone;
            phonesExtracted++;
          }

          // Polite delay
          if (i < detailLimit - 1) {
            await delay(typedScope.detail_delay_between_requests_ms);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`تفاصيل ${i + 1}: ${errMsg}`);
        }
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    // Build sample (first 5 listings, preferring new ones)
    const sampleListings = [
      ...newListings.slice(0, 5),
      ...allListings.filter((l) => l.isDuplicate).slice(0, Math.max(0, 5 - newListings.length)),
    ].slice(0, 5);

    const result: TestResult = {
      scope: {
        code: typedScope.code,
        name: typedScope.name,
        base_url: typedScope.base_url,
        governorate: typedScope.governorate,
        maksab_category: typedScope.maksab_category,
      },
      pages_fetched: page - 1,
      total_listings: allListings.length,
      new_listings: newListings.length,
      duplicate_listings: duplicateCount,
      phones_extracted: phonesExtracted,
      sample_listings: sampleListings,
      errors,
      duration_seconds: durationSeconds,
      fetch_details_enabled: shouldFetchDetails,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطأ في الخادم",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
