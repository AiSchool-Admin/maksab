/**
 * Data layer for ads — queries Supabase for real data.
 * Returns empty results when DB has no data.
 */

import { supabase } from "@/lib/supabase/client";

export interface MockAd {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  image: string | null;
  governorate: string | null;
  city: string | null;
  createdAt: string;
  isNegotiable?: boolean;
  auctionHighestBid?: number;
  auctionEndsAt?: string;
  auctionBidsCount?: number;
  exchangeDescription?: string;
  isFavorited?: boolean;
  isLiveAuction?: boolean;
}

/** Convert a Supabase ad row to MockAd */
function rowToMockAd(row: Record<string, unknown>): MockAd {
  const categoryFields = (row.category_fields as Record<string, unknown>) ?? {};
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
    isLiveAuction: Boolean(categoryFields.is_live_auction),
  };
}

// Empty arrays — no hardcoded data
export const recommendedAds: MockAd[] = [];
export const auctionAds: MockAd[] = [];

const PAGE_SIZE = 8;

/**
 * Fetch paginated feed ads from Supabase.
 */
export async function fetchFeedAds(page: number): Promise<{ ads: MockAd[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    const { data, error } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !data || (data as unknown[]).length === 0) {
      return { ads: [], hasMore: false };
    }

    const ads = (data as Record<string, unknown>[]).map(rowToMockAd);
    return { ads, hasMore: ads.length === PAGE_SIZE };
  } catch {
    return { ads: [], hasMore: false };
  }
}

/**
 * Fetch recommended ads from Supabase (latest active ads).
 */
export async function fetchRecommendedAds(): Promise<MockAd[]> {
  try {
    const { data, error } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data || (data as unknown[]).length === 0) {
      return [];
    }
    return (data as Record<string, unknown>[]).map(rowToMockAd);
  } catch {
    return [];
  }
}

/**
 * Fetch active auction ads from Supabase.
 */
export async function fetchAuctionAds(): Promise<MockAd[]> {
  try {
    const { data, error } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .eq("sale_type", "auction")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error || !data || (data as unknown[]).length === 0) {
      return [];
    }
    return (data as Record<string, unknown>[]).map(rowToMockAd);
  } catch {
    return [];
  }
}
