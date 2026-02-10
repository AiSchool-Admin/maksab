/**
 * Search service — queries Supabase for ads.
 * Falls back to demo data when DB returns no results.
 */

import { supabase } from "@/lib/supabase/client";
import { searchDemoAds, demoAds } from "@/lib/demo/demo-data";
import type { MockAd } from "@/lib/mock-data";

/* ── Search request / response ──────────────────────────────────────── */

export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  saleType?: "cash" | "auction" | "exchange";
  priceMin?: number;
  priceMax?: number;
  governorate?: string;
  condition?: string;
  sortBy?: "newest" | "price_asc" | "price_desc";
  categoryFilters?: Record<string, string>;
}

export interface SearchResult {
  ads: MockAd[];
  total: number;
  hasMore: boolean;
}

const PAGE_SIZE = 12;

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

/** Client-side filtering of demo ads based on search filters */
function filterDemoAds(filters: SearchFilters): MockAd[] {
  let results = filters.query ? searchDemoAds(filters.query) : [...demoAds];

  if (filters.saleType) {
    results = results.filter((ad) => ad.saleType === filters.saleType);
  }
  if (filters.priceMin != null) {
    results = results.filter((ad) => ad.price != null && ad.price >= filters.priceMin!);
  }
  if (filters.priceMax != null) {
    results = results.filter((ad) => ad.price != null && ad.price <= filters.priceMax!);
  }
  if (filters.governorate) {
    results = results.filter((ad) => ad.governorate === filters.governorate);
  }

  // Sort
  if (filters.sortBy === "price_asc") {
    results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  } else if (filters.sortBy === "price_desc") {
    results.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }
  // "newest" is already default order

  return results;
}

/* ── Main search function ───────────────────────────────────────────── */

export async function searchAds(
  filters: SearchFilters,
  page: number = 0,
): Promise<SearchResult> {
  try {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("ads" as never)
      .select("*", { count: "exact" })
      .neq("status", "deleted");

    // Text search
    if (filters.query) {
      query = query.or(
        `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
      );
    }

    // Category filter
    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }

    // Subcategory filter
    if (filters.subcategory) {
      query = query.eq("subcategory_id", filters.subcategory);
    }

    // Sale type filter
    if (filters.saleType) {
      query = query.eq("sale_type", filters.saleType);
    }

    // Price range
    if (filters.priceMin != null) {
      query = query.gte("price", filters.priceMin);
    }
    if (filters.priceMax != null) {
      query = query.lte("price", filters.priceMax);
    }

    // Governorate
    if (filters.governorate) {
      query = query.eq("governorate", filters.governorate);
    }

    // Sorting
    switch (filters.sortBy) {
      case "price_asc":
        query = query.order("price", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false, nullsFirst: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    // Pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error || !data || (data as unknown[]).length === 0) {
      // Fallback to demo data
      const demoResults = filterDemoAds(filters);
      const pageResults = demoResults.slice(from, to + 1);
      return {
        ads: pageResults,
        total: demoResults.length,
        hasMore: to + 1 < demoResults.length,
      };
    }

    const ads = (data as Record<string, unknown>[]).map(rowToMockAd);
    const total = count ?? ads.length;

    return {
      ads,
      total,
      hasMore: from + PAGE_SIZE < total,
    };
  } catch {
    // Network/DB error — use demo data
    const demoResults = filterDemoAds(filters);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const pageResults = demoResults.slice(from, to + 1);
    return {
      ads: pageResults,
      total: demoResults.length,
      hasMore: to + 1 < demoResults.length,
    };
  }
}

/**
 * Get similar/related ads for the "شبيه اللي بتدور عليه" section.
 */
export async function getSimilarSearchAds(
  filters: SearchFilters,
): Promise<MockAd[]> {
  try {
    let query = supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6);

    // Same category but broader search
    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }

    const { data, error } = await query;

    if (error || !data || (data as unknown[]).length === 0) {
      return demoAds.slice(0, 6);
    }

    return (data as Record<string, unknown>[]).map(rowToMockAd);
  } catch {
    return demoAds.slice(0, 6);
  }
}

/** Popular search terms */
export const popularSearches = [
  "تويوتا كورولا",
  "آيفون 15",
  "شقق القاهرة",
  "ذهب عيار 21",
  "سامسونج S24",
  "غسالة توشيبا",
];
