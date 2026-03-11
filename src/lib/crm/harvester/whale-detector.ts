/**
 * AHE Phase 3 — Whale Detection System
 * نظام اكتشاف الحيتان (التجار الكبار)
 *
 * مرحلة 5.6 في pipeline الحصاد:
 * بعد كل حصادة — إعادة حساب whale_score للبائعين
 *
 * Whale Score = 0-100:
 *   ▸ is_business: +30 نقطة
 *   ▸ is_verified: +20 نقطة
 *   ▸ has_featured_listings: +20 نقطة
 *   ▸ total_listings > 5: +10
 *   ▸ total_listings > 10: +10
 *   ▸ total_listings > 20: +10
 *
 *   حد التصنيف: Score >= 60 = حوت 🐋
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface WhaleScoreInput {
  is_business: boolean;
  is_verified: boolean;
  has_featured_listings: boolean;
  total_listings_seen: number;
  featured_listings_count?: number;
  elite_listings_count?: number;
}

export interface WhaleScoreResult {
  score: number;
  is_whale: boolean;
  breakdown: {
    business_points: number;
    verified_points: number;
    featured_points: number;
    listings_5_points: number;
    listings_10_points: number;
    listings_20_points: number;
  };
}

export const WHALE_THRESHOLD = 60;

/**
 * حساب whale score بناءً على بيانات البائع
 */
export function calculateWhaleScore(input: WhaleScoreInput): WhaleScoreResult {
  const breakdown = {
    business_points: input.is_business ? 30 : 0,
    verified_points: input.is_verified ? 20 : 0,
    featured_points: input.has_featured_listings ? 20 : 0,
    listings_5_points: input.total_listings_seen > 5 ? 10 : 0,
    listings_10_points: input.total_listings_seen > 10 ? 10 : 0,
    listings_20_points: input.total_listings_seen > 20 ? 10 : 0,
  };

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  return {
    score: Math.min(score, 100),
    is_whale: score >= WHALE_THRESHOLD,
    breakdown,
  };
}

/**
 * تحديث whale_score لبائع واحد في قاعدة البيانات
 */
export async function updateSellerWhaleScore(
  supabase: SupabaseClient,
  sellerId: string
): Promise<WhaleScoreResult | null> {
  // جلب بيانات البائع
  const { data: seller } = await supabase
    .from("ahe_sellers")
    .select("*")
    .eq("id", sellerId)
    .single();

  if (!seller) return null;

  // عدد الإعلانات المميزة
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
    featured_listings_count: featuredCount || 0,
    elite_listings_count: eliteCount || 0,
  });

  const wasWhale = seller.is_whale;

  // تحديث في قاعدة البيانات
  await supabase
    .from("ahe_sellers")
    .update({
      whale_score: result.score,
      is_whale: result.is_whale,
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
 * يُستخدم في Phase 5.6
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

      // تحقق إذا كان حوت جديد
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
