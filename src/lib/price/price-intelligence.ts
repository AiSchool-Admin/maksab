/**
 * Price Intelligence Service for Maksab
 * - Market price analysis per category/brand
 * - Price history tracking
 * - Smart price suggestions for sellers
 * - Price alerts for buyers
 * - "Is this price good?" analysis
 */

import { supabase } from "@/lib/supabase/client";

export interface PriceStats {
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  totalListings: number;
  priceRange: "cheap" | "fair" | "expensive";
  percentile: number; // Where this price falls (0-100)
  trend: "up" | "down" | "stable";
  trendPercent: number;
  priceHistory: PricePoint[];
}

export interface PricePoint {
  date: string;
  avgPrice: number;
  count: number;
}

export interface PriceSuggestion {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  avgPrice: number;
  quickSalePrice: number; // 10% below average
  premiumPrice: number; // 10% above average
  competitorCount: number;
  reasoning: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  categoryId: string;
  subcategoryId?: string;
  brand?: string;
  maxPrice: number;
  isActive: boolean;
  createdAt: string;
}

/**
 * Analyze market price for a specific category/brand/model
 */
export async function getMarketPriceStats(params: {
  categoryId: string;
  subcategoryId?: string;
  brand?: string;
  model?: string;
  condition?: string;
  governorate?: string;
}): Promise<PriceStats> {
  try {
    // Query active ads in same category
    let query = supabase
      .from("ads" as never)
      .select("price, category_fields, created_at, governorate")
      .eq("category_id", params.categoryId)
      .eq("status", "active")
      .not("price", "is", null)
      .gt("price", 0);

    if (params.subcategoryId) {
      query = query.eq("subcategory_id", params.subcategoryId);
    }
    if (params.governorate) {
      query = query.eq("governorate", params.governorate);
    }

    const { data: ads } = await query.order("created_at", { ascending: false }).limit(200);

    if (!ads || ads.length === 0) {
      return getEmptyStats(params.categoryId);
    }

    // Filter by brand/model if specified
    let filteredAds = ads as Array<{
      price: number;
      category_fields: Record<string, unknown>;
      created_at: string;
      governorate: string;
    }>;

    if (params.brand) {
      filteredAds = filteredAds.filter((ad) => {
        const fields = ad.category_fields || {};
        const adBrand = (fields.brand as string || "").toLowerCase();
        return adBrand.includes(params.brand!.toLowerCase());
      });
    }

    if (params.model) {
      filteredAds = filteredAds.filter((ad) => {
        const fields = ad.category_fields || {};
        const adModel = (fields.model as string || "").toLowerCase();
        return adModel.includes(params.model!.toLowerCase());
      });
    }

    if (filteredAds.length === 0) {
      return getEmptyStats(params.categoryId);
    }

    const prices = filteredAds.map((a) => Number(a.price)).filter((p) => p > 0).sort((a, b) => a - b);

    const avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];

    // Calculate price history (last 3 months, grouped by week)
    const priceHistory = calculatePriceHistory(filteredAds);

    // Calculate trend
    const { trend, trendPercent } = calculateTrend(priceHistory);

    return {
      category: params.categoryId,
      subcategory: params.subcategoryId,
      brand: params.brand,
      model: params.model,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      totalListings: filteredAds.length,
      priceRange: "fair",
      percentile: 50,
      trend,
      trendPercent,
      priceHistory,
    };
  } catch {
    return getEmptyStats(params.categoryId);
  }
}

/**
 * Analyze if a specific price is good or not
 */
export function analyzePriceQuality(
  price: number,
  stats: PriceStats,
): {
  verdict: "great_deal" | "good_price" | "fair_price" | "above_average" | "expensive";
  verdictAr: string;
  emoji: string;
  percentBelow: number;
  explanation: string;
} {
  if (stats.totalListings === 0) {
    return {
      verdict: "fair_price",
      verdictAr: "مفيش بيانات كافية",
      emoji: "🤷",
      percentBelow: 0,
      explanation: "مفيش إعلانات كافية للمقارنة",
    };
  }

  const percentDiff = ((price - stats.avgPrice) / stats.avgPrice) * 100;

  if (percentDiff <= -20) {
    return {
      verdict: "great_deal",
      verdictAr: "صفقة ممتازة!",
      emoji: "🔥",
      percentBelow: Math.abs(Math.round(percentDiff)),
      explanation: `السعر أقل من المتوسط بـ ${Math.abs(Math.round(percentDiff))}% — ده سعر ممتاز!`,
    };
  }
  if (percentDiff <= -10) {
    return {
      verdict: "good_price",
      verdictAr: "سعر كويس",
      emoji: "✅",
      percentBelow: Math.abs(Math.round(percentDiff)),
      explanation: `السعر أقل من المتوسط بـ ${Math.abs(Math.round(percentDiff))}%`,
    };
  }
  if (percentDiff <= 10) {
    return {
      verdict: "fair_price",
      verdictAr: "سعر عادل",
      emoji: "👍",
      percentBelow: 0,
      explanation: "السعر قريب من متوسط السوق",
    };
  }
  if (percentDiff <= 25) {
    return {
      verdict: "above_average",
      verdictAr: "أعلى من المتوسط",
      emoji: "⚠️",
      percentBelow: 0,
      explanation: `السعر أعلى من المتوسط بـ ${Math.round(percentDiff)}%`,
    };
  }
  return {
    verdict: "expensive",
    verdictAr: "سعر مرتفع",
    emoji: "💸",
    percentBelow: 0,
    explanation: `السعر أعلى من المتوسط بـ ${Math.round(percentDiff)}% — ممكن تلاقي أرخص`,
  };
}

