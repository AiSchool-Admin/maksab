/**
 * Vercel Enrichment Endpoint — جلب أرقام المعلنين من detail pages
 *
 * GET /api/admin/crm/harvester/enrich-vercel?platform=aqarmap&limit=5
 *
 * يجلب إعلانات بدون رقم → يفتح detail page → يستخرج رقم + اسم
 * timeout: 50 ثانية (limit × 8 ثواني + buffer)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getParser, getPlatformHeaders } from "@/lib/crm/harvester/parsers/platform-router";
import { cleanSellerName } from "@/lib/crm/harvester/parsers/dubizzle";
import { extractPhone } from "@/lib/crm/harvester/parsers/phone-extractor";

/**
 * Fallback seller-name extraction from raw HTML — covers patterns parsers may miss.
 * Shared with backfill-seller-names endpoint; kept local to avoid extra import surface.
 */
function extractSellerFallback(html: string): string | null {
  const patterns: RegExp[] = [
    /id=["']PostViewOwnerCard["'][\s\S]{0,2000}?<h3[^>]*>([^<]{2,60})<\/h3>/i,
    /class="[^"]*(?:seller|member|owner|advertiser|user)[\w-]*name[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
    /class="[^"]*(?:seller|member|owner)[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
    /itemprop=["']name["'][^>]*>\s*([^<]{2,60})\s*</i,
    /(?:أعلن(?:ها|ه)?|نشر(?:ها|ه)?|بواسطة|صاحب الإعلان)[:：]?\s*([^\n<>\r]{2,60})/,
    /"seller"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,60})"/i,
    /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,60})"/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m && m[1]) {
      const cleaned = cleanSellerName(m[1].trim());
      if (cleaned && cleaned.length >= 2 && cleaned.length <= 60) return cleaned;
    }
  }
  return null;
}

export const maxDuration = 60;

const SUPPORTED_PLATFORMS = ["aqarmap", "opensooq", "propertyfinder", "dubizzle", "dowwr", "olx", "hatla2ee", "semsarmasr"];

// ─── Spec normalization ───

const CAR_SPEC_MAP: Record<string, string> = {
  "الماركة": "brand", "الموديل": "model", "سنة الصنع": "year",
  "الكيلومترات": "mileage", "ناقل الحركة": "transmission",
  "نوع الوقود": "fuel", "اللون": "color", "حجم المحرك": "engine_cc",
  "نوع الهيكل": "body_type", "الحالة": "condition", "مرخصة": "licensed",
  "Make": "brand", "Model": "model", "Year": "year",
  "Mileage": "mileage", "Transmission": "transmission",
  "Fuel Type": "fuel", "Color": "color", "Engine Size": "engine_cc",
  "Body Type": "body_type", "Condition": "condition",
  brand: "brand", model: "model", year: "year", mileage: "mileage",
  transmission: "transmission", fuel: "fuel", color: "color",
  engine_cc: "engine_cc", body_type: "body_type", condition: "condition",
};

const PROPERTY_SPEC_MAP: Record<string, string> = {
  "نوع العقار": "property_type", "المساحة": "area", "عدد الغرف": "rooms",
  "عدد الحمامات": "bathrooms", "الدور": "floor", "التشطيب": "finishing",
  "الحالة": "condition", "الإطلالة": "view", "طريقة الدفع": "payment_method",
  "Property Type": "property_type", Area: "area", Bedrooms: "rooms",
  Bathrooms: "bathrooms", Floor: "floor", Finishing: "finishing", View: "view",
  area: "area", rooms: "rooms", bedrooms: "rooms", bathrooms: "bathrooms",
  floor: "floor", finishing: "finishing", type: "property_type",
  propertyType: "property_type", payment_method: "payment_method",
};

