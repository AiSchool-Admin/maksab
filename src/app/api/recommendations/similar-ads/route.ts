/**
 * Similar Ads API — "شبيه اللي بتدور عليه"
 * Returns ads similar to a search query, excluding already-shown results.
 * Used on the search results page to show related items.
 */

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
    const { query, category, excludeIds = [], limit = 6 } = body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ ads: [] });
    }

    const supabase = getServiceClient();

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_similar_ads" as never,
      {
        p_query: query.trim(),
        p_category_id: category || null,
        p_exclude_ids: excludeIds,
        p_limit: limit,
      } as never,
    );

    if (!rpcError && rpcData && (rpcData as unknown[]).length > 0) {
      const ads = (rpcData as Record<string, unknown>[]).map(mapSimilarRow);
      return NextResponse.json({ ads });
    }

    // Fallback: text search with relaxed criteria
    const ads = await fallbackSimilarAds(supabase, query, category, excludeIds, limit);
    return NextResponse.json({ ads });
  } catch (err) {
    console.error("Similar ads API error:", err);
    return NextResponse.json({ ads: [] });
  }
}

function mapSimilarRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    price: row.price ? Number(row.price) : null,
    saleType: row.sale_type,
    image: ((row.images as string[]) ?? [])[0] ?? null,
    governorate: row.governorate,
    city: row.city,
    categoryId: row.category_id,
    createdAt: row.created_at,
    isNegotiable: row.is_negotiable ?? false,
    auctionStartPrice: row.auction_start_price ? Number(row.auction_start_price) : undefined,
    auctionEndsAt: row.auction_ends_at ?? undefined,
    exchangeDescription: row.exchange_description ?? undefined,
    similarityScore: row.similarity_score ? Number(row.similarity_score) : 0,
    matchType: row.match_type ?? "similar_item",
  };
}

async function fallbackSimilarAds(
  supabase: ReturnType<typeof getServiceClient>,
  query: string,
  category: string | null,
  excludeIds: string[],
  limit: number,
) {
  // Split query into keywords for flexible matching
  const keywords = query.trim().split(/\s+/).filter((w) => w.length >= 2);
  if (keywords.length === 0) return [];

  // Search with ILIKE on individual keywords
  let adsQuery = supabase
    .from("ads" as never)
    .select("id, title, price, sale_type, images, governorate, city, category_id, created_at, is_negotiable, auction_start_price, auction_ends_at, exchange_description")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  // Match any keyword in title
  const orClauses = keywords.map((kw) => `title.ilike.%${kw}%`).join(",");
  adsQuery = adsQuery.or(orClauses);

  if (category) {
    // Don't limit to same category — we want cross-category suggestions too
    // But boost same category in sorting
  }

  const { data } = await adsQuery;
  if (!data) return [];

  // Filter out excluded IDs and pick diverse results
  const filtered = (data as Record<string, unknown>[])
    .filter((row) => !excludeIds.includes(row.id as string));

  // Ensure diversity: mix sale types
  const byType: Record<string, Record<string, unknown>[]> = {};
  for (const row of filtered) {
    const type = row.sale_type as string;
    if (!byType[type]) byType[type] = [];
    byType[type].push(row);
  }

  const diverse: Record<string, unknown>[] = [];
  const types = Object.keys(byType);
  let idx = 0;
  while (diverse.length < limit && idx < filtered.length) {
    for (const type of types) {
      if (diverse.length >= limit) break;
      const typeAds = byType[type];
      const pick = typeAds.shift();
      if (pick) diverse.push(pick);
    }
    idx++;
    if (types.every((t) => (byType[t]?.length ?? 0) === 0)) break;
  }

  return diverse.map(mapSimilarRow);
}
