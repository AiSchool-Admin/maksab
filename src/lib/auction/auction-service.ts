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

/* ── Cancel auction (seller only) ──────────────────────────────────── */

export interface CancelAuctionResult {
  success: boolean;
  error?: string;
}

export async function cancelAuction(adId: string): Promise<CancelAuctionResult> {
  try {
    const { getSessionToken } = await import("@/lib/supabase/auth");
    const token = getSessionToken();
    const res = await fetch("/api/auctions/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ad_id: adId }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "حصل مشكلة. جرب تاني" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/* ── Extend auction (seller only) ─────────────────────────────────── */

export interface ExtendAuctionResult {
  success: boolean;
  error?: string;
  newEndsAt?: string;
}

export async function extendAuction(
  adId: string,
  hours: number,
): Promise<ExtendAuctionResult> {
  try {
    const { getSessionToken } = await import("@/lib/supabase/auth");
    const token = getSessionToken();
    const res = await fetch("/api/auctions/extend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ad_id: adId, hours }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "حصل مشكلة. جرب تاني" };
    }
    return { success: true, newEndsAt: data.newEndsAt };
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
 *
 * Optimizations:
 * - New bid INSERT: merges incrementally (1 profile query) instead of
 *   full refetch (3 queries).
 * - Ads UPDATE (anti-sniping / finalization): full refetch (rare event).
 * - Fallback polling only activates when no Realtime event received
 *   in 30+ seconds, avoiding unnecessary queries when Realtime is healthy.
 */
export function subscribeToAuction(
  adId: string,
  onUpdate: (state: AuctionState) => void,
  initialState?: AuctionState | null,
): AuctionUnsubscribe {
  let isActive = true;
  let cachedState: AuctionState | null = initialState ?? null;
  let lastEventTime = Date.now();

  const emitUpdate = (state: AuctionState) => {
    if (!isActive) return;
    cachedState = state;
    onUpdate(state);
  };

  // Seed cache if no initial state provided
  if (!cachedState) {
    fetchAuctionState(adId).then((state) => {
      if (state && isActive) emitUpdate(state);
    });
  }

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
      async (payload: { new: Record<string, unknown> }) => {
        if (!isActive) return;
        lastEventTime = Date.now();

        // Incremental merge: fetch only bidder name (1 query instead of 3)
        if (cachedState) {
          const newBid = payload.new;
          const bidderId = newBid.bidder_id as string;

          let bidderName = "مزايد";
          if (bidderId) {
            const { data: profile } = await supabase
              .from("profiles" as never)
              .select("display_name")
              .eq("id", bidderId)
              .maybeSingle();
            if (profile) {
              const p = profile as Record<string, unknown>;
              bidderName = (p.display_name as string) || "مزايد";
            }
          }

          const bid: AuctionBid = {
            id: newBid.id as string,
            adId: newBid.ad_id as string,
            bidderId,
            bidderName,
            amount: Number(newBid.amount),
            createdAt: newBid.created_at as string,
          };

          const updatedBids = [bid, ...cachedState.bids]
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 20);

          emitUpdate({
            ...cachedState,
            bids: updatedBids,
            bidsCount: updatedBids.length,
            currentHighestBid: updatedBids[0]?.amount ?? null,
            highestBidderName: updatedBids[0]?.bidderName ?? null,
            highestBidderId: updatedBids[0]?.bidderId ?? null,
          });
        } else {
          // No cached state yet — full refetch
          const state = await fetchAuctionState(adId);
          if (state && isActive) emitUpdate(state);
        }
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
      async () => {
        // Ad-level changes (anti-sniping extension, finalization) — full refetch
        if (!isActive) return;
        lastEventTime = Date.now();
        const state = await fetchAuctionState(adId);
        if (state && isActive) emitUpdate(state);
      },
    )
    .subscribe();

  // Smart fallback polling: only when Realtime appears unhealthy
  // Checks every 10s, but only fetches if no event in 30+ seconds
  const pollInterval = setInterval(() => {
    if (!isActive) return;
    if (Date.now() - lastEventTime >= 30000) {
      fetchAuctionState(adId).then((state) => {
        if (state && isActive) emitUpdate(state);
      });
    }
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
