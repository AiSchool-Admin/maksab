/**
 * Ad detail data layer — fetches from Supabase.
 */

import { supabase } from "@/lib/supabase/client";
import type { AdSummary } from "./ad-data";
import type { AuctionStatus } from "./auction/types";

export interface BidInfo {
  id: string;
  bidderName: string;
  amount: number;
  createdAt: string;
}

export interface SellerInfo {
  id: string;
  displayName: string;
  phone: string;
  avatarUrl: string | null;
  memberSince: string;
  totalAds: number;
  rating: number;
}

export interface AdDetail {
  id: string;
  title: string;
  description: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  isNegotiable: boolean;
  images: string[];
  categoryId: string;
  subcategoryId: string;
  categoryFields: Record<string, unknown>;
  governorate: string;
  city: string | null;
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
  // Auction
  auctionStartPrice: number | null;
  auctionBuyNowPrice: number | null;
  auctionEndsAt: string | null;
  auctionHighestBid: number | null;
  auctionHighestBidderId: string | null;
  auctionHighestBidderName: string | null;
  auctionBidsCount: number;
  auctionMinIncrement: number;
  auctionStatus: AuctionStatus | null;
  auctionWinnerId: string | null;
  auctionWinnerName: string | null;
  bids: BidInfo[];
  // Exchange
  exchangeDescription: string | null;
  exchangeAcceptsPriceDiff: boolean;
  exchangePriceDiff: number | null;
  // Seller
  seller: SellerInfo;
  // Favorite state
  isFavorited: boolean;
}

/**
 * Fetch ad detail by ID from Supabase.
 */
export async function fetchAdDetail(id: string): Promise<AdDetail | null> {
  try {
    // Fetch the ad
    const { data: adData, error: adError } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (adError || !adData) return null;

    const ad = adData as Record<string, unknown>;

    // Fetch seller profile
    let seller: SellerInfo = {
      id: ad.user_id as string,
      displayName: "مستخدم",
      phone: "",
      avatarUrl: null,
      memberSince: ad.created_at as string,
      totalAds: 0,
      rating: 0,
    };

    if (ad.user_id) {
      const { data: profileData } = await supabase
        .from("profiles" as never)
        .select("*")
        .eq("id", ad.user_id)
        .maybeSingle();

      if (profileData) {
        const profile = profileData as Record<string, unknown>;
        seller = {
          id: profile.id as string,
          displayName: (profile.display_name as string) || "مستخدم",
          phone: (profile.phone as string) || "",
          avatarUrl: (profile.avatar_url as string) || null,
          memberSince: (profile.created_at as string) || ad.created_at as string,
          totalAds: Number(profile.total_ads_count) || 0,
          rating: Number(profile.rating) || 0,
        };
      }
    }

    // Fetch auction bids if auction
    let bids: BidInfo[] = [];
    let highestBid: number | null = null;
    let highestBidderName: string | null = null;
    let highestBidderId: string | null = null;

    if (ad.sale_type === "auction") {
      const { data: bidsData } = await supabase
        .from("auction_bids" as never)
        .select("*")
        .eq("ad_id", id)
        .order("amount", { ascending: false })
        .limit(20);

      if (bidsData && (bidsData as unknown[]).length > 0) {
        bids = (bidsData as Record<string, unknown>[]).map((b) => ({
          id: b.id as string,
          bidderName: "مزايد",
          amount: Number(b.amount),
          createdAt: b.created_at as string,
        }));
        highestBid = bids[0].amount;
        highestBidderId = (bidsData as Record<string, unknown>[])[0].bidder_id as string;
        highestBidderName = bids[0].bidderName;
      }
    }

    return {
      id: ad.id as string,
      title: ad.title as string,
      description: (ad.description as string) || "",
      price: ad.price ? Number(ad.price) : null,
      saleType: ad.sale_type as "cash" | "auction" | "exchange",
      isNegotiable: (ad.is_negotiable as boolean) || false,
      images: (ad.images as string[]) || [],
      categoryId: (ad.category_id as string) || "",
      subcategoryId: (ad.subcategory_id as string) || "",
      categoryFields: (ad.category_fields as Record<string, unknown>) || {},
      governorate: (ad.governorate as string) || "",
      city: (ad.city as string) || null,
      viewsCount: Number(ad.views_count) || 0,
      favoritesCount: Number(ad.favorites_count) || 0,
      createdAt: ad.created_at as string,
      // Auction
      auctionStartPrice: ad.auction_start_price ? Number(ad.auction_start_price) : null,
      auctionBuyNowPrice: ad.auction_buy_now_price ? Number(ad.auction_buy_now_price) : null,
      auctionEndsAt: (ad.auction_ends_at as string) || null,
      auctionHighestBid: highestBid,
      auctionHighestBidderId: highestBidderId,
      auctionHighestBidderName: highestBidderName,
      auctionBidsCount: bids.length,
      auctionMinIncrement: Number(ad.auction_min_increment) || 50,
      auctionStatus: (ad.auction_status as AuctionStatus) || null,
      auctionWinnerId: (ad.auction_winner_id as string) || null,
      auctionWinnerName: null,
      bids,
      // Exchange
      exchangeDescription: (ad.exchange_description as string) || null,
      exchangeAcceptsPriceDiff: (ad.exchange_accepts_price_diff as boolean) || false,
      exchangePriceDiff: ad.exchange_price_diff ? Number(ad.exchange_price_diff) : null,
      // Seller
      seller,
      // Favorite
      isFavorited: false,
    };
  } catch {
    return null;
  }
}

/** Get similar ads for the detail page bottom section */
export async function getSimilarAds(currentId: string, categoryId?: string): Promise<AdSummary[]> {
  try {
    let query = supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .neq("id", currentId)
      .order("created_at", { ascending: false })
      .limit(6);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error || !data || (data as unknown[]).length === 0) {
      return [];
    }

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      title: row.title as string,
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
    }));
  } catch {
    return [];
  }
}