/**
 * Get smart price suggestion for sellers
 */
export async function getSuggestedPrice(params: {
  categoryId: string;
  subcategoryId?: string;
  brand?: string;
  model?: string;
  condition?: string;
  governorate?: string;
}): Promise<PriceSuggestion> {
  const stats = await getMarketPriceStats(params);

  if (stats.totalListings === 0) {
    return {
      suggestedPrice: 0,
      priceRange: { min: 0, max: 0 },
      avgPrice: 0,
      quickSalePrice: 0,
      premiumPrice: 0,
      competitorCount: 0,
      reasoning: "مفيش إعلانات مشابهة كافية لاقتراح سعر",
    };
  }

  // Adjust based on condition
  let conditionMultiplier = 1;
  if (params.condition) {
    const c = params.condition.toLowerCase();
    if (c.includes("جديد") || c.includes("متبرشم")) conditionMultiplier = 1.1;
    else if (c.includes("زيرو") || c.includes("ممتاز")) conditionMultiplier = 1.0;
    else if (c.includes("كويس") || c.includes("جيد")) conditionMultiplier = 0.9;
    else if (c.includes("مقبول")) conditionMultiplier = 0.75;
    else if (c.includes("تالف") || c.includes("صيانة")) conditionMultiplier = 0.5;
  }

  const suggestedPrice = Math.round(stats.avgPrice * conditionMultiplier);
  const quickSalePrice = Math.round(suggestedPrice * 0.9);
  const premiumPrice = Math.round(suggestedPrice * 1.1);

  return {
    suggestedPrice,
    priceRange: {
      min: Math.round(stats.minPrice * 0.9),
      max: Math.round(stats.maxPrice * 1.1),
    },
    avgPrice: stats.avgPrice,
    quickSalePrice,
    premiumPrice,
    competitorCount: stats.totalListings,
    reasoning: generatePriceReasoning(stats, conditionMultiplier),
  };
}

function generatePriceReasoning(stats: PriceStats, conditionMult: number): string {
  const parts: string[] = [];
  parts.push(`بناءً على ${stats.totalListings} إعلان مشابه`);
  parts.push(`متوسط السعر ${stats.avgPrice.toLocaleString("en-US")} جنيه`);

  if (stats.trend === "down") {
    parts.push(`الأسعار بتنزل (${stats.trendPercent}% آخر شهر)`);
  } else if (stats.trend === "up") {
    parts.push(`الأسعار بتزيد (${stats.trendPercent}% آخر شهر)`);
  }

  if (conditionMult !== 1) {
    if (conditionMult > 1) parts.push("تعديل بالزيادة لحالة ممتازة");
    else parts.push("تعديل بالنقص حسب الحالة");
  }

  return parts.join(" — ");
}

function calculatePriceHistory(
  ads: Array<{ price: number; created_at: string }>,
): PricePoint[] {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const points: PricePoint[] = [];

  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(threeMonthsAgo.getTime() + i * weekMs);
    const weekEnd = new Date(weekStart.getTime() + weekMs);

    const weekAds = ads.filter((a) => {
      const d = new Date(a.created_at);
      return d >= weekStart && d < weekEnd;
    });

    if (weekAds.length > 0) {
      const avg = Math.round(weekAds.reduce((s, a) => s + Number(a.price), 0) / weekAds.length);
      points.push({
        date: weekStart.toISOString().split("T")[0],
        avgPrice: avg,
        count: weekAds.length,
      });
    }
  }

  return points;
}

function calculateTrend(history: PricePoint[]): { trend: "up" | "down" | "stable"; trendPercent: number } {
  if (history.length < 2) return { trend: "stable", trendPercent: 0 };

  const recent = history.slice(-3);
  const older = history.slice(0, Math.min(3, history.length - 3));

  if (older.length === 0) return { trend: "stable", trendPercent: 0 };

  const recentAvg = recent.reduce((s, p) => s + p.avgPrice, 0) / recent.length;
  const olderAvg = older.reduce((s, p) => s + p.avgPrice, 0) / older.length;

  const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (Math.abs(percentChange) < 3) return { trend: "stable", trendPercent: 0 };
  return {
    trend: percentChange > 0 ? "up" : "down",
    trendPercent: Math.abs(Math.round(percentChange)),
  };
}

function getEmptyStats(category: string): PriceStats {
  return {
    category,
    avgPrice: 0,
    medianPrice: 0,
    minPrice: 0,
    maxPrice: 0,
    totalListings: 0,
    priceRange: "fair",
    percentile: 50,
    trend: "stable",
    trendPercent: 0,
    priceHistory: [],
  };
}
