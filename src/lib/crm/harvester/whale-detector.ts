/**
 * AHE — Whale Detection System (V2)
 * نظام تصنيف البائعين — 4 عوامل × نقاط
 *
 * Whale Score = 0-100:
 *   1. إجمالي الإعلانات (0-40): >=50→40, >=20→25, >=10→15, else→5
 *   2. الإعلانات النشطة (0-30): >=20→30, >=10→20, >=5→10, else→3
 *   3. حساب تجاري (0-20): business→20, else→0
 *   4. موثّق (0-10): verified→10, else→0
 *
 * Tiers:
 *   whale (>=70) | big (>=40) | medium (>=20) | small (<20)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type SellerTier = "whale" | "big" | "medium" | "small";

export interface WhaleScoreInput {
  is_business: boolean;
  is_verified: boolean;
  has_featured_listings: boolean;
  total_listings_seen: number;
  active_listings: number;
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
    total_listings_points: number;
    active_listings_points: number;
    business_points: number;
    verified_points: number;
  };
}

export const WHALE_THRESHOLD = 70;

function getTier(score: number): SellerTier {
  if (score >= 70) return "whale";
  if (score >= 40) return "big";
  if (score >= 20) return "medium";
  return "small";
}

function getEstimatedMonthlyValue(score: number): number {
  if (score >= 70) return 999;
  if (score >= 40) return 499;
  if (score >= 20) return 199;
  return 15;
}

/**
 * حساب whale score بناءً على 4 عوامل (V2)
 */
export function calculateWhaleScore(input: WhaleScoreInput): WhaleScoreResult {
  const breakdown = {
    total_listings_points:
      input.total_listings_seen >= 50 ? 40 :
      input.total_listings_seen >= 20 ? 25 :
      input.total_listings_seen >= 10 ? 15 : 5,
    active_listings_points:
      input.active_listings >= 20 ? 30 :
      input.active_listings >= 10 ? 20 :
      input.active_listings >= 5 ? 10 : 3,
    business_points: input.is_business ? 20 : 0,
    verified_points: input.is_verified ? 10 : 0,
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
    active_listings: seller.active_listings || 0,
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