function normalizeSpecs(raw: Record<string, string>, category: string): Record<string, string> {
  const mapping = category === "vehicles" ? CAR_SPEC_MAP : PROPERTY_SPEC_MAP;
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[mapping[key] || key] = value;
  }
  return normalized;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface EnrichResult {
  listing_id: string;
  url: string;
  phone: string | null;
  seller_name: string | null;
  description_length: number;
  specs_count: number;
  error: string | null;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") || "aqarmap";
  const backfill = searchParams.get("backfill") === "true";
  const maxLimit = backfill ? 8 : 30; // backfill: fewer items, each needs detail fetch
  const limit = Math.min(parseInt(searchParams.get("limit") || "8"), maxLimit);

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.json({
      error: `Platform "${platform}" not supported. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
    }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Alexandria governorate variants
  const ALEX_GOVS = ["الإسكندرية", "alexandria", "Alexandria", "الاسكندرية"];

  // Fetch listings needing enrichment
  let query = supabase
    .from("ahe_listings")
    .select("id, source_listing_url, title, ahe_seller_id, maksab_category")
    .eq("source_platform", platform)
    .eq("is_duplicate", false)
    .or("is_expired.is.null,is_expired.eq.false")
    .in("governorate", ALEX_GOVS); // Always filter to Alexandria

  if (backfill) {
    // Backfill mode: re-enrich listings that Railway processed but didn't extract specs
    query = query
      .not("detail_fetched_at", "is", null)
      .or("specifications.is.null,specifications.eq.{}");
  } else {
    // Normal mode: no phone OR no specs
    query = query.or("extracted_phone.is.null,specifications.is.null,specifications.eq.{}");
  }

  const { data: listings, error: fetchErr } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fetchErr || !listings || listings.length === 0) {
    return NextResponse.json({
      error: fetchErr?.message || `No listings without phone found for ${platform}`,
      listings_found: 0,
    });
  }

  const parser = getParser(platform);
  const results: EnrichResult[] = [];

  for (const listing of listings) {
    // Time guard
    if (Date.now() - startTime > 50000) {
      results.push({
        listing_id: listing.id,
        url: listing.source_listing_url,
        phone: null,
        seller_name: null,
        description_length: 0,
        specs_count: 0,
        error: "Skipped — timeout approaching",
      });
      continue;
    }

    const result: EnrichResult = {
      listing_id: listing.id,
      url: listing.source_listing_url,
      phone: null,
      seller_name: null,
      description_length: 0,
      specs_count: 0,
      error: null,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000); // 6s per listing

      const response = await fetch(listing.source_listing_url, {
        signal: controller.signal,
        headers: getPlatformHeaders(platform),
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
        results.push(result);
        continue;
      }

      const html = await response.text();
      const details = parser.parseDetail(html);

      result.description_length = details.description?.length || 0;
      result.specs_count = Object.keys(details.specifications || {}).length;

      // Seller name: parser-first, then fallback patterns
      const parserSellerName = cleanSellerName(details.sellerName);
      const fallbackSellerName = parserSellerName || extractSellerFallback(html);
      result.seller_name = fallbackSellerName;

      // Try to extract phone from description + specs
      const allText = [
        details.description || "",
        ...Object.values(details.specifications || {}),
        html, // Search full HTML as fallback
      ].join(" ");

      const phone = extractPhone(allText);
      result.phone = phone;

      // Normalize specifications with car/property mapping
      const rawSpecs = details.specifications || {};
      const category = String(listing.maksab_category || "");
      const specs = normalizeSpecs(rawSpecs, category);

      const detectedBrand = specs.brand || null;
      const detectedModel = specs.model || null;

      // Update listing in DB
      const updates: Record<string, unknown> = {
        description: details.description || null,
        main_image_url: details.mainImageUrl || null,
        all_image_urls: details.allImageUrls || [],
        specifications: specs,
      };

      if (detectedBrand) updates.detected_brand = detectedBrand;
      if (detectedModel) updates.detected_model = detectedModel;

      // Save fields that were extracted but previously discarded
      if (details.condition) updates.condition = details.condition;
      if (details.paymentMethod) updates.payment_method = details.paymentMethod;
      if (details.hasWarranty) updates.has_warranty = true;
      if (specs.area) updates.area = specs.area;
      updates.detail_fetched_at = new Date().toISOString();

      if (phone) {
        updates.extracted_phone = phone;
        updates.phone_source = "detail_enrichment";
      }

      if (fallbackSellerName) {
        updates.seller_name = fallbackSellerName;
      }

      await supabase
        .from("ahe_listings")
        .update(updates)
        .eq("id", listing.id);

      // Update seller table — phone and name when missing
      if (listing.ahe_seller_id) {
        if (phone) {
          await supabase
            .from("ahe_sellers")
            .update({
              phone,
              pipeline_status: "phone_found",
              updated_at: new Date().toISOString(),
            })
            .eq("id", listing.ahe_seller_id)
            .is("phone", null); // Only update if no phone yet
        }

        if (fallbackSellerName) {
          await supabase
            .from("ahe_sellers")
            .update({
              name: fallbackSellerName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", listing.ahe_seller_id)
            .is("name", null); // Only update if no name yet
        }
      }

      results.push(result);
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      results.push(result);
    }
  }

  const phonesFound = results.filter((r) => r.phone).length;

  return NextResponse.json({
    platform,
    duration_ms: Date.now() - startTime,
    listings_processed: results.length,
    phones_found: phonesFound,
    results,
  });
}
