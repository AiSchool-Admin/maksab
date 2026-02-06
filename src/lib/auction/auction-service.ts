/**
 * Auction service — handles bidding, anti-sniping, buy now,
 * and Supabase Realtime subscriptions.
 *
 * In dev mode, uses in-memory state. In production, uses Supabase.
 */

import { supabase } from "@/lib/supabase/client";
import type { AuctionState, AuctionBid, AuctionStatus } from "./types";
import { calcMinNextBid } from "./types";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

/** 5 minutes in ms — the anti-sniping threshold */
const ANTI_SNIPE_THRESHOLD_MS = 5 * 60 * 1000;

/* ── In-memory auction state for dev mode ───────────────────────────── */

const devAuctionStates = new Map<string, AuctionState>();
const devSubscribers = new Map<
  string,
  Set<(state: AuctionState) => void>
>();

/** Initialize dev auction state from mock ad detail */
export function initDevAuctionState(state: AuctionState): void {
  devAuctionStates.set(state.adId, state);
}

/** Notify all subscribers of an auction update */
function notifySubscribers(adId: string, state: AuctionState): void {
  const subs = devSubscribers.get(adId);
  if (subs) {
    for (const cb of subs) cb(state);
  }
}

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
  if (IS_DEV_MODE) {
    return placeBidDev(adId, bidderId, bidderName, amount);
  }
  return placeBidProduction(adId, bidderId, bidderName, amount);
}

function placeBidDev(
  adId: string,
  bidderId: string,
  bidderName: string,
  amount: number,
): PlaceBidResult {
  const state = devAuctionStates.get(adId);
  if (!state) return { success: false, error: "المزاد مش موجود" };
  if (state.status !== "active")
    return { success: false, error: "المزاد مش نشط" };

  const now = Date.now();
  const endsAtMs = new Date(state.endsAt).getTime();
  if (now >= endsAtMs)
    return { success: false, error: "المزاد انتهى" };

  const currentPrice = state.currentHighestBid ?? state.startPrice;
  const minNext = calcMinNextBid(currentPrice);
  if (amount < minNext)
    return {
      success: false,
      error: `الحد الأدنى للمزايدة ${minNext.toLocaleString("en-US")} جنيه`,
    };

  // Anti-sniping: extend by 5 minutes if bid in last 5 minutes
  let antiSnipeExtended = false;
  const timeRemaining = endsAtMs - now;
  let newEndsAt = state.endsAt;
  if (timeRemaining <= ANTI_SNIPE_THRESHOLD_MS) {
    const extendedTime = new Date(now + ANTI_SNIPE_THRESHOLD_MS);
    newEndsAt = extendedTime.toISOString();
    antiSnipeExtended = true;
  }

  const newBid: AuctionBid = {
    id: `bid-${Date.now()}`,
    adId,
    bidderId,
    bidderName,
    amount,
    createdAt: new Date().toISOString(),
  };

  const updatedState: AuctionState = {
    ...state,
    currentHighestBid: amount,
    highestBidderName: bidderName,
    highestBidderId: bidderId,
    bidsCount: state.bidsCount + 1,
    bids: [newBid, ...state.bids],
    endsAt: newEndsAt,
    wasExtended: state.wasExtended || antiSnipeExtended,
  };

  devAuctionStates.set(adId, updatedState);
  notifySubscribers(adId, updatedState);

  return { success: true, updatedState, antiSnipeExtended };
}

async function placeBidProduction(
  adId: string,
  bidderId: string,
  _bidderName: string,
  amount: number,
): Promise<PlaceBidResult> {
  // In production: insert bid via Supabase RPC or direct insert
  // The edge function / database trigger handles anti-sniping
  const { error } = await supabase.from("auction_bids" as never).insert({
    ad_id: adId,
    bidder_id: bidderId,
    amount,
  } as never);

  if (error) {
    return { success: false, error: "حصل مشكلة في المزايدة. جرب تاني" };
  }

  return { success: true };
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
  if (IS_DEV_MODE) {
    return buyNowDev(adId, buyerId, buyerName);
  }
  return buyNowProduction(adId, buyerId);
}

