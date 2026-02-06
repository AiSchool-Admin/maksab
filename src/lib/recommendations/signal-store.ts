/**
 * In-memory signal store for dev mode.
 * In production, signals go directly to Supabase user_signals table.
 */

import type { UserSignal, SignalType, UserInterest } from "./types";
import { SIGNAL_WEIGHTS } from "./types";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

/** In-memory signal storage for dev mode */
const devSignals: UserSignal[] = [];

/** Track a user behavior signal — fire and forget */
export async function trackSignal(params: {
  userId: string;
  signalType: SignalType;
  categoryId?: string | null;
  subcategoryId?: string | null;
  adId?: string | null;
  signalData?: Record<string, unknown>;
  governorate?: string | null;
}): Promise<void> {
  const signal: UserSignal = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: params.userId,
    signal_type: params.signalType,
    category_id: params.categoryId ?? null,
    subcategory_id: params.subcategoryId,
    ad_id: params.adId,
    signal_data: params.signalData ?? {},
    governorate: params.governorate,
    weight: SIGNAL_WEIGHTS[params.signalType],
    created_at: new Date().toISOString(),
  };

  if (IS_DEV) {
    devSignals.push(signal);
    // Keep only last 200 signals in dev
    if (devSignals.length > 200) devSignals.splice(0, devSignals.length - 200);
    return;
  }

  // Production: insert into Supabase (fire and forget)
  try {
    const { supabase } = await import("@/lib/supabase/client");
    supabase
      .from("user_signals" as never)
      .insert({
        user_id: signal.user_id,
        signal_type: signal.signal_type,
        category_id: signal.category_id,
        subcategory_id: signal.subcategory_id,
        ad_id: signal.ad_id,
        signal_data: signal.signal_data,
        governorate: signal.governorate,
        weight: signal.weight,
      } as never)
      .then();
  } catch {
    // Silent fail — don't block UI
  }
}

/** Get user signals from dev store (for testing recommendations locally) */
export function getDevSignals(userId: string): UserSignal[] {
  return devSignals.filter((s) => s.user_id === userId);
}

/** Build user interest profile from signals */
export function buildInterestProfile(signals: UserSignal[]): UserInterest[] {
  const interestMap = new Map<
    string,
    {
      category: string;
      subcategory?: string;
      brands: Map<string, number>;
      prices: number[];
      governorates: Map<string, number>;
      keywords: string[];
      totalWeight: number;
    }
  >();

  for (const signal of signals) {
    if (!signal.category_id) continue;

    const key = `${signal.category_id}:${signal.subcategory_id || ""}`;
    if (!interestMap.has(key)) {
      interestMap.set(key, {
        category: signal.category_id,
        subcategory: signal.subcategory_id ?? undefined,
        brands: new Map(),
        prices: [],
        governorates: new Map(),
        keywords: [],
        totalWeight: 0,
      });
    }

    const interest = interestMap.get(key)!;
    interest.totalWeight += signal.weight;

    // Extract brand from signal data
    const brand = signal.signal_data.brand as string | undefined;
    if (brand) {
      interest.brands.set(brand, (interest.brands.get(brand) || 0) + signal.weight);
    }

    // Extract price
    const price = signal.signal_data.price as number | undefined;
    if (price) interest.prices.push(price);

    // Track governorate
    if (signal.governorate) {
      interest.governorates.set(
        signal.governorate,
        (interest.governorates.get(signal.governorate) || 0) + signal.weight,
      );
    }

    // Extract keywords
    const query = signal.signal_data.query as string | undefined;
    if (query) {
      const words = query.split(/\s+/).filter((w) => w.length >= 2);
      interest.keywords.push(...words);
    }
  }

  return Array.from(interestMap.values())
    .map((i) => {
      // Find top brand
      let topBrand: string | undefined;
      let topBrandWeight = 0;
      for (const [brand, weight] of i.brands) {
        if (weight > topBrandWeight) {
          topBrand = brand;
          topBrandWeight = weight;
        }
      }

      // Find top governorate
      let topGov: string | undefined;
      let topGovWeight = 0;
      for (const [gov, weight] of i.governorates) {
        if (weight > topGovWeight) {
          topGov = gov;
          topGovWeight = weight;
        }
      }

      // Price range with 30% flexibility
      let priceRange: [number, number] | undefined;
      if (i.prices.length > 0) {
        const minPrice = Math.min(...i.prices);
        const maxPrice = Math.max(...i.prices);
        priceRange = [minPrice * 0.7, maxPrice * 1.3];
      }

      return {
        category: i.category,
        subcategory: i.subcategory,
        brand: topBrand,
        priceRange,
        governorate: topGov,
        keywords: [...new Set(i.keywords)].slice(0, 10),
        score: i.totalWeight,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
