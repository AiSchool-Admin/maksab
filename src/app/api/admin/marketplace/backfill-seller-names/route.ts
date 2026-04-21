/**
 * Backfill Seller Names — إصلاح الإعلانات اللي ليها رقم بدون اسم بائع
 *
 * GET /api/admin/marketplace/backfill-seller-names?limit=10&platform=dubizzle
 *
 * يستهدف: ahe_listings حيث extracted_phone IS NOT NULL و seller_name IS NULL
 * يعيد فتح source_listing_url، يستخرج اسم البائع، ويحدّث:
 *   - ahe_listings.seller_name
 *   - ahe_sellers.name (لو فاضي)
 *
 * Vercel-friendly: 50s timeout, 6s per listing, batch default 8.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getParser, getPlatformHeaders } from "@/lib/crm/harvester/parsers/platform-router";
import { cleanSellerName } from "@/lib/crm/harvester/parsers/dubizzle";

export const maxDuration = 60;

const SUPPORTED_PLATFORMS = ["dubizzle", "opensooq", "aqarmap", "propertyfinder", "olx", "dowwr", "hatla2ee"];
const ALEX_GOVS = ["الإسكندرية", "alexandria", "Alexandria", "الاسكندرية"];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface BackfillResult {
  listing_id: string;
  url: string;
  seller_name: string | null;
  updated_listing: boolean;
  updated_seller: boolean;
  error: string | null;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform"); // optional filter
  const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 15);
  const alexOnly = searchParams.get("alex_only") !== "false"; // default true

  if (platform && !SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: `Platform "${platform}" not supported. Supported: ${SUPPORTED_PLATFORMS.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Find listings with phone but no seller_name
  let query = supabase
    .from("ahe_listings")
    .select("id, source_platform, source_listing_url, extracted_phone, ahe_seller_id, title")
    .not("extracted_phone", "is", null)
    .is("seller_name", null)
    .eq("is_duplicate", false)
    .or("is_expired.is.null,is_expired.eq.false");

  if (platform) query = query.eq("source_platform", platform);
  if (alexOnly) query = query.in("governorate", ALEX_GOVS);

  const { data: listings, error: fetchErr } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!listings || listings.length === 0) {
    return NextResponse.json({
      message: "No listings found needing seller_name backfill",
      listings_found: 0,
    });
  }

  const results: BackfillResult[] = [];

  for (const listing of listings) {
    // Guard against timeout — 50s budget, leave 5s buffer
    if (Date.now() - startTime > 50000) {
      results.push({
        listing_id: listing.id,
        url: listing.source_listing_url,
        seller_name: null,
        updated_listing: false,
        updated_seller: false,
        error: "Skipped — timeout approaching",
      });
      continue;
    }

    const result: BackfillResult = {
      listing_id: listing.id,
      url: listing.source_listing_url,
      seller_name: null,
      updated_listing: false,
      updated_seller: false,
      error: null,
    };

    try {
      if (!listing.source_listing_url) {
        result.error = "No source_listing_url";
        results.push(result);
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const headers = getPlatformHeaders(listing.source_platform || "");
      const response = await fetch(listing.source_listing_url, {
        signal: controller.signal,
        headers,
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
        results.push(result);
        continue;
      }

      const html = await response.text();
      const parser = getParser(listing.source_platform || "");
      const details = parser.parseDetail(html);

      // Try parser-extracted name first
      let sellerName = cleanSellerName(details.sellerName);

      // Fallback: extract from common HTML patterns if parser missed it
      if (!sellerName) {
        sellerName = extractSellerFallback(html);
      }

      result.seller_name = sellerName;

      if (!sellerName) {
        result.error = "No seller_name found in source";
        results.push(result);
        continue;
      }

      // Update listing
      const { error: updateErr } = await supabase
        .from("ahe_listings")
        .update({ seller_name: sellerName })
        .eq("id", listing.id);

      if (updateErr) {
        result.error = `Listing update failed: ${updateErr.message}`;
        results.push(result);
        continue;
      }
      result.updated_listing = true;

      // Update seller (only if name is empty)
      if (listing.ahe_seller_id) {
        const { data: updatedSeller } = await supabase
          .from("ahe_sellers")
          .update({ name: sellerName, updated_at: new Date().toISOString() })
          .eq("id", listing.ahe_seller_id)
          .is("name", null)
          .select("id")
          .maybeSingle();

        result.updated_seller = !!updatedSeller;
      }

      results.push(result);
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      results.push(result);
    }
  }

  const namesFound = results.filter((r) => r.seller_name).length;
  const listingsUpdated = results.filter((r) => r.updated_listing).length;
  const sellersUpdated = results.filter((r) => r.updated_seller).length;

  return NextResponse.json({
    duration_ms: Date.now() - startTime,
    listings_processed: results.length,
    names_found: namesFound,
    listings_updated: listingsUpdated,
    sellers_updated: sellersUpdated,
    results,
  });
}

/**
 * Fallback seller-name extraction from raw HTML — covers patterns parsers may miss.
 */
function extractSellerFallback(html: string): string | null {
  const patterns: RegExp[] = [
    // OpenSooq owner card
    /id=["']PostViewOwnerCard["'][\s\S]{0,2000}?<h3[^>]*>([^<]{2,60})<\/h3>/i,
    // Generic name classes
    /class="[^"]*(?:seller|member|owner|advertiser|user)[\w-]*name[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
    /class="[^"]*(?:seller|member|owner)[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
    // itemprop / aria-label based
    /itemprop=["']name["'][^>]*>\s*([^<]{2,60})\s*</i,
    // Arabic label followed by name
    /(?:أعلن(?:ها|ه)?|نشر(?:ها|ه)?|بواسطة|صاحب الإعلان)[:：]?\s*([^\n<>\r]{2,60})/,
    // JSON-LD seller name
    /"seller"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,60})"/i,
    /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,60})"/i,
  ];

  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m && m[1]) {
      const cleaned = cleanSellerName(m[1].trim());
      if (cleaned && cleaned.length >= 2 && cleaned.length <= 60) {
        return cleaned;
      }
    }
  }

  return null;
}
