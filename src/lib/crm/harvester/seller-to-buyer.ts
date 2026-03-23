/**
 * استراتيجية: كل بائع محصود = مشتري محتمل
 *
 * createBuyerFromSeller — ينشئ سجل مشتري من بائع محصود
 * calculateBuyProbability — يصنّف البائع حسب احتمالية الشراء
 *
 * يُستخدم في:
 * 1. engine.ts (Railway — dubizzle)
 * 2. harvest-vercel route (Vercel — opensooq/aqarmap/dowwr)
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ═══ Buy Probability Classification ═══

export interface BuyProbability {
  level: "very_high" | "high" | "medium" | "low" | "unknown";
  score: number;
}

export function calculateBuyProbability(seller: {
  is_business?: boolean;
  is_verified?: boolean;
  total_listings_seen?: number;
}): BuyProbability {
  const listings = seller.total_listings_seen || 1;
  const isBusiness = seller.is_business || false;
  const isVerified = seller.is_verified || false;

  // فرد بإعلان واحد = أكيد بيبيع عشان يشتري جديد
  if (!isBusiness && listings === 1) {
    return { level: "very_high", score: 90 };
  }

  // فرد بـ 2-3 إعلانات = غالباً بيجدّد
  if (!isBusiness && listings <= 3) {
    return { level: "very_high", score: 85 };
  }

  // فرد بـ 4-10 إعلانات = نشط — ممكن بيبيع ويشتري
  if (!isBusiness && listings <= 10) {
    return { level: "high", score: 70 };
  }

  // فرد بأكتر من 10 = غالباً تاجر مش مسجل
  if (!isBusiness && listings > 10) {
    return { level: "medium", score: 50 };
  }

  // تاجر صغير (مش موثق) = يشتري جملة
  if (isBusiness && !isVerified) {
    return { level: "medium", score: 40 };
  }

  // تاجر موثق = بيبيع أكتر ما بيشتري من classifieds
  if (isBusiness && isVerified) {
    return { level: "low", score: 20 };
  }

  return { level: "unknown", score: 30 };
}

// ═══ Create Buyer from Seller ═══

interface SellerInfo {
  id?: string;
  phone?: string | null;
  name?: string | null;
  profile_url?: string | null;
  is_business?: boolean;
  is_verified?: boolean;
  total_listings_seen?: number;
}

interface ListingInfo {
  title?: string | null;
  price?: number | null;
  url?: string | null;
  source_listing_url?: string | null;
}

interface ScopeInfo {
  maksab_category?: string | null;
  governorate?: string | null;
  source_platform?: string;
}

/**
 * ينشئ سجل مشتري محتمل من بائع محصود
 * لا ينشئ duplicates — يتحقق من buyer_phone + source
 */
export async function createBuyerFromSeller(
  supabase: SupabaseClient,
  seller: SellerInfo,
  listing: ListingInfo,
  scope: ScopeInfo | null
): Promise<string> {
  console.log('[SIB] START:', seller?.phone, listing?.title?.substring(0, 30));

  // لازم يكون عنده رقم
  if (!seller.phone) {
    console.log('[SIB] SKIP: no phone');
    return 'skip_no_phone';
  }

  try {
    // لا تنشئ duplicate
    const { data: existing } = await supabase
      .from("bhe_buyers")
      .select("id")
      .eq("source", "seller_is_buyer")
      .eq("buyer_phone", seller.phone)
      .limit(1);

    console.log('[SIB] Duplicate check:', existing && existing.length > 0 ? 'SKIP' : 'NEW');
    if (existing && existing.length > 0) return 'skip_duplicate';

    // تصنيف حسب احتمالية الشراء
    const { level, score: buyerScore } = calculateBuyProbability(seller);

    let buyerTier: string;
    if (buyerScore >= 70) {
      buyerTier = "hot_buyer";
    } else if (buyerScore >= 40) {
      buyerTier = "warm_buyer";
    } else {
      buyerTier = "cold_buyer";
    }

    // المنتج المطلوب = ترقية من المعروض
    let productWanted = listing.title || "";
    const category = scope?.maksab_category || "";

    // ترقية ذكية حسب الفئة (دعم إنجليزي + عربي)
    if (category === "phones" || category === "موبايلات") {
      if (/iphone|آيفون|ايفون/i.test(productWanted)) {
        const modelMatch = productWanted.match(/(\d{1,2})/);
        if (modelMatch) {
          const model = parseInt(modelMatch[1]);
          productWanted = `ترقية من ${productWanted} → آيفون ${model + 1} أو ${model + 2}`;
        }
      } else if (/samsung|سامسونج|جالاكسي/i.test(productWanted)) {
        productWanted = `ترقية من ${productWanted} → موديل أحدث`;
      } else {
        productWanted = `ترقية من ${productWanted}`;
      }
    } else if (category === "vehicles" || category === "سيارات") {
      const yearMatch = productWanted.match(/(20\d{2})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        productWanted = `ترقية من ${productWanted} → موديل ${year + 2}+`;
      } else {
        productWanted = `ترقية من ${productWanted} → سيارة أحدث`;
      }
    } else if (category === "properties" || category === "عقارات") {
      productWanted = `يبحث عن عقار مشابه أو أفضل — كان يعرض: ${productWanted}`;
    } else {
      productWanted = `ترقية من ${productWanted}`;
    }

    const { error } = await supabase.from("bhe_buyers").insert({
      source: "seller_is_buyer",
      source_url: listing.source_listing_url || listing.url || null,
      source_platform: scope?.source_platform || "dubizzle",
      buyer_name: seller.name || null,
      buyer_phone: seller.phone,
      buyer_profile_url: seller.profile_url || null,
      product_wanted: productWanted,
      category: category || null,
      governorate: scope?.governorate || null,
      budget_max: listing.price || null,
      original_text: `بائع ${listing.title || ""} — مشتري محتمل`,
      buyer_tier: buyerTier,
      buyer_score: buyerScore,
      pipeline_status: "phone_found",
    });

    if (error) {
      console.log('[SIB] ERROR:', error.message, error.code);
      return `error: ${error.message}`;
    } else {
      console.log('[SIB] SUCCESS — buyer created');
      return 'created';
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('[SIB] CATCH ERROR:', msg);
    return `catch_error: ${msg}`;
  }
}

/**
 * تحديث buy_probability للبائع
 */
export async function updateSellerBuyProbability(
  supabase: SupabaseClient,
  sellerId: string,
  seller: { is_business?: boolean; is_verified?: boolean; total_listings_seen?: number }
): Promise<void> {
  const { level, score } = calculateBuyProbability(seller);
  await supabase
    .from("ahe_sellers")
    .update({
      buy_probability: level,
      buy_probability_score: score,
    })
    .eq("id", sellerId);
}
