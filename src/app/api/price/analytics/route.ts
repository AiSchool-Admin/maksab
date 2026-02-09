/**
 * POST /api/price/analytics
 * Returns market price analysis for a category/brand/model.
 *
 * Body: { categoryId, subcategoryId?, brand?, model?, condition?, governorate?, price? }
 * Returns: { stats, priceQuality?, suggestion }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

interface PricePoint {
  date: string;
  avgPrice: number;
  count: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      categoryId,
      subcategoryId,
      brand,
      model,
      condition,
      governorate,
      price, // Optional: the specific price to analyze
    } = body;

    if (!categoryId) {
      return NextResponse.json({ error: "القسم مطلوب" }, { status: 400 });
    }

    // Query active ads in same category
    let query = supabase
      .from("ads" as never)
      .select("price, category_fields, created_at, governorate")
      .eq("category_id", categoryId)
      .eq("status", "active")
      .not("price", "is", null)
      .gt("price", 0);

    if (subcategoryId) query = query.eq("subcategory_id", subcategoryId);
    if (governorate) query = query.eq("governorate", governorate);

    const { data: rawAds } = await query
      .order("created_at", { ascending: false })
      .limit(300);

    if (!rawAds || rawAds.length === 0) {
      return NextResponse.json({
        stats: null,
        message: "مفيش بيانات كافية للتحليل",
      });
    }

    // Filter by brand/model
    let ads = rawAds as Array<{
      price: number;
      category_fields: Record<string, unknown>;
      created_at: string;
      governorate: string;
    }>;

    if (brand) {
      ads = ads.filter((ad) => {
        const fields = ad.category_fields || {};
        const adBrand = (String(fields.brand || "")).toLowerCase();
        return adBrand.includes(brand.toLowerCase());
      });
    }

    if (model) {
      ads = ads.filter((ad) => {
        const fields = ad.category_fields || {};
        const adModel = (String(fields.model || "")).toLowerCase();
        return adModel.includes(model.toLowerCase());
      });
    }

    if (ads.length === 0) {
      return NextResponse.json({
        stats: null,
        message: "مفيش إعلانات مشابهة كافية",
      });
    }

    // Calculate stats
    const prices = ads.map((a) => Number(a.price)).filter((p) => p > 0).sort((a, b) => a - b);
    const avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];

    // Price history (last 3 months by week)
    const now = Date.now();
    const threeMonths = 90 * 24 * 60 * 60 * 1000;
    const week = 7 * 24 * 60 * 60 * 1000;
    const priceHistory: PricePoint[] = [];

    for (let i = 0; i < 12; i++) {
      const start = new Date(now - threeMonths + i * week);
      const end = new Date(start.getTime() + week);

      const weekAds = ads.filter((a) => {
        const d = new Date(a.created_at);
        return d >= start && d < end;
      });

      if (weekAds.length > 0) {
        priceHistory.push({
          date: start.toISOString().split("T")[0],
          avgPrice: Math.round(weekAds.reduce((s, a) => s + Number(a.price), 0) / weekAds.length),
          count: weekAds.length,
        });
      }
    }

    // Trend
    let trend: "up" | "down" | "stable" = "stable";
    let trendPercent = 0;
    if (priceHistory.length >= 2) {
      const recent = priceHistory.slice(-3);
      const older = priceHistory.slice(0, Math.min(3, priceHistory.length - 3));
      if (older.length > 0) {
        const recentAvg = recent.reduce((s, p) => s + p.avgPrice, 0) / recent.length;
        const olderAvg = older.reduce((s, p) => s + p.avgPrice, 0) / older.length;
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (Math.abs(change) >= 3) {
          trend = change > 0 ? "up" : "down";
          trendPercent = Math.abs(Math.round(change));
        }
      }
    }

    const stats = {
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      totalListings: ads.length,
      trend,
      trendPercent,
      priceHistory,
    };

    // Price quality analysis (if price provided)
    let priceQuality = null;
    if (price && price > 0) {
      const percentDiff = ((price - avgPrice) / avgPrice) * 100;

      if (percentDiff <= -20) {
        priceQuality = {
          verdict: "great_deal",
          verdictAr: "صفقة ممتازة!",
          emoji: "🔥",
          percentDiff: Math.round(percentDiff),
          explanation: `السعر أقل من المتوسط بـ ${Math.abs(Math.round(percentDiff))}% — ده سعر ممتاز!`,
        };
      } else if (percentDiff <= -10) {
        priceQuality = {
          verdict: "good_price",
          verdictAr: "سعر كويس",
          emoji: "✅",
          percentDiff: Math.round(percentDiff),
          explanation: `السعر أقل من المتوسط بـ ${Math.abs(Math.round(percentDiff))}%`,
        };
      } else if (percentDiff <= 10) {
        priceQuality = {
          verdict: "fair_price",
          verdictAr: "سعر عادل",
          emoji: "👍",
          percentDiff: Math.round(percentDiff),
          explanation: "السعر قريب من متوسط السوق",
        };
      } else if (percentDiff <= 25) {
        priceQuality = {
          verdict: "above_average",
          verdictAr: "أعلى من المتوسط",
          emoji: "⚠️",
          percentDiff: Math.round(percentDiff),
          explanation: `السعر أعلى من المتوسط بـ ${Math.round(percentDiff)}%`,
        };
      } else {
        priceQuality = {
          verdict: "expensive",
          verdictAr: "سعر مرتفع",
          emoji: "💸",
          percentDiff: Math.round(percentDiff),
          explanation: `السعر أعلى من المتوسط بـ ${Math.round(percentDiff)}% — ممكن تلاقي أرخص`,
        };
      }
    }

    // Price suggestion for sellers
    let conditionMult = 1;
    if (condition) {
      const c = condition.toLowerCase();
      if (c.includes("جديد") || c.includes("متبرشم")) conditionMult = 1.1;
      else if (c.includes("زيرو") || c.includes("ممتاز")) conditionMult = 1.0;
      else if (c.includes("كويس") || c.includes("جيد")) conditionMult = 0.9;
      else if (c.includes("مقبول")) conditionMult = 0.75;
      else if (c.includes("تالف") || c.includes("صيانة")) conditionMult = 0.5;
    }

    const suggestion = {
      suggestedPrice: Math.round(avgPrice * conditionMult),
      quickSalePrice: Math.round(avgPrice * conditionMult * 0.9),
      premiumPrice: Math.round(avgPrice * conditionMult * 1.1),
      priceRange: { min: minPrice, max: maxPrice },
      competitorCount: ads.length,
    };

    return NextResponse.json({ stats, priceQuality, suggestion });
  } catch {
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
