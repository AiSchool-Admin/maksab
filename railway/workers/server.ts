/**
 * مكسب Workers Server — Railway
 *
 * Endpoints:
 *   GET|POST /harvest         — Harvest a specific scope (GET ?scope_code=XXX or POST { scope_code })
 *   GET  /harvest/status      — Engine status + scopes overview
 *   GET  /cron/harvest        — Automated: pick ready scopes & harvest them
 *   GET  /health              — Health check
 *
 * Features:
 *   - Cheerio-based article parsing for Dubizzle listings
 *   - Auto-queue new sellers with phones to CRM as leads
 *   - 5s delay between requests for rate limiting
 *
 * Also starts the auction-cron worker in background.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

// ─── Config ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000", 10);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
};

// ─── Supabase Client ─────────────────────────────────────────
function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Types ───────────────────────────────────────────────────
interface ParsedListing {
  url: string;
  sourceId: string;
  title: string;
  price: number | null;
  thumbnailUrl: string | null;
  location: string;
  dateText: string;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isFeatured: boolean;
  supportsExchange: boolean;
  isNegotiable: boolean;
}

interface HarvestResult {
  success: boolean;
  scope_code: string;
  pages_fetched: number;
  fetched: number;
  new: number;
  duplicate: number;
  sellers_new: number;
  crm_queued: number;
  errors: string[];
  duration_ms: number;
}

// ─── Cheerio-based Dubizzle Parser ───────────────────────────
// Mirrors the bookmarklet's article-based extraction strategy

function parseDubizzleHtml(html: string): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];
  const seenUrls = new Set<string>();

  $("article").each(function () {
    const article = $(this);

    // Find the ad link
    const adLink = article.find('a[href*="/ad/"]').first();
    if (!adLink.length) return;

    const href = adLink.attr("href") || "";
    const url = href.startsWith("http")
      ? href
      : `https://www.dubizzle.com.eg${href}`;

    // Extract source ID from URL pattern: ID12345.html
    const idMatch = url.match(/ID(\d+)\.html/);
    if (!idMatch) return;

    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const sourceId = idMatch[1];
    const title = (adLink.attr("title") || adLink.text().trim() || "").trim();
    if (!title || title.length < 3) return;

    // Thumbnail: img with -400x300 pattern
    const img = article.find('img[src*="-400x300"]').first();
    const thumbnailUrl = img.attr("src") || null;

    // Card text for regex extraction
    const cardText = article.text() || "";

    // Price: match digits followed by ج.م
    const priceMatch = cardText.match(/([\d,]+)\s*ج\.م/);
    const price = priceMatch
      ? parseInt(priceMatch[1].replace(/,/g, ""), 10)
      : null;

    // Date text: "منذ X دقائق/ساعات/أيام/..."
    const dateMatch = cardText.match(
      /منذ\s+\d+\s*(دقيقة|دقائق|ساعة|ساعات|يوم|أيام|أسبوع|أسابيع|شهر|أشهر)/
    );
    const dateText = dateMatch ? dateMatch[0].trim() : "";

    // Location extraction (same logic as bookmarklet)
    let location = "";
    const govs =
      "القاهرة|الجيزة|الإسكندرية|الدقهلية|البحيرة|المنوفية|الغربية|كفر الشيخ|الشرقية|القليوبية|الفيوم|بني سويف|المنيا|أسيوط|سوهاج|قنا|الأقصر|أسوان|البحر الأحمر|الوادي الجديد|مطروح|شمال سيناء|جنوب سيناء|بورسعيد|السويس|الإسماعيلية|دمياط";

    // Find the element containing bullet + "منذ" (location is before that)
    let locSrc = cardText;
    let minLen = Infinity;
    article.find("*").each(function () {
      const t = $(this).text() || "";
      if (
        /[•·]/.test(t) &&
        /منذ/.test(t) &&
        t.length < minLen &&
        t.length > 5 &&
        t.length < 150
      ) {
        minLen = t.length;
        locSrc = t;
      }
    });

    const bulletIdx = locSrc.search(/[•·]\s*منذ/);
    if (bulletIdx > -1) {
      const before = locSrc.substring(Math.max(0, bulletIdx - 60), bulletIdx).trim();
      // Try "area، governorate" pattern
      const agRe = new RegExp(
        `([\\u0600-\\u06FF][\\u0600-\\u06FF\\u0020]{0,28})[،,]\\s*(${govs})$`
      );
      const agM = before.match(agRe);
      if (agM) {
        location = `${agM[1].trim()}، ${agM[2]}`;
      } else {
        // Try just governorate
        const gRe = new RegExp(`(${govs})$`);
        const gM = before.match(gRe);
        if (gM) location = gM[1];
      }
    }

    // Flags
    const supportsExchange =
      cardText.includes("متوفر التبادل") || cardText.includes("تبادل");
    const isNegotiable = cardText.includes("قابل للتفاوض");
    const isFeatured =
      cardText.includes("مميز") ||
      cardText.includes("إيليت") ||
      !!article.find('[aria-label="Elite"]').length;
    const isVerified = cardText.includes("موثق");
    const isBusiness = cardText.includes("صاحب عمل");

    // Seller
    const sellerLink = article.find('a[href*="/companies/"]').first();
    const sellerName = sellerLink.length ? sellerLink.text().trim() : null;
    const sellerProfileUrl = sellerLink.length
      ? sellerLink.attr("href") || null
      : null;

    listings.push({
      url,
      sourceId,
      title,
      price,
      thumbnailUrl,
      location,
      dateText,
      sellerName,
      sellerProfileUrl: sellerProfileUrl
        ? sellerProfileUrl.startsWith("http")
          ? sellerProfileUrl
          : `https://www.dubizzle.com.eg${sellerProfileUrl}`
        : null,
      isVerified,
      isBusiness,
      isFeatured,
      supportsExchange,
      isNegotiable,
    });
  });

  return listings;
}

// ─── Location Mapper (minimal — matches the src/lib version) ──
const GOVERNORATE_MAP: Record<string, string> = {
  القاهرة: "cairo",
  الإسكندرية: "alexandria",
  الاسكندرية: "alexandria",
  اسكندرية: "alexandria",
  الجيزة: "giza",
  القليوبية: "qalyubia",
  الشرقية: "sharqia",
  الدقهلية: "dakahlia",
  الغربية: "gharbia",
  المنوفية: "monufia",
  البحيرة: "beheira",
  "كفر الشيخ": "kafr_el_sheikh",
  دمياط: "damietta",
  بورسعيد: "port_said",
  الإسماعيلية: "ismailia",
  السويس: "suez",
  الفيوم: "fayoum",
  "بني سويف": "beni_suef",
  المنيا: "minya",
  أسيوط: "assiut",
  سوهاج: "sohag",
  قنا: "qena",
  الأقصر: "luxor",
  أسوان: "aswan",
  "البحر الأحمر": "red_sea",
  مطروح: "matrouh",
  "شمال سيناء": "north_sinai",
  "جنوب سيناء": "south_sinai",
  "الوادي الجديد": "new_valley",
};

function mapLocationFromText(text: string): {
  governorate: string | null;
  city: string | null;
} {
  if (!text) return { governorate: null, city: null };
  const lower = text.trim();
  for (const [key, value] of Object.entries(GOVERNORATE_MAP)) {
    if (lower.includes(key)) {
      // Try to extract city (text before the comma)
      const parts = lower.split(/[،,]/);
      const city =
        parts.length > 1 ? parts[0].trim().replace(/\s+/g, "_") : null;
      return { governorate: value, city };
    }
  }
  return { governorate: null, city: null };
}

// ─── Date Parser ──────────────────────────────────────────────
function parseRelativeDate(text: string): string | null {
  if (!text) return null;
  const now = new Date();
  const numMatch = text.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1]) : 1;

  if (/دقيق|minute/i.test(text)) {
    now.setMinutes(now.getMinutes() - num);
    return now.toISOString();
  }
  if (/ساع|hour/i.test(text)) {
    now.setHours(now.getHours() - num);
    return now.toISOString();
  }
  if (/يوم|أيام|day/i.test(text)) {
    now.setDate(now.getDate() - num);
    return now.toISOString();
  }
  if (/أسبوع|أسابيع|week/i.test(text)) {
    now.setDate(now.getDate() - num * 7);
    return now.toISOString();
  }
  if (/شهر|أشهر|month/i.test(text)) {
    now.setMonth(now.getMonth() - num);
    return now.toISOString();
  }
  return null;
}

// ─── Phone Extractor ──────────────────────────────────────────
function extractPhone(text: string): string | null {
  if (!text) return null;
  let match = text.match(/\+?20\s?1[0-25]\d{8}/g);
  if (match) return normalizePhone(match[0]);
  match = text.match(/01[0-25]\d{8}/g);
  if (match) return normalizePhone(match[0]);
  match = text.match(/01[0-25][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g);
  if (match) return normalizePhone(match[0]);
  return null;
}

function normalizePhone(phone: string): string | null {
  phone = phone.replace(/[\s.\-+]/g, "");
  if (phone.startsWith("20") && phone.length === 12) phone = "0" + phone.slice(2);
  return /^01[0-25]\d{8}$/.test(phone) ? phone : null;
}

// ─── Seller Priority Score ────────────────────────────────────
function calcPriorityScore(data: {
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

// ─── Fetch a Dubizzle page ──────────────────────────────────
async function fetchDubizzlePage(
  url: string,
  timeoutMs = 20000
): Promise<{ html: string; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    const html = await response.text();
    return { html, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Build paginated URL ─────────────────────────────────────
function buildPageUrl(
  baseUrl: string,
  paginationPattern: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  return baseUrl + paginationPattern.replace("{page}", page.toString());
}

// ─── Core Harvest Logic ──────────────────────────────────────
async function harvestScope(scopeCode: string): Promise<HarvestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const supabase = getSupabase();

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
      pages_fetched: 0,
      fetched: 0,
      new: 0,
      duplicate: 0,
      sellers_new: 0,
      crm_queued: 0,
      errors: [`Scope not found: ${scopeCode}`],
      duration_ms: Date.now() - startTime,
    };
  }

  console.log(`[Harvest] 🚀 Starting harvest for scope "${scope.name}" (${scope.code})`);
  console.log(`[Harvest] 📍 URL: ${scope.base_url}`);

  // 2. Fetch pages
  const allListings: ParsedListing[] = [];
  const maxPages = scope.max_pages_per_harvest || 5;
  const delayMs = scope.delay_between_requests_ms || 5000;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const pageUrl = buildPageUrl(
        scope.base_url,
        scope.pagination_pattern || "?page={page}",
        page
      );
      console.log(`[Harvest] 📄 Page ${page}/${maxPages}: ${pageUrl}`);

      const { html, status } = await fetchDubizzlePage(pageUrl);

      if (status === 403) {
        errors.push(`Page ${page}: HTTP 403 — WAF block`);
        // Mark scope as blocked
        await supabase
          .from("ahe_scopes")
          .update({
            server_fetch_blocked: true,
            server_fetch_blocked_at: new Date().toISOString(),
          })
          .eq("id", scope.id);
        break;
      }

      if (status !== 200) {
        errors.push(`Page ${page}: HTTP ${status}`);
        break;
      }

      const listings = parseDubizzleHtml(html);
      console.log(`[Harvest] 📊 Page ${page}: ${listings.length} listings from ${(html.match(/<article/g) || []).length} articles`);

      if (listings.length === 0) {
        if (page === 1) {
          errors.push(
            `Page 1: 0 listings parsed from ${html.length} bytes (${(html.match(/<article/g) || []).length} articles)`
          );
        }
        break;
      }

      allListings.push(...listings);

      // Rate limiting delay
      if (page < maxPages) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    } catch (err: any) {
      errors.push(`Page ${page}: ${err.message}`);
      if (errors.length >= 3) break;
    }
  }

  console.log(`[Harvest] 📊 Fetched total: ${allListings.length} listings`);

  // 3. Deduplicate against existing listings
  let newCount = 0;
  let dupCount = 0;
  let sellersNew = 0;

  for (const listing of allListings) {
    // Check if already exists
    const { data: existing } = await supabase
      .from("ahe_listings")
      .select("id")
      .eq("source_listing_url", listing.url)
      .eq("is_duplicate", false)
      .maybeSingle();

    if (existing) {
      // Update last_seen_at
      await supabase
        .from("ahe_listings")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      dupCount++;
      continue;
    }

    // Map location
    const loc = mapLocationFromText(listing.location);
    const governorate = loc.governorate || scope.governorate;
    const city = loc.city || scope.city;

    // Upsert seller
    let aheSellerId: string | null = null;
    let isNewSeller = false;

    if (listing.sellerProfileUrl) {
      const { data: existingSeller } = await supabase
        .from("ahe_sellers")
        .select("id")
        .eq("profile_url", listing.sellerProfileUrl)
        .maybeSingle();

      if (existingSeller) {
        aheSellerId = existingSeller.id;
        // Increment listings count
        try {
          await supabase.rpc("increment_seller_listings", {
            p_seller_id: existingSeller.id,
          });
        } catch {
          // RPC may not exist
        }
      } else {
        const { data: newSeller } = await supabase
          .from("ahe_sellers")
          .insert({
            profile_url: listing.sellerProfileUrl,
            name: listing.sellerName,
            source_platform: scope.source_platform,
            is_verified: listing.isVerified,
            is_business: listing.isBusiness,
            primary_category: scope.maksab_category,
            primary_governorate: governorate,
            total_listings_seen: 1,
            priority_score: calcPriorityScore({
              isVerified: listing.isVerified,
              isBusiness: listing.isBusiness,
              phone: null,
            }),
            pipeline_status: "discovered",
          })
          .select("id")
          .single();

        if (newSeller) {
          aheSellerId = newSeller.id;
          isNewSeller = true;
          sellersNew++;
        }
      }
    }

    // Insert listing
    const { error: insertErr } = await supabase.from("ahe_listings").insert({
      scope_id: scope.id,
      source_platform: scope.source_platform,
      source_listing_url: listing.url,
      source_listing_id: listing.sourceId,
      title: listing.title,
      price: listing.price,
      is_negotiable: listing.isNegotiable,
      supports_exchange: listing.supportsExchange,
      is_featured: listing.isFeatured,
      thumbnail_url: listing.thumbnailUrl,
      main_image_url: listing.thumbnailUrl,
      source_category: null,
      maksab_category: scope.maksab_category,
      source_location: listing.location || null,
      governorate,
      city,
      source_date_text: listing.dateText || null,
      estimated_posted_at: parseRelativeDate(listing.dateText),
      seller_name: listing.sellerName,
      seller_profile_url: listing.sellerProfileUrl,
      seller_is_verified: listing.isVerified,
      seller_is_business: listing.isBusiness,
      ahe_seller_id: aheSellerId,
    });

    if (insertErr) {
      errors.push(`Insert error for "${listing.title}": ${insertErr.message}`);
    } else {
      newCount++;
    }
  }

  // 4. Update scope stats
  await supabase
    .from("ahe_scopes")
    .update({
      last_harvest_at: new Date().toISOString(),
      last_harvest_new_listings: newCount,
      last_harvest_new_sellers: sellersNew,
      next_harvest_at: new Date(
        Date.now() + (scope.harvest_interval_minutes || 60) * 60 * 1000
      ).toISOString(),
      total_harvests: (scope.total_harvests || 0) + 1,
      total_listings_found: (scope.total_listings_found || 0) + newCount,
      total_sellers_found: (scope.total_sellers_found || 0) + sellersNew,
      consecutive_failures:
        allListings.length === 0 && errors.length > 0
          ? (scope.consecutive_failures || 0) + 1
          : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scope.id);

  // 5. Update engine hourly metrics
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);

  await supabase.from("ahe_hourly_metrics").upsert(
    {
      scope_id: scope.id,
      hour_start: hourStart.toISOString(),
      listings_fetched: allListings.length,
      listings_new: newCount,
      listings_duplicate: dupCount,
      sellers_new: sellersNew,
      pages_fetched: Math.min(
        allListings.length > 0 ? Math.ceil(allListings.length / 45) : 1,
        maxPages
      ),
      errors_count: errors.length,
      fetch_duration_seconds: Math.floor((Date.now() - startTime) / 1000),
    },
    { onConflict: "scope_id,hour_start" }
  );

  // 6. Auto-queue new sellers with phones to CRM
  let crmQueued = 0;
  if (sellersNew > 0) {
    crmQueued = await autoQueueSellersToCrm(supabase, scope);
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[Harvest] ✅ Done in ${durationMs}ms — ${newCount} new, ${dupCount} dup, ${sellersNew} sellers, ${crmQueued} CRM queued, ${errors.length} errors`
  );

  return {
    success: errors.length === 0 || newCount > 0,
    scope_code: scopeCode,
    pages_fetched: Math.min(
      allListings.length > 0 ? Math.ceil(allListings.length / 45) : 1,
      maxPages
    ),
    fetched: allListings.length,
    new: newCount,
    duplicate: dupCount,
    sellers_new: sellersNew,
    crm_queued: crmQueued,
    errors,
    duration_ms: durationMs,
  };
}

// ─── Auto-Queue Sellers to CRM ───────────────────────────────
async function autoQueueSellersToCrm(
  supabase: SupabaseClient,
  scope: any
): Promise<number> {
  try {
    // Find new sellers with phones that aren't yet in CRM
    const { data: sellers } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, primary_category, primary_governorate, is_verified, is_business, profile_url")
      .eq("pipeline_status", "discovered")
      .not("phone", "is", null)
      .is("crm_customer_id", null)
      .order("priority_score", { ascending: false })
      .limit(50);

    if (!sellers || sellers.length === 0) return 0;

    let queued = 0;
    for (const seller of sellers) {
      // Check if phone already exists in CRM
      const { data: existing } = await supabase
        .from("crm_customers")
        .select("id")
        .eq("phone", seller.phone)
        .maybeSingle();

      if (existing) {
        // Link existing CRM customer to seller
        await supabase
          .from("ahe_sellers")
          .update({ crm_customer_id: existing.id, pipeline_status: "crm_linked" })
          .eq("id", seller.id);
        continue;
      }

      // Create new CRM customer
      const { data: newCustomer, error: crmErr } = await supabase
        .from("crm_customers")
        .insert({
          full_name: seller.name || "معلن من دوبيزل",
          phone: seller.phone,
          source: "platform",
          source_platform: scope.source_platform || "dubizzle",
          source_detail: `AHE harvest — ${scope.code}`,
          source_url: seller.profile_url,
          lifecycle_stage: "lead",
          primary_category: seller.primary_category,
          governorate: seller.primary_governorate,
          account_type: seller.is_business ? "business" : "individual",
          is_verified: seller.is_verified,
        })
        .select("id")
        .single();

      if (crmErr) {
        console.error(`[CRM] Error creating customer for ${seller.phone}: ${crmErr.message}`);
        continue;
      }

      if (newCustomer) {
        // Link CRM customer back to seller
        await supabase
          .from("ahe_sellers")
          .update({ crm_customer_id: newCustomer.id, pipeline_status: "crm_linked" })
          .eq("id", seller.id);
        queued++;
      }
    }

    if (queued > 0) {
      console.log(`[CRM] ✅ Auto-queued ${queued} new sellers as CRM leads`);
    }
    return queued;
  } catch (err: any) {
    console.error(`[CRM] Auto-queue error: ${err.message}`);
    return 0;
  }
}

// ─── Harvest Status ─────────────────────────────────────────
async function getHarvestStatus(): Promise<Record<string, any>> {
  const supabase = getSupabase();

  // Get engine status
  const { data: engine } = await supabase
    .from("ahe_engine_status")
    .select("*")
    .eq("id", 1)
    .single();

  // Get all scopes with summary
  const { data: scopes } = await supabase
    .from("ahe_scopes")
    .select("code, name, is_active, is_paused, server_fetch_blocked, source_platform, governorate, maksab_category, last_harvest_at, next_harvest_at, last_harvest_new_listings, last_harvest_new_sellers, total_harvests, total_listings_found, total_sellers_found, consecutive_failures, harvest_interval_minutes")
    .order("is_active", { ascending: false })
    .order("last_harvest_at", { ascending: false, nullsFirst: false });

  // Count totals
  const { count: totalListings } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true });

  const { count: totalSellers } = await supabase
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true });

  const { count: crmLeads } = await supabase
    .from("crm_customers")
    .select("id", { count: "exact", head: true })
    .eq("source", "platform");

  const now = new Date();
  const readyScopes = (scopes || []).filter((s: any) =>
    s.is_active && !s.is_paused && !s.server_fetch_blocked &&
    (!s.next_harvest_at || new Date(s.next_harvest_at) <= now)
  );

  return {
    engine: {
      status: engine?.status || "unknown",
      requests_this_hour: engine?.current_requests_this_hour || 0,
      max_requests_per_hour: engine?.global_max_requests_per_hour || 0,
    },
    totals: {
      listings: totalListings || 0,
      sellers: totalSellers || 0,
      crm_leads_from_harvest: crmLeads || 0,
    },
    scopes_summary: {
      total: (scopes || []).length,
      active: (scopes || []).filter((s: any) => s.is_active).length,
      blocked: (scopes || []).filter((s: any) => s.server_fetch_blocked).length,
      ready_now: readyScopes.length,
    },
    scopes: (scopes || []).map((s: any) => ({
      ...s,
      is_ready: s.is_active && !s.is_paused && !s.server_fetch_blocked &&
        (!s.next_harvest_at || new Date(s.next_harvest_at) <= now),
    })),
    server_time: now.toISOString(),
  };
}

// ─── Cron Harvest Logic ──────────────────────────────────────
async function cronHarvest(): Promise<{
  scopes_processed: number;
  results: HarvestResult[];
}> {
  const supabase = getSupabase();

  // Check engine status
  const { data: engine } = await supabase
    .from("ahe_engine_status")
    .select("*")
    .eq("id", 1)
    .single();

  if (!engine || engine.status !== "running") {
    console.log(
      `[Cron] ⏸️ Engine status: ${engine?.status || "unknown"} — skipping`
    );
    return { scopes_processed: 0, results: [] };
  }

  // Check hourly rate limit
  if (
    engine.current_requests_this_hour >=
    engine.global_max_requests_per_hour
  ) {
    console.log(
      `[Cron] 🚫 Hourly rate limit reached: ${engine.current_requests_this_hour}/${engine.global_max_requests_per_hour}`
    );
    return { scopes_processed: 0, results: [] };
  }

  // Fetch ready scopes
  const { data: scopes } = await supabase
    .from("ahe_scopes")
    .select("*")
    .eq("is_active", true)
    .eq("is_paused", false)
    .eq("server_fetch_blocked", false)
    .or("next_harvest_at.is.null,next_harvest_at.lte.now()")
    .order("priority", { ascending: false })
    .limit(3);

  if (!scopes || scopes.length === 0) {
    console.log("[Cron] 😴 No scopes ready for harvest");
    return { scopes_processed: 0, results: [] };
  }

  console.log(
    `[Cron] 🚀 Found ${scopes.length} ready scope(s): ${scopes.map((s: any) => s.code).join(", ")}`
  );

  const results: HarvestResult[] = [];

  for (const scope of scopes) {
    try {
      const result = await harvestScope(scope.code);
      results.push(result);

      // Delay between scopes
      if (scopes.indexOf(scope) < scopes.length - 1) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (err: any) {
      console.error(`[Cron] ❌ Error harvesting ${scope.code}: ${err.message}`);
      results.push({
        success: false,
        scope_code: scope.code,
        pages_fetched: 0,
        fetched: 0,
        new: 0,
        duplicate: 0,
        sellers_new: 0,
        crm_queued: 0,
        errors: [err.message],
        duration_ms: 0,
      });
    }
  }

  return { scopes_processed: scopes.length, results };
}

// ─── HTTP Helpers ────────────────────────────────────────────
function sendJson(
  res: ServerResponse,
  data: Record<string, any>,
  status = 200
) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// ─── Route Handlers ──────────────────────────────────────────

async function handleHarvest(req: IncomingMessage, res: ServerResponse) {
  try {
    let scope_code: string | null = null;

    if (req.method === "GET") {
      // GET /harvest?scope_code=dub_phones_alex
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);
      scope_code = url.searchParams.get("scope_code");
    } else if (req.method === "POST") {
      // POST /harvest { scope_code: "..." }
      const body = await readBody(req);
      scope_code = JSON.parse(body).scope_code;
    } else {
      return sendJson(res, { error: "Method not allowed. Use GET or POST." }, 405);
    }

    if (!scope_code) {
      return sendJson(
        res,
        { error: "Missing required parameter: scope_code (e.g. ?scope_code=dub_phones_alex)" },
        400
      );
    }

    console.log(`[API] ${req.method} /harvest — scope_code: ${scope_code}`);
    const result = await harvestScope(scope_code);
    sendJson(res, result);
  } catch (err: any) {
    console.error(`[API] /harvest error: ${err.message}`);
    sendJson(res, { error: err.message }, 500);
  }
}

async function handleCronHarvest(req: IncomingMessage, res: ServerResponse) {
  // Optional: validate CRON_SECRET
  if (CRON_SECRET) {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    const secret = url.searchParams.get("secret") || "";
    const authHeader = req.headers.authorization || "";
    if (secret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return sendJson(res, { error: "Unauthorized" }, 401);
    }
  }

  try {
    console.log("[API] GET /cron/harvest — starting cron cycle");
    const result = await cronHarvest();
    sendJson(res, {
      message: "Cron harvest cycle complete",
      ...result,
    });
  } catch (err: any) {
    console.error(`[API] /cron/harvest error: ${err.message}`);
    sendJson(res, { error: err.message }, 500);
  }
}

// ─── Harvest Status Handler ──────────────────────────────────
async function handleHarvestStatus(_req: IncomingMessage, res: ServerResponse) {
  try {
    console.log("[API] GET /harvest/status");
    const status = await getHarvestStatus();
    sendJson(res, status);
  } catch (err: any) {
    console.error(`[API] /harvest/status error: ${err.message}`);
    sendJson(res, { error: err.message }, 500);
  }
}

// ─── HTTP Server ──────────────────────────────────────────────
const server = createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const path = (req.url || "/").split("?")[0];

  try {
    if (path === "/harvest") {
      await handleHarvest(req, res);
    } else if (path === "/harvest/status") {
      await handleHarvestStatus(req, res);
    } else if (path === "/cron/harvest") {
      await handleCronHarvest(req, res);
    } else if (path === "/health") {
      sendJson(res, {
        ok: true,
        timestamp: new Date().toISOString(),
        region: process.env.RAILWAY_REGION || "unknown",
      });
    } else {
      sendJson(res, {
        message: "مكسب Workers Server — Railway",
        endpoints: {
          "GET /harvest?scope_code=XXX": "Harvest a specific scope (browser-testable)",
          "POST /harvest": "Harvest a specific scope { scope_code }",
          "GET /harvest/status": "Engine & scopes status overview",
          "GET /cron/harvest": "Automated harvest (picks ready scopes)",
          "GET /health": "Health check",
        },
      });
    }
  } catch (err: any) {
    console.error(`[Server] Unhandled error: ${err.message}`);
    sendJson(res, { error: "Internal server error" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`[Server] 🟢 HTTP server running on port ${PORT}`);
  console.log(`[Server] Endpoints: /harvest, /harvest/status, /cron/harvest, /health`);
});

// Also start the auction cron worker
console.log("[Server] Starting auction cron worker...");
import("./auction-cron").catch((err) => {
  console.error("[Server] Failed to start auction cron:", err.message);
});
