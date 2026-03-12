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
  phones_extracted: number;
  crm_queued: number;
  errors: string[];
  duration_ms: number;
  debug?: Record<string, any>;
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

    // Seller: try multiple extraction methods
    let sellerName: string | null = null;
    let sellerProfileUrl: string | null = null;

    // Method 1: company link
    const companyLink = article.find('a[href*="/companies/"]').first();
    if (companyLink.length) {
      sellerName = companyLink.text().trim() || null;
      sellerProfileUrl = companyLink.attr("href") || null;
    }

    // Method 2: member/profile/user link
    if (!sellerName) {
      const memberLink = article.find('a[href*="/member/"], a[href*="/profile/"], a[href*="/user/"]').first();
      if (memberLink.length) {
        sellerName = memberLink.text().trim() || null;
        sellerProfileUrl = memberLink.attr("href") || null;
      }
    }

    // Method 3: aria-label or data-testid for seller
    if (!sellerName) {
      const sellerEl = article.find('[aria-label*="eller"], [aria-label*="عضو"], [data-testid*="seller"], [data-testid*="user"]').first();
      if (sellerEl.length) {
        sellerName = sellerEl.text().trim() || null;
      }
    }

    // Method 4: name near "موثق" or "صاحب عمل" badges
    if (!sellerName) {
      const verifiedMatch = cardText.match(/([\u0600-\u06FF\s]{3,25})\s*(?:موثق|صاحب عمل)/);
      if (verifiedMatch) {
        sellerName = verifiedMatch[1].trim() || null;
      }
    }

    // Debug: log first 2 articles' seller extraction
    if (listings.length < 2) {
      console.log(`[Harvest] 🔍 Seller DEBUG article #${listings.length + 1}:`, {
        sellerName: sellerName || "(empty)",
        sellerProfileUrl: sellerProfileUrl || "(empty)",
        isVerified,
        isBusiness,
        companyLink: companyLink.length > 0,
        memberLink: article.find('a[href*="/member/"]').length > 0,
        profileLink: article.find('a[href*="/profile/"]').length > 0,
        userLink: article.find('a[href*="/user/"]').length > 0,
        allLinks: article.find("a").map((_: any, el: any) => cheerio.load(el)("a").attr("href")).get().slice(0, 8),
        textSample: cardText.substring(0, 200),
      });
    }

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
    // Debug: list available scopes
    const { data: availableScopes } = await supabase
      .from("ahe_scopes")
      .select("code, name, is_active")
      .limit(20);

    return {
      success: false,
      scope_code: scopeCode,
      pages_fetched: 0,
      fetched: 0,
      new: 0,
      duplicate: 0,
      sellers_new: 0,
      phones_extracted: 0,
      crm_queued: 0,
      errors: [`Scope not found: ${scopeCode}`],
      debug: {
        scope_found: false,
        db_error: scopeErr?.message || null,
        available_scopes: (availableScopes || []).map((s: any) => s.code),
        env_check: {
          has_supabase_url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
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
        errors.push(JSON.stringify({
          debug: {
            scope_found: true,
            url_used: pageUrl,
            fetch_status: status,
            response_snippet: html.substring(0, 300),
          },
        }));
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

    // Upsert seller — create even without profile URL (use name + governorate as fallback key)
    let aheSellerId: string | null = null;
    let isNewSeller = false;

    if (listing.sellerProfileUrl) {
      // Strategy 1: Match by profile URL
      const { data: existingSeller } = await supabase
        .from("ahe_sellers")
        .select("id")
        .eq("profile_url", listing.sellerProfileUrl)
        .maybeSingle();

      if (existingSeller) {
        aheSellerId = existingSeller.id;
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
            name: listing.sellerName || null,
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
    } else if (listing.sellerName) {
      // Strategy 2: No profile URL but have seller name — match by name + platform
      const { data: existingSeller } = await supabase
        .from("ahe_sellers")
        .select("id")
        .eq("name", listing.sellerName)
        .eq("source_platform", scope.source_platform)
        .eq("primary_governorate", governorate)
        .is("profile_url", null)
        .maybeSingle();

      if (existingSeller) {
        aheSellerId = existingSeller.id;
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
            profile_url: null,
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
    } else {
      // Strategy 3: No profile URL, no name — create anonymous seller record
      // so the listing still gets linked and detail-fetch phone extraction can update it later
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

  // 3b. Detail fetching — extract phone numbers from ad detail pages
  // Only fetch top 10 new listings without a phone to avoid timeout
  let phonesExtracted = 0;
  try {
    const { data: newWithoutPhone } = await supabase
      .from("ahe_listings")
      .select("id, source_listing_url, ahe_seller_id")
      .eq("scope_id", scope.id)
      .is("extracted_phone", null)
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .limit(10);

    console.log(`[Harvest] === Detail Fetch Debug ===`);
    console.log(`[Harvest] 📞 New listings without phone: ${newWithoutPhone?.length ?? 0}`);

    if (newWithoutPhone && newWithoutPhone.length > 0) {
      for (const listing of newWithoutPhone) {
        try {
          await new Promise((r) => setTimeout(r, 5000)); // 5s delay
          console.log(`[Harvest] 📞 Fetching detail: ${listing.source_listing_url?.substring(0, 80)}`);
          const { html: detailHtml, status: detailStatus } = await fetchDubizzlePage(listing.source_listing_url);
          console.log(`[Harvest] 📞 Detail response status: ${detailStatus}`);
          console.log(`[Harvest] 📞 Detail HTML length: ${detailHtml.length}`);

          if (detailStatus === 403) {
            console.log("[Harvest] 📞 Detail fetch blocked (403), stopping detail extraction");
            break;
          }

          if (detailStatus !== 200) {
            console.log(`[Harvest] 📞 Non-200 status, skipping`);
            continue;
          }

          const $detail = cheerio.load(detailHtml);

          // Try multiple selectors to find description/phone text
          const descParts: string[] = [];
          // Primary: article text
          const articleText = $detail("article").text();
          if (articleText) descParts.push(articleText);
          // Secondary: description area
          const descTestId = $detail('[data-testid*="description"], [data-testid*="Description"]').text();
          if (descTestId) descParts.push(descTestId);
          // Tertiary: common description containers
          const descContainers = $detail('.description, #description, [class*="description"], [class*="Description"], [class*="details"], [class*="Details"]').text();
          if (descContainers) descParts.push(descContainers);
          // Also check phone-specific elements (some sites put phone in dedicated elements)
          const phoneElements = $detail('[data-testid*="phone"], [class*="phone"], [class*="Phone"], a[href^="tel:"]');
          phoneElements.each((_: any, el: any) => {
            const telHref = $detail(el).attr("href");
            if (telHref && telHref.startsWith("tel:")) {
              descParts.push(telHref.replace("tel:", ""));
            }
            descParts.push($detail(el).text());
          });
          // Fallback: full body
          if (descParts.length === 0) {
            descParts.push($detail("body").text());
          }

          const description = descParts.join(" ");
          console.log(`[Harvest] 📞 Description length: ${description.length}`);
          console.log(`[Harvest] 📞 Description sample: ${description.substring(0, 300).replace(/\s+/g, ' ')}`);

          // Try multiple phone extraction strategies
          const phone = extractPhone(description);
          console.log(`[Harvest] 📞 Phone extracted: ${phone || 'none'}`);

          if (phone) {
            // Update listing
            await supabase
              .from("ahe_listings")
              .update({ extracted_phone: phone, phone_source: "detail_page" })
              .eq("id", listing.id);

            // Update seller phone if not already set
            if (listing.ahe_seller_id) {
              await supabase
                .from("ahe_sellers")
                .update({ phone, pipeline_status: "phone_found" })
                .eq("id", listing.ahe_seller_id)
                .is("phone", null);
            }

            phonesExtracted++;
            console.log(`[Harvest] 📞 ✅ Saved phone ${phone} for listing ${listing.id}`);
          }
        } catch (e: any) {
          console.log(`[Harvest] 📞 Detail fetch error: ${e.message}`);
        }
      }
      console.log(`[Harvest] 📞 Total phones extracted: ${phonesExtracted}`);
    }
  } catch (e: any) {
    console.log(`[Harvest] 📞 Detail extraction error: ${e.message}`);
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
    phones_extracted: phonesExtracted,
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

  // Get all scopes with summary (no filters — fetch everything for debug)
  const { data: scopes, error: scopesError } = await supabase
    .from("ahe_scopes")
    .select("*")
    .order("is_active", { ascending: false })
    .order("last_harvest_at", { ascending: false, nullsFirst: false });

  console.log("All scopes count:", scopes?.length ?? 0);
  console.log("All scopes error:", scopesError?.message ?? "none");

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

  const allScopes = scopes || [];

  return {
    env_check: {
      has_supabase_url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabase_url_prefix: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").substring(0, 30),
    },
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
      total: allScopes.length,
      active: allScopes.filter((s: any) => s.is_active && !s.is_paused && !s.server_fetch_blocked).length,
      paused: allScopes.filter((s: any) => s.is_active && s.is_paused).length,
      blocked: allScopes.filter((s: any) => s.server_fetch_blocked).length,
      inactive: allScopes.filter((s: any) => !s.is_active).length,
      ready_now: readyScopes.length,
    },
    debug_scopes: {
      total_in_db: allScopes.length,
      error: scopesError?.message || null,
      first_scope: allScopes[0]?.code || null,
      first_scope_flags: allScopes[0] ? {
        is_active: allScopes[0].is_active,
        is_paused: allScopes[0].is_paused,
        server_fetch_blocked: allScopes[0].server_fetch_blocked,
      } : null,
    },
    scopes: allScopes.map((s: any) => ({
      code: s.code,
      name: s.name,
      status: !s.is_active ? "inactive" : s.server_fetch_blocked ? "blocked" : s.is_paused ? "paused" : "active",
      is_active: s.is_active,
      is_paused: s.is_paused,
      server_fetch_blocked: s.server_fetch_blocked,
      source_platform: s.source_platform,
      governorate: s.governorate,
      maksab_category: s.maksab_category,
      last_harvest_at: s.last_harvest_at,
      next_harvest_at: s.next_harvest_at,
      last_harvest_new_listings: s.last_harvest_new_listings,
      last_harvest_new_sellers: s.last_harvest_new_sellers,
      total_harvests: s.total_harvests,
      total_listings_found: s.total_listings_found,
      total_sellers_found: s.total_sellers_found,
      consecutive_failures: s.consecutive_failures,
      harvest_interval_minutes: s.harvest_interval_minutes,
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
    .or("server_fetch_blocked.eq.false,server_fetch_blocked.is.null")
    .or("next_harvest_at.is.null,next_harvest_at.lte.now()")
    .order("priority", { ascending: false })
    .limit(1);

  if (!scopes || scopes.length === 0) {
    console.log("[Cron] 😴 No scopes ready for harvest");
    return { scopes_processed: 0, results: [] };
  }

  const scope = scopes[0];
  console.log(
    `[Cron] 🚀 Harvesting 1 scope: ${scope.code}`
  );

  const results: HarvestResult[] = [];

  try {
    const result = await harvestScope(scope.code);
    results.push(result);
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
      phones_extracted: 0,
      crm_queued: 0,
      errors: [err.message],
      duration_ms: 0,
    });
  }

  return { scopes_processed: 1, results };
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
  let scope_code: string | null = null;
  try {
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
    sendJson(res, {
      error: err.message,
      debug: {
        scope_code,
        error_stack: err.stack?.split("\n").slice(0, 5),
        env_check: {
          has_supabase_url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    }, 500);
  }
}

async function handleCronHarvest(req: IncomingMessage, res: ServerResponse) {
  try {
    // Optional: validate CRON_SECRET
    if (CRON_SECRET) {
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);
      const secret = url.searchParams.get("secret") || "";
      const authHeader = req.headers.authorization || "";
      if (secret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return sendJson(res, { error: "Unauthorized" }, 401);
      }
    }

    console.log("[API] GET /cron/harvest — starting cron cycle");

    // Timeout protection: 5 minutes max
    const TIMEOUT_MS = 5 * 60 * 1000;
    let timedOut = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        timedOut = true;
        reject(new Error("TIMEOUT: Cron harvest exceeded 5 minutes"));
      }, TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([cronHarvest(), timeoutPromise]);
      sendJson(res, {
        message: "Cron harvest cycle complete",
        ...result,
      });
    } catch (innerErr: any) {
      if (timedOut) {
        console.error("[API] /cron/harvest TIMEOUT — exceeded 5 minutes");
        sendJson(res, {
          error: true,
          message: "Cron harvest timed out after 5 minutes — partial results may have been saved to DB",
          timeout: true,
        });
      } else {
        throw innerErr; // re-throw to outer catch
      }
    }
  } catch (error: any) {
    console.error(`[API] /cron/harvest error: ${error.message}`);
    sendJson(res, {
      error: true,
      message: error.message || "Unknown error",
      stack: error.stack?.substring(0, 500) || null,
    });
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

  // Railway Cron بيعمل restart كل 15 دقيقة
  // عند كل restart — شغّل حصادة واحدة تلقائياً
  setTimeout(async () => {
    console.log('[Auto-Cron] Server started — running automatic harvest...');
    try {
      const result = await cronHarvest();
      console.log('[Auto-Cron] Complete:', JSON.stringify(result));
    } catch (e: any) {
      console.log('[Auto-Cron] Error:', e.message);
    }
  }, 10000); // 10 ثواني بعد البدء
});

// Also start the auction cron worker
console.log("[Server] Starting auction cron worker...");
import("./auction-cron").catch((err) => {
  console.error("[Server] Failed to start auction cron:", err.message);
});
