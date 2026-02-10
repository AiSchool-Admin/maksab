/**
 * Data layer for ads — queries Supabase for real data.
 * Falls back to demo data when DB is empty or demo mode is active.
 * Keeps the MockAd interface for backward compatibility with components.
 */

import { supabase } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo/demo-mode";
import { demoAds, getDemoAuctionAds } from "@/lib/demo/demo-data";

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

// Empty arrays — no more hardcoded mock data
export const recommendedAds: MockAd[] = [];
export const auctionAds: MockAd[] = [];

const PAGE_SIZE = 8;

/**
 * Fetch paginated feed ads from Supabase.
 * Falls back to demo ads when DB is empty or in demo mode.
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
      // Fall back to demo ads
      const allAds = demoAds;
      const pageAds = allAds.slice(from, to + 1);
      return { ads: pageAds, hasMore: to + 1 < allAds.length };
    }

    const ads = (data as Record<string, unknown>[]).map(rowToMockAd);

    // If DB has some data but also in demo mode, merge demo ads
    if (isDemoMode() && page === 0) {
      const merged = [...ads, ...demoAds.filter(d => !ads.some(a => a.id === d.id))];
      return { ads: merged.slice(0, PAGE_SIZE), hasMore: true };
    }

    return { ads, hasMore: ads.length === PAGE_SIZE };
  } catch {
    // Network error or DB issue — use demo data
    const allAds = demoAds;
    const pageAds = allAds.slice(from, to + 1);
    return { ads: pageAds, hasMore: to + 1 < allAds.length };
  }
}

/**
 * Fetch recommended ads from Supabase (latest active ads as fallback).
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
      // Return a mix of demo ads
      return demoAds.slice(0, 10);
    }
    return (data as Record<string, unknown>[]).map(rowToMockAd);
  } catch {
    return demoAds.slice(0, 10);
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
      return getDemoAuctionAds();
    }
    return (data as Record<string, unknown>[]).map(rowToMockAd);
  } catch {
    return getDemoAuctionAds();
  }
}
