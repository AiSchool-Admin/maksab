/**
 * GET /api/gold/prices
 *
 * Returns current gold and silver prices per gram in EGP.
 *
 * Flow:
 * 1. Check if DB cache is fresh (< 30 minutes)
 * 2. If fresh, return cached prices
 * 3. If stale, fetch from external API, update DB, return
 * 4. If external API fails, return stale cache with warning
 *
 * External source: goldapi.io or manual admin updates.
 * Prices are in EGP per gram for each karat.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

// Gold purity ratios relative to 24K
const KARAT_RATIOS: Record<string, number> = {
  "24": 1.0,
  "21": 21 / 24,     // 0.875
  "18": 18 / 24,     // 0.75
  "14": 14 / 24,     // 0.583
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface GoldPriceRow {
  karat: string;
  price_per_gram: number;
  source: string;
  fetched_at: string;
}

export async function GET() {
  const client = getServiceClient();

  // Step 1: Check DB cache
  if (client) {
    const { data: cached } = await client
      .from("gold_price_cache")
      .select("karat, price_per_gram, source, fetched_at")
      .order("karat");

    if (cached && cached.length > 0) {
      const rows = cached as GoldPriceRow[];
      const oldestFetch = rows.reduce((min, row) => {
        const t = new Date(row.fetched_at).getTime();
        return t < min ? t : min;
      }, Date.now());

      const isFresh = Date.now() - oldestFetch < CACHE_MAX_AGE_MS;

      if (isFresh) {
        return NextResponse.json({
          prices: rows.map((r) => ({
            karat: r.karat,
            label: karatLabel(r.karat),
            pricePerGram: Number(r.price_per_gram),
            fetchedAt: r.fetched_at,
            source: r.source,
          })),
          cached: true,
        });
      }
    }
  }

  // Step 2: Fetch from external API
  let gold24Price: number | null = null;
  let silverOzPrice: number | null = null;
  let source = "fallback";

  // Try GoldAPI.io
  const goldApiKey = process.env.GOLD_API_KEY;
  if (goldApiKey) {
    try {
      const res = await fetch(
        "https://www.goldapi.io/api/XAU/EGP",
        {
          headers: { "x-access-token": goldApiKey },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        // price is per troy ounce (31.1035 grams)
        if (data.price) {
          gold24Price = data.price / 31.1035;
          source = "goldapi.io";
        }
      }
    } catch {
      // API failed
    }
  }

  // Try secondary source if primary failed
  if (!gold24Price) {
    try {
      const res = await fetch(
        "https://api.metalpriceapi.com/v1/latest?api_key=" +
          (process.env.METAL_PRICE_API_KEY || "") +
          "&base=EGP&currencies=XAU,XAG",
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.rates?.XAU) {
          // rates are inverse: EGP per 1 troy ounce of gold
          gold24Price = (1 / data.rates.XAU) / 31.1035;
          source = "metalpriceapi.com";
        }
        if (data.rates?.XAG) {
          silverOzPrice = (1 / data.rates.XAG) / 31.1035;
        }
      }
    } catch {
      // Secondary API also failed
    }
  }

  // Step 3: Calculate prices for each karat
  const prices: { karat: string; pricePerGram: number; source: string; fetchedAt: string }[] = [];
  const now = new Date().toISOString();

  if (gold24Price) {
    for (const [karat, ratio] of Object.entries(KARAT_RATIOS)) {
      prices.push({
        karat,
        pricePerGram: Math.round(gold24Price * ratio),
        source,
        fetchedAt: now,
      });
    }
  }

  // Silver prices
  if (silverOzPrice) {
    prices.push({
      karat: "silver_925",
      pricePerGram: Math.round(silverOzPrice * 0.925),
      source,
      fetchedAt: now,
    });
    prices.push({
      karat: "silver_900",
      pricePerGram: Math.round(silverOzPrice * 0.9),
      source,
      fetchedAt: now,
    });
  }

  // Step 4: Update DB cache if we got fresh prices
  if (client && prices.length > 0) {
    for (const p of prices) {
      await client
        .from("gold_price_cache")
        .upsert(
          {
            karat: p.karat,
            price_per_gram: p.pricePerGram,
            source: p.source,
            fetched_at: p.fetchedAt,
          },
          { onConflict: "karat" },
        );
    }
  }

  // Step 5: Return fresh prices or fallback to cached
  if (prices.length > 0) {
    return NextResponse.json({
      prices: prices.map((p) => ({
        karat: p.karat,
        label: karatLabel(p.karat),
        pricePerGram: p.pricePerGram,
        fetchedAt: p.fetchedAt,
        source: p.source,
      })),
      cached: false,
    });
  }

  // Return cached (stale) prices if available, or fallback defaults
  if (client) {
    const { data: stale } = await client
      .from("gold_price_cache")
      .select("karat, price_per_gram, source, fetched_at")
      .order("karat");

    if (stale && stale.length > 0) {
      return NextResponse.json({
        prices: (stale as GoldPriceRow[]).map((r) => ({
          karat: r.karat,
          label: karatLabel(r.karat),
          pricePerGram: Number(r.price_per_gram),
          fetchedAt: r.fetched_at,
          source: r.source + " (cached)",
        })),
        cached: true,
        stale: true,
      });
    }
  }

  // Absolute fallback
  const fallback = [
    { karat: "24", pricePerGram: 4500 },
    { karat: "21", pricePerGram: 3940 },
    { karat: "18", pricePerGram: 3375 },
    { karat: "14", pricePerGram: 2625 },
    { karat: "silver_925", pricePerGram: 55 },
    { karat: "silver_900", pricePerGram: 53 },
  ];

  return NextResponse.json({
    prices: fallback.map((f) => ({
      ...f,
      label: karatLabel(f.karat),
      fetchedAt: now,
      source: "fallback",
    })),
    cached: false,
    fallback: true,
  });
}

function karatLabel(karat: string): string {
  const labels: Record<string, string> = {
    "24": "عيار 24",
    "21": "عيار 21",
    "18": "عيار 18",
    "14": "عيار 14",
    silver_925: "فضة 925",
    silver_900: "فضة 900",
  };
  return labels[karat] || karat;
}
