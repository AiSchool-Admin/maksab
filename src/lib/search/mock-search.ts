/**
 * Search service — queries Supabase for ads.
 * Returns empty results when DB has no data.
 */

import { supabase } from "@/lib/supabase/client";
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

    if (filters.query) {
      query = query.or(
        `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
      );
    }
    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }
    if (filters.subcategory) {
      query = query.eq("subcategory_id", filters.subcategory);
    }
    if (filters.saleType) {
      query = query.eq("sale_type", filters.saleType);
    }
    if (filters.priceMin != null) {
      query = query.gte("price", filters.priceMin);
    }
    if (filters.priceMax != null) {
      query = query.lte("price", filters.priceMax);
    }
    if (filters.governorate) {
      query = query.eq("governorate", filters.governorate);
    }

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

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error || !data || (data as unknown[]).length === 0) {
      return { ads: [], total: 0, hasMore: false };
    }

    const ads = (data as Record<string, unknown>[]).map(rowToMockAd);
    const total = count ?? ads.length;

    return {
      ads,
      total,
      hasMore: from + PAGE_SIZE < total,
    };
  } catch {
    return { ads: [], total: 0, hasMore: false };
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

    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }

    const { data, error } = await query;

    if (error || !data || (data as unknown[]).length === 0) {
      return [];
    }

    return (data as Record<string, unknown>[]).map(rowToMockAd);
  } catch {
    return [];
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
