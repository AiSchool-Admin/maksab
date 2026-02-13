/**
 * Store Service — CRUD operations for the stores system.
 * Queries Supabase, returns empty results when DB has no data.
 */

import { supabase } from "@/lib/supabase/client";
import type {
  Store,
  StoreWithStats,
  StoreCategory,
  StoreReview,
  StorePromotion,
  StoreSubscription,
  SubscriptionPlan,
} from "@/types";

// Product type for dashboard views
export interface StoreProduct {
  id: string;
  title: string;
  price: number | null;
  images: string[];
  status: string;
  sale_type: string;
  is_pinned: boolean;
  views_count: number;
  created_at: string;
  store_id: string;
  governorate: string | null;
  city: string | null;
  is_negotiable: boolean;
  exchange_description: string | null;
}

// ============================================
// READ Operations (Public)
// ============================================

/** Fetch a store by slug with stats */
export async function getStoreBySlug(
  slug: string,
  currentUserId?: string,
): Promise<StoreWithStats | null> {
  // Decode slug in case it's URL-encoded (Arabic slugs)
  const decodedSlug = decodeURIComponent(slug);

  const { data: store, error } = await supabase
    .from("stores" as never)
    .select("*")
    .eq("slug", decodedSlug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !store) {
    // Fallback: try via API route for server-side fetch (bypasses client RLS edge cases)
    try {
      const res = await fetch(`/api/stores/${encodeURIComponent(decodedSlug)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          total_sales: data.total_sales || 0,
          avg_response_time: data.avg_response_time || null,
          is_following: data.is_following || false,
          badges: data.badges || [],
        } as StoreWithStats;
      }
    } catch {
      // API fallback also failed
    }
    return null;
  }

  const s = store as unknown as Store;

  // Fetch stats separately — errors here should NOT prevent store display
  let totalFollowers = 0;
  let totalReviews = 0;
  let avgRating = 0;
  let totalProducts = 0;
  let isFollowing = false;
  let storeBadges: StoreWithStats["badges"] = [];

  try {
    const [followers, reviews, products, badges, followCheck] = await Promise.all(
      [
        supabase
          .from("store_followers" as never)
          .select("id", { count: "exact", head: true })
          .eq("store_id", s.id),
        supabase
          .from("store_reviews" as never)
          .select("overall_rating")
          .eq("store_id", s.id),
        supabase
          .from("ads" as never)
          .select("id", { count: "exact", head: true })
          .eq("store_id", s.id)
          .eq("status", "active"),
        supabase
          .from("store_badges" as never)
          .select("*")
          .eq("store_id", s.id)
          .eq("is_active", true),
        currentUserId
          ? supabase
              .from("store_followers" as never)
              .select("id")
              .eq("store_id", s.id)
              .eq("user_id", currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ],
    );

    totalFollowers = followers.count || 0;
    totalProducts = products.count || 0;
    isFollowing = !!followCheck.data;
    storeBadges = (badges.data || []) as StoreWithStats["badges"];

    const reviewsData = (reviews.data || []) as { overall_rating: number }[];
    totalReviews = reviewsData.length;
    avgRating =
      reviewsData.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.overall_rating, 0) /
          reviewsData.length
        : 0;
  } catch {
    // Stats failed but store was found — show store with zero stats
  }

  return {
    ...s,
    avg_rating: Math.round(avgRating * 10) / 10,
    total_reviews: totalReviews,
    total_followers: totalFollowers,
    total_products: totalProducts,
    total_sales: 0,
    avg_response_time: null,
    is_following: isFollowing,
    badges: storeBadges,
  };
}

/** Fetch all active stores with optional filters, including stats */
export async function getStores(params?: {
  category?: string;
  governorate?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ stores: StoreWithStats[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const from = (page - 1) * limit;

  try {
    let query = supabase
      .from("stores" as never)
      .select("*", { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (params?.category) {
      query = query.eq("main_category", params.category);
    }
    if (params?.governorate) {
      query = query.eq("location_gov", params.governorate);
    }
    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`);
    }

    const { data, count, error } = await query;

    if (error || !data || data.length === 0) {
      return { stores: [], total: 0 };
    }

    const rawStores = (data || []) as unknown as Store[];

    // Enrich each store with stats
    const storesWithStats: StoreWithStats[] = await Promise.all(
      rawStores.map(async (s) => {
        const [followers, reviews, products] = await Promise.all([
          supabase
            .from("store_followers" as never)
            .select("id", { count: "exact", head: true })
            .eq("store_id", s.id),
          supabase
            .from("store_reviews" as never)
            .select("overall_rating")
            .eq("store_id", s.id),
          supabase
            .from("ads" as never)
            .select("id", { count: "exact", head: true })
            .eq("store_id", s.id)
            .eq("status", "active"),
        ]);

        const reviewsData = (reviews.data || []) as { overall_rating: number }[];
        const avgRating =
          reviewsData.length > 0
            ? reviewsData.reduce((sum, r) => sum + r.overall_rating, 0) /
              reviewsData.length
            : 0;

        return {
          ...s,
          avg_rating: Math.round(avgRating * 10) / 10,
          total_reviews: reviewsData.length,
          total_followers: followers.count || 0,
          total_products: products.count || 0,
          total_sales: 0,
          avg_response_time: null,
          is_following: false,
          badges: [],
        };
      }),
    );

    return {
      stores: storesWithStats,
      total: count || 0,
    };
  } catch {
    return { stores: [], total: 0 };
  }
}

