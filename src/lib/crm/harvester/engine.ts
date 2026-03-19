/**
 * AHE Engine — محرك الحصاد الآلي الرئيسي
 * 6 مراحل: جلب → استبعاد → تفاصيل → إثراء + تخزين → طابور CRM → مقاييس
 *
 * وضعين للعمل:
 * 1. Server-side fetch — للمنصات اللي تسمح (تلقائي 24/7)
 * 2. Bookmarklet — لدوبيزل أو أي منصة تحظر (يحتاج موظف يضغط زر)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  parseDubizzleList,
  parseDubizzleDetail,
  cleanSellerName,
  detectBuyRequest,
  BROWSER_HEADERS,
  type ListPageListing,
} from "./parsers/dubizzle";
import { getParser } from "./parsers/platform-router";
import { extractPhone } from "./parsers/phone-extractor";
import { parseRelativeDate } from "./parsers/date-parser";
import { mapLocation } from "./parsers/location-mapper";
import { applyScopeFilters, type FilterableListing } from "./scope-filter";
import { updateWhaleScoresAfterHarvest } from "./whale-detector";
import { createBuyerFromSeller, updateSellerBuyProbability } from "./seller-to-buyer";
import type { AheScope } from "./types";

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[AHE] ⚠️ SUPABASE_SERVICE_ROLE_KEY غير موجود — استخدام anon key (قد لا يعمل مع RLS)"
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface HarvestResult {
  success: boolean;
  listings_new: number;
  listings_duplicate: number;
  sellers_new: number;
  phones_extracted: number;
  auto_queued: number;
  errors: string[];
  warnings: string[];
  duration_seconds: number;
  fetch_strategy: string;
  http_status?: number;
}

// Extended listing type with enrichment fields
interface EnrichedListing extends ListPageListing {
  estimatedDate?: string;
  enrichedDescription?: string;
  enrichedMainImageUrl?: string;
  enrichedAllImageUrls?: string[];
  enrichedSpecifications?: Record<string, string>;
  enrichedCondition?: string | null;
  extractedPhone?: string | null;
  sellerNameFromDetail?: string | null;
  sellerProfileUrlFromDetail?: string | null;
  detectedBuyerPhone: string | null;
}

async function safeRpc(
  supabase: SupabaseClient,
  fn: string,
  params?: Record<string, unknown>
) {
  try {
    await supabase.rpc(fn, params);
  } catch {
    // RPC may not exist, ignore
  }
}

/**
 * Simple fetch — single attempt, no rotation strategies
 * If 403 → mark scope as server_fetch_blocked
 */
async function fetchPage(
  url: string,
  timeoutMs: number
): Promise<{ html: string; status: number; strategy: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[AHE] 🔄 Fetching: ${url.substring(0, 80)}...`);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });

    if (response.ok) {
      const html = await response.text();
      console.log(
        `[AHE] ✅ Success — ${html.length} bytes, status ${response.status}`
      );
      return { html, status: response.status, strategy: "server_fetch" };
    }

    // 403 = WAF block (e.g., Dubizzle's Imperva)
    if (response.status === 403) {
      throw new ServerFetchBlockedError(
        `HTTP 403 — المنصة تحظر server-side fetch. استخدم Bookmarklet بدلاً من ذلك.`
      );
    }

    throw new Error(`HTTP ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Custom error for 403 blocks — engine uses this to mark scope
 */
export class ServerFetchBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerFetchBlockedError";
  }
}

/**
 * Run a harvest job for a specific scope
 */
