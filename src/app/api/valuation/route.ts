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

export async function POST(req: NextRequest) {
  try {
    const body: ValuationRequest = await req.json();
    const { asset_type } = body;

    if (!asset_type || !["car", "property"].includes(asset_type)) {
      return NextResponse.json({ error: "asset_type مطلوب (car أو property)" }, { status: 400 });
    }

    const sb = getSupabase();
    const gov = body.governorate || "alexandria";
    const govVariants = ["الإسكندرية", "alexandria", "الاسكندرية"];

    // ─── Find comparable listings ───
    const category = asset_type === "car" ? "vehicles" : "properties";
    const cutoff90 = new Date(Date.now() - 90 * 86400000).toISOString();

    let query = sb
      .from("ahe_listings")
      .select("title, price, created_at, source_platform, governorate, category_fields")
      .eq("maksab_category", category)
      .in("governorate", govVariants)
      .gt("price", 0)
      .gte("created_at", cutoff90)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: allListings } = await query;
    if (!allListings || allListings.length === 0) {
      return NextResponse.json({
        estimated_min: 0,
        estimated_max: 0,
        estimated_avg: 0,
        confidence_score: 0,
        comparable_count: 0,
        ai_analysis: "لا توجد بيانات كافية لتقييم هذا الأصل حالياً. جرّب تاني بعد كام يوم.",
        market_trend: "unknown",
        trend_pct: 0,
        comparables: [],
      });
    }

    // ─── Filter comparables by similarity ───
    let comparables = allListings;

    if (asset_type === "car" && body.car_make) {
      const makeFilter = body.car_make.toLowerCase();
      const filtered = comparables.filter((l) => {
        const title = (l.title || "").toLowerCase();
        const fields = l.category_fields as Record<string, unknown> | null;
        const brand = String(fields?.brand || fields?.make || "").toLowerCase();
        return title.includes(makeFilter) || brand.includes(makeFilter);
      });
      if (filtered.length >= 3) comparables = filtered;

      // Further filter by model
      if (body.car_model && comparables.length > 5) {
        const modelFilter = body.car_model.toLowerCase();
        const modelFiltered = comparables.filter((l) => {
          const title = (l.title || "").toLowerCase();
          const fields = l.category_fields as Record<string, unknown> | null;
          const model = String(fields?.model || "").toLowerCase();
          return title.includes(modelFilter) || model.includes(modelFilter);
        });
        if (modelFiltered.length >= 3) comparables = modelFiltered;
      }

      // Filter by year ± 2
      if (body.car_year && comparables.length > 5) {
        const yearFiltered = comparables.filter((l) => {
          const fields = l.category_fields as Record<string, unknown> | null;
          const year = Number(fields?.year || 0);
          return year && Math.abs(year - body.car_year!) <= 2;
        });
        if (yearFiltered.length >= 3) comparables = yearFiltered;
      }
    }

    if (asset_type === "property") {
      // Filter by type
      if (body.property_type) {
        const typeFilter = body.property_type.toLowerCase();
        const filtered = comparables.filter((l) => {
          const title = (l.title || "").toLowerCase();
          const fields = l.category_fields as Record<string, unknown> | null;
          const pType = String(fields?.type || fields?.property_type || "").toLowerCase();
          return title.includes(typeFilter) || pType.includes(typeFilter);
        });
        if (filtered.length >= 3) comparables = filtered;
      }

      // Filter by area ± 30%
      if (body.property_area_sqm && comparables.length > 5) {
        const areaMin = body.property_area_sqm * 0.7;
        const areaMax = body.property_area_sqm * 1.3;
        const areaFiltered = comparables.filter((l) => {
          const fields = l.category_fields as Record<string, unknown> | null;
          const area = Number(fields?.area_sqm || fields?.area || fields?.size || 0);
          return area >= areaMin && area <= areaMax;
        });
        if (areaFiltered.length >= 3) comparables = areaFiltered;
      }
    }

    // Take top 50
    comparables = comparables.slice(0, 50);

    // ─── Calculate prices ───
    const prices = comparables.map((l) => Number(l.price)).filter((p) => p > 0).sort((a, b) => a - b);

    if (prices.length === 0) {
      return NextResponse.json({
        estimated_min: 0, estimated_max: 0, estimated_avg: 0,
        confidence_score: 0, comparable_count: 0,
        ai_analysis: "لا توجد إعلانات مشابهة كافية. جرّب تعدّل المواصفات.",
        market_trend: "unknown", trend_pct: 0, comparables: [],
      });
    }

    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const median = prices[Math.floor(prices.length / 2)];
    const estimatedMin = Math.round(prices[0] * 0.9);
    const estimatedMax = Math.round(prices[prices.length - 1] * 1.1);
    const estimatedAvg = Math.round((avg + median) / 2);
    const confidenceScore = Math.min(prices.length * 2, 95);

    // ─── Calculate trend from older data ───
    const cutoff180 = new Date(Date.now() - 180 * 86400000).toISOString();
    let trendPct = 0;
    let marketTrend = "stable";

    const { data: olderListings } = await sb
      .from("ahe_listings")
      .select("price")
      .eq("maksab_category", category)
      .in("governorate", govVariants)
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

    // Data freshness
    const newestDate = comparables[0]?.created_at;
    const freshnessDays = newestDate ? Math.floor((Date.now() - new Date(newestDate).getTime()) / 86400000) : 90;

    // ─── AI Analysis (Claude Haiku) ───
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
      governorate: gov,
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

    // ─── Return result ───
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
      comparables: comparables.slice(0, 5).map((l) => ({
        title: l.title,
        price: l.price,
        source: l.source_platform,
        date: l.created_at,
      })),
    });
  } catch (err) {
    console.error("[VALUATION] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "حصلت مشكلة" },
      { status: 500 }
    );
  }
}
