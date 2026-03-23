/**
 * محرك حصاد السيارات — Cars Harvester Engine
 * متخصص في حصاد إعلانات السيارات من جميع المنصات
 *
 * المنصات المدعومة:
 * - Dubizzle (سيارات)
 * - Hatla2ee (أكبر منصة سيارات)
 * - OpenSooq (سيارات)
 * - ContactCars (سيارات)
 * - OLX (سيارات)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Config ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VERCEL_HARVEST_URL = process.env.VERCEL_HARVEST_URL || "";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
};

// Platforms that need Vercel for fetching (Railway IPs blocked)
const VERCEL_DELEGATED_PLATFORMS = ["opensooq", "dubizzle"];

// ─── Types ───────────────────────────────────────────────────

interface AheScope {
  id: string;
  name: string;
  code: string;
  source_platform: string;
  maksab_category: string;
  governorate: string;
  city: string | null;
  base_url: string;
  pagination_pattern: string;
  max_pages_per_harvest: number;
  harvest_interval_minutes: number;
  detail_fetch_enabled: boolean;
  is_active: boolean;
  priority: number;
  delay_between_requests_ms: number;
}

export interface CarListing {
  title: string;
  price: number | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  condition: string | null;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  governorate: string;
  city: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_profile_url: string | null;
  seller_is_business: boolean;
  source_url: string;
  source_listing_id: string;
  source_platform: string;
  thumbnail_url: string | null;
  is_featured: boolean;
  is_verified: boolean;
}

interface HarvestResult {
  success: boolean;
  scope_code: string;
  pages_fetched: number;
  listings_found: number;
  listings_new: number;
  listings_duplicate: number;
  sellers_new: number;
  phones_extracted: number;
  errors: string[];
  duration_seconds: number;
}

// ─── Supabase Client ─────────────────────────────────────────

function getSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Brand/Model Detection ───────────────────────────────────

const CAR_BRANDS: Record<string, string[]> = {
  "تويوتا": ["toyota", "تويوتا"],
  "هيونداي": ["hyundai", "هيونداي", "هيونداى"],
  "شيفروليه": ["chevrolet", "chevy", "شيفروليه", "شيفرولية"],
  "نيسان": ["nissan", "نيسان"],
  "كيا": ["kia", "كيا"],
  "بي إم دبليو": ["bmw", "بي ام", "بي إم"],
  "مرسيدس": ["mercedes", "مرسيدس", "مرسيديس"],
  "فيات": ["fiat", "فيات"],
  "سكودا": ["skoda", "سكودا"],
  "أوبل": ["opel", "أوبل", "اوبل"],
  "بيجو": ["peugeot", "بيجو"],
  "رينو": ["renault", "رينو"],
  "سوزوكي": ["suzuki", "سوزوكي", "سوزوكى"],
  "ميتسوبيشي": ["mitsubishi", "ميتسوبيشي", "ميتسوبيشى"],
  "هوندا": ["honda", "هوندا"],
  "MG": ["mg"],
  "شيري": ["chery", "شيري", "شيرى"],
  "بي واي دي": ["byd", "بي واي دي"],
  "جيلي": ["geely", "جيلي", "جيلى"],
  "فولكس فاجن": ["volkswagen", "vw", "فولكس"],
  "سيات": ["seat", "سيات"],
  "لاند روفر": ["land rover", "لاند روفر"],
  "جيب": ["jeep", "جيب"],
  "فورد": ["ford", "فورد"],
  "مازدا": ["mazda", "مازدا"],
  "سوبارو": ["subaru", "سوبارو"],
  "بروتون": ["proton", "بروتون"],
  "دايو": ["daewoo", "دايو", "دايوو"],
  "لادا": ["lada", "لادا"],
  "شانجان": ["changan", "شانجان"],
  "هافال": ["haval", "هافال"],
  "جاك": ["jac", "جاك"],
  "بايك": ["baic", "بايك"],
};

function detectBrand(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [arabicName, aliases] of Object.entries(CAR_BRANDS)) {
    for (const alias of aliases) {
      if (lower.includes(alias.toLowerCase())) return arabicName;
    }
  }
  return null;
}

function detectYear(text: string): number | null {
  const match = text.match(/\b(19[89]\d|20[0-2]\d)\b/);
  return match ? parseInt(match[1]) : null;
}

function detectMileage(text: string): number | null {
  // "45,000 كم" or "45000 km" or "45,000km"
  const match = text.match(/(\d[\d,٬]*)\s*(?:كم|km|كيلو)/i);
  if (match) {
    return parseInt(match[1].replace(/[,٬]/g, ""));
  }
  return null;
}

function detectTransmission(text: string): string | null {
  const lower = text.toLowerCase();
  if (/أوتوماتيك|automatic|auto/i.test(lower)) return "أوتوماتيك";
  if (/مانيوال|manual|يدوي/i.test(lower)) return "مانيوال";
  return null;
}

function detectFuelType(text: string): string | null {
  if (/بنزين|petrol|gasoline/i.test(text)) return "بنزين";
  if (/سولار|ديزل|diesel/i.test(text)) return "سولار";
  if (/غاز|gas|lpg|cng/i.test(text)) return "غاز";
  if (/كهرباء|electric|ev/i.test(text)) return "كهرباء";
  if (/هايبرد|hybrid/i.test(text)) return "هايبرد";
  return null;
}

function detectColor(text: string): string | null {
  const colors: Record<string, RegExp> = {
    "أبيض": /أبيض|white/i,
    "أسود": /أسود|black/i,
    "فضي": /فضي|silver|سيلفر/i,
    "رمادي": /رمادي|grey|gray/i,
    "أحمر": /أحمر|red/i,
    "أزرق": /أزرق|blue/i,
    "بيج": /بيج|beige/i,
    "ذهبي": /ذهبي|gold|شامبين/i,
    "بني": /بني|brown/i,
    "أخضر": /أخضر|green/i,
  };
  for (const [name, pattern] of Object.entries(colors)) {
    if (pattern.test(text)) return name;
  }
  return null;
}

function extractPhoneFromText(text: string): string | null {
  const match = text.match(/(?:\+?20)?(?:0)?(1[0125]\d{8})/);
  return match ? `0${match[1]}` : null;
}

function extractSourceId(url: string): string {
  // Extract numeric ID from URL
  const match = url.match(/(\d{5,})/);
  return match ? match[1] : url.replace(/[^a-zA-Z0-9]/g, "").slice(-20);
}

// ─── Platform-Specific Parsers ───────────────────────────────

function parseCarFromGenericListing(
  listing: Record<string, unknown>,
  platform: string,
  governorate: string
): CarListing | null {
  const title = (listing.title as string) || "";
  const description = (listing.description as string) || "";
  const fullText = `${title} ${description}`;

  if (!title) return null;

  const specs = (listing.specifications as Record<string, string>) || {};

  return {
    title,
    price: (listing.price as number) || null,
    brand: specs["الماركة"] || specs["brand"] || specs["Brand"] || detectBrand(fullText),
    model: specs["الموديل"] || specs["model"] || specs["Model"] || null,
    year: parseInt(specs["السنة"] || specs["year"] || specs["Year"] || "") || detectYear(fullText),
    mileage: parseInt((specs["الكيلومتراج"] || specs["mileage"] || specs["Mileage"] || "").replace(/[,٬]/g, "")) || detectMileage(fullText),
    condition: specs["الحالة"] || specs["condition"] || null,
    color: specs["اللون"] || specs["color"] || detectColor(fullText),
    fuel_type: specs["نوع الوقود"] || specs["fuel"] || specs["Fuel Type"] || detectFuelType(fullText),
    transmission: specs["ناقل الحركة"] || specs["transmission"] || specs["Transmission"] || detectTransmission(fullText),
    governorate,
    city: (listing.city as string) || (listing.area as string) || null,
    seller_name: (listing.sellerName as string) || (listing.seller_name as string) || null,
    seller_phone: (listing.extractedPhone as string) || (listing.seller_phone as string) || extractPhoneFromText(fullText),
    seller_profile_url: (listing.sellerProfileUrl as string) || null,
    seller_is_business: !!(listing.isBusiness || listing.seller_is_business),
    source_url: (listing.url as string) || (listing.source_url as string) || "",
    source_listing_id: extractSourceId((listing.url as string) || ""),
    source_platform: platform,
    thumbnail_url: (listing.thumbnailUrl as string) || (listing.thumbnail_url as string) || null,
    is_featured: !!(listing.isFeatured),
    is_verified: !!(listing.isVerified),
  };
}

// ─── Main Harvest Function ───────────────────────────────────

export async function harvestCarsScope(scope: AheScope): Promise<HarvestResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const errors: string[] = [];
  let pagesF = 0;
  let listingsFound = 0;
  let listingsNew = 0;
  let listingsDuplicate = 0;
  let sellersNew = 0;
  let phonesExtracted = 0;

  console.log(`[CARS-HARVESTER] 🚗 Starting harvest for ${scope.code} (${scope.source_platform})`);

  try {
    // Check if we should delegate to Vercel
    if (VERCEL_DELEGATED_PLATFORMS.includes(scope.source_platform) && VERCEL_HARVEST_URL) {
      console.log(`[CARS-HARVESTER] 📡 Delegating ${scope.source_platform} to Vercel...`);
      try {
        const res = await fetch(VERCEL_HARVEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope_code: scope.code }),
        });
        if (res.ok) {
          const result = await res.json();
          return {
            success: true,
            scope_code: scope.code,
            pages_fetched: result.pages_fetched || 0,
            listings_found: result.fetched || 0,
            listings_new: result.new || 0,
            listings_duplicate: result.duplicate || 0,
            sellers_new: result.sellers_new || 0,
            phones_extracted: result.phones_extracted || 0,
            errors: [],
            duration_seconds: (Date.now() - startTime) / 1000,
          };
        }
        errors.push(`Vercel delegation failed: HTTP ${res.status}`);
      } catch (e) {
        errors.push(`Vercel delegation error: ${e instanceof Error ? e.message : String(e)}`);
      }
      // Fall through to direct fetch
    }

    // Direct fetch with pagination
    for (let page = 1; page <= scope.max_pages_per_harvest; page++) {
      try {
        const url = buildPageUrl(scope.base_url, scope.pagination_pattern, page);
        console.log(`[CARS-HARVESTER] 📄 Page ${page}: ${url.substring(0, 80)}...`);

        const response = await fetch(url, {
          headers: BROWSER_HEADERS,
          redirect: "follow",
          signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
          if (response.status === 403) {
            errors.push(`HTTP 403 — ${scope.source_platform} يحظر server-side fetch`);
            // Mark scope as blocked
            await supabase
              .from("ahe_scopes")
              .update({ server_fetch_blocked: true, server_fetch_blocked_at: new Date().toISOString() })
              .eq("id", scope.id);
            break;
          }
          errors.push(`HTTP ${response.status} on page ${page}`);
          continue;
        }

        const html = await response.text();
        pagesF++;

        // Use the engine's parser system dynamically
        const { getParser } = await import("../../src/lib/crm/harvester/parsers/platform-router");
        const parser = getParser(scope.source_platform);
        const rawListings = parser.parseList(html);

        console.log(`[CARS-HARVESTER] 📊 Page ${page}: ${rawListings.length} listings found`);

        if (rawListings.length === 0) break;

        for (const raw of rawListings) {
          listingsFound++;

          // Convert to CarListing
          const carListing = parseCarFromGenericListing(
            raw as unknown as Record<string, unknown>,
            scope.source_platform,
            scope.governorate
          );

          if (!carListing) continue;

          // Save to database
          const result = await saveCarListing(supabase, carListing, scope.id);
          if (result.isNew) listingsNew++;
          else listingsDuplicate++;
          if (result.sellerIsNew) sellersNew++;
          if (result.phoneExtracted) phonesExtracted++;
        }

        // Delay between pages
        if (page < scope.max_pages_per_harvest) {
          await delay(scope.delay_between_requests_ms || 5000);
        }
      } catch (pageError) {
        const msg = pageError instanceof Error ? pageError.message : String(pageError);
        errors.push(`Page ${page} error: ${msg}`);
        if (msg.includes("abort") || msg.includes("timeout")) break;
      }
    }

    // Update scope stats
    await supabase
      .from("ahe_scopes")
      .update({
        last_harvest_at: new Date().toISOString(),
        last_harvest_new_listings: listingsNew,
        last_harvest_new_sellers: sellersNew,
        total_harvests: scope.total_harvests ? scope.total_harvests + 1 : 1,
        next_harvest_at: new Date(Date.now() + scope.harvest_interval_minutes * 60 * 1000).toISOString(),
      })
      .eq("id", scope.id);

  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`[CARS-HARVESTER] ✅ Done ${scope.code}: ${listingsNew} new, ${phonesExtracted} phones, ${duration.toFixed(1)}s`);

  return {
    success: errors.length === 0,
    scope_code: scope.code,
    pages_fetched: pagesF,
    listings_found: listingsFound,
    listings_new: listingsNew,
    listings_duplicate: listingsDuplicate,
    sellers_new: sellersNew,
    phones_extracted: phonesExtracted,
    errors,
    duration_seconds: duration,
  };
}

// ─── Storage ─────────────────────────────────────────────────

async function saveCarListing(
  supabase: SupabaseClient,
  listing: CarListing,
  scopeId: string
): Promise<{ isNew: boolean; sellerIsNew: boolean; phoneExtracted: boolean }> {
  let isNew = false;
  let sellerIsNew = false;
  let phoneExtracted = false;

  try {
    // 1. Check for duplicate
    const { data: existing } = await supabase
      .from("ahe_listings")
      .select("id")
      .eq("source_platform", listing.source_platform)
      .eq("source_listing_url", listing.source_url)
      .single();

    if (existing) {
      // Update last_seen_at
      await supabase
        .from("ahe_listings")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return { isNew: false, sellerIsNew: false, phoneExtracted: false };
    }

    // 2. Upsert seller
    let sellerId: string | null = null;
    if (listing.seller_name || listing.seller_phone || listing.seller_profile_url) {
      const sellerResult = await upsertCarSeller(supabase, listing);
      sellerId = sellerResult.id;
      sellerIsNew = sellerResult.isNew;
    }

    // 3. Insert listing
    const { error: insertError } = await supabase.from("ahe_listings").insert({
      scope_id: scopeId,
      source_platform: listing.source_platform,
      source_listing_url: listing.source_url,
      source_listing_id: listing.source_listing_id,
      title: listing.title,
      price: listing.price,
      currency: "EGP",
      maksab_category: "سيارات",
      detected_brand: listing.brand,
      detected_model: listing.model,
      thumbnail_url: listing.thumbnail_url,
      source_location: listing.city || listing.governorate,
      governorate: listing.governorate,
      city: listing.city,
      seller_name: listing.seller_name,
      seller_profile_url: listing.seller_profile_url,
      seller_is_verified: listing.is_verified,
      seller_is_business: listing.seller_is_business,
      is_featured: listing.is_featured,
      ahe_seller_id: sellerId,
      extracted_phone: listing.seller_phone,
      phone_source: listing.seller_phone ? "listing_page" : null,
      specifications: {
        brand: listing.brand,
        model: listing.model,
        year: listing.year,
        mileage: listing.mileage,
        color: listing.color,
        fuel_type: listing.fuel_type,
        transmission: listing.transmission,
        condition: listing.condition,
      },
      migration_status: "harvested",
    });

    if (!insertError) {
      isNew = true;
      if (listing.seller_phone) phoneExtracted = true;
    }
  } catch (error) {
    console.error(`[CARS-HARVESTER] Save error:`, error);
  }

  return { isNew, sellerIsNew, phoneExtracted };
}

async function upsertCarSeller(
  supabase: SupabaseClient,
  listing: CarListing
): Promise<{ id: string; isNew: boolean }> {
  // Try to find existing seller by phone or profile URL
  let existingSeller = null;

  if (listing.seller_phone) {
    const { data } = await supabase
      .from("ahe_sellers")
      .select("id")
      .eq("phone", listing.seller_phone)
      .single();
    existingSeller = data;
  }

  if (!existingSeller && listing.seller_profile_url) {
    const { data } = await supabase
      .from("ahe_sellers")
      .select("id")
      .eq("profile_url", listing.seller_profile_url)
      .single();
    existingSeller = data;
  }

  if (existingSeller) {
    // Update existing seller
    await supabase
      .from("ahe_sellers")
      .update({
        last_seen_at: new Date().toISOString(),
        total_listings_seen: supabase.rpc ? undefined : undefined, // let trigger handle
        ...(listing.seller_phone && { phone: listing.seller_phone }),
        ...(listing.seller_name && { name: listing.seller_name }),
      })
      .eq("id", existingSeller.id);

    return { id: existingSeller.id, isNew: false };
  }

  // Create new seller
  const { data: newSeller, error } = await supabase
    .from("ahe_sellers")
    .insert({
      phone: listing.seller_phone,
      name: listing.seller_name,
      profile_url: listing.seller_profile_url,
      source_platform: listing.source_platform,
      is_verified: listing.is_verified,
      is_business: listing.seller_is_business,
      detected_account_type: listing.seller_is_business ? "business" : "individual",
      primary_category: "سيارات",
      primary_governorate: listing.governorate,
      total_listings_seen: 1,
      active_listings: 1,
      pipeline_status: listing.seller_phone ? "new_with_phone" : "new_no_phone",
    })
    .select("id")
    .single();

  if (error || !newSeller) {
    console.error("[CARS-HARVESTER] Seller insert error:", error?.message);
    return { id: "", isNew: false };
  }

  return { id: newSeller.id, isNew: true };
}

// ─── Utilities ───────────────────────────────────────────────

function buildPageUrl(baseUrl: string, pattern: string, page: number): string {
  if (page === 1) return baseUrl;

  const pageStr = pattern.replace("{page}", String(page));

  if (pattern.startsWith("?") || pattern.startsWith("&")) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${pageStr.replace(/^[?&]/, "")}`;
  }

  if (baseUrl.endsWith("/")) {
    return `${baseUrl}${pageStr}`;
  }

  return `${baseUrl}/${pageStr}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Exported Runner ─────────────────────────────────────────

export async function runCarsHarvest(): Promise<HarvestResult[]> {
  const supabase = getSupabase();

  // Get all active car scopes for Alexandria
  const { data: scopes, error } = await supabase
    .from("ahe_scopes")
    .select("*")
    .eq("maksab_category", "سيارات")
    .eq("governorate", "الإسكندرية")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error || !scopes) {
    console.error("[CARS-HARVESTER] Failed to load scopes:", error?.message);
    return [];
  }

  console.log(`[CARS-HARVESTER] 🚗 Found ${scopes.length} active car scopes for Alexandria`);

  const results: HarvestResult[] = [];
  for (const scope of scopes) {
    // Check if scope is ready for harvest
    if (scope.next_harvest_at && new Date(scope.next_harvest_at) > new Date()) {
      console.log(`[CARS-HARVESTER] ⏳ Skipping ${scope.code} — next harvest at ${scope.next_harvest_at}`);
      continue;
    }

    const result = await harvestCarsScope(scope);
    results.push(result);

    // Small delay between scopes
    await delay(3000);
  }

  return results;
}