function buyNowDev(
  adId: string,
  buyerId: string,
  buyerName: string,
): BuyNowResult {
  const state = devAuctionStates.get(adId);
  if (!state) return { success: false, error: "المزاد مش موجود" };
  if (state.status !== "active")
    return { success: false, error: "المزاد مش نشط" };
  if (!state.buyNowPrice)
    return { success: false, error: "مفيش سعر شراء فوري" };

  const updatedState: AuctionState = {
    ...state,
    status: "bought_now",
    currentHighestBid: state.buyNowPrice,
    highestBidderName: buyerName,
    highestBidderId: buyerId,
    winnerId: buyerId,
    winnerName: buyerName,
  };

  devAuctionStates.set(adId, updatedState);
  notifySubscribers(adId, updatedState);

  return { success: true, updatedState };
}

async function buyNowProduction(
  adId: string,
  buyerId: string,
): Promise<BuyNowResult> {
  // In production: call Supabase Edge Function to handle buy now
  const { error } = await supabase.functions.invoke("auction-buy-now", {
    body: { ad_id: adId, buyer_id: buyerId },
  });

  if (error) {
    return { success: false, error: "حصل مشكلة. جرب تاني" };
  }

  return { success: true };
}

/* ── Check and finalize ended auctions ──────────────────────────────── */

export function checkAuctionEnd(adId: string): AuctionState | null {
  if (!IS_DEV_MODE) return null;

  const state = devAuctionStates.get(adId);
  if (!state || state.status !== "active") return null;

  const now = Date.now();
  const endsAtMs = new Date(state.endsAt).getTime();
  if (now < endsAtMs) return null;

  // Auction has ended
  const finalStatus: AuctionStatus =
    state.bidsCount > 0 ? "ended_winner" : "ended_no_bids";

  const updatedState: AuctionState = {
    ...state,
    status: finalStatus,
    winnerId: state.highestBidderId,
    winnerName: state.highestBidderName,
  };

  devAuctionStates.set(adId, updatedState);
  notifySubscribers(adId, updatedState);

  return updatedState;
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
  if (IS_DEV_MODE) {
    if (!devSubscribers.has(adId)) {
      devSubscribers.set(adId, new Set());
    }
    devSubscribers.get(adId)!.add(onUpdate);
    return () => {
      devSubscribers.get(adId)?.delete(onUpdate);
    };
  }

  // Production: subscribe to Supabase Realtime
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
      (payload: Record<string, unknown>) => {
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
      (payload: Record<string, unknown>) => {
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
async function fetchAuctionState(adId: string): Promise<AuctionState | null> {
  const { data: ad } = await supabase
    .from("ads" as never)
    .select("*")
    .eq("id", adId)
    .single();

  if (!ad) return null;

  const adData = ad as Record<string, unknown>;

  const { data: bids } = await supabase
    .from("auction_bids" as never)
    .select("*, bidder:users(display_name)")
    .eq("ad_id", adId)
    .order("amount", { ascending: false })
    .limit(20);

  const bidsList: AuctionBid[] = ((bids as Record<string, unknown>[] | null) || []).map(
    (b: Record<string, unknown>) => ({
      id: b.id as string,
      adId: b.ad_id as string,
      bidderId: b.bidder_id as string,
      bidderName:
        ((b.bidder as Record<string, unknown>)?.display_name as string) || "مستخدم",
      amount: Number(b.amount),
      createdAt: b.created_at as string,
    }),
  );

  return {
    adId,
    status: adData.auction_status as AuctionStatus,
    startPrice: Number(adData.auction_start_price),
    buyNowPrice: adData.auction_buy_now_price
      ? Number(adData.auction_buy_now_price)
      : null,
    currentHighestBid: bidsList.length > 0 ? bidsList[0].amount : null,
    highestBidderName: bidsList.length > 0 ? bidsList[0].bidderName : null,
    highestBidderId: bidsList.length > 0 ? bidsList[0].bidderId : null,
    bidsCount: bidsList.length,
    minIncrement: Number(adData.auction_min_increment) || 50,
    endsAt: adData.auction_ends_at as string,
    originalEndsAt: adData.auction_ends_at as string,
    bids: bidsList,
    winnerId: (adData.auction_winner_id as string) || null,
    winnerName: null,
    wasExtended: false,
  };
}
