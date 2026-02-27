/**
 * Gold Price Service — Real-time gold & silver price tracking.
 *
 * Provides:
 * 1. Current gold/silver prices per gram in EGP by karat
 * 2. Craftsmanship fee (مصنعية) calculation
 * 3. Ad price valuation against raw metal value
 *
 * Prices are fetched from an external API and cached in Supabase.
 * Fallback to cached prices if API is unavailable.
 */

export interface GoldPrice {
  karat: string;
  label: string;
  pricePerGram: number;
  fetchedAt: string;
  source: string;
}

export interface GoldValuation {
  /** Raw metal value (weight * price per gram) */
  metalValue: number;
  /** The listed ad price */
  listedPrice: number;
  /** Craftsmanship fee = listed price - metal value */
  craftsmanshipFee: number;
  /** Craftsmanship percentage of total price */
  craftsmanshipPercent: number;
  /** Current price per gram for this karat */
  pricePerGram: number;
  /** Karat type */
  karat: string;
  /** Human-readable karat label */
  karatLabel: string;
  /** Whether the listed price is below metal value (potential deal) */
  isBelowMetalValue: boolean;
  /** Price data freshness */
  fetchedAt: string;
}

/** Karat labels in Arabic */
export const KARAT_LABELS: Record<string, string> = {
  "24": "عيار 24",
  "21": "عيار 21",
  "18": "عيار 18",
  "14": "عيار 14",
  silver_925: "فضة 925",
  silver_900: "فضة 900",
};

/** Default fallback prices (updated manually as a safety net) */
const FALLBACK_PRICES: Record<string, number> = {
  "24": 4500,
  "21": 3940,
  "18": 3375,
  "14": 2625,
  silver_925: 55,
  silver_900: 53,
};

// In-memory cache (5 minutes TTL)
let cachedPrices: GoldPrice[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch current gold prices from the API endpoint.
 * Falls back to Supabase cache, then to hardcoded defaults.
 */
export async function getGoldPrices(): Promise<GoldPrice[]> {
  // Check in-memory cache first
  if (cachedPrices && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedPrices;
  }

  try {
    // Try API route first (server-side fetches from external API + updates DB)
    const res = await fetch("/api/gold/prices", { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.prices && Array.isArray(data.prices)) {
        cachedPrices = data.prices;
        cacheTime = Date.now();
        return data.prices;
      }
    }
  } catch {
    // API failed, try Supabase directly
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data } = await supabase
      .from("gold_price_cache")
      .select("karat, price_per_gram, source, fetched_at")
      .order("karat");

    if (data && data.length > 0) {
      const prices: GoldPrice[] = (data as Record<string, unknown>[]).map((row) => ({
        karat: row.karat as string,
        label: KARAT_LABELS[row.karat as string] || (row.karat as string),
        pricePerGram: Number(row.price_per_gram),
        fetchedAt: row.fetched_at as string,
        source: row.source as string,
      }));
      cachedPrices = prices;
      cacheTime = Date.now();
      return prices;
    }
  } catch {
    // Supabase failed too
  }

  // Fallback to hardcoded prices
  return Object.entries(FALLBACK_PRICES).map(([karat, price]) => ({
    karat,
    label: KARAT_LABELS[karat] || karat,
    pricePerGram: price,
    fetchedAt: new Date().toISOString(),
    source: "fallback",
  }));
}

/**
 * Get the price per gram for a specific karat.
 */
export async function getPricePerGram(karat: string): Promise<number> {
  const prices = await getGoldPrices();
  const found = prices.find((p) => p.karat === karat);
  return found?.pricePerGram ?? FALLBACK_PRICES[karat] ?? 0;
}

/**
 * Calculate the gold valuation for an ad.
 * Determines the raw metal value vs the listed price to show craftsmanship fee.
 *
 * @param karat - The karat type (e.g., "21", "24", "silver_925")
 * @param weightGrams - Weight in grams
 * @param listedPrice - The seller's listed price
 */
export async function calculateGoldValuation(
  karat: string,
  weightGrams: number,
  listedPrice: number,
): Promise<GoldValuation> {
  const prices = await getGoldPrices();
  const priceData = prices.find((p) => p.karat === karat);
  const pricePerGram = priceData?.pricePerGram ?? FALLBACK_PRICES[karat] ?? 0;

  const metalValue = Math.round(pricePerGram * weightGrams);
  const craftsmanshipFee = Math.max(0, listedPrice - metalValue);
  const craftsmanshipPercent =
    listedPrice > 0 ? Math.round((craftsmanshipFee / listedPrice) * 100) : 0;

  return {
    metalValue,
    listedPrice,
    craftsmanshipFee,
    craftsmanshipPercent,
    pricePerGram,
    karat,
    karatLabel: KARAT_LABELS[karat] || karat,
    isBelowMetalValue: listedPrice < metalValue,
    fetchedAt: priceData?.fetchedAt ?? new Date().toISOString(),
  };
}

/**
 * Format a gold price for display.
 */
export function formatGoldPrice(amount: number): string {
  return `${amount.toLocaleString("en-US")} جنيه`;
}
