/**
 * Advanced Search Service — World-class search with:
 * - Full-text Arabic search (to_tsvector)
 * - Fuzzy matching (pg_trgm)
 * - Smart query parsing (AI entity extraction)
 * - Server-side autocomplete
 * - Trending searches
 * - Image search
 */

import type { AdSummary } from "@/lib/ad-data";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface AdvancedSearchFilters {
  query?: string;
  /** Original user-typed query before AI cleaning — used for ILIKE fallback */
  originalQuery?: string;
  category?: string;
  subcategory?: string;
  saleType?: "cash" | "auction" | "exchange";
  priceMin?: number;
  priceMax?: number;
  governorate?: string;
  city?: string;
  condition?: string;
  sortBy?: "relevance" | "newest" | "price_asc" | "price_desc";
  categoryFilters?: Record<string, string>;
}

export interface AdvancedSearchResult {
  ads: AdSummary[];
  total: number;
  hasMore: boolean;
  searchMethod: string;
}

export interface AutocompleteSuggestion {
  text: string;
  category: string | null;
  count: number;
  type: string;
}

export interface TrendingSearch {
  query: string;
  count: number;
  lastSearched?: string;
}

export interface ImageSearchResult {
  id: string;
  title: string;
  price: number | null;
  saleType: string;
  image: string | null;
  governorate: string | null;
  city: string | null;
  categoryId: string;
  createdAt: string;
  matchScore: number;
}

/* ── Advanced Search (Full-text + Fuzzy) ───────────────────────────────── */

const PAGE_SIZE = 12;

