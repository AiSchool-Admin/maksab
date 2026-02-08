/**
 * AI Search types — intent detection, parsed queries, wishes, and smart results.
 */

/* ── Intent ──────────────────────────────────────────────────────────── */

export type SearchIntent =
  | "buy"        // عايز أشتري
  | "exchange"   // عايز أبدل
  | "browse"     // بتفرج / بدور
  | "compare"    // عايز أقارن / أفضل
  | "gift"       // هدية لحد
  | "urgent"     // محتاج دلوقتي / ضروري
  | "bargain";   // عايز حاجة رخيصة / عرض

export type PriceIntent =
  | "budget"     // رخيص / مش غالي
  | "mid"        // متوسط
  | "premium"    // غالي / أصلي / لوكس
  | "any"        // مش مهم
  | "exact";     // رقم محدد

export type ConditionHint =
  | "new"        // جديد / متبرشم
  | "like_new"   // زيرو / زي الجديد
  | "good"       // كويس / نضيف
  | "any";

/* ── AI Parsed Query ─────────────────────────────────────────────────── */

export interface AIParsedQuery {
  /** Original user text */
  originalQuery: string;
  /** Cleaned query (after extracting entities) */
  cleanQuery: string;
  /** Detected user intent */
  intent: SearchIntent;
  /** Price intent and optional range */
  priceIntent: PriceIntent;
  priceMin?: number;
  priceMax?: number;
  /** Condition hint */
  conditionHint: ConditionHint;
  /** Extracted structured filters */
  categories: string[];          // Could match multiple categories
  primaryCategory?: string;      // Most likely category
  subcategory?: string;
  brand?: string;
  model?: string;
  governorate?: string;
  city?: string;
  year?: number;
  /** Category-specific extracted fields */
  extractedFields: Record<string, string>;
  /** Sale type preference */
  saleType?: "cash" | "auction" | "exchange";
  /** Confidence score (0-1) */
  confidence: number;
  /** Suggested alternative queries */
  alternativeQueries: string[];
  /** Human-readable interpretation in Egyptian Arabic */
  interpretation: string;
  /** Gift target (if intent is gift) */
  giftTarget?: string;
}

/* ── "دوّر لي" Wish ──────────────────────────────────────────────────── */

export interface SearchWish {
  id: string;
  /** Original search text */
  query: string;
  /** Parsed structured criteria */
  parsedQuery: AIParsedQuery;
  /** Additional user-set filters */
  filters: {
    category?: string;
    saleType?: "cash" | "auction" | "exchange";
    priceMin?: number;
    priceMax?: number;
    governorate?: string;
    condition?: string;
  };
  /** When the wish was created */
  createdAt: string;
  /** How many matches found so far */
  matchCount: number;
  /** Last time matches were checked */
  lastCheckedAt: string;
  /** New matches since last view */
  newMatchCount: number;
  /** Is the wish active? */
  isActive: boolean;
  /** User-friendly description */
  displayText: string;
}

/* ── Smart Search Result ─────────────────────────────────────────────── */

export interface SmartSearchResult {
  /** Main results */
  ads: SmartAd[];
  total: number;
  hasMore: boolean;
  /** AI analysis */
  parsedQuery: AIParsedQuery;
  /** Suggested refinements */
  refinements: SearchRefinement[];
  /** Empty state suggestions (if no results) */
  emptySuggestions: EmptySuggestion[];
}

export interface SmartAd {
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
  exchangeDescription?: string;
  isLiveAuction?: boolean;
  /** AI relevance score (0-100) */
  relevanceScore: number;
  /** Why this result is relevant */
  matchReason?: string;
}

export interface SearchRefinement {
  label: string;        // e.g., "في القاهرة"
  type: "category" | "brand" | "location" | "price" | "condition" | "saleType";
  value: string;
  icon: string;
}

export interface EmptySuggestion {
  text: string;
  query: string;
  icon: string;
}

/* ── Price ranges by category (for "budget"/"premium" intent) ────────── */

export const CATEGORY_PRICE_RANGES: Record<string, {
  budget: [number, number];
  mid: [number, number];
  premium: [number, number];
}> = {
  cars: { budget: [0, 200000], mid: [200000, 600000], premium: [600000, 10000000] },
  real_estate: { budget: [0, 500000], mid: [500000, 2000000], premium: [2000000, 50000000] },
  phones: { budget: [0, 5000], mid: [5000, 20000], premium: [20000, 80000] },
  fashion: { budget: [0, 500], mid: [500, 3000], premium: [3000, 50000] },
  gold: { budget: [0, 5000], mid: [5000, 30000], premium: [30000, 500000] },
  luxury: { budget: [0, 5000], mid: [5000, 30000], premium: [30000, 200000] },
  appliances: { budget: [0, 3000], mid: [3000, 15000], premium: [15000, 80000] },
  furniture: { budget: [0, 5000], mid: [5000, 30000], premium: [30000, 200000] },
  hobbies: { budget: [0, 2000], mid: [2000, 10000], premium: [10000, 100000] },
  tools: { budget: [0, 1000], mid: [1000, 5000], premium: [5000, 50000] },
  scrap: { budget: [0, 500], mid: [500, 5000], premium: [5000, 100000] },
  services: { budget: [0, 500], mid: [500, 3000], premium: [3000, 20000] },
};