export async function runHarvestJob(jobId: string): Promise<HarvestResult> {
  const supabase = getServiceClient();
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let fetchStrategy = "unknown";

  try {
    // Get job + scope
    const { data: job, error: jobError } = await supabase
      .from("ahe_harvest_jobs")
      .select("*, ahe_scopes(*)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      const errMsg = jobError
        ? `Job lookup error: ${jobError.message} (code: ${jobError.code})`
        : "Job not found";
      console.error(`[AHE] ❌ ${errMsg}`);
      return {
        success: false,
        listings_new: 0,
        listings_duplicate: 0,
        sellers_new: 0,
        phones_extracted: 0,
        auto_queued: 0,
        errors: [errMsg],
        warnings: [
          !process.env.SUPABASE_SERVICE_ROLE_KEY
            ? "⚠️ SUPABASE_SERVICE_ROLE_KEY غير موجود — RLS قد يمنع الوصول"
            : "",
        ].filter(Boolean),
        duration_seconds: 0,
        fetch_strategy: "none",
      };
    }

    const scope = job.ahe_scopes as AheScope;
    console.log(
      `[AHE] 🚀 Starting harvest job ${jobId} for scope "${scope.name}" (${scope.code})`
    );
    console.log(`[AHE] 📍 URL: ${scope.base_url}`);

    // Check if scope is server_fetch_blocked
    if (scope.server_fetch_blocked) {
      const msg = `Scope "${scope.code}" محظور من server-side fetch — يحتاج Bookmarklet`;
      console.log(`[AHE] ⚠️ ${msg}`);
      await updateJob(supabase, jobId, {
        status: "failed",
        errors: [msg],
        completed_at: new Date().toISOString(),
        duration_seconds: 0,
      });
      return {
        success: false,
        listings_new: 0,
        listings_duplicate: 0,
        sellers_new: 0,
        phones_extracted: 0,
        auto_queued: 0,
        errors: [msg],
        warnings: [],
        duration_seconds: 0,
        fetch_strategy: "blocked",
      };
    }

    // Increment running jobs count
    await supabase
      .from("ahe_engine_status")
      .update({ running_jobs_count: 1 })
      .eq("id", 1);

    await updateJob(supabase, jobId, {
      status: "fetching_list",
      started_at: new Date().toISOString(),
      current_step: "جلب القوائم",
    });

    // ═══ PHASE 1: FETCH LIST PAGES ═══
    const allListings: EnrichedListing[] = [];
    let page = 1;
    let shouldStop = false;
    let httpStatus: number | undefined;

    while (page <= scope.max_pages_per_harvest && !shouldStop) {
      try {
        const pageUrl = buildPageUrl(
          scope.base_url,
          scope.pagination_pattern,
          page
        );

        console.log(
          `[AHE] 📄 Fetching page ${page}/${scope.max_pages_per_harvest}: ${pageUrl}`
        );

        const result = await fetchPage(pageUrl, 20000);
        httpStatus = result.status;
        fetchStrategy = result.strategy;

        // Increment hourly request counter
        await safeRpc(supabase, "increment_hourly_requests");

        const platformParser = getParser(scope.source_platform);
        const listings = platformParser.parseList(result.html);

        console.log(
          `[AHE] 📊 Page ${page}: Found ${listings.length} listings`
        );

        if (listings.length === 0) {
          warnings.push(
            `Page ${page}: 0 listings found (${result.html.length} bytes received)`
          );
          if (page === 1) {
            warnings.push(
              `First page HTML snippet: ${result.html.substring(0, 500).replace(/\n/g, "\\n")}`
            );
          }
          shouldStop = true;
          break;
        }

        for (const listing of listings) {
          const estimatedDate = parseRelativeDate(
            listing.dateText,
            new Date(job.target_to)
          );

          if (estimatedDate && estimatedDate < new Date(job.target_from)) {
            shouldStop = true;
            break;
          }

          allListings.push({
            ...listing,
            estimatedDate: estimatedDate?.toISOString(),
          });
        }

        await updateJob(supabase, jobId, {
          pages_fetched: page,
          listings_fetched: allListings.length,
          progress_percentage: Math.round(
            (page / scope.max_pages_per_harvest) * 30
          ),
        });

        page++;

        if (page <= scope.max_pages_per_harvest && !shouldStop) {
          await delay(scope.delay_between_requests_ms);
        }
      } catch (error) {
        // 403 = WAF block → mark scope as server_fetch_blocked
        if (error instanceof ServerFetchBlockedError) {
          console.log(
            `[AHE] 🚫 Server-side fetch blocked for scope "${scope.code}" — marking as blocked`
          );
          await supabase
            .from("ahe_scopes")
            .update({
              server_fetch_blocked: true,
              server_fetch_blocked_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", scope.id);

          errors.push(
            `المنصة تحظر server-side fetch (403). تم تسجيل الحظر. استخدم Bookmarklet.`
          );
          shouldStop = true;
          break;
        }

        const errMsg =
          error instanceof Error ? error.message : String(error);
        errors.push(`Page ${page}: ${errMsg}`);
        console.error(`[AHE] ❌ Page ${page} error: ${errMsg}`);

        if (errors.length >= 3) {
          shouldStop = true;
        } else {
          await delay(10000);
        }
      }
    }

    console.log(
      `[AHE] 📊 Phase 1 complete: ${allListings.length} total listings, ${errors.length} errors`
    );

    // Reset or increment consecutive errors
    if (errors.length === 0 && allListings.length > 0) {
      await supabase
        .from("ahe_engine_status")
        .update({ consecutive_errors: 0 })
        .eq("id", 1);
    } else if (errors.length > 0) {
      const engineState = await getEngineStatus(supabase);
      await supabase
        .from("ahe_engine_status")
        .update({
          consecutive_errors:
            engineState.consecutive_errors + errors.length,
          last_error_at: new Date().toISOString(),
          last_error_message: errors[errors.length - 1],
        })
        .eq("id", 1);

      await safeRpc(supabase, "auto_pause_on_consecutive_errors");
    }

    // ═══ PHASE 2: DEDUPLICATE ═══
    await updateJob(supabase, jobId, {
      status: "deduplicating",
      current_step: "استبعاد المكرر",
    });

    const newListings: EnrichedListing[] = [];
    let duplicateCount = 0;

    for (const listing of allListings) {
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
        duplicateCount++;
      } else {
        newListings.push(listing);
      }
    }

    const buyRequestsFromCards = newListings.filter(l => l.isLikelyBuyRequest);
    console.log(
      `[AHE] 📊 Phase 2: ${newListings.length} new, ${duplicateCount} duplicates`
    );
    console.log(
      `[BHE] 🔍 Detected ${buyRequestsFromCards.length} buy requests from ${newListings.length} card listings`
    );

    await updateJob(supabase, jobId, {
      listings_new: newListings.length,
      listings_duplicate: duplicateCount,
      listings_total: allListings.length,
      progress_percentage: 40,
    });

    // ═══ PHASE 3: FETCH DETAILS (Buyers first!) ═══
    if (scope.detail_fetch_enabled && newListings.length > 0) {
      await updateJob(supabase, jobId, {
        status: "fetching_details",
        current_step: "جلب التفاصيل (المشترين أولاً)",
      });

      // Prioritize likely buyers — fetch their details first to get phone numbers
      const likelyBuyers = newListings.filter(l => l.isLikelyBuyRequest);
      const regularListings = newListings.filter(l => !l.isLikelyBuyRequest);
      const prioritizedListings = [...likelyBuyers, ...regularListings];

      // Reorder newListings in-place to match prioritized order
      newListings.length = 0;
      newListings.push(...prioritizedListings);

      const maxDetailFetches = Math.min(newListings.length, 50);

      console.log(`[AHE] 🎯 Detail fetch priority: ${likelyBuyers.length} likely buyers + ${Math.min(regularListings.length, maxDetailFetches - likelyBuyers.length)} sellers`);

      for (let i = 0; i < maxDetailFetches; i++) {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 40) {
          warnings.push(
            `Stopped detail fetching at ${i}/${newListings.length} — time budget exceeded (${Math.round(elapsed)}s)`
          );
          break;
        }

        try {
          const result = await fetchPage(newListings[i].url, 15000);
          await safeRpc(supabase, "increment_hourly_requests");

          const detailParser = getParser(scope.source_platform);
          const details = detailParser.parseDetail(result.html);

          newListings[i].enrichedDescription = details.description;
          newListings[i].enrichedMainImageUrl = details.mainImageUrl;
          newListings[i].enrichedAllImageUrls = details.allImageUrls;
          newListings[i].enrichedSpecifications = details.specifications;
          newListings[i].enrichedCondition = details.condition;

          const phone = extractPhone(details.description || "");
          if (phone) newListings[i].extractedPhone = phone;
          if (details.sellerName) newListings[i].sellerNameFromDetail = details.sellerName;
          if (details.sellerProfileUrl)
            newListings[i].sellerProfileUrlFromDetail = details.sellerProfileUrl;

          await updateJob(supabase, jobId, {
            details_fetched: i + 1,
            progress_percentage: 40 + Math.round(((i + 1) / maxDetailFetches) * 30),
          });

          if (i < maxDetailFetches - 1) {
            await delay(scope.detail_delay_between_requests_ms);
          }
        } catch (error) {
          if (error instanceof ServerFetchBlockedError) {
            warnings.push("Detail fetch also blocked (403) — skipping remaining details");
            break;
          }
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Detail ${newListings[i].url}: ${errMsg}`);
        }
      }
    }

    // ═══ PHASE 4: ENRICH + STORE ═══
    await updateJob(supabase, jobId, {
      status: "enriching",
      current_step: "إثراء وتخزين",
    });

    let newSellersCount = 0;
    let phonesExtracted = 0;

    for (const listing of newListings) {
      const location = mapLocation(listing.location || "", scope.source_platform);

      const sellerId = await upsertSeller(supabase, {
        phone: listing.extractedPhone || null,
        profileUrl: listing.sellerProfileUrlFromDetail || listing.sellerProfileUrl || null,
        name: cleanSellerName(listing.sellerNameFromDetail || listing.sellerName || null),
        platform: scope.source_platform,
        isVerified: listing.isVerified,
        isBusiness: listing.isBusiness,
        primaryCategory: scope.maksab_category,
        primaryGovernorate: location.governorate || scope.governorate,
      });

      if (sellerId?.isNew) newSellersCount++;
      if (listing.extractedPhone) phonesExtracted++;

      // Fetch actual total_listings_seen for existing sellers
      let actualListingsSeen = 1;
      if (sellerId?.id && !sellerId.isNew) {
        const { data: sellerData } = await supabase
          .from("ahe_sellers")
          .select("total_listings_seen")
          .eq("id", sellerId.id)
          .single();
        if (sellerData) actualListingsSeen = sellerData.total_listings_seen || 1;
      }

      // Strategy 1: كل بائع جديد = مشتري محتمل
      const sellerPhone = listing.extractedPhone || null;
      const sellerName = cleanSellerName(listing.sellerNameFromDetail || listing.sellerName || null);
      const sellerProfileUrl = listing.sellerProfileUrlFromDetail || listing.sellerProfileUrl || null;

      if (sellerPhone) {
        console.log('=== [SIB-CHECK] Calling with phone:', sellerPhone);
        try {
          const sibResult = await createBuyerFromSeller(supabase, {
            name: sellerName,
            phone: sellerPhone,
            profile_url: sellerProfileUrl,
            is_business: listing.isBusiness,
            is_verified: listing.isVerified,
            total_listings_seen: actualListingsSeen,
          }, {
            title: listing.title,
            price: listing.price,
            source_listing_url: listing.url,
          }, {
            maksab_category: scope.maksab_category,
            governorate: scope.governorate,
            source_platform: scope.source_platform,
          });
          console.log('=== [SIB-CHECK] Result:', sibResult);
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.log('=== [SIB-CHECK] ERROR:', errMsg);
        }
      } else {
        console.log('=== [SIB-CHECK] SKIP — no phone');
      }

      // Strategy 3: تصنيف احتمالية الشراء
      if (sellerId?.id) {
        await updateSellerBuyProbability(supabase, sellerId.id, {
          is_business: listing.isBusiness,
          is_verified: listing.isVerified,
          total_listings_seen: actualListingsSeen,
        });
      }

      // حفظ sellerId للاستخدام في Phase 5.6 (whale detection)
      if (sellerId?.id) {
        (listing as unknown as Record<string, unknown>).__sellerId = sellerId.id;
      }

      await supabase.from("ahe_listings").insert({
        scope_id: scope.id,
        harvest_job_id: jobId,
        source_platform: scope.source_platform,
        source_listing_url: listing.url,
        title: listing.title,
        description: listing.enrichedDescription || null,
        price: listing.price,
        is_negotiable: listing.isNegotiable,
        supports_exchange: listing.supportsExchange,
        is_featured: listing.isFeatured,
        thumbnail_url: listing.thumbnailUrl,
        main_image_url: listing.enrichedMainImageUrl || listing.thumbnailUrl,
        all_image_urls: listing.enrichedAllImageUrls || [],
        source_category: listing.category,
        maksab_category: scope.maksab_category,
        specifications: listing.enrichedSpecifications || {},
        source_location: listing.location,
        governorate: location.governorate || scope.governorate,
        city: location.city || scope.city,
        area: location.area,
        source_date_text: listing.dateText,
        estimated_posted_at: listing.estimatedDate || null,
        seller_name: cleanSellerName(listing.sellerNameFromDetail || listing.sellerName || null),
        seller_profile_url: listing.sellerProfileUrlFromDetail || listing.sellerProfileUrl,
        seller_is_verified: listing.isVerified,
        seller_is_business: listing.isBusiness,
        ahe_seller_id: sellerId?.id || null,
        extracted_phone: listing.extractedPhone || null,
        phone_source: listing.extractedPhone ? "description" : null,
        condition: listing.enrichedCondition || null,
        listing_type: listing.isFeatured ? "featured" : "regular",
        is_likely_buy_request: listing.isLikelyBuyRequest || false,
      });
    }

    await updateJob(supabase, jobId, {
      sellers_new: newSellersCount,
      phones_extracted: phonesExtracted,
      progress_percentage: 80,
    });

    // ═══ PHASE 4.5: BHE — SAVE DETECTED BUYERS ═══
    let buyersDetected = 0;
    let buyersWithPhone = 0;

    // Save buyers that went through detail fetch (have phone + description)
    for (const listing of newListings) {
      const confirmedBuyRequest = listing.enrichedDescription
        ? detectBuyRequest(listing.enrichedDescription)
        : false;
      const likelyBuyRequest = listing.isLikelyBuyRequest;

      if (confirmedBuyRequest || likelyBuyRequest) {
        const phone = listing.extractedPhone || listing.detectedBuyerPhone || null;
        const sellerName = cleanSellerName(
          listing.sellerNameFromDetail || listing.sellerName || null
        );
        const description = listing.enrichedDescription || "";

        try {
          // Check for duplicate by source_url
          const { data: existingBuyer } = await supabase
            .from("bhe_buyers")
            .select("id")
            .eq("source_url", listing.url)
            .maybeSingle();

          if (!existingBuyer) {
            await supabase.from("bhe_buyers").insert({
              source: confirmedBuyRequest ? `${scope.source_platform}_wanted` : `${scope.source_platform}_title_match`,
              source_url: listing.url,
              source_platform: scope.source_platform,
              buyer_name: sellerName,
              buyer_phone: phone,
              product_wanted: listing.title,
              category: scope.maksab_category || null,
              governorate: scope.governorate || null,
              budget_max: listing.price || null,
              original_text:
                listing.title + " - " + (description).substring(0, 200),
              buyer_tier: phone ? "hot_buyer" : "warm_buyer",
              buyer_score: phone ? 80 : confirmedBuyRequest ? 60 : 40,
              pipeline_status: phone ? "phone_found" : "discovered",
            });
            buyersDetected++;
            if (phone) buyersWithPhone++;

            console.log(
              `[BHE] ${confirmedBuyRequest ? "Confirmed" : "Title match"} buy request:`,
              listing.title?.substring(0, 40),
              phone ? `📞 ${phone}` : "📵 no phone"
            );
          }
        } catch {
          // Skip on duplicate or error
        }
      }
    }

    // Save unfetched buyers (beyond detail limit) as warm leads without phone
    const detailFetchedUrls = new Set(
      newListings.slice(0, Math.min(newListings.length, 50)).map((l) => l.url)
    );
    const unfetchedBuyers = newListings.filter(
      (l) => l.isLikelyBuyRequest && !detailFetchedUrls.has(l.url)
    );

    for (const buyer of unfetchedBuyers) {
      try {
        const { data: existingBuyer } = await supabase
          .from("bhe_buyers")
          .select("id")
          .eq("source_url", buyer.url)
          .maybeSingle();

        if (!existingBuyer) {
          const buyerPhone = buyer.detectedBuyerPhone || null;
          await supabase.from("bhe_buyers").insert({
            source: `${scope.source_platform}_title_match`,
            source_url: buyer.url,
            source_platform: scope.source_platform,
            buyer_name: buyer.sellerName || null,
            buyer_phone: buyerPhone,
            product_wanted: buyer.title,
            category: scope.maksab_category || null,
            governorate: scope.governorate || null,
            budget_max: buyer.price || null,
            original_text: buyer.title,
            buyer_tier: buyerPhone ? "hot_buyer" : "warm_buyer",
            buyer_score: buyerPhone ? 70 : 30,
            pipeline_status: buyerPhone ? "phone_found" : "discovered",
          });
          buyersDetected++;
        }
      } catch {
        // Skip on error
      }
    }

    if (buyersDetected > 0) {
      console.log(
        `[BHE] 📊 Phase 4.5: ${buyersDetected} buyers detected (${buyersWithPhone} with phone)`
      );
    }

    // ═══ PHASE 5.5: SCOPE-LEVEL FILTERING ═══
    // فلترة ما بعد الجلب بناءً على معاملات النطاق المتقدمة (Phase 3)
    let filteredOutCount = 0;
    const hasAdvancedFilters =
      (scope.target_seller_type && scope.target_seller_type !== "all") ||
      (scope.target_listing_type && scope.target_listing_type !== "all") ||
      scope.price_min != null ||
      scope.price_max != null ||
      scope.product_condition != null;

    if (hasAdvancedFilters && newListings.length > 0) {
      await updateJob(supabase, jobId, {
        current_step: "فلترة متقدمة",
      });

      const filterableListings: FilterableListing[] = newListings.map((l) => ({
        url: l.url,
        title: l.title,
        price: l.price,
        isFeatured: l.isFeatured,
        isBusiness: l.isBusiness,
        isVerified: l.isVerified,
        condition: l.enrichedCondition || null,
      }));

      const filterResult = applyScopeFilters(filterableListings, scope);
      filteredOutCount = filterResult.filtered_out.length;

      if (filteredOutCount > 0) {
        // حذف الإعلانات المفلترة من القائمة
        const passedUrls = new Set(filterResult.passed.map((l) => l.url));
        const originalLength = newListings.length;
        const filteredNewListings = newListings.filter((l) =>
          passedUrls.has(l.url)
        );
        newListings.length = 0;
        newListings.push(...filteredNewListings);

        console.log(
          `[AHE] 🔍 Phase 5.5: Filtered ${filteredOutCount}/${originalLength} — ` +
            `seller_type: ${filterResult.stats.filtered_by_seller_type}, ` +
            `listing_type: ${filterResult.stats.filtered_by_listing_type}, ` +
            `price: ${filterResult.stats.filtered_by_price}, ` +
            `condition: ${filterResult.stats.filtered_by_condition}`
        );

        warnings.push(
          `فلترة متقدمة: ${filteredOutCount} إعلان مستبعد من ${originalLength}`
        );
      }
    }

    // ═══ PHASE 5: AUTO-QUEUE TO CRM ═══
    await updateJob(supabase, jobId, {
      status: "queuing",
      current_step: "إرسال للـ CRM",
    });

    let autoQueuedCount = 0;

    const { data: unqueuedSellers } = await supabase
      .from("ahe_sellers")
      .select("*")
      .eq("pipeline_status", "discovered")
      .not("phone", "is", null)
      .is("crm_customer_id", null)
      .limit(50);

    for (const seller of unqueuedSellers || []) {
      try {
        const { data: existingCustomer } = await supabase
          .from("crm_customers")
          .select("id")
          .eq("phone", seller.phone)
          .maybeSingle();

        if (existingCustomer) {
          await supabase
            .from("ahe_sellers")
            .update({
              crm_customer_id: existingCustomer.id,
              pipeline_status: "linked_existing",
            })
            .eq("id", seller.id);
          continue;
        }

        const { data: customer } = await supabase
          .from("crm_customers")
          .insert({
            full_name: seller.name || "معلن من " + seller.source_platform,
            phone: seller.phone,
            lifecycle_stage: "lead",
            source: "competitor_migration",
            source_platform: seller.source_platform,
            primary_category: seller.primary_category,
            governorate: seller.primary_governorate,
            acquisition_score: seller.priority_score,
          })
          .select()
          .single();

        if (customer) {
          await supabase
            .from("ahe_sellers")
            .update({
              crm_customer_id: customer.id,
              pipeline_status: "auto_queued",
            })
            .eq("id", seller.id);
          autoQueuedCount++;
        }
      } catch {
        // Skip on error
      }
    }

    // ═══ PHASE 5.6: WHALE DETECTION UPDATE ═══
    // إعادة حساب whale_score للبائعين المتأثرين (Phase 3)
    let newWhalesCount = 0;
    const affectedSellerIds = new Set<string>();
    for (const listing of newListings) {
      const sellerId = (listing as unknown as Record<string, unknown>).__sellerId as string | undefined;
      if (sellerId) affectedSellerIds.add(sellerId);
    }

    if (affectedSellerIds.size > 0) {
      await updateJob(supabase, jobId, {
        current_step: "تحليل الحيتان 🐋",
      });

      try {
        const whaleResult = await updateWhaleScoresAfterHarvest(
          supabase,
          Array.from(affectedSellerIds)
        );
        newWhalesCount = whaleResult.new_whales;

        if (whaleResult.new_whales > 0) {
          console.log(
            `[AHE] 🐋 Phase 5.6: ${whaleResult.new_whales} new whales detected! (total: ${whaleResult.total_whales})`
          );
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        warnings.push(`Whale detection warning: ${errMsg}`);
      }
    }

    // ═══ PHASE 6: METRICS ═══
    await updateJob(supabase, jobId, {
      status: "recording_metrics",
      current_step: "تسجيل المقاييس",
    });

    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);

    await supabase.from("ahe_hourly_metrics").upsert(
      {
        scope_id: scope.id,
        hour_start: hourStart.toISOString(),
        listings_fetched: allListings.length,
        listings_new: newListings.length,
        listings_duplicate: duplicateCount,
        sellers_new: newSellersCount,
        phones_extracted: phonesExtracted,
        auto_queued: autoQueuedCount,
        fetch_duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        pages_fetched: page - 1,
        errors_count: errors.length,
      },
      { onConflict: "scope_id,hour_start" }
    );

    await safeRpc(supabase, "upsert_ahe_daily_metrics", {
      p_listings_new: newListings.length,
      p_sellers_new: newSellersCount,
      p_phones_extracted: phonesExtracted,
      p_auto_queued: autoQueuedCount,
    });

    await supabase
      .from("ahe_scopes")
      .update({
        last_harvest_at: new Date().toISOString(),
        last_harvest_job_id: jobId,
        last_harvest_new_listings: newListings.length,
        last_harvest_new_sellers: newSellersCount,
        total_harvests: scope.total_harvests + 1,
        total_listings_found: scope.total_listings_found + newListings.length,
        total_sellers_found: scope.total_sellers_found + newSellersCount,
        total_phones_extracted: scope.total_phones_extracted + phonesExtracted,
        total_whales_found: (scope.total_whales_found || 0) + newWhalesCount,
        total_filtered_out: (scope.total_filtered_out || 0) + filteredOutCount,
        consecutive_failures:
          allListings.length === 0 && errors.length > 0
            ? scope.consecutive_failures + 1
            : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scope.id);

    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    await updateJob(supabase, jobId, {
      status: "completed",
      current_step: null,
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      auto_queued: autoQueuedCount,
      errors: errors.length > 0 ? errors : [],
      progress_percentage: 100,
    });

    // Decrement running jobs
    const currentEngine = await getEngineStatus(supabase);
    await supabase
      .from("ahe_engine_status")
      .update({
        running_jobs_count: Math.max(0, currentEngine.running_jobs_count - 1),
      })
      .eq("id", 1);

    console.log(
      `[AHE] ✅ Job ${jobId} completed in ${durationSeconds}s — ${newListings.length} new, ${duplicateCount} dup, ${errors.length} errors`
    );

    // ═══ SELLER IS BUYER — بعد كل حصادة ═══
    try {
      console.log('=== [SIB] Starting seller_is_buyer conversion ===');

      // جلب آخر 50 بائع بأرقام اتضافوا في آخر ساعة
      const { data: recentSellers, error: selErr } = await supabase
        .from('ahe_sellers')
        .select('id, name, phone, profile_url, is_business, total_listings_seen')
        .not('phone', 'is', null)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(50);

      if (selErr) {
        console.log('=== [SIB] Query error:', selErr.message);
      } else {
        console.log('=== [SIB] Found', recentSellers?.length || 0, 'recent sellers with phones');

        let created = 0;
        for (const seller of (recentSellers || [])) {
          // check duplicate
          const { data: exists } = await supabase
            .from('bhe_buyers')
            .select('id')
            .eq('source', 'seller_is_buyer')
            .eq('buyer_phone', seller.phone)
            .maybeSingle();

          if (exists) continue;

          const { error: insErr } = await supabase.from('bhe_buyers').insert({
            source: 'seller_is_buyer',
            source_platform: 'dubizzle',
            buyer_name: seller.name,
            buyer_phone: seller.phone,
            buyer_profile_url: seller.profile_url,
            product_wanted: 'ترقية — بائع نشط',
            category: scope?.maksab_category || null,
            governorate: scope?.governorate || null,
            buyer_tier: (!seller.is_business && (seller.total_listings_seen || 1) <= 3) ? 'hot_buyer' : 'warm_buyer',
            buyer_score: (!seller.is_business && (seller.total_listings_seen || 1) <= 3) ? 80 : 50,
            pipeline_status: 'phone_found',
          });

          if (insErr) {
            console.log('=== [SIB] Insert error:', insErr.message);
            break; // لو فيه خطأ schema — وقف
          } else {
            created++;
          }
        }

        console.log('=== [SIB] Created', created, 'buyers from sellers');
      }
    } catch (e: unknown) {
      const sibMsg = e instanceof Error ? e.message : String(e);
      console.log('=== [SIB] CRASH:', sibMsg);
    }

    return {
      success: true,
      listings_new: newListings.length,
      listings_duplicate: duplicateCount,
      sellers_new: newSellersCount,
      phones_extracted: phonesExtracted,
      auto_queued: autoQueuedCount,
      errors,
      warnings,
      duration_seconds: durationSeconds,
      fetch_strategy: fetchStrategy,
      http_status: httpStatus,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(errMsg);
    console.error(`[AHE] 💥 Job ${jobId} fatal error: ${errMsg}`);

    await updateJob(supabase, jobId, {
      status: "failed",
      current_step: null,
      errors,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor((Date.now() - startTime) / 1000),
    });

    const engineState = await getEngineStatus(supabase);
    await supabase
      .from("ahe_engine_status")
      .update({
        consecutive_errors: engineState.consecutive_errors + 1,
        last_error_at: new Date().toISOString(),
        last_error_message: errMsg,
        running_jobs_count: Math.max(0, engineState.running_jobs_count - 1),
      })
      .eq("id", 1);

    await safeRpc(supabase, "auto_pause_on_consecutive_errors");

    return {
      success: false,
      listings_new: 0,
      listings_duplicate: 0,
      sellers_new: 0,
      phones_extracted: 0,
      auto_queued: 0,
      errors,
      warnings,
      duration_seconds: Math.floor((Date.now() - startTime) / 1000),
      fetch_strategy: fetchStrategy,
    };
  }
}

// ═══ Helper Functions ═══

async function updateJob(
  supabase: SupabaseClient,
  jobId: string,
  updates: Record<string, unknown>
) {
  await supabase.from("ahe_harvest_jobs").update(updates).eq("id", jobId);
}

async function getEngineStatus(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("ahe_engine_status")
    .select("*")
    .eq("id", 1)
    .single();
  return data || { consecutive_errors: 0, running_jobs_count: 0 };
}

function buildPageUrl(
  baseUrl: string,
  paginationPattern: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  return baseUrl + paginationPattern.replace("{page}", page.toString());
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface UpsertSellerResult {
  id: string;
  isNew: boolean;
}

async function upsertSeller(
  supabase: SupabaseClient,
  data: {
    phone: string | null;
    profileUrl: string | null;
    name: string | null;
    platform: string;
    isVerified: boolean;
    isBusiness: boolean;
    primaryCategory: string;
    primaryGovernorate: string;
  }
): Promise<UpsertSellerResult | null> {
  let existingSeller: { id: string } | null = null;

  if (data.phone) {
    const { data: byPhone } = await supabase
      .from("ahe_sellers")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    existingSeller = byPhone;
  }

  if (!existingSeller && data.profileUrl) {
    const { data: byProfile } = await supabase
      .from("ahe_sellers")
      .select("id")
      .eq("profile_url", data.profileUrl)
      .maybeSingle();
    existingSeller = byProfile;
  }

  // Fallback: match by name + platform + governorate (dedup same company with different phones)
  if (!existingSeller && data.name && data.name.length >= 3) {
    const { data: byName } = await supabase
      .from("ahe_sellers")
      .select("id")
      .eq("name", data.name)
      .eq("source_platform", data.platform)
      .eq("primary_governorate", data.primaryGovernorate)
      .maybeSingle();
    existingSeller = byName;

    // If matched by name but we have a new phone, add it as alternate
    if (existingSeller && data.phone) {
      const { data: seller } = await supabase
        .from("ahe_sellers")
        .select("phone, alternate_phones")
        .eq("id", existingSeller.id)
        .single();

      if (seller) {
        const existingPhones = new Set<string>([
          ...(seller.phone ? [seller.phone] : []),
          ...(seller.alternate_phones || []),
        ]);
        if (!existingPhones.has(data.phone)) {
          const altPhones = [...(seller.alternate_phones || []), data.phone];
          // If no primary phone, promote this one
          if (!seller.phone) {
            await supabase.from("ahe_sellers").update({
              phone: data.phone,
              updated_at: new Date().toISOString(),
            }).eq("id", existingSeller.id);
          } else {
            await supabase.from("ahe_sellers").update({
              alternate_phones: altPhones,
              updated_at: new Date().toISOString(),
            }).eq("id", existingSeller.id);
          }
        }
      }
    }
  }

  if (existingSeller) {
    await safeRpc(supabase, "increment_seller_listings", {
      p_seller_id: existingSeller.id,
    });
    return { id: existingSeller.id, isNew: false };
  }

  const priorityScore = calculatePriorityScore(data);

  const { data: newSeller } = await supabase
    .from("ahe_sellers")
    .insert({
      phone: data.phone,
      profile_url: data.profileUrl,
      name: data.name,
      source_platform: data.platform,
      is_verified: data.isVerified,
      is_business: data.isBusiness,
      primary_category: data.primaryCategory,
      primary_governorate: data.primaryGovernorate,
      total_listings_seen: 1,
      priority_score: priorityScore,
      pipeline_status: "discovered",
    })
    .select("id")
    .single();

  return newSeller ? { id: newSeller.id, isNew: true } : null;
}

function calculatePriorityScore(data: {
  isVerified: boolean;
  isBusiness: boolean;
  phone: string | null;
}): number {
  let score = 0;
  if (data.isVerified) score += 30;
  if (data.isBusiness) score += 20;
  if (data.phone) score += 25;
  return Math.min(score, 100);
}
