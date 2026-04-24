import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const ALEX_GOVS = ["الإسكندرية", "الاسكندرية", "Alexandria", "alexandria"];

type AheListing = {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  governorate: string | null;
  city: string | null;
  area: string | null;
  source_listing_url: string | null;
  source_platform: string | null;
  source_location: string | null;
  maksab_category: string | null;
  extracted_phone: string | null;
  seller_name: string | null;
  ahe_seller_id: string | null;
  is_duplicate: boolean | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  floor_number: string | null;
  specifications: Record<string, unknown> | null;
  created_at: string | null;
};

function isValidEgyPhone(p: string | null): boolean {
  if (!p) return false;
  return /^01[0125]\d{8}$/.test(p);
}

function isMeaningfulName(n: string | null): boolean {
  if (!n) return false;
  const clean = n.trim();
  if (clean.length < 2 || clean.length > 60) return false;
  // Reject obvious garbage
  if (/^\d+$/.test(clean)) return false;
  if (/^(تتصل|من خلال|اضغط|للتواصل|سمسار|المعلن)$/i.test(clean)) return false;
  return true;
}

function isAlexandria(gov: string | null): boolean {
  return !!gov && ALEX_GOVS.some((g) => gov.includes(g) || g.includes(gov));
}

function hasSpecs(specs: Record<string, unknown> | null): boolean {
  if (!specs || typeof specs !== "object") return false;
  // Ignore internal markers (_wm_*, _images_*, etc.)
  const publicKeys = Object.keys(specs).filter((k) => !k.startsWith("_"));
  return publicKeys.length > 0;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");

  const supabase = getSupabase();

  let query = supabase
    .from("ahe_listings")
    .select("id, title, description, price, governorate, city, area, source_listing_url, source_platform, source_location, maksab_category, extracted_phone, seller_name, ahe_seller_id, is_duplicate, property_type, bedrooms, bathrooms, area_sqm, floor_number, specifications, created_at")
    .limit(20000);

  if (platform) query = query.eq("source_platform", platform);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data as AheListing[]) || [];
  const nonDup = rows.filter((r) => !r.is_duplicate);

  // Per-field completeness across non-duplicates
  const total = nonDup.length;
  const check = (fn: (r: AheListing) => boolean) => {
    const count = nonDup.filter(fn).length;
    return { count, percent: total ? Math.round((count / total) * 1000) / 10 : 0 };
  };

  const completeness = {
    title: check((r) => !!r.title && r.title.trim().length >= 3),
    price: check((r) => typeof r.price === "number" && r.price > 0),
    description: check((r) => !!r.description && r.description.trim().length >= 10),
    seller_phone: check((r) => isValidEgyPhone(r.extracted_phone)),
    seller_name: check((r) => isMeaningfulName(r.seller_name)),
    seller_linked: check((r) => !!r.ahe_seller_id),
    governorate_alex: check((r) => isAlexandria(r.governorate)),
    city_or_area: check((r) => !!(r.city || r.area || r.source_location)),
    source_url: check((r) => !!r.source_listing_url),
    source_platform: check((r) => !!r.source_platform),
    specs_populated: check((r) => hasSpecs(r.specifications)),
    category: check((r) => !!r.maksab_category),
  };

  // Category-specific completeness (properties only for now)
  const props = nonDup.filter((r) => r.maksab_category === "properties" || r.property_type);
  const cars = nonDup.filter((r) => r.maksab_category === "cars");

  const propCompleteness = props.length ? {
    total: props.length,
    property_type: Math.round((props.filter((r) => !!r.property_type).length / props.length) * 100),
    bedrooms: Math.round((props.filter((r) => r.bedrooms != null).length / props.length) * 100),
    bathrooms: Math.round((props.filter((r) => r.bathrooms != null).length / props.length) * 100),
    area_sqm: Math.round((props.filter((r) => r.area_sqm != null).length / props.length) * 100),
    floor: Math.round((props.filter((r) => !!r.floor_number).length / props.length) * 100),
  } : null;

  // Breakdown per platform
  const byPlatform: Record<string, { total: number; with_phone: number; with_name: number; alex: number }> = {};
  for (const r of nonDup) {
    const p = r.source_platform || "unknown";
    byPlatform[p] = byPlatform[p] || { total: 0, with_phone: 0, with_name: 0, alex: 0 };
    byPlatform[p].total++;
    if (isValidEgyPhone(r.extracted_phone)) byPlatform[p].with_phone++;
    if (isMeaningfulName(r.seller_name)) byPlatform[p].with_name++;
    if (isAlexandria(r.governorate)) byPlatform[p].alex++;
  }

  // Data issues (top N problematic patterns)
  const issues = {
    duplicates: rows.filter((r) => r.is_duplicate).length,
    missing_phone: nonDup.filter((r) => !isValidEgyPhone(r.extracted_phone)).length,
    missing_name: nonDup.filter((r) => !isMeaningfulName(r.seller_name)).length,
    malformed_phone: nonDup.filter((r) => r.extracted_phone && !isValidEgyPhone(r.extracted_phone)).length,
    not_alexandria: nonDup.filter((r) => !isAlexandria(r.governorate)).length,
    empty_specs: nonDup.filter((r) => !hasSpecs(r.specifications)).length,
    no_price: nonDup.filter((r) => !(typeof r.price === "number" && r.price > 0)).length,
    short_title: nonDup.filter((r) => !r.title || r.title.trim().length < 15).length,
  };

  // Progress toward 10k target
  const targetProgress = {
    current: nonDup.filter((r) => isAlexandria(r.governorate)).length,
    target: 10000,
    percent: Math.round((nonDup.filter((r) => isAlexandria(r.governorate)).length / 10000) * 1000) / 10,
    remaining: Math.max(0, 10000 - nonDup.filter((r) => isAlexandria(r.governorate)).length),
  };

  // Seller coverage
  const uniqueSellers = new Set(nonDup.map((r) => r.ahe_seller_id).filter(Boolean));
  const uniquePhones = new Set(nonDup.map((r) => r.extracted_phone).filter((p) => isValidEgyPhone(p)));

  return NextResponse.json({
    total_rows: rows.length,
    non_duplicate_rows: total,
    target_progress: targetProgress,
    completeness,
    by_platform: byPlatform,
    category_specific: {
      properties: propCompleteness,
      cars_count: cars.length,
    },
    issues,
    sellers: {
      unique_linked: uniqueSellers.size,
      unique_phones: uniquePhones.size,
    },
    generated_at: new Date().toISOString(),
  });
}
