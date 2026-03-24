/**
 * محرك حصاد العقارات — Properties Harvester Engine
 * متخصص في حصاد إعلانات العقارات من جميع المنصات
 *
 * المنصات المدعومة:
 * - Dubizzle (عقارات)
 * - AqarMap (أكبر منصة عقارات)
 * - OpenSooq (عقارات)
 * - PropertyFinder (عقارات)
 * - سمسار مصر (عقارات)
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

// Platforms that need Vercel for fetching
const VERCEL_DELEGATED_PLATFORMS = [
  "opensooq", "aqarmap", "dowwr", "propertyfinder",
  "hatla2ee", "contactcars", "carsemsar", "yallamotor",
  "olx", "semsarmasr",
];

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
  total_harvests?: number;
  next_harvest_at?: string | null;
}

export interface PropertyListing {
  title: string;
  price: number | null;
  property_type: string | null;
  transaction_type: string | null;
  area_sqm: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  has_garage: boolean | null;
  furnished: string | null;
  finishing: string | null;
  governorate: string;
  district: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_profile_url: string | null;
  seller_is_agent: boolean;
  seller_is_developer: boolean;
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

// ─── Property Type Detection ─────────────────────────────────

function detectPropertyType(text: string): string | null {
  const lower = text.toLowerCase();
  const types: [string, RegExp][] = [
    ["شقة", /شقة|شقه|apartment|flat/i],
    ["فيلا", /فيلا|فيللا|villa/i],
    ["أرض", /أرض|ارض|land|plot/i],
    ["محل", /محل|shop|store|commercial/i],
    ["مكتب", /مكتب|office/i],
    ["دوبلكس", /دوبلكس|duplex/i],
    ["بنتهاوس", /بنتهاوس|penthouse/i],
    ["استوديو", /استوديو|studio/i],
    ["شاليه", /شاليه|chalet/i],
    ["عمارة", /عمارة|عماره|building/i],
  ];
  for (const [name, pattern] of types) {
    if (pattern.test(lower)) return name;
  }
  return null;
}

function detectTransactionType(text: string): string | null {
  if (/(?:للبيع|for sale|sale|بيع)/i.test(text)) return "بيع";
  if (/(?:للإيجار|for rent|rent|إيجار|ايجار)/i.test(text)) return "إيجار";
  return null;
}

function detectArea(text: string): number | null {
  const match = text.match(/(\d[\d,٬]*)\s*(?:م²|م2|sqm|متر\s*مربع|m²|m2)/i);
  if (match) return parseInt(match[1].replace(/[,٬]/g, ""));
  // Also try "XXX متر"
  const match2 = text.match(/(\d{2,4})\s*(?:متر|meter)/i);
  if (match2) return parseInt(match2[1]);
  return null;
}

function detectRooms(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:غرف|غرفة|rooms?|bed|نوم)/i);
  return match ? parseInt(match[1]) : null;
}

function detectBathrooms(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:حمام|حمامات|bath|bathroom)/i);
  return match ? parseInt(match[1]) : null;
}

function detectFloor(text: string): number | null {
  if (/أرضي|ground/i.test(text)) return 0;
  const match = text.match(/(?:الطابق|الدور|floor)\s*[:\s]*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function detectFinishing(text: string): string | null {
  if (/سوبر لوكس|super lux/i.test(text)) return "سوبر لوكس";
  if (/لوكس|lux/i.test(text)) return "لوكس";
  if (/نص تشطيب|semi.?finish/i.test(text)) return "نص تشطيب";
  if (/على المحارة|plastered/i.test(text)) return "على المحارة";
  if (/على الطوب|core.*shell/i.test(text)) return "على الطوب";
  return null;
}

function detectFurnished(text: string): string | null {
  if (/مفروش بالكامل|fully.*furnished/i.test(text)) return "مفروش";
  if (/نص مفروش|semi.*furnished/i.test(text)) return "نص مفروش";
  if (/فارغ|غير مفروش|unfurnished|empty/i.test(text)) return "فارغ";
  if (/مفروش|furnished/i.test(text)) return "مفروش";
  return null;
}

// Alexandria districts
const ALEX_DISTRICTS = [
  "سموحة", "المنتزه", "محرم بك", "سيدي بشر", "ستانلي", "كليوباترا",
  "جليم", "الشاطبي", "لوران", "العصافرة", "المعمورة", "الأنفوشي",
  "المندرة", "أبو قير", "العجمي", "الدخيلة", "العامرية", "برج العرب",
  "الحضرة", "باب شرق", "كرموز", "المنشية", "الإبراهيمية", "فليمنج",
  "سابا باشا", "بولكلي", "رشدي", "كامب شيزار", "سان ستيفانو",
  "ميامي", "سيدي جابر", "زيزينيا", "الأزاريطة", "العطارين",
];

function detectDistrict(text: string): string | null {
  for (const district of ALEX_DISTRICTS) {
    if (text.includes(district)) return district;
  }
  // English names
  const englishMap: Record<string, string> = {
    "smouha": "سموحة", "smoha": "سموحة",
    "montazah": "المنتزه", "montaza": "المنتزه",
    "moharam bek": "محرم بك",
    "sidi bishr": "سيدي بشر", "sidi beshr": "سيدي بشر",
    "stanley": "ستانلي",
    "gleem": "جليم", "glim": "جليم",
    "louran": "لوران", "laurent": "لوران",
    "mandara": "المندرة",
    "agami": "العجمي",
    "miami": "ميامي",
    "sidi gaber": "سيدي جابر",
    "san stefano": "سان ستيفانو",
    "camp caesar": "كامب شيزار",
    "fleming": "فليمنج",
  };
  const lower = text.toLowerCase();
  for (const [eng, ar] of Object.entries(englishMap)) {
    if (lower.includes(eng)) return ar;
  }
  return null;
}

function extractPhoneFromText(text: string): string | null {
  const match = text.match(/(?:\+?20)?(?:0)?(1[0125]\d{8})/);
  return match ? `0${match[1]}` : null;
}

function extractSourceId(url: string): string {
  const match = url.match(/(\d{5,})/);
  return match ? match[1] : url.replace(/[^a-zA-Z0-9]/g, "").slice(-20);
}

// ─── Generic Listing → PropertyListing ───────────────────────

function parsePropertyFromGenericListing(
  listing: Record<string, unknown>,
  platform: string,
  governorate: string
): PropertyListing | null {
  const title = (listing.title as string) || "";
  const description = (listing.description as string) || "";
  const fullText = `${title} ${description}`;

  if (!title) return null;

  const specs = (listing.specifications as Record<string, string>) || {};
  const location = (listing.location as string) || (listing.source_location as string) || "";

  return {
    title,
    price: (listing.price as number) || null,
    property_type: specs["النوع"] || specs["type"] || specs["Type"] || detectPropertyType(fullText),
    transaction_type: specs["نوع المعاملة"] || detectTransactionType(fullText),
    area_sqm: parseInt((specs["المساحة"] || specs["area"] || specs["Size"] || "").replace(/[,٬]/g, "")) || detectArea(fullText),
    rooms: parseInt(specs["الغرف"] || specs["rooms"] || specs["Bedrooms"] || "") || detectRooms(fullText),
    bathrooms: parseInt(specs["الحمامات"] || specs["bathrooms"] || specs["Bathrooms"] || "") || detectBathrooms(fullText),
    floor: parseInt(specs["الطابق"] || specs["floor"] || specs["Floor"] || "") || detectFloor(fullText),
    has_garage: specs["جراج"] === "true" || /garage|جراج/i.test(fullText) ? true : null,
    furnished: specs["مفروش"] || specs["furnished"] || detectFurnished(fullText),
    finishing: specs["التشطيب"] || specs["finishing"] || detectFinishing(fullText),
    governorate,
    district: detectDistrict(`${fullText} ${location}`),
    seller_name: (listing.sellerName as string) || (listing.seller_name as string) || null,
    seller_phone: (listing.extractedPhone as string) || (listing.seller_phone as string) || extractPhoneFromText(fullText),
    seller_profile_url: (listing.sellerProfileUrl as string) || null,
    seller_is_agent: !!(listing.isBusiness) || /(?:سمسار|وسيط|broker|agent|مكتب عقاري)/i.test(fullText),
    seller_is_developer: /(?:شركة تطوير|developer|مطور عقاري)/i.test(fullText),
    source_url: (listing.url as string) || (listing.source_url as string) || "",
    source_listing_id: extractSourceId((listing.url as string) || ""),
    source_platform: platform,
    thumbnail_url: (listing.thumbnailUrl as string) || (listing.thumbnail_url as string) || null,
    is_featured: !!(listing.isFeatured),
    is_verified: !!(listing.isVerified),
  };
}

// ─── Main Harvest Function ───────────────────────────────────

export async function harvestPropertiesScope(scope: AheScope): Promise<HarvestResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const errors: string[] = [];
  let pagesF = 0;
  let listingsFound = 0;
  let listingsNew = 0;
  let listingsDuplicate = 0;
  let sellersNew = 0;
  let phonesExtracted = 0;

  console.log(`[PROPS-HARVESTER] 🏠 Starting harvest for ${scope.code} (${scope.source_platform})`);

  try {
    // Check if we should delegate to Vercel
    if (VERCEL_DELEGATED_PLATFORMS.includes(scope.source_platform) && VERCEL_HARVEST_URL) {
      console.log(`[PROPS-HARVESTER] 📡 Delegating ${scope.source_platform} to Vercel...`);
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
    }

    // Direct fetch with pagination
    for (let page = 1; page <= scope.max_pages_per_harvest; page++) {
      try {
        const url = buildPageUrl(scope.base_url, scope.pagination_pattern, page);
        console.log(`[PROPS-HARVESTER] 📄 Page ${page}: ${url.substring(0, 80)}...`);

        const response = await fetch(url, {
          headers: BROWSER_HEADERS,
          redirect: "follow",
          signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
          if (response.status === 403) {
            errors.push(`HTTP 403 — ${scope.source_platform} يحظر server-side fetch`);
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

        // Use the engine's parser system
        const { getParser } = await import("../../src/lib/crm/harvester/parsers/platform-router");
        const parser = getParser(scope.source_platform);
        const rawListings = parser.parseList(html);

        console.log(`[PROPS-HARVESTER] 📊 Page ${page}: ${rawListings.length} listings found`);

        if (rawListings.length === 0) break;

        for (const raw of rawListings) {
          listingsFound++;

          const propListing = parsePropertyFromGenericListing(
            raw as unknown as Record<string, unknown>,
            scope.source_platform,
            scope.governorate
          );

          if (!propListing) continue;

          const result = await savePropertyListing(supabase, propListing, scope.id);
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
        total_harvests: (scope.total_harvests || 0) + 1,
        next_harvest_at: new Date(Date.now() + scope.harvest_interval_minutes * 60 * 1000).toISOString(),
      })
      .eq("id", scope.id);

  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`[PROPS-HARVESTER] ✅ Done ${scope.code}: ${listingsNew} new, ${phonesExtracted} phones, ${duration.toFixed(1)}s`);

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

async function savePropertyListing(
  supabase: SupabaseClient,
  listing: PropertyListing,
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
      await supabase
        .from("ahe_listings")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return { isNew: false, sellerIsNew: false, phoneExtracted: false };
    }

    // 2. Upsert seller
    let sellerId: string | null = null;
    if (listing.seller_name || listing.seller_phone || listing.seller_profile_url) {
      const sellerResult = await upsertPropertySeller(supabase, listing);
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
      maksab_category: "عقارات",
      thumbnail_url: listing.thumbnail_url,
      source_location: listing.district || listing.governorate,
      governorate: listing.governorate,
      city: listing.district,
      seller_name: listing.seller_name,
      seller_profile_url: listing.seller_profile_url,
      seller_is_verified: listing.is_verified,
      seller_is_business: listing.seller_is_agent || listing.seller_is_developer,
      is_featured: listing.is_featured,
      ahe_seller_id: sellerId,
      extracted_phone: listing.seller_phone,
      phone_source: listing.seller_phone ? "listing_page" : null,
      specifications: {
        property_type: listing.property_type,
        transaction_type: listing.transaction_type,
        area_sqm: listing.area_sqm,
        rooms: listing.rooms,
        bathrooms: listing.bathrooms,
        floor: listing.floor,
        finishing: listing.finishing,
        furnished: listing.furnished,
        has_garage: listing.has_garage,
        district: listing.district,
      },
      migration_status: "harvested",
    });

    if (!insertError) {
      isNew = true;
      if (listing.seller_phone) phoneExtracted = true;
    }
  } catch (error) {
    console.error(`[PROPS-HARVESTER] Save error:`, error);
  }

  return { isNew, sellerIsNew, phoneExtracted };
}

async function upsertPropertySeller(
  supabase: SupabaseClient,
  listing: PropertyListing
): Promise<{ id: string; isNew: boolean }> {
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
    await supabase
      .from("ahe_sellers")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(listing.seller_phone && { phone: listing.seller_phone }),
        ...(listing.seller_name && { name: listing.seller_name }),
      })
      .eq("id", existingSeller.id);

    return { id: existingSeller.id, isNew: false };
  }

  const isBusiness = listing.seller_is_agent || listing.seller_is_developer;
  const { data: newSeller, error } = await supabase
    .from("ahe_sellers")
    .insert({
      phone: listing.seller_phone,
      name: listing.seller_name,
      profile_url: listing.seller_profile_url,
      source_platform: listing.source_platform,
      is_verified: listing.is_verified,
      is_business: isBusiness,
      detected_account_type: isBusiness ? "business" : "individual",
      primary_category: "عقارات",
      primary_governorate: listing.governorate,
      total_listings_seen: 1,
      active_listings: 1,
      pipeline_status: listing.seller_phone ? "new_with_phone" : "new_no_phone",
    })
    .select("id")
    .single();

  if (error || !newSeller) {
    console.error("[PROPS-HARVESTER] Seller insert error:", error?.message);
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

export async function runPropertiesHarvest(): Promise<HarvestResult[]> {
  const supabase = getSupabase();

  const { data: scopes, error } = await supabase
    .from("ahe_scopes")
    .select("*")
    .eq("maksab_category", "عقارات")
    .eq("governorate", "الإسكندرية")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error || !scopes) {
    console.error("[PROPS-HARVESTER] Failed to load scopes:", error?.message);
    return [];
  }

  console.log(`[PROPS-HARVESTER] 🏠 Found ${scopes.length} active property scopes for Alexandria`);

  const results: HarvestResult[] = [];
  for (const scope of scopes) {
    if (scope.next_harvest_at && new Date(scope.next_harvest_at) > new Date()) {
      console.log(`[PROPS-HARVESTER] ⏳ Skipping ${scope.code} — next harvest at ${scope.next_harvest_at}`);
      continue;
    }

    const result = await harvestPropertiesScope(scope);
    results.push(result);

    await delay(3000);
  }

  return results;
}
