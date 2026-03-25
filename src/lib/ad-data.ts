/**
 * Data layer for ads — queries Supabase for real data.
 * Returns empty results when DB has no data.
 */

import { supabase } from "@/lib/supabase/client";
import { getCategoryById } from "@/lib/categories/categories-config";
import { generateAutoTitle } from "@/lib/categories/generate";

/** Alexandria MVP: only show cars + properties */
const ACTIVE_CATEGORY_IDS = ["cars", "real_estate"];

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
  useDayPrice?: boolean;
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
    useDayPrice: Boolean(categoryFields.use_day_price),
  };
}

// Empty arrays — no hardcoded data
export const recommendedAds: AdSummary[] = [];
export const auctionAds: AdSummary[] = [];

const PAGE_SIZE = 8;

/** How many hours an ad is considered "new" for the dedicated section */
const NEW_AD_HOURS = 72; // 3 days

/**
 * Fetch "new on Maksab" ads — only ads from the last 72 hours,
 * with category diversity (round-robin across categories),
 * photos prioritized, and sale type mixing.
 */
export async function fetchNewListings(page: number): Promise<{ ads: AdSummary[]; hasMore: boolean; totalNew: number }> {
  const cutoff = new Date(Date.now() - NEW_AD_HOURS * 3600000).toISOString();
  const limit = 60; // fetch a generous batch to allow diversity sorting

  try {
    // Only fetch on first page; subsequent pages draw from the same pool
    if (page > 0) {
      // For pagination, use offset-based approach on the already-diverse set
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("ads" as never)
        .select("*")
        .eq("status", "active")
        .in("category_id", ACTIVE_CATEGORY_IDS)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error || !data || (data as unknown[]).length === 0) {
        return { ads: [], hasMore: false, totalNew: 0 };
      }

      const ads = (data as Record<string, unknown>[]).map(rowToAdSummary);
      return { ads: diversifyAds(ads), hasMore: ads.length === PAGE_SIZE, totalNew: 0 };
    }

    // First page: fetch all recent ads to count and diversify
    const { data, error, count } = await supabase
      .from("ads" as never)
      .select("*", { count: "exact" })
      .eq("status", "active")
      .in("category_id", ACTIVE_CATEGORY_IDS)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data || (data as unknown[]).length === 0) {
      return { ads: [], hasMore: false, totalNew: 0 };
    }

    const allAds = (data as Record<string, unknown>[]).map(rowToAdSummary);
    const totalNew = count ?? allAds.length;

    // Apply diversity: round-robin by category, prioritize ads with photos
    const diverse = diversifyAds(allAds);
    const firstPage = diverse.slice(0, PAGE_SIZE);

    return { ads: firstPage, hasMore: diverse.length > PAGE_SIZE, totalNew };
  } catch {
    return { ads: [], hasMore: false, totalNew: 0 };
  }
}

/**
 * Diversify ads: round-robin across categories, prioritize ads with images,
 * and mix sale types so the feed feels varied and interesting.
 */
function diversifyAds(ads: AdSummary[]): AdSummary[] {
  if (ads.length <= 3) return ads;

  // Group by category
  const byCategory: Record<string, AdSummary[]> = {};
  for (const ad of ads) {
    const cat = ad.categoryId || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(ad);
  }

  // Within each category, sort: ads with images first, then by newest
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => {
      // Images first
      if (a.image && !b.image) return -1;
      if (!a.image && b.image) return 1;
      // Then by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Round-robin across categories (sorted by number of ads desc for fairness)
  const categoryKeys = Object.keys(byCategory).sort(
    (a, b) => byCategory[b].length - byCategory[a].length,
  );
  const pointers: Record<string, number> = {};
  for (const k of categoryKeys) pointers[k] = 0;

  const result: AdSummary[] = [];
  const seen = new Set<string>();
  let lastSaleType = "";
  let sameTypeRun = 0;

  // Keep going until we've placed all ads or run out
  let exhausted = false;
  while (!exhausted) {
    exhausted = true;
    for (const cat of categoryKeys) {
      const catAds = byCategory[cat];
      let ptr = pointers[cat];

      // Find next ad from this category that maintains sale type diversity
      while (ptr < catAds.length) {
        const candidate = catAds[ptr];
        if (seen.has(candidate.id)) {
          ptr++;
          continue;
        }

        // Sale type diversity: avoid more than 3 consecutive same type
        if (candidate.saleType === lastSaleType && sameTypeRun >= 3) {
          // Try to find a different sale type in this category
          let found = false;
          for (let j = ptr + 1; j < catAds.length; j++) {
            if (!seen.has(catAds[j].id) && catAds[j].saleType !== lastSaleType) {
              result.push(catAds[j]);
              seen.add(catAds[j].id);
              lastSaleType = catAds[j].saleType;
              sameTypeRun = 1;
              found = true;
              break;
            }
          }
          if (!found) {
            // Accept the same type if no alternative
            result.push(candidate);
            seen.add(candidate.id);
            sameTypeRun++;
          }
        } else {
          if (candidate.saleType === lastSaleType) {
            sameTypeRun++;
          } else {
            lastSaleType = candidate.saleType;
            sameTypeRun = 1;
          }
          result.push(candidate);
          seen.add(candidate.id);
        }

        ptr++;
        pointers[cat] = ptr;
        exhausted = false;
        break;
      }
    }
  }

  return result;
}

/**
 * Check if an ad is "very fresh" (less than 24 hours old).
 */
export function isVeryFreshAd(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 3600000;
}

/**
 * Fetch paginated feed ads from Supabase (all active, for the general feed below "new" section).
 */
export async function fetchFeedAds(page: number): Promise<{ ads: AdSummary[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    const { data, error } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .in("category_id", ACTIVE_CATEGORY_IDS)
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
      .in("category_id", ACTIVE_CATEGORY_IDS)
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
      .in("category_id", ACTIVE_CATEGORY_IDS)
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
