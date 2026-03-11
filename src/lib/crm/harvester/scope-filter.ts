/**
 * AHE Phase 3 — Scope-Level Post-Fetch Filtering
 * فلترة ما بعد الجلب بناءً على معاملات النطاق المتقدمة
 *
 * مرحلة 5.5 في pipeline الحصاد:
 * بعد جلب الإعلانات → فلترة حسب:
 *   ▸ seller_type (تاجر/فرد) مقابل target_seller_type
 *   ▸ listing_type (مميز/إيليت) مقابل target_listing_type
 *   ▸ نطاق السعر (price_min / price_max)
 *   ▸ حالة المنتج (جديد/مستعمل)
 */

import type { AheScope } from "./types";

export interface FilterableListing {
  url: string;
  title: string;
  price: number | null;
  isFeatured: boolean;
  isElite?: boolean;
  listingType?: "regular" | "featured" | "elite";
  isBusiness: boolean;
  isVerified: boolean;
  condition?: string | null;
  sellerWhaleScore?: number;
  [key: string]: unknown;
}

export interface ScopeFilterResult {
  passed: FilterableListing[];
  filtered_out: FilterableListing[];
  stats: {
    total_input: number;
    total_passed: number;
    filtered_by_seller_type: number;
    filtered_by_listing_type: number;
    filtered_by_price: number;
    filtered_by_condition: number;
  };
}

/**
 * فلترة الإعلانات بناءً على معاملات النطاق المتقدمة
 */
export function applyScopeFilters(
  listings: FilterableListing[],
  scope: AheScope
): ScopeFilterResult {
  const stats = {
    total_input: listings.length,
    total_passed: 0,
    filtered_by_seller_type: 0,
    filtered_by_listing_type: 0,
    filtered_by_price: 0,
    filtered_by_condition: 0,
  };

  const passed: FilterableListing[] = [];
  const filtered_out: FilterableListing[] = [];

  for (const listing of listings) {
    let shouldFilter = false;
    let reason = "";

    // 1. فلترة نوع المعلن
    if (scope.target_seller_type && scope.target_seller_type !== "all") {
      const match = matchSellerType(listing, scope.target_seller_type);
      if (!match) {
        shouldFilter = true;
        reason = "seller_type";
        stats.filtered_by_seller_type++;
      }
    }

    // 2. فلترة نوع الإعلان (مميز/إيليت)
    if (!shouldFilter && scope.target_listing_type && scope.target_listing_type !== "all") {
      const match = matchListingType(listing, scope.target_listing_type);
      if (!match) {
        shouldFilter = true;
        reason = "listing_type";
        stats.filtered_by_listing_type++;
      }
    }

    // 3. فلترة نطاق السعر
    if (!shouldFilter && (scope.price_min != null || scope.price_max != null)) {
      if (listing.price != null) {
        if (scope.price_min != null && listing.price < scope.price_min) {
          shouldFilter = true;
          reason = "price_below_min";
          stats.filtered_by_price++;
        }
        if (scope.price_max != null && listing.price > scope.price_max) {
          shouldFilter = true;
          reason = "price_above_max";
          stats.filtered_by_price++;
        }
      }
    }

    // 4. فلترة حالة المنتج
    if (!shouldFilter && scope.product_condition) {
      const match = matchCondition(listing, scope.product_condition);
      if (!match) {
        shouldFilter = true;
        reason = "condition";
        stats.filtered_by_condition++;
      }
    }

    if (shouldFilter) {
      filtered_out.push(listing);
    } else {
      passed.push(listing);
    }
  }

  stats.total_passed = passed.length;

  return { passed, filtered_out, stats };
}

function matchSellerType(
  listing: FilterableListing,
  targetType: string
): boolean {
  switch (targetType) {
    case "business":
      return listing.isBusiness;
    case "individual":
      return !listing.isBusiness;
    case "verified":
      return listing.isVerified;
    case "whales":
      // حيتان = تجار موثقين أو بنتيجة حيتان عالية
      return (
        (listing.isBusiness && listing.isVerified) ||
        (listing.sellerWhaleScore != null && listing.sellerWhaleScore >= 60)
      );
    default:
      return true;
  }
}

function matchListingType(
  listing: FilterableListing,
  targetType: string
): boolean {
  const isFeatured = listing.isFeatured || listing.listingType === "featured";
  const isElite = listing.isElite || listing.listingType === "elite";

  switch (targetType) {
    case "featured":
      return isFeatured;
    case "elite":
      return isElite;
    case "featured_and_elite":
      return isFeatured || isElite;
    default:
      return true;
  }
}

function matchCondition(
  listing: FilterableListing,
  targetCondition: string
): boolean {
  if (!listing.condition) return true; // لا توجد معلومات — نمرر

  const condition = listing.condition.toLowerCase();
  const newKeywords = ["جديد", "new", "متبرشم", "زيرو"];
  const usedKeywords = ["مستعمل", "used", "مستخدم"];

  if (targetCondition === "new") {
    return newKeywords.some((k) => condition.includes(k));
  }
  if (targetCondition === "used") {
    return usedKeywords.some((k) => condition.includes(k));
  }

  return true;
}