export async function advancedSearch(
  filters: AdvancedSearchFilters,
  page: number = 0,
): Promise<AdvancedSearchResult> {
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: filters.query,
        originalQuery: filters.originalQuery,
        category: filters.category,
        subcategory: filters.subcategory,
        saleType: filters.saleType,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        governorate: filters.governorate,
        city: filters.city,
        condition: filters.condition,
        sortBy: filters.sortBy,
        categoryFilters: filters.categoryFilters,
        page,
        limit: PAGE_SIZE,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}`);
    }

    const data = await response.json();

    // Convert API response to AdSummary format
    const ads: AdSummary[] = (data.ads || []).map((ad: Record<string, unknown>) => ({
      id: ad.id as string,
      title: ad.title as string,
      price: ad.price as number | null,
      saleType: ad.saleType as AdSummary["saleType"],
      image: ad.image as string | null,
      governorate: ad.governorate as string | null,
      city: ad.city as string | null,
      createdAt: ad.createdAt as string,
      isNegotiable: (ad.isNegotiable as boolean) ?? false,
      auctionHighestBid: ad.auctionStartPrice as number | undefined,
      auctionEndsAt: ad.auctionEndsAt as string | undefined,
      exchangeDescription: ad.exchangeDescription as string | undefined,
    }));

    return {
      ads,
      total: data.total ?? 0,
      hasMore: data.hasMore ?? false,
      searchMethod: data.searchMethod ?? "unknown",
    };
  } catch (err) {
    console.error("Advanced search error:", err);
    // Import fallback only when needed
    const { searchAds } = await import("./search-data");
    const result = await searchAds(
      {
        query: filters.query,
        category: filters.category,
        subcategory: filters.subcategory,
        saleType: filters.saleType,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        governorate: filters.governorate,
        condition: filters.condition,
        sortBy: (filters.sortBy === "relevance" ? "newest" : filters.sortBy) as "newest" | "price_asc" | "price_desc",
        categoryFilters: filters.categoryFilters,
      },
      page,
    );
    return { ...result, searchMethod: "client_fallback" };
  }
}

/* ── Autocomplete ──────────────────────────────────────────────────────── */

let autocompleteAbortController: AbortController | null = null;

export async function getAutocomplete(
  query: string,
): Promise<AutocompleteSuggestion[]> {
  if (!query || query.length < 2) return [];

  // Cancel previous request
  if (autocompleteAbortController) {
    autocompleteAbortController.abort();
  }
  autocompleteAbortController = new AbortController();

  try {
    const response = await fetch(
      `/api/search/autocomplete?q=${encodeURIComponent(query)}`,
      { signal: autocompleteAbortController.signal },
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.suggestions || [];
  } catch (err) {
    if ((err as Error).name === "AbortError") return [];
    console.error("Autocomplete error:", err);
    return [];
  }
}

/* ── Trending Searches ─────────────────────────────────────────────────── */

let trendingCache: { data: TrendingSearch[]; timestamp: number } | null = null;
const TRENDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getTrendingSearches(
  limit: number = 10,
): Promise<TrendingSearch[]> {
  // Check cache
  if (trendingCache && Date.now() - trendingCache.timestamp < TRENDING_CACHE_TTL) {
    return trendingCache.data.slice(0, limit);
  }

  try {
    const response = await fetch(`/api/search/trending?limit=${limit}`);
    if (!response.ok) throw new Error("Trending API failed");

    const data = await response.json();
    const trending = data.trending || [];

    // Cache it
    trendingCache = { data: trending, timestamp: Date.now() };

    return trending;
  } catch (err) {
    console.error("Trending search error:", err);
    // Return static fallback
    return [
      { query: "تويوتا كورولا", count: 450 },
      { query: "آيفون 15", count: 380 },
      { query: "شقق القاهرة", count: 320 },
      { query: "ذهب عيار 21", count: 290 },
      { query: "سامسونج S24", count: 260 },
      { query: "غسالة توشيبا", count: 220 },
      { query: "بلايستيشن 5", count: 180 },
      { query: "شقة مدينة نصر", count: 200 },
    ].slice(0, limit);
  }
}

/* ── Image Search ──────────────────────────────────────────────────────── */

export async function searchByImage(
  tags: string[],
  category?: string,
): Promise<{ results: ImageSearchResult[]; detectedCategory: string | null }> {
  try {
    const response = await fetch("/api/search/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags, category }),
    });

    if (!response.ok) throw new Error("Image search API failed");

    const data = await response.json();
    return {
      results: data.results || [],
      detectedCategory: data.detectedCategory || null,
    };
  } catch (err) {
    console.error("Image search error:", err);
    return { results: [], detectedCategory: null };
  }
}

/* ── Visual Tag Extraction (Client-side) ───────────────────────────────── */

/**
 * Extract searchable tags from image.
 * For MVP: user manually selects tags from a predefined list.
 * Future: use a vision API (Google Vision, Claude, etc.)
 */
export const IMAGE_TAG_CATEGORIES: Record<string, { label: string; tags: string[] }> = {
  cars: {
    label: "سيارات",
    tags: ["سيارة", "عربية", "تويوتا", "هيونداي", "كيا", "بي ام", "مرسيدس", "شيفروليه", "نيسان", "فيات", "سوزوكي"],
  },
  phones: {
    label: "موبايلات",
    tags: ["موبايل", "آيفون", "سامسونج", "شاومي", "أوبو", "هواوي", "تابلت", "لابتوب"],
  },
  real_estate: {
    label: "عقارات",
    tags: ["شقة", "فيلا", "أرض", "محل", "مكتب", "بيت"],
  },
  gold: {
    label: "ذهب وفضة",
    tags: ["ذهب", "فضة", "خاتم", "سلسلة", "أسورة", "دبلة", "جنيه ذهب"],
  },
  fashion: {
    label: "موضة",
    tags: ["ملابس", "حذاء", "شنطة", "ساعة", "نظارة", "فستان", "جاكت"],
  },
  appliances: {
    label: "أجهزة منزلية",
    tags: ["غسالة", "ثلاجة", "بوتاجاز", "مكيف", "تلفزيون", "سخان", "ميكروويف"],
  },
  furniture: {
    label: "أثاث",
    tags: ["غرفة نوم", "سفرة", "أنتريه", "مطبخ", "كرسي", "سرير", "كنبة"],
  },
  hobbies: {
    label: "هوايات",
    tags: ["بلايستيشن", "إكسبوكس", "كاميرا", "دراجة", "جيتار", "كتاب"],
  },
  tools: {
    label: "عدد وأدوات",
    tags: ["شنيور", "دريل", "صاروخ", "عدة", "مولد"],
  },
  scrap: {
    label: "خردة",
    tags: ["حديد", "نحاس", "ألومنيوم", "بلاستيك", "أجهزة قديمة"],
  },
};
