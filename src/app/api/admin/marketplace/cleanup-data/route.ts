/**
 * Data Cleanup Endpoint — إصلاح البيانات الموجودة
 *
 * يعمل 4 مهام إصلاح (كل واحدة مستقلة):
 *   1. normalize-phones   → ينرمل الأرقام المشوهة (+20 prefix, etc.)
 *   2. mark-duplicates    → يعلّم الإعلانات المكررة (نفس source_listing_id)
 *   3. parse-dubizzle     → يستخرج specs + وصف نظيف من page-dumps
 *   4. unify-governorate  → يوحّد "alexandria" → "الإسكندرية"
 *
 * Vercel-safe: 50s budget. كل مهمة لها limit خاص.
 *
 * GET /api/admin/marketplace/cleanup-data?task=normalize-phones&limit=200
 * GET /api/admin/marketplace/cleanup-data?task=mark-duplicates&limit=100
 * GET /api/admin/marketplace/cleanup-data?task=parse-dubizzle&limit=50
 * GET /api/admin/marketplace/cleanup-data?task=unify-governorate&limit=500
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEgyptianPhone } from "@/lib/crm/harvester/parsers/phone-extractor";
import { isDubizzleTextDump, parseDubizzleTextDump } from "@/lib/crm/harvester/parsers/dubizzle-text-dump";

export const maxDuration = 60;

const ALEX_GOVS = ["الإسكندرية", "alexandria", "Alexandria", "الاسكندرية"];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const task = searchParams.get("task") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
  const supabase = getServiceClient();

  switch (task) {
    case "normalize-phones":
      return await normalizePhones(supabase, limit);
    case "mark-duplicates":
      return await markDuplicates(supabase, limit);
    case "parse-dubizzle":
      return await parseDubizzleDumps(supabase, limit);
    case "unify-governorate":
      return await unifyGovernorate(supabase, limit);
    case "status":
      return await status(supabase);
    case "source-breakdown":
      return await sourceBreakdown(supabase);
    case "railway-check":
      return await railwayCheck(supabase);
    default:
      return NextResponse.json({
        error: "Missing or invalid `task` parameter",
        available_tasks: [
          "normalize-phones — fix `+20...` → `01...` in listings + sellers",
          "mark-duplicates — flag duplicate listings (same source_listing_id)",
          "parse-dubizzle — extract inline specs + clean desc from Dubizzle dumps",
          "unify-governorate — `alexandria` → `الإسكندرية`",
          "status — count remaining issues",
        ],
      }, { status: 400 });
  }
}

// ═══ Task 1: Normalize malformed phones ═══

type SupabaseClient = ReturnType<typeof getServiceClient>;

async function normalizePhones(supabase: SupabaseClient, limit: number) {
  const startTime = Date.now();

  // Find listings with phones that don't match canonical format
  const { data: badListings } = await supabase
    .from("ahe_listings")
    .select("id, extracted_phone, ahe_seller_id")
    .not("extracted_phone", "is", null)
    .not("extracted_phone", "like", "01%")
    .limit(limit);

  let listingsFixed = 0;
  let listingsCleared = 0;
  let sellersFixed = 0;
  const seenSellers = new Set<string>();

  for (const listing of badListings || []) {
    const normalized = normalizeEgyptianPhone(listing.extracted_phone);
    if (normalized) {
      await supabase
        .from("ahe_listings")
        .update({ extracted_phone: normalized })
        .eq("id", listing.id);
      listingsFixed++;

      // Also fix seller record (once per seller per batch)
      if (listing.ahe_seller_id && !seenSellers.has(listing.ahe_seller_id)) {
        seenSellers.add(listing.ahe_seller_id);
        const { data: updated } = await supabase
          .from("ahe_sellers")
          .update({ phone: normalized })
          .eq("id", listing.ahe_seller_id)
          .select("id")
          .maybeSingle();
        if (updated) sellersFixed++;
      }
    } else {
      // Can't normalize — clear invalid phone
      await supabase
        .from("ahe_listings")
        .update({ extracted_phone: null, phone_source: null })
        .eq("id", listing.id);
      listingsCleared++;
    }
  }

  // Also normalize seller-table phones that are malformed
  const { data: badSellers } = await supabase
    .from("ahe_sellers")
    .select("id, phone")
    .not("phone", "is", null)
    .not("phone", "like", "01%")
    .limit(limit);

  let extraSellersFixed = 0;
  let extraSellersCleared = 0;
  for (const seller of badSellers || []) {
    const normalized = normalizeEgyptianPhone(seller.phone);
    if (normalized) {
      await supabase.from("ahe_sellers").update({ phone: normalized }).eq("id", seller.id);
      extraSellersFixed++;
    } else {
      await supabase.from("ahe_sellers").update({ phone: null }).eq("id", seller.id);
      extraSellersCleared++;
    }
  }

  return NextResponse.json({
    task: "normalize-phones",
    duration_ms: Date.now() - startTime,
    listings_fixed: listingsFixed,
    listings_cleared: listingsCleared,
    sellers_fixed: sellersFixed + extraSellersFixed,
    sellers_cleared: extraSellersCleared,
  });
}

// ═══ Task 2: Mark duplicate listings ═══

async function markDuplicates(supabase: SupabaseClient, limit: number) {
  const startTime = Date.now();

  // Find groups of listings with same source_listing_url (where is_duplicate=false)
  const { data: dupGroups, error } = await supabase.rpc("find_duplicate_listings", {
    p_limit: limit,
  });

  let markedCount = 0;

  // Fallback: query via SQL if RPC doesn't exist
  if (error || !dupGroups) {
    // Manual approach: fetch all URLs with count > 1
    const { data: allListings } = await supabase
      .from("ahe_listings")
      .select("id, source_listing_url, source_listing_id, source_platform, created_at")
      .eq("is_duplicate", false)
      .order("created_at", { ascending: true })
      .limit(5000); // scan up to 5000 rows at a time

    // Group by URL — keep the oldest, mark rest as duplicate
    const byUrl: Record<string, typeof allListings> = {};
    const byPlatformId: Record<string, typeof allListings> = {};
    for (const l of allListings || []) {
      if (l.source_listing_url) {
        byUrl[l.source_listing_url] = byUrl[l.source_listing_url] || [];
        byUrl[l.source_listing_url]!.push(l);
      }
      if (l.source_listing_id) {
        const key = `${l.source_platform}::${l.source_listing_id}`;
        byPlatformId[key] = byPlatformId[key] || [];
        byPlatformId[key]!.push(l);
      }
    }

    const toMark = new Set<string>();
    const keepMap = new Map<string, string>(); // duplicate_id → original_id
    for (const [, group] of Object.entries(byUrl)) {
      if (!group || group.length <= 1) continue;
      const keeper = group[0]; // oldest
      for (let i = 1; i < group.length; i++) {
        toMark.add(group[i].id);
        keepMap.set(group[i].id, keeper.id);
      }
    }
    for (const [, group] of Object.entries(byPlatformId)) {
      if (!group || group.length <= 1) continue;
      const keeper = group[0];
      for (let i = 1; i < group.length; i++) {
        if (toMark.has(group[i].id)) continue;
        toMark.add(group[i].id);
        keepMap.set(group[i].id, keeper.id);
      }
    }

    // Batch-update: mark as duplicate
    const ids = Array.from(toMark).slice(0, limit);
    for (const id of ids) {
      await supabase
        .from("ahe_listings")
        .update({ is_duplicate: true, duplicate_of: keepMap.get(id) || null })
        .eq("id", id);
      markedCount++;
    }
  } else {
    markedCount = dupGroups.length || 0;
  }

  return NextResponse.json({
    task: "mark-duplicates",
    duration_ms: Date.now() - startTime,
    listings_marked: markedCount,
  });
}

// ═══ Task 3: Parse Dubizzle page-dumps to extract specs + clean description ═══

async function parseDubizzleDumps(supabase: SupabaseClient, limit: number) {
  const startTime = Date.now();

  // Find dubizzle listings whose description looks like a page-dump AND specs are missing
  const { data: listings } = await supabase
    .from("ahe_listings")
    .select("id, description, specifications")
    .eq("source_platform", "dubizzle")
    .or("specifications.is.null,specifications.eq.{}")
    .not("description", "is", null)
    .in("governorate", ALEX_GOVS)
    .limit(limit);

  let specsExtracted = 0;
  let descCleaned = 0;
  let skipped = 0;

  for (const listing of listings || []) {
    if (!isDubizzleTextDump(listing.description)) {
      skipped++;
      continue;
    }

    const parsed = parseDubizzleTextDump(listing.description);
    const updates: Record<string, unknown> = {};

    if (Object.keys(parsed.inlineSpecs).length > 0) {
      updates.specifications = parsed.inlineSpecs;
      specsExtracted++;
    }

    if (parsed.cleanDescription && parsed.cleanDescription !== listing.description) {
      updates.description = parsed.cleanDescription;
      descCleaned++;
    } else if (!parsed.cleanDescription) {
      // Fully noisy — clear description entirely
      updates.description = null;
      descCleaned++;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("ahe_listings").update(updates).eq("id", listing.id);
    }
  }

  return NextResponse.json({
    task: "parse-dubizzle",
    duration_ms: Date.now() - startTime,
    listings_processed: (listings || []).length,
    specs_extracted: specsExtracted,
    descriptions_cleaned: descCleaned,
    skipped_not_dump: skipped,
  });
}

// ═══ Task 4: Unify governorate naming ═══

async function unifyGovernorate(supabase: SupabaseClient, limit: number) {
  const startTime = Date.now();

  // Update English "alexandria" → Arabic "الإسكندرية"
  const { data: fixed1 } = await supabase
    .from("ahe_listings")
    .update({ governorate: "الإسكندرية" })
    .in("governorate", ["alexandria", "Alexandria", "الاسكندرية"])
    .select("id")
    .limit(limit);

  // Fill null governorate where source_location contains Alexandria signals
  const { data: nullGov } = await supabase
    .from("ahe_listings")
    .select("id, source_location, city, area")
    .is("governorate", null)
    .limit(limit);

  let fixed2 = 0;
  for (const l of nullGov || []) {
    const combined = `${l.source_location || ""} ${l.city || ""} ${l.area || ""}`;
    if (/إسكندرية|اسكندرية|alexandria/i.test(combined)) {
      await supabase
        .from("ahe_listings")
        .update({ governorate: "الإسكندرية" })
        .eq("id", l.id);
      fixed2++;
    }
  }

  // Same treatment for sellers
  const { data: fixedSellers } = await supabase
    .from("ahe_sellers")
    .update({ primary_governorate: "الإسكندرية" })
    .in("primary_governorate", ["alexandria", "Alexandria", "الاسكندرية"])
    .select("id")
    .limit(limit);

  return NextResponse.json({
    task: "unify-governorate",
    duration_ms: Date.now() - startTime,
    listings_renamed: (fixed1 || []).length,
    listings_filled_from_location: fixed2,
    sellers_renamed: (fixedSellers || []).length,
  });
}

// ═══ Task: railway-check — simulates Railway worker queries ═══
//
// Mirrors the filters used in railway/workers/cars-harvester.ts and
// properties-harvester.ts so we can see INSTANTLY whether Railway would
// harvest anything right now — without waiting for the next cron tick
// and without needing the Railway service URL.

async function railwayCheck(supabase: SupabaseClient) {
  const now = new Date().toISOString();

  // Exact same filter Railway's cars-harvester uses
  const { data: carsScopes } = await supabase
    .from("ahe_scopes")
    .select("code, maksab_category, governorate, is_active, is_paused, next_harvest_at")
    .eq("maksab_category", "سيارات")
    .eq("governorate", "الإسكندرية")
    .eq("is_active", true);

  // Exact same filter Railway's properties-harvester uses
  const { data: propsScopes } = await supabase
    .from("ahe_scopes")
    .select("code, maksab_category, governorate, is_active, is_paused, next_harvest_at")
    .eq("maksab_category", "عقارات")
    .eq("governorate", "الإسكندرية")
    .eq("is_active", true);

  // Scopes Railway would ACTUALLY process right now (is_active + ready)
  function readyFilter(s: { next_harvest_at: string | null }) {
    return !s.next_harvest_at || new Date(s.next_harvest_at) <= new Date(now);
  }

  const carsReady = (carsScopes || []).filter(readyFilter);
  const propsReady = (propsScopes || []).filter(readyFilter);

  // Scheduler view: additionally filters by is_paused=false
  const { data: schedulerReady } = await supabase
    .from("ahe_scopes")
    .select("code")
    .eq("is_active", true)
    .eq("is_paused", false)
    .or(`next_harvest_at.is.null,next_harvest_at.lte.${now}`);

  const totalRailwayWillProcess = carsReady.length + propsReady.length;

  return NextResponse.json({
    now: now,
    verdict: totalRailwayWillProcess === 0
      ? "✅ Railway آمن — مفيش scopes هيشتغل عليها"
      : `⚠️ Railway هيحصد ${totalRailwayWillProcess} scope لو شغّل دلوقتي`,
    cars_harvester_will_pick: carsReady.map((s) => s.code),
    properties_harvester_will_pick: propsReady.map((s) => s.code),
    scheduler_endpoint_will_pick: (schedulerReady || []).map((s) => s.code),
    details: {
      all_alexandria_scopes: {
        cars_total: (carsScopes || []).length,
        cars_ready_now: carsReady.length,
        properties_total: (propsScopes || []).length,
        properties_ready_now: propsReady.length,
      },
      note: "Railway workers فلترتهم فقط `is_active=true AND next_harvest_at<=now`. لو الاتنين 0 معناه Railway مش هيحصد حاجة.",
    },
  });
}

// ═══ Task: source-breakdown — where did existing listings come from? ═══

async function sourceBreakdown(supabase: SupabaseClient) {
  // Get all listings grouped by source_platform + source (if bookmarklet payload set it)
  const { data: listings } = await supabase
    .from("ahe_listings")
    .select("id, source_platform, source_listing_url, created_at, scope_id, phone_source, seller_name, extracted_phone, title")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!listings || listings.length === 0) {
    return NextResponse.json({
      message: "No listings in ahe_listings",
      total: 0,
    });
  }

  const byPlatform: Record<string, { count: number; with_phone: number; with_name: number; phone_sources: Record<string, number>; sample_urls: string[] }> = {};
  for (const l of listings) {
    const p = l.source_platform || "unknown";
    if (!byPlatform[p]) byPlatform[p] = { count: 0, with_phone: 0, with_name: 0, phone_sources: {}, sample_urls: [] };
    byPlatform[p].count++;
    if (l.extracted_phone) byPlatform[p].with_phone++;
    if (l.seller_name) byPlatform[p].with_name++;
    const ps = l.phone_source || "none";
    byPlatform[p].phone_sources[ps] = (byPlatform[p].phone_sources[ps] || 0) + 1;
    if (byPlatform[p].sample_urls.length < 3) byPlatform[p].sample_urls.push(l.source_listing_url);
  }

  // Created-at histogram (group by hour)
  const byHour: Record<string, number> = {};
  for (const l of listings) {
    const dt = l.created_at ? new Date(l.created_at) : null;
    if (!dt) continue;
    const key = dt.toISOString().substring(0, 13) + ":00"; // YYYY-MM-DDTHH:00
    byHour[key] = (byHour[key] || 0) + 1;
  }

  // Most recent listings
  const recent = listings.slice(0, 10).map((l) => ({
    created_at: l.created_at,
    platform: l.source_platform,
    title: l.title?.substring(0, 60),
    has_phone: !!l.extracted_phone,
    has_name: !!l.seller_name,
  }));

  return NextResponse.json({
    total: listings.length,
    by_platform: byPlatform,
    created_histogram: byHour,
    most_recent_10: recent,
  });
}

// ═══ Task: Status — count remaining issues ═══

async function status(supabase: SupabaseClient) {
  const [
    { count: aheListingsAlex },
    { count: aheListingsTotal },
    { count: aheSellersTotal },
    { count: aheSellersWithPhone },
    { count: adsTotalAlex },
    { count: adsTotalAll },
    { count: adsCars },
    { count: adsProps },
    { count: badPhones },
    { count: dupCandidates },
    { count: alexEnglish },
    { count: nullGov },
    { count: dubizzleNoSpecs },
    { count: scopesTotal },
    { count: scopesActive },
    { count: scopesPaused },
  ] = await Promise.all([
    supabase.from("ahe_listings").select("id", { count: "exact", head: true }).in("governorate", ALEX_GOVS),
    supabase.from("ahe_listings").select("id", { count: "exact", head: true }),
    supabase.from("ahe_sellers").select("id", { count: "exact", head: true }),
    supabase.from("ahe_sellers").select("id", { count: "exact", head: true }).not("phone", "is", null),
    supabase.from("ads").select("id", { count: "exact", head: true }).eq("governorate", "الإسكندرية"),
    supabase.from("ads").select("id", { count: "exact", head: true }),
    supabase.from("ads").select("id", { count: "exact", head: true }).eq("governorate", "الإسكندرية").eq("category_id", "cars"),
    supabase.from("ads").select("id", { count: "exact", head: true }).eq("governorate", "الإسكندرية").eq("category_id", "real_estate"),
    supabase.from("ahe_listings").select("id", { count: "exact", head: true }).not("extracted_phone", "is", null).not("extracted_phone", "like", "01%"),
    supabase.from("ahe_listings").select("id", { count: "exact", head: true }).eq("is_duplicate", true),
    supabase.from("ahe_listings").select("id", { count: "exact", head: true }).in("governorate", ["alexandria", "Alexandria", "الاسكندرية"]),
    supabase.from("ahe_listings").select("id", { count: "exact", head: true }).is("governorate", null),
    supabase.from("ahe_listings").select("id", { count: "exact", head: true }).eq("source_platform", "dubizzle").or("specifications.is.null,specifications.eq.{}").in("governorate", ALEX_GOVS),
    supabase.from("ahe_scopes").select("id", { count: "exact", head: true }),
    supabase.from("ahe_scopes").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_paused", false),
    supabase.from("ahe_scopes").select("id", { count: "exact", head: true }).eq("is_paused", true),
  ]);

  return NextResponse.json({
    ahe_listings: {
      alexandria: aheListingsAlex,
      total_all_govs: aheListingsTotal,
      note: "ده اللي بتبنيه الـ bookmarklet. browse page بتقراه منه.",
    },
    ads: {
      alexandria_total: adsTotalAlex,
      alexandria_cars: adsCars,
      alexandria_properties: adsProps,
      total_all_govs: adsTotalAll,
      note: "ده table المنشور في التطبيق. publish endpoint بيحط فيه.",
    },
    ahe_sellers: {
      total: aheSellersTotal,
      with_phone: aheSellersWithPhone,
    },
    scopes: {
      total: scopesTotal,
      active_and_running: scopesActive,
      paused: scopesPaused,
    },
    issues_remaining: {
      malformed_phones: badPhones,
      english_alexandria: alexEnglish,
      null_governorate: nullGov,
      dubizzle_missing_specs: dubizzleNoSpecs,
    },
    already_marked_duplicates: dupCandidates,
  });
}
