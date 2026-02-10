/**
 * Auction service — handles bidding, anti-sniping, buy now,
 * and Supabase Realtime subscriptions.
 *
 * Uses API routes + Supabase Realtime.
 */

import { supabase } from "@/lib/supabase/client";
import type { AuctionState, AuctionBid, AuctionStatus } from "./types";

/* ── Place a bid ────────────────────────────────────────────────────── */

export interface PlaceBidResult {
  success: boolean;
  error?: string;
  updatedState?: AuctionState;
  antiSnipeExtended?: boolean;
}

export async function placeBid(
  adId: string,
  bidderId: string,
  bidderName: string,
  amount: number,
): Promise<PlaceBidResult> {
  return placeBidImpl(adId, bidderId, bidderName, amount);
}

async function placeBidImpl(
  adId: string,
  bidderId: string,
  bidderName: string,
  amount: number,
): Promise<PlaceBidResult> {
  try {
    const res = await fetch("/api/auctions/bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_id: adId,
        bidder_id: bidderId,
        bidder_name: bidderName,
        amount,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "حصل مشكلة في المزايدة. جرب تاني",
      };
    }

    return {
      success: true,
      updatedState: data.auctionState as AuctionState,
      antiSnipeExtended: data.antiSnipeExtended,
    };
  } catch {
    return { success: false, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/* ── Buy now ────────────────────────────────────────────────────────── */

export interface BuyNowResult {
  success: boolean;
  error?: string;
  updatedState?: AuctionState;
}

export async function buyNow(
  adId: string,
  buyerId: string,
  buyerName: string,
): Promise<BuyNowResult> {
  return buyNowImpl(adId, buyerId, buyerName);
}

async function buyNowImpl(
  adId: string,
  buyerId: string,
  buyerName: string,
): Promise<BuyNowResult> {
  try {
    const res = await fetch("/api/auctions/buy-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_id: adId,
        buyer_id: buyerId,
        buyer_name: buyerName,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "حصل مشكلة. جرب تاني",
      };
    }

    return {
      success: true,
      updatedState: data.auctionState as AuctionState,
    };
  } catch {
    return { success: false, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/* ── Check and finalize ended auctions ──────────────────────────────── */

export async function checkAuctionEnd(adId: string): Promise<AuctionState | null> {
  return fetchAuctionState(adId);
}

/* ── Real-time subscriptions ────────────────────────────────────────── */

export type AuctionUnsubscribe = () => void;

/**
 * Subscribe to real-time auction updates.
 * In dev mode: uses in-memory pub/sub.
 * In production: uses Supabase Realtime on auction_bids table.
 */
export function subscribeToAuction(
  adId: string,
  onUpdate: (state: AuctionState) => void,
): AuctionUnsubscribe {
  // Subscribe to Supabase Realtime
  const channel = supabase
    .channel(`auction-${adId}`)
    .on(
      "postgres_changes" as never,
      {
        event: "INSERT",
        schema: "public",
        table: "auction_bids",
        filter: `ad_id=eq.${adId}`,
      } as never,
      () => {
        // When a new bid arrives, fetch updated auction state
        fetchAuctionState(adId).then((state) => {
          if (state) onUpdate(state);
        });
      },
    )
    .on(
      "postgres_changes" as never,
      {
        event: "UPDATE",
        schema: "public",
        table: "ads",
        filter: `id=eq.${adId}`,
      } as never,
      () => {
        // When ad is updated (auction_ends_at, auction_status change)
        fetchAuctionState(adId).then((state) => {
          if (state) onUpdate(state);
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Fetch current auction state from Supabase (production only) */
export async function fetchAuctionState(adId: string): Promise<AuctionState | null> {
  const { data: ad } = await supabase
    .from("ads" as never)
    .select("*")
    .eq("id", adId)
    .single();

  if (!ad) return null;

  const adData = ad as Record<string, unknown>;

  const { data: bids } = await supabase
    .from("auction_bids" as never)
    .select("*, bidder:profiles(display_name)")
    .eq("ad_id", adId)
    .order("amount", { ascending: false })
    .limit(20);

  const bidsList: AuctionBid[] = ((bids as Record<string, unknown>[] | null) || []).map(
    (b: Record<string, unknown>) => ({
      id: b.id as string,
      adId: b.ad_id as string,
      bidderId: b.bidder_id as string,
      bidderName:
        ((b.bidder as Record<string, unknown>)?.display_name as string) || "مزايد",
      amount: Number(b.amount),
      createdAt: b.created_at as string,
    }),
  );

  // Determine real-time status: check if auction ended
  let status = adData.auction_status as AuctionStatus;
  const endsAt = adData.auction_ends_at as string;
  if (status === "active" && endsAt && new Date(endsAt).getTime() <= Date.now()) {
    status = bidsList.length > 0 ? "ended_winner" : "ended_no_bids";
  }

  return {
    adId,
    status,
    startPrice: Number(adData.auction_start_price),
    buyNowPrice: adData.auction_buy_now_price
      ? Number(adData.auction_buy_now_price)
      : null,
    currentHighestBid: bidsList.length > 0 ? bidsList[0].amount : null,
    highestBidderName: bidsList.length > 0 ? bidsList[0].bidderName : null,
    highestBidderId: bidsList.length > 0 ? bidsList[0].bidderId : null,
    bidsCount: bidsList.length,
    minIncrement: Number(adData.auction_min_increment) || 50,
    endsAt,
    originalEndsAt: endsAt,
    bids: bidsList,
    winnerId: (adData.auction_winner_id as string) || null,
    winnerName: null,
    wasExtended: false,
  };
}
