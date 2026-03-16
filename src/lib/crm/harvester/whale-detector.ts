/**
 * AHE — Whale Detection System (v2)
 * نظام تصنيف البائعين — 5 عوامل × نقاط
 *
 * Whale Score = 0-75:
 *   1. الفئة (0-30): vehicles=30, properties=25, phones=15, electronics/furniture=10, else=5
 *   2. عدد الإعلانات (0-20): >=10→20, >=5→15, >=2→10, else→5
 *   3. نوع الحساب (0-15): business+verified=15, business=10, verified=5, else=0
 *   4. الرقم (0-10): phone→10, else→0
 *
 * Tiers:
 *   whale (>=60) | big_fish (>=45) | regular (>=30) | small_fish (>=15) | visitor (<15)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type SellerTier = "whale" | "big_fish" | "regular" | "small_fish" | "visitor";

export interface WhaleScoreInput {
  is_business: boolean;
  is_verified: boolean;
  has_featured_listings: boolean;
  total_listings_seen: number;
  primary_category?: string | null;
  phone?: string | null;
  featured_listings_count?: number;
  elite_listings_count?: number;
}

export interface WhaleScoreResult {
  score: number;
  tier: SellerTier;
  is_whale: boolean;
  estimated_monthly_value: number;
  breakdown: {
    category_points: number;
    listings_points: number;
    account_type_points: number;
    phone_points: number;
  };
}

export const WHALE_THRESHOLD = 60;

const CATEGORY_SCORES: Record<string, number> = {
  vehicles: 30,
  properties: 25,
  phones: 15,
  electronics: 10,
  furniture: 10,
};

function getTier(score: number): SellerTier {
  if (score >= 60) return "whale";
  if (score >= 45) return "big_fish";
  if (score >= 30) return "regular";
  if (score >= 15) return "small_fish";
  return "visitor";
}

function getEstimatedMonthlyValue(score: number): number {
  if (score >= 60) return 999;
  if (score >= 45) return 499;
  if (score >= 30) return 199;
  if (score >= 15) return 15;
  return 0;
}

/**
 * حساب whale score بناءً على 5 عوامل
 */
export function calculateWhaleScore(input: WhaleScoreInput): WhaleScoreResult {
  const category = input.primary_category || "";

  const breakdown = {
    category_points: CATEGORY_SCORES[category] || 5,
    listings_points:
      input.total_listings_seen >= 10 ? 20 :
      input.total_listings_seen >= 5 ? 15 :
      input.total_listings_seen >= 2 ? 10 : 5,
    account_type_points:
      input.is_business && input.is_verified ? 15 :
      input.is_business ? 10 :
      input.is_verified ? 5 : 0,
    phone_points: input.phone ? 10 : 0,
  };

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const tier = getTier(score);

  return {
    score,
    tier,
    is_whale: score >= WHALE_THRESHOLD,
    estimated_monthly_value: getEstimatedMonthlyValue(score),
    breakdown,
  };
}

/**
 * تحديث whale_score + seller_tier لبائع واحد
 */
export async function updateSellerWhaleScore(
  supabase: SupabaseClient,
  sellerId: string
): Promise<WhaleScoreResult | null> {
  const { data: seller } = await supabase
    .from("ahe_sellers")
    .select("*")
    .eq("id", sellerId)
    .single();

  if (!seller) return null;

  const { count: featuredCount } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .eq("ahe_seller_id", sellerId)
    .eq("is_featured", true);

  const { count: eliteCount } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .eq("ahe_seller_id", sellerId)
    .eq("is_elite", true);

  const result = calculateWhaleScore({
    is_business: seller.is_business,
    is_verified: seller.is_verified,
    has_featured_listings: (featuredCount || 0) > 0 || (eliteCount || 0) > 0,
    total_listings_seen: seller.total_listings_seen,
    primary_category: seller.primary_category,
    phone: seller.phone,
    featured_listings_count: featuredCount || 0,
    elite_listings_count: eliteCount || 0,
  });

  const wasWhale = seller.is_whale;

  await supabase
    .from("ahe_sellers")
    .update({
      whale_score: result.score,
      is_whale: result.is_whale,
      seller_tier: result.tier,
      estimated_monthly_value: result.estimated_monthly_value,
      whale_detected_at:
        result.is_whale && !wasWhale
          ? new Date().toISOString()
          : seller.whale_detected_at,
      has_featured_listings: (featuredCount || 0) > 0,
      has_elite_listings: (eliteCount || 0) > 0,
      featured_listings_count: featuredCount || 0,
      elite_listings_count: eliteCount || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sellerId);

  return result;
}

/**
 * تحديث whale_score لكل البائعين المتأثرين بعد حصادة
 */
export async function updateWhaleScoresAfterHarvest(
  supabase: SupabaseClient,
  sellerIds: string[]
): Promise<{
  total_processed: number;
  new_whales: number;
  total_whales: number;
}> {
  let newWhales = 0;
  let totalWhales = 0;

  for (const sellerId of sellerIds) {
    const result = await updateSellerWhaleScore(supabase, sellerId);
    if (result) {
      if (result.is_whale) totalWhales++;

      const { data: seller } = await supabase
        .from("ahe_sellers")
        .select("whale_detected_at, created_at")
        .eq("id", sellerId)
        .single();

      if (seller && result.is_whale) {
        const detectedAt = new Date(seller.whale_detected_at || seller.created_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (detectedAt > fiveMinutesAgo) {
          newWhales++;
        }
      }
    }
  }

  return {
    total_processed: sellerIds.length,
    new_whales: newWhales,
    total_whales: totalWhales,
  };
}
