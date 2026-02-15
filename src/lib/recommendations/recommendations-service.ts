/**
 * Recommendations service — AI-powered personalized recommendations.
 * Uses server-side API (/api/recommendations) that calls Supabase RPCs
 * analyzing user_signals for real personalization.
 */

import type { AdSummary } from "@/lib/ad-data";
import type { ExchangeMatch, SellerInsights } from "./types";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface RecommendationResult {
  personalizedAds: AdSummary[];
  matchingAuctions: (AdSummary & {
    matchReason?: string;
    timeRemainingHours?: number | null;
  })[];
  hasSignals: boolean;
}

interface RecommendedAdFromAPI {
  id: string;
  title: string;
  price: number | null;
  saleType: string;
  image: string | null;
  governorate: string | null;
  city: string | null;
  categoryId: string;
  subcategoryId: string;
  createdAt: string;
  isNegotiable: boolean;
  auctionStartPrice?: number;
  auctionBuyNowPrice?: number;
  auctionEndsAt?: string;
  auctionStatus?: string;
  exchangeDescription?: string;
  viewsCount: number;
  favoritesCount: number;
  relevanceScore: number;
  matchReason: string;
  timeRemainingHours?: number | null;
}

/* ── Convert API response to AdSummary format ──────────────────────────────── */

function apiAdToAdSummary(ad: RecommendedAdFromAPI): AdSummary {
  return {
    id: ad.id,
    title: ad.title,
    price: ad.price,
    saleType: ad.saleType as AdSummary["saleType"],
    image: ad.image,
    governorate: ad.governorate,
    city: ad.city,
    createdAt: ad.createdAt,
    isNegotiable: ad.isNegotiable ?? false,
    auctionHighestBid: ad.auctionStartPrice,
    auctionEndsAt: ad.auctionEndsAt,
    exchangeDescription: ad.exchangeDescription,
  };
}

/* ── Get personalized recommendations ─────────────────────────────────── */

export async function getRecommendations(
  userId: string,
  userGovernorate?: string,
): Promise<RecommendationResult> {
  // For unauthenticated users (empty userId), skip API and use direct fallback
  if (!userId) {
    return fallbackRecommendations(userId);
  }

  try {
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        governorate: userGovernorate || null,
        limit: 20,
        auctionLimit: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Recommendations API returned ${response.status}`);
    }

    const data = await response.json();

    const personalizedAds = (data.personalizedAds || []).map(
      (ad: RecommendedAdFromAPI) => apiAdToAdSummary(ad),
    );

    const matchingAuctions = (data.matchingAuctions || []).map(
      (ad: RecommendedAdFromAPI) => ({
        ...apiAdToAdSummary(ad),
        matchReason: ad.matchReason || "",
        timeRemainingHours: ad.timeRemainingHours ?? null,
      }),
    );

    return {
      personalizedAds,
      matchingAuctions,
      hasSignals: data.hasSignals ?? false,
    };
  } catch (err) {
    console.error("Recommendations error:", err);
    return fallbackRecommendations(userId);
  }
}

/** Client-side fallback when API is down */
async function fallbackRecommendations(userId: string): Promise<RecommendationResult> {
  try {
    const { supabase } = await import("@/lib/supabase/client");

    let adsQuery = supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    // Only exclude own ads when userId is a real value (not empty string)
    if (userId) {
      adsQuery = adsQuery.neq("user_id", userId);
    }

    const { data: adsData } = await adsQuery;

    const personalizedAds = adsData && (adsData as unknown[]).length > 0
      ? (adsData as Record<string, unknown>[]).map(rowToAdSummary)
      : [];

    let auctionQuery = supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .eq("sale_type", "auction")
      .order("created_at", { ascending: false })
      .limit(8);

    if (userId) {
      auctionQuery = auctionQuery.neq("user_id", userId);
    }

    const { data: auctionData } = await auctionQuery;

    const matchingAuctions = auctionData && (auctionData as unknown[]).length > 0
      ? (auctionData as Record<string, unknown>[]).map(rowToAdSummary)
      : [];

    return { personalizedAds, matchingAuctions, hasSignals: false };
  } catch {
    return { personalizedAds: [], matchingAuctions: [], hasSignals: false };
  }
}

/** Convert Supabase row to AdSummary */
function rowToAdSummary(row: Record<string, unknown>): AdSummary {
  return {
    id: row.id as string,
    title: row.title as string,
    price: row.price ? Number(row.price) : null,
    saleType: row.sale_type as AdSummary["saleType"],
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

/* ── Exchange matching ────────────────────────────────────────────────── */

export async function findExchangeMatches(
  adTitle: string,
  exchangeDescription: string,
  categoryId: string,
  currentAdId: string,
): Promise<ExchangeMatch[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");

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

export async function getSellerInsights(params: {
  categoryId: string;
  subcategoryId?: string;
  title: string;
  governorate: string;
  brand?: string;
  hasImages: boolean;
}): Promise<SellerInsights> {
  try {
    const response = await fetch("/api/recommendations/seller-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: params.categoryId,
        subcategoryId: params.subcategoryId,
        governorate: params.governorate,
        brand: params.brand,
      }),
    });

    const data = await response.json();

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
      categorySearchers: data.categorySearchers || 0,
      specificSearchers: data.specificSearchers || 0,
      locationInterested: data.locationInterested || 0,
      tips,
    };
  } catch {
    return {
      categorySearchers: 0,
      specificSearchers: 0,
      locationInterested: 0,
      tips: [],
    };
  }
}

/* ── Enhanced similar search ads ──────────────────────────────────────── */

export function getEnhancedSimilarAds(
  _query: string,
  _mainResultIds: Set<string>,
  _category?: string,
): AdSummary[] {
  return [];
}
