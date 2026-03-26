/**
 * POST /api/valuation — تقييم فوري للأصول (سيارات + عقارات)
 * Uses comparable listings from ahe_listings + Claude AI analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// DB has mixed naming for categories and governorates
const CAR_CATS = ["سيارات", "cars", "vehicles"];
const PROPERTY_CATS = ["عقارات", "properties", "real-estate", "real_estate"];
const ALEX_GOVS = ["الإسكندرية", "alexandria", "Alexandria", "الاسكندرية"];

interface ValuationRequest {
  asset_type: "car" | "property";
  car_make?: string;
  car_model?: string;
  car_year?: number;
  car_mileage?: number;
  car_condition?: string;
  property_type?: string;
  property_area_sqm?: number;
  property_rooms?: number;
  property_finishing?: string;
  property_floor?: number;
  governorate?: string;
  district?: string;
  user_id?: string;
}

type SupabaseClient = ReturnType<typeof getSupabase>;
type Listing = Record<string, unknown>;

export async function POST(req: NextRequest) {
  try {
    const body: ValuationRequest = await req.json();
    const { asset_type } = body;

    if (!asset_type || !["car", "property"].includes(asset_type)) {
      return NextResponse.json({ error: "asset_type مطلوب (car أو property)" }, { status: 400 });
    }

    const sb = getSupabase();
    const catVariants = asset_type === "car" ? CAR_CATS : PROPERTY_CATS;

    console.error(`[Valuation] asset_type: ${asset_type}, cats: ${catVariants.join(",")}`);

    // ─── Rental exclusion keywords ───
    const RENTAL_KEYWORDS = ['للإيجار', 'للايجار', 'ايجار', 'إيجار', 'مفروشة', 'مفروش', 'for rent', 'rent'];

    // ─── Find comparable listings (Alexandria first) ───
    let query = sb
      .from("ahe_listings")
      .select("title, price, created_at, source_platform, governorate, maksab_category, city, source_listing_url")
      .in("maksab_category", catVariants)
      .in("governorate", ALEX_GOVS)
      .gt("price", 0)
      .not("price", "is", null);

    // Exclude rentals at DB level where possible
    for (const kw of ['للإيجار', 'للايجار', 'إيجار']) {
      query = query.not("title", "ilike", `%${kw}%`);
    }
    // Exclude installment/deposit ads
    for (const kw of ['مقدم', 'قسط', 'تقسيط', 'أقساط']) {
      query = query.not("title", "ilike", `%${kw}%`);
    }

    const { data: allListings, error: queryErr } = await query
      .order("created_at", { ascending: false })
      .limit(300);

    console.error(`[Valuation] Alexandria results: ${allListings?.length || 0}, error: ${queryErr?.message || "none"}`);
    if (allListings?.[0]) {
      console.error(`[Valuation] Sample: ${JSON.stringify({ title: allListings[0].title, price: allListings[0].price, cat: allListings[0].maksab_category, gov: allListings[0].governorate })}`);
    }

    if (allListings && allListings.length > 0) {
      return processComparables(sb, body, asset_type, allListings, catVariants);
    }

    // ─── Fallback: try without governorate filter ───
    console.error("[Valuation] No Alexandria listings, trying all governorates...");
    let fallbackQuery = sb
      .from("ahe_listings")
      .select("title, price, created_at, source_platform, governorate, maksab_category, city, source_listing_url")
      .in("maksab_category", catVariants)
      .gt("price", 0)
      .not("price", "is", null);
    for (const kw of ['للإيجار', 'للايجار', 'إيجار']) {
      fallbackQuery = fallbackQuery.not("title", "ilike", `%${kw}%`);
    }
    for (const kw of ['مقدم', 'قسط', 'تقسيط', 'أقساط']) {
      fallbackQuery = fallbackQuery.not("title", "ilike", `%${kw}%`);
    }
    const { data: fallback } = await fallbackQuery
      .order("created_at", { ascending: false })
      .limit(300);

    console.error(`[Valuation] All-gov fallback: ${fallback?.length || 0}`);

    if (fallback && fallback.length > 0) {
      return processComparables(sb, body, asset_type, fallback, catVariants);
    }

    // ─── Last resort: check what categories exist ───
    const { data: catSample } = await sb
      .from("ahe_listings")
      .select("maksab_category, governorate, price")
      .gt("price", 0)
      .limit(10);
    console.error(`[Valuation] DB sample (any category): ${JSON.stringify(catSample?.map(r => ({ cat: r.maksab_category, gov: r.governorate, price: r.price })))}`);

    return NextResponse.json({
      estimated_min: 0, estimated_max: 0, estimated_avg: 0,
      confidence_score: 0, comparable_count: 0,
      ai_analysis: "لا توجد بيانات كافية لتقييم هذا الأصل حالياً. جرّب تاني بعد كام يوم.",
      market_trend: "unknown", trend_pct: 0, comparables: [],
    });
  } catch (err) {
    console.error("[VALUATION] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "حصلت مشكلة" },
      { status: 500 }
    );
  }
}

// ─── Process comparables: filter, calculate, AI, save, return ───

async function processComparables(
  sb: SupabaseClient,
  body: ValuationRequest,
  asset_type: string,
  allListings: Listing[],
  catVariants: string[],
) {
  // Track each filter step
  const step1_total = allListings.length;
  let comparables = allListings;
  let afterSpecificCount = step1_total;
  const filtersApplied: Record<string, string> = {
    category: catVariants.join(", "),
    governorate: ALEX_GOVS.join(", "),
  };

  // ─── Step 1: Client-side rental + installment exclusion ───
  const EXCLUDE_WORDS = [
    'للإيجار', 'للايجار', 'ايجار', 'إيجار', 'مفروشة', 'مفروش', 'for rent',
    'مقدم', 'حجز', 'قسط', 'تقسيط', 'أقساط', 'اقساط', 'down payment',
  ];
  comparables = comparables.filter((l) => {
    const title = String(l.title || "").toLowerCase();
    return !EXCLUDE_WORDS.some(kw => title.includes(kw));
  });
  console.error(`[Valuation] After rental+installment exclusion: ${comparables.length} (from ${step1_total})`);

  // ─── Step 2: District filter — search in title, city, and URL ───
  if (body.district) {
    filtersApplied.district = body.district;
    const d = body.district;
    // Create fuzzy variants: ة↔ه, common misspellings
    const variants = [d];
    if (d.includes("ة")) variants.push(d.replace(/ة/g, "ه"));
    if (d.includes("ه")) variants.push(d.replace(/ه/g, "ة"));

    const districtFiltered = comparables.filter((l) => {
      const title = String(l.title || "");
      const city = String(l.city || "");
      const url = String(l.source_listing_url || "");
      return variants.some(v =>
        title.includes(v) || city.includes(v) || url.toLowerCase().includes(v.toLowerCase())
      );
    });
    console.error(`[Valuation] District "${d}" filter: ${districtFiltered.length} (variants: ${variants.join(",")})`);
    if (districtFiltered.length >= 5) {
      comparables = districtFiltered;
    } else {
      console.error(`[Valuation] District too few (${districtFiltered.length}), using all Alexandria`);
    }
  }

  // ─── Step 3: Car similarity filters ───
  if (asset_type === "car" && body.car_make) {
    const makeFilter = body.car_make.toLowerCase();
    filtersApplied.make = body.car_make;
    const filtered = comparables.filter((l) => {
      const title = String(l.title || "").toLowerCase();
      return title.includes(makeFilter);
    });
    if (filtered.length >= 3) comparables = filtered;

    if (body.car_model && comparables.length > 5) {
      const modelFilter = body.car_model.toLowerCase();
      filtersApplied.model = body.car_model;
      const modelFiltered = comparables.filter((l) => {
        const title = String(l.title || "").toLowerCase();
        return title.includes(modelFilter);
      });
      if (modelFiltered.length >= 3) comparables = modelFiltered;
    }

    if (body.car_year && comparables.length > 5) {
      const yearStr = String(body.car_year);
      filtersApplied.year_range = `${body.car_year - 2} — ${body.car_year + 2}`;
      const yearFiltered = comparables.filter((l) => {
        const title = String(l.title || "");
        return title.includes(yearStr);
      });
      if (yearFiltered.length >= 3) comparables = yearFiltered;
    }
  }

  // ─── Step 4: Property similarity filters ───
  if (asset_type === "property") {
    if (body.property_type) {
      const typeFilter = body.property_type.toLowerCase();
      filtersApplied.property_type = body.property_type;
      const typeKeywords: Record<string, string[]> = {
        apartment: ["شقة", "شقه", "apartment"],
        villa: ["فيلا", "فيللا", "villa"],
        duplex: ["دوبلكس", "duplex"],
        studio: ["استوديو", "studio"],
        office: ["مكتب", "office"],
        shop: ["محل", "shop"],
        land: ["أرض", "ارض", "land"],
      };
      const keywords = typeKeywords[typeFilter] || [typeFilter];
      const filtered = comparables.filter((l) => {
        const title = String(l.title || "").toLowerCase();
        return keywords.some(k => title.includes(k));
      });
      if (filtered.length >= 3) comparables = filtered;
    }

    // Area filter: ±30%, but KEEP listings without area in title
    if (body.property_area_sqm && comparables.length > 5) {
      const areaMin = Math.round(body.property_area_sqm * 0.7);
      const areaMax = Math.round(body.property_area_sqm * 1.3);
      filtersApplied.area_range = `${areaMin} — ${areaMax} م²`;
      const areaFiltered = comparables.filter((l) => {
        const title = String(l.title || "");
        const areaMatch = title.match(/(\d+)\s*(?:م²|متر|sqm|م\b|m²)/i);
        if (!areaMatch) return true; // no area in title → keep it
        const area = Number(areaMatch[1]);
        return area >= areaMin && area <= areaMax;
      });
      if (areaFiltered.length >= 3) comparables = areaFiltered;
    }
  }

  afterSpecificCount = comparables.length;

  // ─── Step 5: Platform balancing — equal distribution ───
  const ALL_PLATFORMS = ["dubizzle", "opensooq", "aqarmap", "propertyfinder", "olx", "hatla2ee", "contactcars"];
  const byPlatform: Record<string, Listing[]> = {};
  for (const l of comparables) {
    const p = String(l.source_platform || "unknown");
    if (!byPlatform[p]) byPlatform[p] = [];
    byPlatform[p].push(l);
  }
  const activePlatforms = ALL_PLATFORMS.filter(p => byPlatform[p]?.length > 0);
  const platformCounts = Object.entries(byPlatform).map(([k, v]) => `${k}:${v.length}`).join(", ");
  console.error(`[Valuation] Platform distribution (before): ${platformCounts}`);

  // Equal share: ceil(50 / active platforms count), e.g. 4 platforms → 13 each
  const perPlatform = Math.ceil(50 / Math.max(activePlatforms.length, 1));
  const balanced: Listing[] = [];
  for (const name of activePlatforms) {
    balanced.push(...byPlatform[name].slice(0, perPlatform));
  }
  // Add remaining from other platforms not in ALL_PLATFORMS
  for (const [name, listings] of Object.entries(byPlatform)) {
    if (!activePlatforms.includes(name)) {
      balanced.push(...listings.slice(0, perPlatform));
    }
  }

  if (balanced.length >= 10) {
    comparables = balanced.slice(0, 50);
  } else {
    comparables = comparables.slice(0, 50);
  }
  console.error(`[Valuation] After balancing: ${comparables.length} (perPlatform=${perPlatform}, active: ${activePlatforms.join(",")})`);

  // ─── Extract and sort prices ───
  const allPrices = comparables.map((l) => Number(l.price)).filter((p) => p > 0).sort((a, b) => a - b);

  if (allPrices.length === 0) {
    return NextResponse.json({
      estimated_min: 0, estimated_max: 0, estimated_avg: 0,
      confidence_score: 0, comparable_count: 0,
      ai_analysis: "لا توجد إعلانات مشابهة كافية. جرّب تعدّل المواصفات.",
      market_trend: "unknown", trend_pct: 0, comparables: [],
      process_details: {
        step1_total_listings: step1_total,
        step2_after_specific: afterSpecificCount,
        step3_after_iqr: 0,
        prices_used: [], prices_removed: [],
        filters_applied: filtersApplied,
        sample_listings: [],
      },
    });
  }

  // ─── IQR outlier removal ───
  const q1Idx = Math.floor(allPrices.length * 0.25);
  const q3Idx = Math.floor(allPrices.length * 0.75);
  const q1 = allPrices[q1Idx];
  const q3 = allPrices[q3Idx];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filteredPrices = allPrices.filter((p) => p >= lowerBound && p <= upperBound);
  const removedOutliers = allPrices.filter((p) => p < lowerBound || p > upperBound);

  // Use filtered prices if enough remain, otherwise use all
  const prices = filteredPrices.length >= 3 ? filteredPrices : allPrices;

  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const median = prices[Math.floor(prices.length / 2)];
  const estimatedMin = Math.round(prices[0] * 0.9);
  const estimatedMax = Math.round(prices[prices.length - 1] * 1.1);
  const estimatedAvg = Math.round((avg + median) / 2);
  const confidenceScore = Math.min(prices.length * 2, 95);

  // ─── Trend: compare recent vs older ───
  const cutoff90 = new Date(Date.now() - 90 * 86400000).toISOString();
  const cutoff180 = new Date(Date.now() - 180 * 86400000).toISOString();
  let trendPct = 0;
  let marketTrend = "stable";

  const { data: olderListings } = await sb
    .from("ahe_listings")
    .select("price")
    .in("maksab_category", catVariants)
    .in("governorate", ALEX_GOVS)
    .gt("price", 0)
    .gte("created_at", cutoff180)
    .lt("created_at", cutoff90)
    .limit(100);

  if (olderListings && olderListings.length >= 3) {
    const olderPrices = olderListings.map((l) => Number(l.price)).filter((p) => p > 0);
    const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
    if (olderAvg > 0) {
      trendPct = Math.round(((avg - olderAvg) / olderAvg) * 1000) / 10;
      marketTrend = trendPct > 2 ? "rising" : trendPct < -2 ? "falling" : "stable";
    }
  }

  const newestDate = comparables[0]?.created_at as string | undefined;
  const freshnessDays = newestDate ? Math.floor((Date.now() - new Date(newestDate).getTime()) / 86400000) : 90;

  // ─── AI Analysis ───
  let aiAnalysis = "";
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("No ANTHROPIC_API_KEY");

    const assetDesc = asset_type === "car"
      ? `${body.car_make || ""} ${body.car_model || ""} ${body.car_year || ""} — ${(body.car_mileage || 0).toLocaleString()} كم — حالة ${body.car_condition || "جيدة"}`
      : `${body.property_type || "شقة"} ${body.property_area_sqm || ""}م² — ${body.property_rooms || ""} غرف — ${body.property_finishing || "متشطبة"} — ${body.district || "الإسكندرية"}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `أنت خبير تقييم ${asset_type === "car" ? "سيارات" : "عقارات"} في مصر.

الأصل: ${assetDesc}
بناءً على ${prices.length} إعلان مشابه في الإسكندرية:
متوسط السعر: ${avg.toLocaleString()} جنيه
النطاق: ${estimatedMin.toLocaleString()} — ${estimatedMax.toLocaleString()} جنيه
اتجاه السوق: ${marketTrend === "rising" ? "صاعد" : marketTrend === "falling" ? "هابط" : "مستقر"} (${trendPct > 0 ? "+" : ""}${trendPct}%)

اكتب تحليلاً موجزاً (3 جمل) باللغة العربية المصرية عن:
1. هل السعر مناسب؟
2. اتجاه السوق الحالي
3. نصيحة للبائع أو المشتري

لا تستخدم markdown. لا تستخدم نجوم أو رموز تنسيق.`
        }],
      }),
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      aiAnalysis = aiData?.content?.[0]?.text || "";
    }
  } catch (err) {
    console.error("[VALUATION] AI error:", err);
    aiAnalysis = `بناءً على ${prices.length} إعلان مشابه، السعر التقديري ${estimatedAvg.toLocaleString()} جنيه. السوق ${marketTrend === "rising" ? "في ارتفاع" : marketTrend === "falling" ? "في انخفاض" : "مستقر"}.`;
  }

  // ─── Save to DB ───
  const insertData: Record<string, unknown> = {
    asset_type,
    governorate: body.governorate || "alexandria",
    district: body.district || null,
    estimated_min: estimatedMin,
    estimated_max: estimatedMax,
    estimated_avg: estimatedAvg,
    confidence_score: confidenceScore,
    comparable_count: prices.length,
    data_freshness_days: freshnessDays,
    ai_analysis: aiAnalysis,
    market_trend: marketTrend,
    trend_pct: trendPct,
    user_id: body.user_id || null,
    is_anonymous: !body.user_id,
  };

  if (asset_type === "car") {
    insertData.car_make = body.car_make || null;
    insertData.car_model = body.car_model || null;
    insertData.car_year = body.car_year || null;
    insertData.car_mileage = body.car_mileage || null;
    insertData.car_condition = body.car_condition || null;
  } else {
    insertData.property_type = body.property_type || null;
    insertData.property_area_sqm = body.property_area_sqm || null;
    insertData.property_floor = body.property_floor || null;
    insertData.property_rooms = body.property_rooms || null;
    insertData.property_finishing = body.property_finishing || null;
  }

  await sb.from("asset_valuations").insert(insertData);

  const mapListing = (l: Listing) => ({
    title: l.title as string,
    price: l.price as number,
    city: (l.city as string) || null,
    source_platform: (l.source_platform as string) || null,
    source_listing_url: (l.source_listing_url as string) || null,
    created_at: l.created_at as string,
  });

  return NextResponse.json({
    estimated_min: estimatedMin,
    estimated_max: estimatedMax,
    estimated_avg: estimatedAvg,
    confidence_score: confidenceScore,
    comparable_count: prices.length,
    data_freshness_days: freshnessDays,
    ai_analysis: aiAnalysis,
    market_trend: marketTrend,
    trend_pct: trendPct,
    comparables: comparables.slice(0, 10).map(mapListing),
    process_details: {
      step1_total_listings: step1_total,
      step2_after_specific: afterSpecificCount,
      step3_after_iqr: prices.length,
      outliers_removed_count: removedOutliers.length,
      prices_used: prices,
      prices_removed: removedOutliers,
      filters_applied: filtersApplied,
      sample_listings: comparables.slice(0, 10).map(mapListing),
    },
  });
}
