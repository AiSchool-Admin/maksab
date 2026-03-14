/**
 * AHE Diagnostic Test API
 * POST — يجلب ويحلل صفحة واحدة أو أكتر من scope معين
 * يعرض تفاصيل كاملة عن كل خطوة (HTTP status, strategy, HTML preview)
 * ⚠️ لا يكتب في قاعدة البيانات — فقط fetch + parse + dedup + عرض
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import {
  parseDubizzleList,
  parseDubizzleDetail,
  BROWSER_HEADERS,
} from "@/lib/crm/harvester/parsers/dubizzle";
import { getParser } from "@/lib/crm/harvester/parsers/platform-router";
import { extractPhone } from "@/lib/crm/harvester/parsers/phone-extractor";
import { parseRelativeDate } from "@/lib/crm/harvester/parsers/date-parser";
import { mapLocation } from "@/lib/crm/harvester/parsers/location-mapper";
import type { AheScope } from "@/lib/crm/harvester/types";

export const maxDuration = 60;

interface FetchDiagnostic {
  url: string;
  strategy: string;
  http_status: number | null;
  response_size: number;
  content_type: string | null;
  html_preview: string;
  has_next_data: boolean;
  has_json_ld: boolean;
  listings_found: number;
  error: string | null;
  duration_ms: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const body = await req.json();
    const { scope_code, max_pages, fetch_details } = body;

    if (!scope_code) {
      return NextResponse.json(
        { error: "scope_code مطلوب" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Get scope by code
    const { data: scope, error: scopeError } = await supabase
      .from("ahe_scopes")
      .select("*")
      .eq("code", scope_code)
      .single();

    if (scopeError || !scope) {
      return NextResponse.json(
        {
          error: `النطاق '${scope_code}' غير موجود`,
          details: scopeError?.message,
          hint: !process.env.SUPABASE_SERVICE_ROLE_KEY
            ? "⚠️ SUPABASE_SERVICE_ROLE_KEY غير موجود — RLS يمنع الوصول لجداول AHE"
            : undefined,
        },
        { status: 404 }
      );
    }

    const typedScope = scope as AheScope;
    const pagesToFetch = Math.min(max_pages || 1, 3);
    const shouldFetchDetails = fetch_details ?? false;

    // ═══ Fetch diagnostics — try all strategies ═══
    const diagnostics: FetchDiagnostic[] = [];
    const allListings: Array<{
      url: string;
      title: string;
      price: number | null;
      location: string;
      dateText: string;
      sellerName: string | null;
      thumbnailUrl: string | null;
      isVerified: boolean;
      isBusiness: boolean;
      isDuplicate: boolean;
    }> = [];

    const strategies: Array<{
      name: string;
      headers: Record<string, string>;
    }> = [
      { name: "browser_desktop", headers: { ...BROWSER_HEADERS } },
      {
        name: "browser_mobile",
        headers: {
          ...BROWSER_HEADERS,
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": '"Android"',
        },
      },
      {
        name: "simple_fetch",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Maksab/1.0; +https://maksab.app)",
          Accept: "text/html,application/json",
          "Accept-Language": "ar",
        },
      },
    ];

    for (const strategy of strategies) {
      const fetchStart = Date.now();
      const diag: FetchDiagnostic = {
        url: typedScope.base_url,
        strategy: strategy.name,
        http_status: null,
        response_size: 0,
        content_type: null,
        html_preview: "",
        has_next_data: false,
        has_json_ld: false,
        listings_found: 0,
        error: null,
        duration_ms: 0,
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(typedScope.base_url, {
          signal: controller.signal,
          headers: strategy.headers,
          redirect: "follow",
        });
        clearTimeout(timeout);

        diag.http_status = response.status;
        diag.content_type = response.headers.get("content-type");

        if (response.ok) {
          const html = await response.text();
          diag.response_size = html.length;
          diag.html_preview = html.substring(0, 500).replace(/\n/g, "\\n");
          diag.has_next_data = html.includes("__NEXT_DATA__");
          diag.has_json_ld = html.includes("application/ld+json");

          const platformParser = getParser(typedScope.source_platform);
          const listings = platformParser.parseList(html);
          diag.listings_found = listings.length;

          // Store listings from the first successful strategy
          if (listings.length > 0 && allListings.length === 0) {
            for (const listing of listings) {
              allListings.push({
                url: listing.url,
                title: listing.title,
                price: listing.price,
                location: listing.location,
                dateText: listing.dateText,
                sellerName: listing.sellerName,
                thumbnailUrl: listing.thumbnailUrl,
                isVerified: listing.isVerified,
                isBusiness: listing.isBusiness,
                isDuplicate: false,
              });
            }
          }
        } else {
          diag.error = `HTTP ${response.status} ${response.statusText}`;
          // Try to read error body
          try {
            const body = await response.text();
            diag.html_preview = body.substring(0, 300);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        diag.error =
          err instanceof Error ? err.message : String(err);
      }

      diag.duration_ms = Date.now() - fetchStart;
      diagnostics.push(diag);

      // Small delay between strategies
      await delay(1000);
    }

    // ═══ Dedup check ═══
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
        // Skip dedup if table issue
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      scope: {
        code: typedScope.code,
        name: typedScope.name,
        base_url: typedScope.base_url,
        governorate: typedScope.governorate,
        maksab_category: typedScope.maksab_category,
      },
      environment: {
        has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        has_app_url: !!process.env.NEXT_PUBLIC_APP_URL,
        has_cron_secret: !!process.env.CRON_SECRET,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + "..."
          : "NOT SET",
      },
      fetch_diagnostics: diagnostics,
      summary: {
        total_listings: allListings.length,
        new_listings: allListings.length - duplicateCount,
        duplicate_listings: duplicateCount,
        best_strategy: diagnostics.find((d) => d.listings_found > 0)
          ?.strategy || "none",
        all_blocked:
          diagnostics.every((d) => d.http_status === 403) ||
          diagnostics.every(
            (d) => d.http_status !== 200 && d.http_status !== null
          ),
      },
      sample_listings: allListings.slice(0, 10),
      errors,
      duration_seconds: durationSeconds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطأ في الخادم",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
