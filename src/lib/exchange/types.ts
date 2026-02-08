/**
 * Exchange system types — structured wanted items, matching scores, chain trades.
 */

/* ── Structured wanted item ──────────────────────────────────────────── */

export interface ExchangeWantedItem {
  categoryId: string;           // Wanted category (e.g., "phones")
  subcategoryId?: string;       // Optional subcategory (e.g., "mobile")
  fields: Record<string, unknown>; // Key fields (e.g., { brand: "apple", storage: "256" })
  title: string;                // Auto-generated: "آيفون — 256GB"
}

/* ── Match types and scores ──────────────────────────────────────────── */

export type MatchLevel = "perfect" | "strong" | "good" | "partial";

export interface ExchangeMatchResult {
  adId: string;
  title: string;
  image: string | null;
  saleType: "cash" | "auction" | "exchange";
  price: number | null;
  exchangeDescription: string | null;
  exchangeWanted: ExchangeWantedItem | null;
  governorate: string | null;
  city: string | null;
  matchLevel: MatchLevel;
  matchScore: number;           // 0-100
  matchReasons: string[];       // Arabic explanations
  categoryIcon: string;         // e.g., "📱"
}

/* ── Chain exchange (3-way trade) ────────────────────────────────────── */

export interface ChainExchangeLink {
  adId: string;
  title: string;
  image: string | null;
  ownerName: string;
  categoryIcon: string;
  has: string;      // What this person has (ad title)
  wants: string;    // What this person wants (exchange_wanted title)
}

export interface ChainExchange {
  links: ChainExchangeLink[];   // Always 3 items: A→B→C→A
  totalScore: number;
}

/* ── Match level config ──────────────────────────────────────────────── */

export const MATCH_LEVEL_CONFIG: Record<MatchLevel, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  minScore: number;
}> = {
  perfect: {
    label: "تطابق مثالي",
    icon: "🎯",
    color: "text-brand-green",
    bgColor: "bg-brand-green-light",
    minScore: 80,
  },
  strong: {
    label: "تطابق قوي",
    icon: "💪",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    minScore: 60,
  },
  good: {
    label: "مطابقة جيدة",
    icon: "👍",
    color: "text-brand-gold",
    bgColor: "bg-brand-gold-light",
    minScore: 40,
  },
  partial: {
    label: "مطابقة جزئية",
    icon: "🔍",
    color: "text-gray-text",
    bgColor: "bg-gray-light",
    minScore: 0,
  },
};
