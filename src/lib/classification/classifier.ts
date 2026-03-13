/**
 * نظام تصنيف العملاء — Customer Classification Engine
 * 7 شرائح من الحوت 🐋 للبدون رقم 👻
 *
 * يُستخدم بعد كل حصادة + enrichment + يومياً كـ cron
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ═══ Types ═══

export type SellerTier =
  | "whale"
  | "premium_merchant"
  | "regular_merchant"
  | "verified_seller"
  | "active_seller"
  | "new_seller"
  | "no_phone"
  | "unknown";

export interface TierInfo {
  tier: SellerTier;
  value: number;       // القيمة الشهرية المتوقعة بالجنيه
  priority: number;    // أولوية التواصل (0-100)
  emoji: string;
  label: string;       // الاسم بالعربي
}

export interface SellerInput {
  phone: string | null;
  whale_score: number;
  is_business: boolean;
  is_verified: boolean;
  has_featured_listings: boolean;
  total_listings_seen: number;
}

// ═══ Tier Config ═══

export const TIER_CONFIG: Record<SellerTier, Omit<TierInfo, "tier">> = {
  whale:             { value: 999, priority: 100, emoji: "🐋", label: "حوت" },
  premium_merchant:  { value: 499, priority: 80,  emoji: "🏪", label: "تاجر مميز" },
  regular_merchant:  { value: 199, priority: 60,  emoji: "🏬", label: "تاجر عادي" },
  verified_seller:   { value: 20,  priority: 50,  emoji: "✅", label: "بائع موثق" },
  active_seller:     { value: 12,  priority: 30,  emoji: "👤", label: "بائع نشط" },
  new_seller:        { value: 5,   priority: 10,  emoji: "👤", label: "بائع جديد" },
  no_phone:          { value: 0,   priority: 0,   emoji: "👻", label: "بدون رقم" },
  unknown:           { value: 0,   priority: 0,   emoji: "❓", label: "غير مصنّف" },
};

// ═══ Core Classification Function ═══

export function classifySeller(seller: SellerInput): TierInfo {
  // الشريحة 7: بدون رقم
  if (!seller.phone) {
    return { tier: "no_phone", ...TIER_CONFIG.no_phone };
  }

  // الشريحة 1: حوت
  if (seller.whale_score >= 60) {
    return { tier: "whale", ...TIER_CONFIG.whale };
  }

  // الشريحة 2: تاجر مميز
  if (
    seller.is_business &&
    (seller.is_verified || seller.has_featured_listings) &&
    seller.total_listings_seen >= 5
  ) {
    return { tier: "premium_merchant", ...TIER_CONFIG.premium_merchant };
  }

  // الشريحة 3: تاجر عادي
  if (seller.is_business && seller.total_listings_seen >= 2) {
    return { tier: "regular_merchant", ...TIER_CONFIG.regular_merchant };
  }

  // الشريحة 4: بائع موثق
  if (seller.is_verified && seller.total_listings_seen >= 2) {
    return { tier: "verified_seller", ...TIER_CONFIG.verified_seller };
  }

  // الشريحة 5: بائع نشط
  if (seller.total_listings_seen >= 2) {
    return { tier: "active_seller", ...TIER_CONFIG.active_seller };
  }

  // الشريحة 6: بائع جديد
  return { tier: "new_seller", ...TIER_CONFIG.new_seller };
}

// ═══ DB Operations ═══

/**
 * تصنيف بائع واحد وتحديث قاعدة البيانات
 */
export async function classifyAndUpdateSeller(
  supabase: SupabaseClient,
  sellerId: string
): Promise<TierInfo | null> {
  const { data: seller } = await supabase
    .from("ahe_sellers")
    .select("phone, whale_score, is_business, is_verified, has_featured_listings, total_listings_seen")
    .eq("id", sellerId)
    .single();

  if (!seller) return null;

  const tierInfo = classifySeller(seller);

  await supabase
    .from("ahe_sellers")
    .update({
      seller_tier: tierInfo.tier,
      estimated_monthly_value: tierInfo.value,
      seller_tier_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sellerId);

  // مزامنة مع CRM لو موجود
  const { data: sellerData } = await supabase
    .from("ahe_sellers")
    .select("crm_customer_id")
    .eq("id", sellerId)
    .single();

  if (sellerData?.crm_customer_id) {
    await supabase
      .from("crm_customers")
      .update({
        seller_tier: tierInfo.tier,
        estimated_monthly_value: tierInfo.value,
      })
      .eq("id", sellerData.crm_customer_id);
  }

  return tierInfo;
}

/**
 * تصنيف مجموعة من البائعين بعد حصادة
 * يُستخدم في Phase 5.7 من engine.ts
 */
export async function classifySellersAfterHarvest(
  supabase: SupabaseClient,
  sellerIds: string[]
): Promise<{
  total_classified: number;
  by_tier: Record<string, number>;
}> {
  const byTier: Record<string, number> = {};
  let totalClassified = 0;

  for (const sellerId of sellerIds) {
    const result = await classifyAndUpdateSeller(supabase, sellerId);
    if (result) {
      totalClassified++;
      byTier[result.tier] = (byTier[result.tier] || 0) + 1;
    }
  }

  return { total_classified: totalClassified, by_tier: byTier };
}

/**
 * الحصول على توزيع الشرائح لاستخدامه في Dashboard
 */
export async function getTierDistribution(
  supabase: SupabaseClient
): Promise<{
  tiers: Array<{
    tier: SellerTier;
    emoji: string;
    label: string;
    count: number;
    percentage: number;
    total_value: number;
  }>;
  total_sellers: number;
  total_monthly_value: number;
}> {
  const { data, error } = await supabase
    .from("ahe_sellers")
    .select("seller_tier, estimated_monthly_value");

  if (error || !data) {
    return { tiers: [], total_sellers: 0, total_monthly_value: 0 };
  }

  const tierCounts: Record<string, { count: number; total_value: number }> = {};
  const totalSellers = data.length;

  for (const seller of data) {
    const tier = seller.seller_tier || "unknown";
    if (!tierCounts[tier]) {
      tierCounts[tier] = { count: 0, total_value: 0 };
    }
    tierCounts[tier].count++;
    tierCounts[tier].total_value += seller.estimated_monthly_value || 0;
  }

  // ترتيب الشرائح حسب الأولوية
  const orderedTiers: SellerTier[] = [
    "whale",
    "premium_merchant",
    "regular_merchant",
    "verified_seller",
    "active_seller",
    "new_seller",
    "no_phone",
    "unknown",
  ];

  const tiers = orderedTiers
    .filter((tier) => tierCounts[tier])
    .map((tier) => ({
      tier,
      emoji: TIER_CONFIG[tier].emoji,
      label: TIER_CONFIG[tier].label,
      count: tierCounts[tier].count,
      percentage: totalSellers > 0
        ? Math.round((tierCounts[tier].count / totalSellers) * 100)
        : 0,
      total_value: tierCounts[tier].total_value,
    }));

  const totalMonthlyValue = Object.values(tierCounts).reduce(
    (sum, t) => sum + t.total_value,
    0
  );

  return {
    tiers,
    total_sellers: totalSellers,
    total_monthly_value: totalMonthlyValue,
  };
}
