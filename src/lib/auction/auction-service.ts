/**
 * Auction service — handles bidding, anti-sniping, buy now,
 * and Supabase Realtime subscriptions.
 *
 * Uses API routes + Supabase Realtime.
 */

import { supabase } from "@/lib/supabase/client";
import type { AuctionState, AuctionBid } from "./types";
import { resolveAuctionStatus, calcOriginalEndsAt, wasAuctionExtended } from "./finalize";

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
    const { getSessionToken } = await import("@/lib/supabase/auth");
    const token = getSessionToken();
    const res = await fetch("/api/auctions/bid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
    const { getSessionToken } = await import("@/lib/supabase/auth");
    const res = await fetch("/api/auctions/buy-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_id: adId,
        buyer_id: buyerId,
        buyer_name: buyerName,
        session_token: getSessionToken(),
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
 * Subscribe to real-time auction updates via Supabase Realtime.
 * Includes fallback polling every 10 seconds in case Realtime connection drops.
 */
export function subscribeToAuction(
  adId: string,
  onUpdate: (state: AuctionState) => void,
): AuctionUnsubscribe {
  let isActive = true;

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
        if (!isActive) return;
        fetchAuctionState(adId).then((state) => {
          if (state && isActive) onUpdate(state);
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
        if (!isActive) return;
        fetchAuctionState(adId).then((state) => {
          if (state && isActive) onUpdate(state);
        });
      },
    )
    .subscribe();

  // Fallback polling every 10 seconds in case Realtime connection drops
  const pollInterval = setInterval(() => {
    if (!isActive) return;
    fetchAuctionState(adId).then((state) => {
      if (state && isActive) onUpdate(state);
    });
  }, 10000);

  return () => {
    isActive = false;
    clearInterval(pollInterval);
    supabase.removeChannel(channel);
  };
}

/** Fetch current auction state from Supabase (production only) */
export async function fetchAuctionState(adId: string): Promise<AuctionState | null> {
  const { data: ad } = await supabase
    .from("ads" as never)
    .select("*")
    .eq("id", adId)
    .maybeSingle();

  if (!ad) return null;

  const adData = ad as Record<string, unknown>;

  const { data: bids } = await supabase
    .from("auction_bids" as never)
    .select("*")
    .eq("ad_id", adId)
    .order("amount", { ascending: false })
    .limit(20);

  const bidsRaw = (bids as Record<string, unknown>[] | null) || [];

  // Fetch bidder names separately (more reliable than PostgREST join)
  const bidderIds = [...new Set(bidsRaw.map((b) => b.bidder_id as string))];
  const nameMap = new Map<string, string>();
  if (bidderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles" as never)
      .select("id, display_name")
      .in("id", bidderIds);
    if (profiles) {
      for (const p of profiles as Record<string, unknown>[]) {
        if (p.display_name) {
          nameMap.set(p.id as string, p.display_name as string);
        }
      }
    }
  }

  const bidsList: AuctionBid[] = bidsRaw.map(
    (b: Record<string, unknown>) => ({
      id: b.id as string,
      adId: b.ad_id as string,
      bidderId: b.bidder_id as string,
      bidderName: nameMap.get(b.bidder_id as string) || "مزايد",
      amount: Number(b.amount),
      createdAt: b.created_at as string,
    }),
  );

  // Determine real-time status using shared logic
  const endsAt = adData.auction_ends_at as string;
  const status = resolveAuctionStatus(
    adData.auction_status as import("./types").AuctionStatus,
    endsAt,
    bidsList.length > 0,
  );

  // Detect anti-snipe extensions using shared logic
  const durationHours = Number(adData.auction_duration_hours) || 72;
  const createdAt = adData.created_at as string;
  const originalEndsAt = createdAt
    ? calcOriginalEndsAt(createdAt, durationHours)
    : endsAt;
  const wasExtended = wasAuctionExtended(endsAt, createdAt, durationHours);

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
    originalEndsAt,
    bids: bidsList,
    winnerId: (adData.auction_winner_id as string) || null,
    winnerName: adData.auction_winner_id
      ? nameMap.get(adData.auction_winner_id as string) || null
      : null,
    wasExtended,
  };
}
