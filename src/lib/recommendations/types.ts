/**
 * Recommendations engine types — signal tracking, user interests,
 * exchange matching, and display rules.
 */

/* ── Signal types ─────────────────────────────────────────────────────── */

export type SignalType =
  | "search"
  | "view"
  | "favorite"
  | "ad_created"
  | "bid_placed"
  | "chat_initiated";

/** Signal weights by type — higher = stronger intent */
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  bid_placed: 10,
  chat_initiated: 8,
  ad_created: 8,
  favorite: 6,
  search: 5,
  view: 3,
};

export interface UserSignal {
  id: string;
  user_id: string;
  signal_type: SignalType;
  category_id: string | null;
  subcategory_id?: string | null;
  ad_id?: string | null;
  signal_data: Record<string, unknown>;
  governorate?: string | null;
  weight: number;
  created_at: string;
}

/* ── Interest profile (precomputed from signals) ──────────────────────── */

export interface UserInterest {
  category: string;
  subcategory?: string;
  brand?: string;
  priceRange?: [number, number];
  governorate?: string;
  keywords: string[];
  score: number;
}

/* ── Exchange matching ────────────────────────────────────────────────── */

export interface ExchangeMatch {
  adId: string;
  title: string;
  saleType: "cash" | "auction" | "exchange";
  price: number | null;
  exchangeDescription: string | null;
  governorate: string | null;
  city: string | null;
  matchType: "perfect" | "partial";
  matchReason: string;
}

/* ── Seller insights ──────────────────────────────────────────────────── */

export interface SellerInsights {
  categorySearchers: number;
  specificSearchers: number;
  locationInterested: number;
  tips: string[];
}
