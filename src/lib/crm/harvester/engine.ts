/**
 * AHE Engine — محرك الحصاد الآلي الرئيسي
 * 6 مراحل: جلب → استبعاد → تفاصيل → إثراء + تخزين → طابور CRM → مقاييس
 *
 * استراتيجيات الجلب:
 * 1. JSON API مباشرة (الأسرع)
 * 2. HTML مع __NEXT_DATA__ parsing
 * 3. HTML regex fallback
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  parseDubizzleList,
  parseDubizzleDetail,
  BROWSER_HEADERS,
  API_HEADERS,
  type ListPageListing,
} from "./parsers/dubizzle";
import { extractPhone } from "./parsers/phone-extractor";
import { parseRelativeDate } from "./parsers/date-parser";
import { mapLocation } from "./parsers/location-mapper";
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
 * Fetch strategies for Dubizzle
 * Tries multiple approaches to bypass bot detection
 */
async function fetchPage(
  url: string,
  timeoutMs: number
): Promise<{ html: string; status: number; strategy: string }> {
  const strategies = [
    {
      name: "browser_html",
      headers: { ...BROWSER_HEADERS },
      transform: (u: string) => u,
    },
    {
      name: "api_json",
      headers: { ...API_HEADERS },
      transform: (u: string) => {
        // Try adding .json or using API path
        if (u.includes("/api/")) return u;
        // Convert page URL to a potential API URL
        return u;
      },
    },
    {
      name: "english_path",
      headers: { ...BROWSER_HEADERS },
      transform: (u: string) => {
        // Try /en/ path variant
        const urlObj = new URL(u);
        if (!urlObj.pathname.startsWith("/en/")) {
          urlObj.pathname = "/en" + urlObj.pathname;
        }
        return urlObj.toString();
      },
    },
    {
      name: "mobile_ua",
      headers: {
        ...BROWSER_HEADERS,
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
      },
      transform: (u: string) => u,
    },
  ];

  let lastError: Error | null = null;
  let lastStatus = 0;

  for (const strategy of strategies) {
    const targetUrl = strategy.transform(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(
        `[AHE] 🔄 Trying strategy "${strategy.name}" for: ${targetUrl.substring(0, 80)}...`
      );

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: strategy.headers,
        redirect: "follow",
      });

      lastStatus = response.status;

      if (response.ok) {
        const html = await response.text();
        console.log(
          `[AHE] ✅ Strategy "${strategy.name}" succeeded — ${html.length} bytes, status ${response.status}`
        );
        return { html, status: response.status, strategy: strategy.name };
      }

      console.log(
        `[AHE] ❌ Strategy "${strategy.name}" failed — HTTP ${response.status}`
      );

      // If 429 (rate limited), don't try more strategies
      if (response.status === 429) {
        throw new Error(`Rate limited (429) — waiting required`);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(
        `[AHE] ❌ Strategy "${strategy.name}" error: ${lastError.message}`
      );
    } finally {
      clearTimeout(timeout);
    }

    // Small delay between strategies
    await delay(2000);
  }

  throw new Error(
    `All fetch strategies failed for ${url}. Last status: ${lastStatus}. Last error: ${lastError?.message || "unknown"}`
  );
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

        // Log response preview for diagnostics
        const preview = result.html.substring(0, 200).replace(/\n/g, " ");
        console.log(`[AHE] 📝 Response preview: ${preview}...`);

        const listings = parseDubizzleList(result.html);

        console.log(
          `[AHE] 📊 Page ${page}: Found ${listings.length} listings (strategy: ${result.strategy})`
        );

        if (listings.length === 0) {
          warnings.push(
            `Page ${page}: 0 listings found (${result.html.length} bytes received, strategy: ${result.strategy})`
          );

          // If first page returns nothing, the parser might not match the HTML structure
          if (page === 1) {
            // Store a diagnostic snippet
            const diagnosticSnippet = result.html.substring(0, 500);
            warnings.push(
              `First page HTML snippet: ${diagnosticSnippet.replace(/\n/g, "\\n")}`
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

    console.log(
      `[AHE] 📊 Phase 2: ${newListings.length} new, ${duplicateCount} duplicates`
    );

    await updateJob(supabase, jobId, {
      listings_new: newListings.length,
      listings_duplicate: duplicateCount,
      listings_total: allListings.length,
      progress_percentage: 40,
    });

    // ═══ PHASE 3: FETCH DETAILS ═══
    if (scope.detail_fetch_enabled && newListings.length > 0) {
      await updateJob(supabase, jobId, {
        status: "fetching_details",
        current_step: "جلب التفاصيل",
      });

      // Limit detail fetches to avoid timeout (Vercel 60s limit)
      const maxDetailFetches = Math.min(newListings.length, 5);

      for (let i = 0; i < maxDetailFetches; i++) {
        // Check time budget — leave 15s for remaining phases
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

          const details = parseDubizzleDetail(result.html);

          newListings[i].enrichedDescription = details.description;
          newListings[i].enrichedMainImageUrl = details.mainImageUrl;
          newListings[i].enrichedAllImageUrls = details.allImageUrls;
          newListings[i].enrichedSpecifications = details.specifications;
          newListings[i].enrichedCondition = details.condition;

          const phone = extractPhone(details.description || "");
          if (phone) {
            newListings[i].extractedPhone = phone;
          }

          if (details.sellerName) {
            newListings[i].sellerNameFromDetail = details.sellerName;
          }
          if (details.sellerProfileUrl) {
            newListings[i].sellerProfileUrlFromDetail =
              details.sellerProfileUrl;
          }

          await updateJob(supabase, jobId, {
            details_fetched: i + 1,
            progress_percentage:
              40 + Math.round(((i + 1) / maxDetailFetches) * 30),
          });

          if (i < maxDetailFetches - 1) {
            await delay(scope.detail_delay_between_requests_ms);
          }
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : String(error);
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
      const location = mapLocation(
        listing.location || "",
        scope.source_platform
      );

      const sellerId = await upsertSeller(supabase, {
        phone: listing.extractedPhone || null,
        profileUrl:
          listing.sellerProfileUrlFromDetail ||
          listing.sellerProfileUrl ||
          null,
        name:
          listing.sellerNameFromDetail || listing.sellerName || null,
        platform: scope.source_platform,
        isVerified: listing.isVerified,
        isBusiness: listing.isBusiness,
        primaryCategory: scope.maksab_category,
        primaryGovernorate: location.governorate || scope.governorate,
      });

      if (sellerId?.isNew) newSellersCount++;
      if (listing.extractedPhone) phonesExtracted++;

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
        main_image_url:
          listing.enrichedMainImageUrl || listing.thumbnailUrl,
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
        seller_name:
          listing.sellerNameFromDetail || listing.sellerName,
        seller_profile_url:
          listing.sellerProfileUrlFromDetail ||
          listing.sellerProfileUrl,
        seller_is_verified: listing.isVerified,
        seller_is_business: listing.isBusiness,
        ahe_seller_id: sellerId?.id || null,
        extracted_phone: listing.extractedPhone || null,
        phone_source: listing.extractedPhone ? "description" : null,
        condition: listing.enrichedCondition || null,
      });
    }

    await updateJob(supabase, jobId, {
      sellers_new: newSellersCount,
      phones_extracted: phonesExtracted,
      progress_percentage: 80,
    });

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
            full_name:
              seller.name || "معلن من " + seller.source_platform,
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
        fetch_duration_seconds: Math.floor(
          (Date.now() - startTime) / 1000
        ),
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
        total_listings_found:
          scope.total_listings_found + newListings.length,
        total_sellers_found:
          scope.total_sellers_found + newSellersCount,
        total_phones_extracted:
          scope.total_phones_extracted + phonesExtracted,
        consecutive_failures:
          allListings.length === 0 && errors.length > 0
            ? scope.consecutive_failures + 1
            : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scope.id);

    const durationSeconds = Math.floor(
      (Date.now() - startTime) / 1000
    );

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
        running_jobs_count: Math.max(
          0,
          currentEngine.running_jobs_count - 1
        ),
      })
      .eq("id", 1);

    console.log(
      `[AHE] ✅ Job ${jobId} completed in ${durationSeconds}s — ${newListings.length} new, ${duplicateCount} dup, ${errors.length} errors`
    );

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
    const errMsg =
      error instanceof Error ? error.message : String(error);
    errors.push(errMsg);
    console.error(`[AHE] 💥 Job ${jobId} fatal error: ${errMsg}`);

    await updateJob(supabase, jobId, {
      status: "failed",
      current_step: null,
      errors,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor(
        (Date.now() - startTime) / 1000
      ),
    });

    const engineState = await getEngineStatus(supabase);
    await supabase
      .from("ahe_engine_status")
      .update({
        consecutive_errors: engineState.consecutive_errors + 1,
        last_error_at: new Date().toISOString(),
        last_error_message: errMsg,
        running_jobs_count: Math.max(
          0,
          engineState.running_jobs_count - 1
        ),
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
      duration_seconds: Math.floor(
        (Date.now() - startTime) / 1000
      ),
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
  await supabase
    .from("ahe_harvest_jobs")
    .update(updates)
    .eq("id", jobId);
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