/** Fetch store products (ads) */
export async function getStoreProducts(
  storeId: string,
  params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const from = (page - 1) * limit;

  try {
    let query = supabase
      .from("ads" as never)
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (params?.categoryId) {
      query = query.eq("store_category_id", params.categoryId);
    }

    const { data, count, error } = await query;

    if (error || !data || data.length === 0) {
      return { products: [], total: 0 };
    }

    return {
      products: data || [],
      total: count || 0,
    };
  } catch {
    return { products: [], total: 0 };
  }
}

/** Fetch store categories (internal sections) */
export async function getStoreCategories(
  storeId: string,
): Promise<StoreCategory[]> {
  try {
    const { data, error } = await supabase
      .from("store_categories" as never)
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return [];
    return (data || []) as unknown as StoreCategory[];
  } catch {
    return [];
  }
}

/** Fetch store reviews */
export async function getStoreReviews(
  storeId: string,
  page = 1,
  limit = 10,
): Promise<{ reviews: StoreReview[]; total: number }> {
  const from = (page - 1) * limit;

  try {
    const { data, count, error } = await supabase
      .from("store_reviews" as never)
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error || !data || data.length === 0) {
      return { reviews: [], total: 0 };
    }
    return {
      reviews: (data || []) as unknown as StoreReview[],
      total: count || 0,
    };
  } catch {
    return { reviews: [], total: 0 };
  }
}

/** Fetch store promotions */
export async function getStorePromotions(
  storeId: string,
): Promise<StorePromotion[]> {
  try {
    const { data, error } = await supabase
      .from("store_promotions" as never)
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) return [];
    return (data || []) as unknown as StorePromotion[];
  } catch {
    return [];
  }
}

/** Fetch store analytics (owner only) */
export async function getStoreAnalytics(
  storeId: string,
  days = 30,
) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  try {
    const { data, error } = await supabase
      .from("store_analytics" as never)
      .select("*")
      .eq("store_id", storeId)
      .gte("date", fromDate.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error || !data || data.length === 0) return [];
    return data as unknown as {
      date: string;
      total_views: number;
      unique_visitors: number;
      source_search: number;
      source_direct: number;
      source_followers: number;
      source_product_card: number;
    }[];
  } catch {
    return [];
  }
}

// ============================================
// WRITE Operations
// ============================================

/** Toggle follow/unfollow store */
export async function toggleFollow(
  storeId: string,
  userId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("store_followers" as never)
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("store_followers" as never)
      .delete()
      .eq("store_id", storeId)
      .eq("user_id", userId);
    return false;
  } else {
    await supabase
      .from("store_followers" as never)
      .insert({ store_id: storeId, user_id: userId } as never);
    return true;
  }
}

/** Record a store view for analytics */
export async function recordStoreView(storeId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  await supabase.from("store_analytics" as never).upsert(
    {
      store_id: storeId,
      date: today,
      total_views: 1,
      unique_visitors: 1,
      source_direct: 1,
    } as never,
    { onConflict: "store_id,date" },
  );
}

// ============================================
// SUBSCRIPTION Operations
// ============================================

/** Fetch the active subscription for a store */
export async function getStoreSubscription(
  storeId: string,
): Promise<StoreSubscription | null> {
  try {
    const { data, error } = await supabase
      .from("store_subscriptions" as never)
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as StoreSubscription;
  } catch {
    return null;
  }
}

/** Fetch full subscription history for a store */
export async function getSubscriptionHistory(
  storeId: string,
): Promise<StoreSubscription[]> {
  try {
    const { data, error } = await supabase
      .from("store_subscriptions" as never)
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) return [];
    return (data || []) as unknown as StoreSubscription[];
  } catch {
    return [];
  }
}

/** Get the current plan for a store (defaults to 'free' if none found) */
export async function getCurrentPlan(
  storeId: string,
): Promise<SubscriptionPlan> {
  const sub = await getStoreSubscription(storeId);
  return sub?.plan || "free";
}

// ============================================
// Helpers (for dashboard pages)
// ============================================

/** Get store by user ID — for dashboard pages */
export async function getStoreByUserId(userId: string): Promise<Store | null> {
  try {
    const { data, error } = await supabase
      .from("stores" as never)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as Store;
  } catch {
    return null;
  }
}

/** Get store products for dashboard (includes all statuses) */
export async function getStoreProductsForDashboard(storeId: string): Promise<StoreProduct[]> {
  try {
    // Try with is_pinned first
    const { data, error } = await supabase
      .from("ads" as never)
      .select("id, title, price, images, status, sale_type, is_pinned, views_count, created_at, store_id, governorate, city, is_negotiable, exchange_description")
      .eq("store_id", storeId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as unknown as StoreProduct[];
    }

    // Fallback: query without is_pinned in case column doesn't exist
    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("ads" as never)
        .select("id, title, price, images, status, sale_type, views_count, created_at, store_id, governorate, city, is_negotiable, exchange_description")
        .eq("store_id", storeId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        return (fallbackData as unknown as Record<string, unknown>[]).map((d) => ({
          ...d,
          is_pinned: false,
        })) as unknown as StoreProduct[];
      }
    }

    return [];
  } catch {
    return [];
  }
}
