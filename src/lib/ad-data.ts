/**
 * Data layer for ads — queries Supabase for real data.
 * Returns empty results when DB has no data.
 */

import { supabase } from "@/lib/supabase/client";
import { getCategoryById } from "@/lib/categories/categories-config";
import { generateAutoTitle } from "@/lib/categories/generate";

export interface AdSummary {
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
  categoryId?: string;
}

/**
 * Resolve title using category config (Arabic labels instead of English values).
 * Falls back to the stored title if resolution fails.
 */
function resolveTitle(row: Record<string, unknown>): string {
  const storedTitle = row.title as string;
  const categoryId = row.category_id as string | undefined;
  const subcategoryId = row.subcategory_id as string | undefined;
  const categoryFields = (row.category_fields as Record<string, unknown>) ?? {};

  if (!categoryId) return storedTitle;

  const config = getCategoryById(categoryId);
  if (!config) return storedTitle;

  const generated = generateAutoTitle(config, categoryFields, subcategoryId || undefined);
  return generated || storedTitle;
}

/** Convert a Supabase ad row to AdSummary */
function rowToAdSummary(row: Record<string, unknown>): AdSummary {
  const categoryFields = (row.category_fields as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    title: resolveTitle(row),
    price: row.price ? Number(row.price) : null,
    saleType: row.sale_type as AdSummary["saleType"],
    image: ((row.images as string[]) ?? [])[0] ?? null,
    governorate: (row.governorate as string) ?? null,
    city: (row.city as string) ?? null,
    createdAt: row.created_at as string,
    isNegotiable: (row.is_negotiable as boolean) ?? false,
    auctionHighestBid: row.auction_start_price ? Number(row.auction_start_price) : undefined,
    auctionEndsAt: (row.auction_ends_at as string) ?? undefined,
    exchangeDescription: (row.exchange_description as string) ?? undefined,
    isLiveAuction: Boolean(categoryFields.is_live_auction),
    categoryId: (row.category_id as string) ?? undefined,
  };
}

// Empty arrays — no hardcoded data
export const recommendedAds: AdSummary[] = [];
export const auctionAds: AdSummary[] = [];

const PAGE_SIZE = 8;

/**
 * Fetch paginated feed ads from Supabase.
 */
export async function fetchFeedAds(page: number): Promise<{ ads: AdSummary[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    const { data, error } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .not("category_fields", "cs", '{"_type":"buy_request"}')
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !data || (data as unknown[]).length === 0) {
      return { ads: [], hasMore: false };
    }

    const ads = (data as Record<string, unknown>[]).map(rowToAdSummary);
    return { ads, hasMore: ads.length === PAGE_SIZE };
  } catch {
    return { ads: [], hasMore: false };
  }
}

/**
 * Fetch recommended ads from Supabase (latest active ads).
 */
export async function fetchRecommendedAds(): Promise<AdSummary[]> {
  try {
    const { data, error } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .not("category_fields", "cs", '{"_type":"buy_request"}')
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data || (data as unknown[]).length === 0) {
      return [];
    }
    return (data as Record<string, unknown>[]).map(rowToAdSummary);
  } catch {
    return [];
  }
}

/**
 * Fetch active auction ads from Supabase.
 */
export async function fetchAuctionAds(): Promise<AdSummary[]> {
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
    return (data as Record<string, unknown>[]).map(rowToAdSummary);
  } catch {
    return [];
  }
}
