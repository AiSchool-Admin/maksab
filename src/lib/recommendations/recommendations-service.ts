/**
 * Recommendations service — fetches from Supabase.
 * No more mock data — returns real data or empty arrays.
 */

import { supabase } from "@/lib/supabase/client";
import type { MockAd } from "@/lib/mock-data";
import type { ExchangeMatch, SellerInsights } from "./types";

/* ── Get personalized recommendations ─────────────────────────────────── */

export interface RecommendationResult {
  personalizedAds: MockAd[];
  matchingAuctions: MockAd[];
  hasSignals: boolean;
}

/** Convert Supabase row to MockAd */
function rowToMockAd(row: Record<string, unknown>): MockAd {
  return {
    id: row.id as string,
    title: row.title as string,
    price: row.price ? Number(row.price) : null,
    saleType: row.sale_type as MockAd["saleType"],
    image: ((row.images as string[]) ?? [])[0] ?? null,
    governorate: (row.governorate as string) ?? null,
    city: (row.city as string) ?? null,
    createdAt: row.created_at as string,
    isNegotiable: (row.is_negotiable as boolean) ?? false,
    auctionHighestBid: row.auction_start_price ? Number(row.auction_start_price) : undefined,
    auctionEndsAt: (row.auction_ends_at as string) ?? undefined,
    exchangeDescription: (row.exchange_description as string) ?? undefined,
  };
}

/**
 * Fetch personalized recommendations.
 * Returns latest active ads as personalized, and active auctions.
 */
export async function getRecommendations(
  userId: string,
  userGovernorate?: string,
): Promise<RecommendationResult> {
  try {
    // Fetch latest active ads for personalized section
    const { data: adsData } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    const personalizedAds = adsData
      ? (adsData as Record<string, unknown>[]).map(rowToMockAd)
      : [];

    // Fetch active auctions
    const { data: auctionData } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .eq("sale_type", "auction")
      .order("created_at", { ascending: false })
      .limit(8);

    const matchingAuctions = auctionData
      ? (auctionData as Record<string, unknown>[]).map(rowToMockAd)
      : [];

    return {
      personalizedAds,
      matchingAuctions,
      hasSignals: false,
    };
  } catch {
    return { personalizedAds: [], matchingAuctions: [], hasSignals: false };
  }
}

/* ── Exchange matching ────────────────────────────────────────────────── */

/**
 * Find matching ads for exchange.
 */
export async function findExchangeMatches(
  adTitle: string,
  exchangeDescription: string,
  categoryId: string,
  currentAdId: string,
): Promise<ExchangeMatch[]> {
  try {
    // Search for ads that might match what the user wants
    const { data } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .neq("id", currentAdId)
      .or(`title.ilike.%${exchangeDescription}%,exchange_description.ilike.%${adTitle}%`)
      .limit(6);

    if (!data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
      adId: row.id as string,
      title: row.title as string,
      saleType: row.sale_type as "cash" | "auction" | "exchange",
      price: row.price ? Number(row.price) : null,
      exchangeDescription: (row.exchange_description as string) || null,
      governorate: (row.governorate as string) || null,
      city: (row.city as string) || null,
      matchType: row.sale_type === "exchange" ? "perfect" as const : "partial" as const,
      matchReason: row.sale_type === "exchange"
        ? "ممكن يناسبك للتبديل"
        : "بيبيع اللي أنت عايزه",
    }));
  } catch {
    return [];
  }
}

/* ── Seller insights ──────────────────────────────────────────────────── */

/**
 * Calculate seller insights after publishing an ad.
 */
export async function getSellerInsights(params: {
  categoryId: string;
  title: string;
  governorate: string;
  hasImages: boolean;
}): Promise<SellerInsights> {
  // Return basic tips without mock numbers
  const tips: string[] = [];
  if (!params.hasImages) {
    tips.push("أضف صور لزيادة المشاهدات بنسبة 3x");
  }

  const categoryTips: Record<string, string> = {
    cars: "أضف صورة للعداد والموتور — دي أكتر حاجة الناس بتسأل عنها",
    phones: "اذكر حالة البطارية — دي بتفرق كتير في السعر",
    real_estate: "أضف صور للمطبخ والحمام — الناس عايزة تشوف التفاصيل",
    gold: "صور واضحة للدمغة بتزود الثقة",
  };
  if (categoryTips[params.categoryId]) {
    tips.push(categoryTips[params.categoryId]);
  }

  return {
    categorySearchers: 0,
    specificSearchers: 0,
    locationInterested: 0,
    tips,
  };
}

/* ── Enhanced similar search ads ──────────────────────────────────────── */

/**
 * Enhanced "شبيه اللي بتدور عليه" — returns related ads from Supabase.
 */
export function getEnhancedSimilarAds(
  query: string,
  mainResultIds: Set<string>,
  category?: string,
): MockAd[] {
  // This is now handled by getSimilarSearchAds in search service
  // Return empty to avoid showing mock data
  return [];
}
