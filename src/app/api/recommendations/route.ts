/**
 * Personalized Recommendations API
 * Server-side endpoint using service role key for RPC access.
 * Returns personalized ads + matching auctions based on user_signals.
 */

/** Alexandria MVP: only recommend cars + properties */
const ACTIVE_CATEGORY_IDS = ["cars", "real_estate"];

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, governorate, limit = 20, auctionLimit = 10 } = body;

    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch personalized recommendations + matching auctions in parallel
    const [recsResult, auctionsResult] = await Promise.all([
      supabase.rpc("get_personalized_recommendations" as never, {
        p_user_id: userId,
        p_governorate: governorate || null,
        p_limit: limit,
      } as never),
      supabase.rpc("get_matching_auctions" as never, {
        p_user_id: userId,
        p_governorate: governorate || null,
        p_limit: auctionLimit,
      } as never),
    ]);

    // If RPC fails (function doesn't exist yet), use fallback
    if (recsResult.error || auctionsResult.error) {
      console.warn("Recommendations RPC failed, using fallback:", recsResult.error?.message);
      return fallbackRecommendations(supabase, userId, governorate, limit, auctionLimit);
    }

    const personalizedRows = (recsResult.data || []) as Record<string, unknown>[];
    const auctionRows = (auctionsResult.data || []) as Record<string, unknown>[];

    // Apply diversity rule: no more than 3 of same sale_type in a row
    const diverseAds = applyDiversityRule(personalizedRows);

    const personalizedAds = diverseAds.map(mapRowToAd);
    const matchingAuctions = auctionRows.map((row) => ({
      ...mapRowToAd(row),
      timeRemainingHours: row.time_remaining_hours ? Number(row.time_remaining_hours) : null,
    }));

    return NextResponse.json({
      personalizedAds,
      matchingAuctions,
      hasSignals: personalizedRows.length > 0 &&
        personalizedRows.some((r) => r.match_reason !== "إعلان جديد"),
    });
  } catch (err) {
    console.error("Recommendations API error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة في التوصيات" },
      { status: 500 },
    );
  }
}

/** Map DB row to ad shape */
function mapRowToAd(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    price: row.price ? Number(row.price) : null,
    saleType: row.sale_type,
    image: ((row.images as string[]) ?? [])[0] ?? null,
    images: row.images ?? [],
    governorate: row.governorate,
    city: row.city,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    categoryFields: row.category_fields,
    createdAt: row.created_at,
    isNegotiable: row.is_negotiable ?? false,
    auctionStartPrice: row.auction_start_price ? Number(row.auction_start_price) : undefined,
    auctionBuyNowPrice: row.auction_buy_now_price ? Number(row.auction_buy_now_price) : undefined,
    auctionEndsAt: row.auction_ends_at ?? undefined,
    auctionStatus: row.auction_status ?? undefined,
    exchangeDescription: row.exchange_description ?? undefined,
    viewsCount: row.views_count ?? 0,
    favoritesCount: row.favorites_count ?? 0,
    relevanceScore: row.relevance_score ? Number(row.relevance_score) : 0,
    matchReason: (row.match_reason as string) ?? "",
  };
}

/** Diversity rule: max 3 consecutive ads of same sale_type */
function applyDiversityRule(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (rows.length <= 3) return rows;

  const result: Record<string, unknown>[] = [];
  const deferred: Record<string, unknown>[] = [];
  let lastType = "";
  let consecutiveCount = 0;

  for (const row of rows) {
    const saleType = row.sale_type as string;
    if (saleType === lastType) {
      consecutiveCount++;
      if (consecutiveCount >= 3) {
        deferred.push(row);
        continue;
      }
    } else {
      consecutiveCount = 1;
      lastType = saleType;
    }
    result.push(row);
  }

  // Append deferred items at the end
  return [...result, ...deferred];
}

/** Fallback when RPC doesn't exist yet */
 
async function fallbackRecommendations(
  supabase: any,
  userId: string,
  governorate: string | null,
  limit: number,
  auctionLimit: number,
) {
  // Fetch user's signals to build basic interest profile
  const { data: signalData } = await supabase
    .from("user_signals" as never)
    .select("category_id, subcategory_id, signal_data, weight")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const signals = (signalData || []) as Record<string, unknown>[];

  // Build interest categories from signals
  const categoryWeights = new Map<string, number>();
  for (const s of signals) {
    const cat = s.category_id as string;
    if (cat) {
      categoryWeights.set(cat, (categoryWeights.get(cat) || 0) + (s.weight as number || 1));
    }
  }

  // Sort by weight, get top categories
  const topCategories = [...categoryWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // Fetch ads matching top categories (or recent ads if no signals)
  let adsQuery = supabase
    .from("ads" as never)
    .select("*")
    .eq("status", "active")
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Always restrict to active categories (Alexandria MVP)
  adsQuery = adsQuery.in("category_id", ACTIVE_CATEGORY_IDS);

  if (topCategories.length > 0) {
    // Further narrow by user's top categories (intersection with active)
    const filtered = topCategories.filter(c => ACTIVE_CATEGORY_IDS.includes(c));
    if (filtered.length > 0) {
      adsQuery = adsQuery.in("category_id", filtered);
    }
  } else if (governorate) {
    adsQuery = adsQuery.eq("governorate", governorate);
  }

  const { data: adsData } = await adsQuery;

  // Fetch auctions — always filtered to active categories
  let auctionQuery = supabase
    .from("ads" as never)
    .select("*")
    .eq("status", "active")
    .eq("sale_type", "auction")
    .in("category_id", ACTIVE_CATEGORY_IDS)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(auctionLimit);

  if (topCategories.length > 0) {
    const filtered = topCategories.filter(c => ACTIVE_CATEGORY_IDS.includes(c));
    if (filtered.length > 0) {
      auctionQuery = auctionQuery.in("category_id", filtered);
    }
  }

  const { data: auctionData } = await auctionQuery;

  const personalizedAds = ((adsData || []) as Record<string, unknown>[]).map(mapRowToAd);
  const matchingAuctions = ((auctionData || []) as Record<string, unknown>[]).map((row) => ({
    ...mapRowToAd(row),
    timeRemainingHours: null,
  }));

  return NextResponse.json({
    personalizedAds,
    matchingAuctions,
    hasSignals: topCategories.length > 0,
  });
}
