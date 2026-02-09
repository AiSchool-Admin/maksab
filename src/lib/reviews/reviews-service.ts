/**
 * Reviews & Ratings service — handles creating, fetching, and managing seller reviews.
 */

import { supabase } from "@/lib/supabase/client";

export interface Review {
  id: string;
  adId: string;
  reviewerId: string;
  sellerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerAvatar: string | null;
  adTitle: string;
}

export interface SellerRatingsSummary {
  averageRating: number;
  totalReviews: number;
  positiveReviews: number; // 4-5 stars
  distribution: Record<number, number>; // { 1: count, 2: count, ... 5: count }
  isTrustedSeller: boolean;
}

/**
 * Fetch reviews for a specific seller
 */
export async function getSellerReviews(
  sellerId: string,
  limit = 20,
  offset = 0,
): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from("reviews" as never)
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return [];

    const reviews = data as Record<string, unknown>[];

    // Fetch reviewer profiles and ad titles
    const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id as string))];
    const adIds = [...new Set(reviews.map((r) => r.ad_id as string))];

    const [profilesRes, adsRes] = await Promise.all([
      supabase.from("profiles" as never).select("id, display_name, avatar_url").in("id", reviewerIds),
      supabase.from("ads" as never).select("id, title").in("id", adIds),
    ]);

    const profilesMap = new Map<string, { name: string; avatar: string | null }>();
    if (profilesRes.data) {
      for (const p of profilesRes.data as Record<string, unknown>[]) {
        profilesMap.set(p.id as string, {
          name: (p.display_name as string) || "مستخدم",
          avatar: (p.avatar_url as string) || null,
        });
      }
    }

    const adsMap = new Map<string, string>();
    if (adsRes.data) {
      for (const a of adsRes.data as Record<string, unknown>[]) {
        adsMap.set(a.id as string, (a.title as string) || "إعلان");
      }
    }

    return reviews.map((r) => {
      const profile = profilesMap.get(r.reviewer_id as string);
      return {
        id: r.id as string,
        adId: r.ad_id as string,
        reviewerId: r.reviewer_id as string,
        sellerId: r.seller_id as string,
        rating: Number(r.rating),
        comment: (r.comment as string) || null,
        createdAt: r.created_at as string,
        reviewerName: profile?.name || "مستخدم",
        reviewerAvatar: profile?.avatar || null,
        adTitle: adsMap.get(r.ad_id as string) || "إعلان",
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get seller ratings summary
 */
export async function getSellerRatingSummary(sellerId: string): Promise<SellerRatingsSummary> {
  const defaultSummary: SellerRatingsSummary = {
    averageRating: 0,
    totalReviews: 0,
    positiveReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    isTrustedSeller: false,
  };

  try {
    const { data, error } = await supabase
      .from("reviews" as never)
      .select("rating")
      .eq("seller_id", sellerId);

    if (error || !data || (data as unknown[]).length === 0) return defaultSummary;

    const ratings = (data as Record<string, unknown>[]).map((r) => Number(r.rating));
    const total = ratings.length;
    const sum = ratings.reduce((a, b) => a + b, 0);
    const avg = sum / total;
    const positive = ratings.filter((r) => r >= 4).length;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
      distribution[r] = (distribution[r] || 0) + 1;
    }

    return {
      averageRating: Math.round(avg * 10) / 10,
      totalReviews: total,
      positiveReviews: positive,
      distribution,
      isTrustedSeller: positive >= 5,
    };
  } catch {
    return defaultSummary;
  }
}

/**
 * Submit a review for a seller
 */
export async function submitReview(params: {
  adId: string;
  reviewerId: string;
  sellerId: string;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already reviewed
    const { data: existing } = await supabase
      .from("reviews" as never)
      .select("id")
      .eq("ad_id", params.adId)
      .eq("reviewer_id", params.reviewerId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "لقد قمت بتقييم هذا البائع من قبل" };
    }

    // Can't review yourself
    if (params.reviewerId === params.sellerId) {
      return { success: false, error: "لا يمكنك تقييم نفسك" };
    }

    const { error } = await supabase.from("reviews" as never).insert({
      ad_id: params.adId,
      reviewer_id: params.reviewerId,
      seller_id: params.sellerId,
      rating: params.rating,
      comment: params.comment || null,
    } as never);

    if (error) {
      return { success: false, error: "حصل مشكلة، جرب تاني" };
    }

    // Update seller's review counts
    const summary = await getSellerRatingSummary(params.sellerId);
    await supabase
      .from("profiles" as never)
      .update({
        rating: summary.averageRating,
        total_reviews_count: summary.totalReviews,
        positive_reviews_count: summary.positiveReviews,
        is_trusted_seller: summary.isTrustedSeller,
      } as never)
      .eq("id", params.sellerId);

    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة، جرب تاني" };
  }
}

/**
 * Check if a user has already reviewed a seller for a specific ad
 */
export async function hasReviewed(adId: string, reviewerId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("reviews" as never)
      .select("id")
      .eq("ad_id", adId)
      .eq("reviewer_id", reviewerId)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get top-rated sellers in a specific category
 */
export async function getTopSellersByCategory(
  categoryId: string,
  limit = 10,
): Promise<Array<{ id: string; name: string; avatar: string | null; rating: number; reviewsCount: number }>> {
  try {
    // Get sellers with ads in this category
    const { data: adsData } = await supabase
      .from("ads" as never)
      .select("user_id")
      .eq("category_id", categoryId)
      .eq("status", "active");

    if (!adsData || (adsData as unknown[]).length === 0) return [];

    const sellerIds = [...new Set((adsData as Record<string, unknown>[]).map((a) => a.user_id as string))];

    const { data: sellersData } = await supabase
      .from("profiles" as never)
      .select("id, display_name, avatar_url, rating, total_reviews_count")
      .in("id", sellerIds)
      .gt("total_reviews_count", 0)
      .order("rating", { ascending: false })
      .limit(limit);

    if (!sellersData) return [];

    return (sellersData as Record<string, unknown>[]).map((s) => ({
      id: s.id as string,
      name: (s.display_name as string) || "مستخدم",
      avatar: (s.avatar_url as string) || null,
      rating: Number(s.rating) || 0,
      reviewsCount: Number(s.total_reviews_count) || 0,
    }));
  } catch {
    return [];
  }
}
