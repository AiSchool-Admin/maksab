/**
 * Vercel Harvest Endpoint — حصاد المنصات المحظورة على Railway
 *
 * OpenSooq, Aqarmap, Dowwr → Railway IPs محظورة (403 WAF)
 * لكن Vercel IPs شغالة (200) ✅
 *
 * POST /api/admin/crm/harvester/harvest-vercel  { scope_code }
 * GET  /api/admin/crm/harvester/harvest-vercel?scope_code=opensooq_properties_cairo
 *
 * ⚠️ Vercel function timeout = 60 ثانية
 *    → max_pages = 1 فقط
 *    → لا detail fetch (يتعمل لاحقاً من enrichment على Railway)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getParser, getPlatformHeaders } from "@/lib/crm/harvester/parsers/platform-router";
import {
  cleanSellerName,
  detectBuyRequest,
  BROWSER_HEADERS,
  type ListPageListing,
} from "@/lib/crm/harvester/parsers/dubizzle";
import {
  parseOpenSooqListWithDebug,
  type OpenSooqParseDebug,
} from "@/lib/crm/harvester/parsers/opensooq";
import {
  parseAqarmapListWithDebug,
  type AqarmapParseDebug,
} from "@/lib/crm/harvester/parsers/aqarmap";
import {
  parsePropertyFinderListWithDebug,
  type PFParseDebug,
} from "@/lib/crm/harvester/parsers/propertyfinder";
import {
  parseOlxListWithDebug,
  type OlxParseDebug,
} from "@/lib/crm/harvester/parsers/olx";
import { extractPhone } from "@/lib/crm/harvester/parsers/phone-extractor";
import { detectSellerTypeSlug } from "@/lib/crm/harvester/seller-classifier";
import { parseRelativeDate } from "@/lib/crm/harvester/parsers/date-parser";
import { mapLocation, normalizeGovernorate, governorateToArabic, extractGovernorateFromUrl } from "@/lib/crm/harvester/parsers/location-mapper";
import { createBuyerFromSeller, updateSellerBuyProbability } from "@/lib/crm/harvester/seller-to-buyer";

export const maxDuration = 60; // Vercel max

// Platforms that work from Vercel but are blocked on Railway
const VERCEL_PLATFORMS = [
  "opensooq", "aqarmap", "dowwr", "propertyfinder",
  "hatla2ee", "contactcars", "carsemsar", "yallamotor",
  "olx", "semsarmasr",
];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface VercelHarvestResult {
  success: boolean;
  scope_code: string;
  source_platform: string;
  pages_fetched: number;
  listings_fetched: number;
  listings_new: number;
  listings_duplicate: number;
  sellers_new: number;
  phones_extracted: number;
  buyers_detected: number;
  errors: string[];
  warnings: string[];
  duration_ms: number;
  parserDebug: OpenSooqParseDebug | AqarmapParseDebug | PFParseDebug | OlxParseDebug | null;
}

async function harvestFromVercel(scopeCode: string): Promise<VercelHarvestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const supabase = getServiceClient();

  // 1. Load scope
  const { data: scope, error: scopeErr } = await supabase
    .from("ahe_scopes")
    .select("*")
    .eq("code", scopeCode)
    .single();

  if (scopeErr || !scope) {
    return {
      success: false,
      scope_code: scopeCode,
      source_platform: "unknown",
      pages_fetched: 0,
      listings_fetched: 0,
      listings_new: 0,
      listings_duplicate: 0,
      sellers_new: 0,
      phones_extracted: 0,
      buyers_detected: 0,
      errors: [`Scope not found: ${scopeCode} — ${scopeErr?.message || ""}`],
      warnings: [],
      duration_ms: Date.now() - startTime,
      parserDebug: null,
    };
  }

  // Normalize platform name to avoid case/whitespace mismatches
  const platform = (scope.source_platform || '').trim().toLowerCase();

  // 2. Validate platform — only non-dubizzle platforms
  if (!VERCEL_PLATFORMS.includes(platform)) {
    return {
      success: false,
      scope_code: scopeCode,
      source_platform: scope.source_platform,
      pages_fetched: 0,
      listings_fetched: 0,
      listings_new: 0,
      listings_duplicate: 0,
      sellers_new: 0,
      phones_extracted: 0,
      buyers_detected: 0,
      errors: [
        `Platform "${scope.source_platform}" (normalized: "${platform}") غير مدعوم على Vercel. ` +
        `المنصات المدعومة: ${VERCEL_PLATFORMS.join(", ")}`,
      ],
      warnings: [],
      duration_ms: Date.now() - startTime,
      parserDebug: null,
    };
  }

  console.log(
    `[Vercel Harvest] 🚀 Starting: "${scope.name}" (${scope.code}) — platform: "${platform}" (raw: "${scope.source_platform}")`
  );

  // 3. Fetch list page (max_pages=1 due to 60s timeout)
  const parser = getParser(platform);
  let listings: ListPageListing[] = [];
  let pagesFetched = 0;
  let parserDebug: OpenSooqParseDebug | AqarmapParseDebug | PFParseDebug | OlxParseDebug | null = null;

  try {
    const pageUrl = scope.base_url;
    console.log(`[Vercel Harvest] 📄 Fetching: ${pageUrl.substring(0, 100)}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout for fetch

    const fetchHeaders = getPlatformHeaders(platform);
    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: fetchHeaders,
      redirect: "follow",
    });
    clearTimeout(timeout);

    console.error(`[Vercel Harvest] HTTP ${response.status} ${response.statusText} — ${pageUrl.substring(0, 100)}`);

    if (!response.ok) {
      if (response.status === 403) {
        errors.push(`HTTP 403 — Vercel أيضاً محظور من ${platform}`);
      } else {
        errors.push(`HTTP ${response.status} from ${platform}`);
      }
      // Capture HTTP failure in parserDebug so it's visible in the response
      if (platform === 'aqarmap') {
        parserDebug = {
          htmlLength: 0,
          nextDataFound: false,
          pagePropsKeys: [],
          strategyUsed: 'none',
          listingsFound: 0,
          firstItemKeys: [],
          httpStatus: response.status,
          httpError: `HTTP ${response.status} ${response.statusText}`,
        };
      }
    } else {
      const html = await response.text();
      pagesFetched = 1;
      console.error(`[Vercel Harvest] ✅ Received ${html.length} bytes`);
      console.error('[DEBUG] platform value:', JSON.stringify(scope.source_platform));
      console.error('[DEBUG] typeof:', typeof scope.source_platform);
      console.error('[DEBUG] normalized platform:', JSON.stringify(platform));

      // Use debug-aware parsers for all supported platforms
      const platformCheck = scope.source_platform?.toLowerCase().trim();
      console.error(`[Vercel Harvest] 🔀 Platform routing: platformCheck="${platformCheck}" (raw="${scope.source_platform}")`);
      if (platformCheck === 'opensooq') {
        const result = parseOpenSooqListWithDebug(html);
        listings = result.listings;
        parserDebug = result.debug;
        console.error(`[Vercel Harvest] 📊 OpenSooq: ${listings.length} listings (patterns: ${result.debug.patternsUsed.join(', ') || 'none'})`);
      } else if (platformCheck === 'aqarmap') {
        const result = parseAqarmapListWithDebug(html);
        listings = result.listings;
        parserDebug = result.debug;
        console.error(`[Vercel Harvest] 📊 AqarMap: ${listings.length} listings (strategy: ${result.debug.strategyUsed}, nextData: ${result.debug.nextDataFound}, pagePropsKeys: [${result.debug.pagePropsKeys.join(', ')}], firstItemKeys: [${result.debug.firstItemKeys.join(', ')}])`);
      } else if (platformCheck === 'propertyfinder') {
        console.error(`[Vercel Harvest] ➡️ Entering PropertyFinder debug parser`);
        const result = parsePropertyFinderListWithDebug(html);
        listings = result.listings;
        parserDebug = result.debug;
        console.error(`[Vercel Harvest] 📊 PropertyFinder: ${listings.length} listings (strategy: ${result.debug.strategyUsed}, nextData: ${result.debug.nextDataFound}, pagePropsKeys: [${result.debug.pagePropsKeys.join(', ')}], firstItemKeys: [${result.debug.firstItemKeys.join(', ')}])`);
      } else if (platformCheck === 'olx') {
        console.error(`[Vercel Harvest] ➡️ Entering OLX debug parser`);
        const result = parseOlxListWithDebug(html);
        listings = result.listings;
        parserDebug = result.debug;
        console.error(`[Vercel Harvest] 📊 OLX: ${listings.length} listings (strategy: ${result.debug.strategyUsed}, nextData: ${result.debug.nextDataFound}, pagePropsKeys: [${result.debug.pagePropsKeys.join(', ')}], firstItemKeys: [${result.debug.firstItemKeys.join(', ')}])`);
      } else {
        listings = parser.parseList(html);
        console.error(`[Vercel Harvest] 📊 Parsed ${listings.length} listings (platform="${platformCheck}" — generic parser)`);
      }

      if (listings.length === 0) {
        warnings.push(
          `0 listings parsed from ${html.length} bytes. HTML snippet: ${html.substring(0, 300).replace(/\n/g, "\\n")}`
        );
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Fetch error: ${msg}`);
  }

  // 4. Filter listings by governorate — uses 3 sources, compares with scope
  const scopeGov = normalizeGovernorate(scope.governorate || "");

  const filteredListings = scopeGov ? listings.filter((listing) => {
    // Source 1: Extract governorate from listing URL (most reliable)
    const urlGov = extractGovernorateFromUrl(listing.url || "");

    // Source 2: Extract from location text via mapLocation
    const loc = mapLocation(listing.location || "", platform);
    const locGov = loc.governorate ? normalizeGovernorate(loc.governorate) : null;

    // Determine listing's actual governorate
    const listingGov = urlGov || locGov;

    if (listingGov) {
      // We know the listing's governorate — compare with scope
      if (listingGov !== scopeGov) {
        console.log(`[Filter] SKIP gov mismatch: listing=${listingGov} scope=${scopeGov} — "${listing.title?.substring(0, 50)}"`);
        return false;
      }
      return true; // matches scope
    }

    // Can't determine from URL or location — accept cautiously
    // (these are listings where the platform didn't include governorate in URL/location)
    return true;
  }) : listings;

  console.log(`[Filter] ${listings.length} → ${filteredListings.length} after governorate filter (scope=${scopeGov})`);

  // 5. Deduplicate + Store
  let newCount = 0;
  let dupCount = 0;
  let sellersNew = 0;
  let phonesExtracted = 0;
  let buyersDetected = 0;

  for (const listing of filteredListings) {
    // Time guard — stop if approaching timeout
    if (Date.now() - startTime > 50000) {
      warnings.push(`Stopped at ${newCount + dupCount}/${filteredListings.length} — approaching 60s timeout`);
      break;
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from("ahe_listings")
      .select("id")
      .eq("source_listing_url", listing.url)
      .eq("is_duplicate", false)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ahe_listings")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      dupCount++;
      continue;
    }

    // Map location — prioritize listing data over scope
    const location = mapLocation(listing.location || "", scope.source_platform);
    const urlGov = extractGovernorateFromUrl(listing.url || "");
    const governorate = governorateToArabic(location.governorate)
      || governorateToArabic(urlGov)
      || scope.governorate;
    const city = location.city || scope.city;

    // Extract phone from title (no detail fetch)
    const phone = extractPhone(listing.title || "");
    if (phone) phonesExtracted++;

    // Estimate date
    const estimatedDate = parseRelativeDate(listing.dateText, new Date());

    // Upsert seller
    let aheSellerId: string | null = null;
    const sellerName = cleanSellerName(listing.sellerName);

    if (listing.sellerProfileUrl) {
      const { data: existingSeller } = await supabase
        .from("ahe_sellers")
        .select("id")
        .eq("profile_url", listing.sellerProfileUrl)
        .maybeSingle();

      if (existingSeller) {
        aheSellerId = existingSeller.id;
        try {
          await supabase.rpc("increment_seller_listings", { p_seller_id: existingSeller.id });
        } catch { /* RPC may not exist */ }
      } else {
        const priorityScore = (listing.isVerified ? 30 : 0) + (listing.isBusiness ? 20 : 0) + (phone ? 25 : 0);
        const sellerType = detectSellerTypeSlug(sellerName, 1, listing.isBusiness);
        const { data: newSeller } = await supabase
          .from("ahe_sellers")
          .insert({
            profile_url: listing.sellerProfileUrl,
            name: sellerName,
            source_platform: scope.source_platform,
            is_verified: listing.isVerified,
            is_business: listing.isBusiness,
            primary_category: scope.maksab_category,
            primary_governorate: governorate,
            total_listings_seen: 1,
            phone: phone || null,
            priority_score: Math.min(priorityScore, 100),
            pipeline_status: phone ? "phone_found" : "discovered",
            detected_account_type: sellerType,
          })
          .select("id")
          .single();

        if (newSeller) {
          aheSellerId = newSeller.id;
          sellersNew++;
        }
      }
    } else if (sellerName) {
      const { data: existingSeller } = await supabase
        .from("ahe_sellers")
        .select("id")
        .eq("name", sellerName)
        .eq("source_platform", scope.source_platform)
        .eq("primary_governorate", governorate)
        .is("profile_url", null)
        .maybeSingle();

      if (existingSeller) {
        aheSellerId = existingSeller.id;
        try {
          await supabase.rpc("increment_seller_listings", { p_seller_id: existingSeller.id });
        } catch { /* RPC may not exist */ }
      } else {
        const priorityScore = (listing.isVerified ? 30 : 0) + (listing.isBusiness ? 20 : 0) + (phone ? 25 : 0);
        const { data: newSeller } = await supabase
          .from("ahe_sellers")
          .insert({
            profile_url: null,
            name: sellerName,
            source_platform: scope.source_platform,
            is_verified: listing.isVerified,
            is_business: listing.isBusiness,
            primary_category: scope.maksab_category,
            primary_governorate: governorate,
            total_listings_seen: 1,
            phone: phone || null,
            priority_score: Math.min(priorityScore, 100),
            pipeline_status: phone ? "phone_found" : "discovered",
          })
          .select("id")
          .single();

        if (newSeller) {
          aheSellerId = newSeller.id;
          sellersNew++;
        }
      }
    } else {
      // Anonymous seller
      const priorityScore = (listing.isVerified ? 30 : 0) + (listing.isBusiness ? 20 : 0);
      const anonSellerType = detectSellerTypeSlug(null, 1, listing.isBusiness);
      const { data: newSeller } = await supabase
        .from("ahe_sellers")
        .insert({
          profile_url: null,
          name: null,
          source_platform: scope.source_platform,
          is_verified: listing.isVerified,
          is_business: listing.isBusiness,
          primary_category: scope.maksab_category,
          primary_governorate: governorate,
          total_listings_seen: 1,
          priority_score: Math.min(priorityScore, 100),
          pipeline_status: "discovered",
          detected_account_type: anonSellerType,
        })
        .select("id")
        .single();

      if (newSeller) {
        aheSellerId = newSeller.id;
        sellersNew++;
      }
    }

    // Fetch actual total_listings_seen for existing sellers
    let actualListingsSeen = 1;
    if (aheSellerId) {
      const { data: sellerData } = await supabase
        .from("ahe_sellers")
        .select("total_listings_seen")
        .eq("id", aheSellerId)
        .single();
      if (sellerData) actualListingsSeen = sellerData.total_listings_seen || 1;
    }

    // Strategy 1+3: كل بائع جديد = مشتري محتمل
    if (aheSellerId) {
      try {
        const sibResult = await createBuyerFromSeller(supabase, {
          id: aheSellerId,
          phone,
          name: sellerName,
          profile_url: listing.sellerProfileUrl || null,
          is_business: listing.isBusiness,
          is_verified: listing.isVerified,
          total_listings_seen: actualListingsSeen,
        }, {
          title: listing.title,
          price: listing.price,
          source_listing_url: listing.url,
        }, {
          maksab_category: scope.maksab_category,
          governorate: scope.governorate || governorate,
          source_platform: scope.source_platform,
        });
        console.log('=== [SIB-CHECK] Result:', sibResult);
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.log('=== [SIB-CHECK] CRASH:', errMsg);
      }
    }
    if (aheSellerId) {
      await updateSellerBuyProbability(supabase, aheSellerId, {
        is_business: listing.isBusiness,
        is_verified: listing.isVerified,
        total_listings_seen: actualListingsSeen,
      });
    }

    // Insert listing
    const { error: insertErr } = await supabase.from("ahe_listings").insert({
      scope_id: scope.id,
      source_platform: scope.source_platform,
      source_listing_url: listing.url,
      title: listing.title,
      price: listing.price,
      is_negotiable: listing.isNegotiable,
      supports_exchange: listing.supportsExchange,
      is_featured: listing.isFeatured,
      thumbnail_url: listing.thumbnailUrl,
      main_image_url: listing.thumbnailUrl,
      all_image_urls: [],
      source_category: listing.category,
      maksab_category: scope.maksab_category,
      source_location: listing.location || null,
      governorate,
      city,
      source_date_text: listing.dateText || null,
      estimated_posted_at: estimatedDate?.toISOString() || null,
      seller_name: sellerName,
      seller_profile_url: listing.sellerProfileUrl,
      seller_is_verified: listing.isVerified,
      seller_is_business: listing.isBusiness,
      ahe_seller_id: aheSellerId,
      extracted_phone: phone || null,
      phone_source: phone ? "title" : null,
      listing_type: listing.isFeatured ? "featured" : "regular",
    });

    if (insertErr) {
      errors.push(`Insert error: ${insertErr.message}`);
    } else {
      newCount++;
    }

    // BHE — detect buyers
    const isLikelyBuyRequest = listing.isLikelyBuyRequest || detectBuyRequest(listing.title);
    if (isLikelyBuyRequest) {
      try {
        const { data: existingBuyer } = await supabase
          .from("bhe_buyers")
          .select("id")
          .eq("source_url", listing.url)
          .maybeSingle();

        if (!existingBuyer) {
          await supabase.from("bhe_buyers").insert({
            source: `${scope.source_platform}_title_match`,
            source_url: listing.url,
            source_platform: scope.source_platform,
            buyer_name: sellerName,
            buyer_phone: phone || null,
            product_wanted: listing.title,
            category: scope.maksab_category || null,
            governorate: scope.governorate || null,
            budget_max: listing.price || null,
            original_text: listing.title,
            buyer_tier: phone ? "hot_buyer" : "warm_buyer",
            buyer_score: phone ? 80 : 30,
            pipeline_status: phone ? "phone_found" : "discovered",
          });
          buyersDetected++;
        }
      } catch {
        // Skip duplicates
      }
    }
  }

  // 5. Update scope stats
  await supabase
    .from("ahe_scopes")
    .update({
      last_harvest_at: new Date().toISOString(),
      last_harvest_new_listings: newCount,
      last_harvest_new_sellers: sellersNew,
      total_harvests: (scope.total_harvests || 0) + 1,
      total_listings_found: (scope.total_listings_found || 0) + newCount,
      total_sellers_found: (scope.total_sellers_found || 0) + sellersNew,
      total_phones_extracted: (scope.total_phones_extracted || 0) + phonesExtracted,
      consecutive_failures: newCount === 0 && errors.length > 0
        ? (scope.consecutive_failures || 0) + 1
        : 0,
      // Clear server_fetch_blocked since Vercel works
      server_fetch_blocked: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scope.id);

  const durationMs = Date.now() - startTime;
  console.log(
    `[Vercel Harvest] ✅ Done in ${durationMs}ms — ${newCount} new, ${dupCount} dup, ${sellersNew} sellers, ${errors.length} errors`
  );

  return {
    success: errors.length === 0 || newCount > 0,
    scope_code: scopeCode,
    source_platform: scope.source_platform,
    pages_fetched: pagesFetched,
    listings_fetched: listings.length,
    listings_new: newCount,
    listings_duplicate: dupCount,
    sellers_new: sellersNew,
    phones_extracted: phonesExtracted,
    buyers_detected: buyersDetected,
    errors,
    warnings,
    duration_ms: durationMs,
    parserDebug,
  };
}

// ═══ POST Handler ═══
export async function POST(req: NextRequest) {
  try {
    const { scope_code } = await req.json();

    if (!scope_code) {
      return NextResponse.json(
        { error: "scope_code مطلوب", example: { scope_code: "opensooq_properties_cairo" } },
        { status: 400 }
      );
    }

    const result = await harvestFromVercel(scope_code);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ في الخادم", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ═══ GET Handler (for browser testing) ═══
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope_code = searchParams.get("scope_code");

  if (!scope_code) {
    return NextResponse.json(
      {
        error: "scope_code مطلوب",
        usage: "GET /api/admin/crm/harvester/harvest-vercel?scope_code=opensooq_properties_cairo",
        supported_platforms: VERCEL_PLATFORMS,
      },
      { status: 400 }
    );
  }

  const result = await harvestFromVercel(scope_code);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
