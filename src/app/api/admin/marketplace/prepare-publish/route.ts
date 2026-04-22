/**
 * Prepare-Publish — تقرير قبل النشر
 *
 * قبل تشغيل `publish` الفعلي، شغّل ده لتشوف إيه هيحصل:
 *   - عدد الحسابات اللي هتتعمل
 *   - عدد الإعلانات اللي هتتنقل
 *   - عدد اللي هيتم تجاهلها (ومش ليه)
 *   - تفصيل حسب المنصة والقسم والمحافظة
 *
 * الاستخدام:
 *   GET /api/admin/marketplace/prepare-publish?governorate=alexandria
 *   GET /api/admin/marketplace/prepare-publish?governorate=alexandria&platform=dubizzle
 *
 * بعد ما تطمئن للتقرير، شغّل POST /api/admin/marketplace/publish فعلاً.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const GOV_AR: Record<string, string> = {
  alexandria: "الإسكندرية",
  cairo: "القاهرة",
  giza: "الجيزة",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const governorate = searchParams.get("governorate") || "alexandria";
  const platform = searchParams.get("platform") || null;

  const sb = getSupabase();
  const govAr = GOV_AR[governorate] || governorate;
  const govSlugs = [governorate, govAr];

  // ─── 1. Sellers that will be published (have phone, not yet signed up) ───

  let sellerQuery = sb
    .from("ahe_sellers")
    .select("id, phone, name, source_platform, primary_category, primary_governorate, pipeline_status", { count: "exact" })
    .not("phone", "is", null)
    .in("primary_governorate", govSlugs)
    .not("pipeline_status", "in", '("signed_up","active")');

  if (platform) sellerQuery = sellerQuery.eq("source_platform", platform);

  const { data: sellers, count: sellersCount } = await sellerQuery;

  // Detect existing profiles (phone already in use)
  const phones = (sellers || []).map((s) => s.phone).filter(Boolean);
  let existingProfiles = 0;
  if (phones.length > 0) {
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("phone", phones);
    existingProfiles = count || 0;
  }
  const newAccountsToCreate = (sellersCount || 0) - existingProfiles;

  // ─── 2. Listings that will be migrated ───

  const sellerIds = (sellers || []).map((s) => s.id);
  let listingsCount = 0;
  let listingsByCategory: Record<string, number> = {};
  let listingsByPlatform: Record<string, number> = {};
  let listingsWithImage = 0;
  let listingsWithPrice = 0;
  let listingsWithSpecs = 0;

  if (sellerIds.length > 0) {
    const chunkSize = 500; // avoid .in() limits
    for (let i = 0; i < sellerIds.length; i += chunkSize) {
      const chunk = sellerIds.slice(i, i + chunkSize);
      const { data: listings, count } = await sb
        .from("ahe_listings")
        .select("id, maksab_category, source_platform, thumbnail_url, main_image_url, all_image_urls, price, specifications", { count: "exact" })
        .in("ahe_seller_id", chunk)
        .eq("is_duplicate", false)
        .in("migration_status", ["harvested", "queued"]);

      listingsCount += count || 0;
      for (const l of listings || []) {
        const cat = l.maksab_category || "غير مصنف";
        listingsByCategory[cat] = (listingsByCategory[cat] || 0) + 1;
        listingsByPlatform[l.source_platform] = (listingsByPlatform[l.source_platform] || 0) + 1;
        if (l.thumbnail_url || l.main_image_url || (Array.isArray(l.all_image_urls) && l.all_image_urls.length > 0)) listingsWithImage++;
        if (l.price != null && l.price > 0) listingsWithPrice++;
        if (l.specifications && typeof l.specifications === "object" && Object.keys(l.specifications).length > 0) listingsWithSpecs++;
      }
    }
  }

  // ─── 3. What will NOT be published (for transparency) ───

  const { count: sellersNoPhone } = await sb
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true })
    .is("phone", null)
    .in("primary_governorate", govSlugs);

  const { count: listingsNoSeller } = await sb
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .is("ahe_seller_id", null)
    .eq("is_duplicate", false)
    .in("governorate", govSlugs);

  const { count: listingsNoPhone } = await sb
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .is("extracted_phone", null)
    .eq("is_duplicate", false)
    .in("governorate", govSlugs);

  // ─── 4. Seller quality by platform ───

  const sellersByPlatform: Record<string, { total: number; with_name: number }> = {};
  for (const s of sellers || []) {
    const p = s.source_platform;
    if (!sellersByPlatform[p]) sellersByPlatform[p] = { total: 0, with_name: 0 };
    sellersByPlatform[p].total++;
    if (s.name) sellersByPlatform[p].with_name++;
  }

  // ─── Response ───

  return NextResponse.json({
    governorate: govAr,
    platform: platform || "all",
    summary: {
      sellers_eligible_for_publish: sellersCount || 0,
      existing_profiles_reused: existingProfiles,
      new_auth_accounts_to_create: Math.max(newAccountsToCreate, 0),
      listings_to_migrate: listingsCount,
    },
    listings_breakdown: {
      by_category: listingsByCategory,
      by_platform: listingsByPlatform,
      with_image: listingsWithImage,
      with_price: listingsWithPrice,
      with_specs: listingsWithSpecs,
      total: listingsCount,
    },
    sellers_by_platform: sellersByPlatform,
    will_be_skipped: {
      sellers_without_phone: sellersNoPhone || 0,
      listings_without_seller_link: listingsNoSeller || 0,
      listings_without_phone: listingsNoPhone || 0,
      reason: "Only sellers with phone are promoted to Maksab accounts",
    },
    next_step: {
      to_execute: "POST /api/admin/marketplace/publish",
      body: { governorate, platform, limit: 50 },
      note: "شغّله على دفعات 50 لحد ما يخلص كل المؤهلين",
    },
  });
}
