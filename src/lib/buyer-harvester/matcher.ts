/**
 * BHE — Matching Engine
 *
 * Forward match:  buyer → listings (from ahe_listings)
 * Reverse match:  new listing → existing buyers
 */

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface MatchResult {
  buyer_id: string;
  matched_count: number;
  listings: Array<{ id: string; title: string; price: number | null }>;
}

/**
 * For a single buyer, find matching listings in ahe_listings.
 */
export async function matchBuyerToListings(
  buyerId: string,
  supabase?: any
): Promise<MatchResult> {
  const sb = supabase || getSupabase();

  // Get buyer
  const { data: buyer } = await sb
    .from("bhe_buyers")
    .select("*")
    .eq("id", buyerId)
    .single();

  if (!buyer) return { buyer_id: buyerId, matched_count: 0, listings: [] };

  // Build query
  let query = sb
    .from("ahe_listings")
    .select("id, title, price, governorate, category, source_listing_url")
    .eq("is_duplicate", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (buyer.category) {
    query = query.eq("category", buyer.category);
  }
  if (buyer.governorate) {
    query = query.eq("governorate", buyer.governorate);
  }
  if (buyer.budget_min) {
    query = query.gte("price", buyer.budget_min);
  }
  if (buyer.budget_max) {
    query = query.lte("price", buyer.budget_max);
  }

  const { data: listings } = await query;

  if (!listings || listings.length === 0) {
    return { buyer_id: buyerId, matched_count: 0, listings: [] };
  }

  // Update buyer with matches
  const matchedListings = listings.map((l: any) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    url: l.source_listing_url,
  }));

  await sb
    .from("bhe_buyers")
    .update({
      matched_listings: matchedListings,
      matches_count: listings.length,
      last_matched_at: new Date().toISOString(),
      pipeline_status: buyer.pipeline_status === "discovered" || buyer.pipeline_status === "phone_found"
        ? "matched"
        : buyer.pipeline_status,
    })
    .eq("id", buyerId);

  return {
    buyer_id: buyerId,
    matched_count: listings.length,
    listings: matchedListings,
  };
}

/**
 * For a new listing, find matching buyers who have phones.
 */
export async function reverseMatchListingToBuyers(
  listingId: string,
  supabase?: any
): Promise<{ listing_id: string; matched_buyers: number }> {
  const sb = supabase || getSupabase();

  // Get listing
  const { data: listing } = await sb
    .from("ahe_listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (!listing) return { listing_id: listingId, matched_buyers: 0 };

  // Find matching buyers with phones
  let query = sb
    .from("bhe_buyers")
    .select("id, buyer_name, buyer_phone, product_wanted, budget_max, buyer_score")
    .not("buyer_phone", "is", null)
    .in("pipeline_status", ["discovered", "phone_found", "matched"])
    .order("buyer_score", { ascending: false })
    .limit(10);

  if (listing.category) {
    query = query.eq("category", listing.category);
  }
  if (listing.governorate) {
    query = query.or(`governorate.eq.${listing.governorate},governorate.is.null`);
  }
  if (listing.price) {
    query = query.or(`budget_max.gte.${listing.price},budget_max.is.null`);
  }

  const { data: buyers } = await query;

  if (!buyers || buyers.length === 0) {
    return { listing_id: listingId, matched_buyers: 0 };
  }

  // Update each matched buyer
  for (const buyer of buyers) {
    const { data: existing } = await sb
      .from("bhe_buyers")
      .select("matched_listings, matches_count")
      .eq("id", buyer.id)
      .single();

    const currentMatches = (existing?.matched_listings as any[]) || [];
    const alreadyMatched = currentMatches.some((m: any) => m.id === listingId);

    if (!alreadyMatched) {
      const newMatch = {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        url: listing.source_listing_url,
      };

      await sb
        .from("bhe_buyers")
        .update({
          matched_listings: [...currentMatches, newMatch],
          matches_count: (existing?.matches_count || 0) + 1,
          last_matched_at: new Date().toISOString(),
          pipeline_status: "matched",
        })
        .eq("id", buyer.id);
    }
  }

  return { listing_id: listingId, matched_buyers: buyers.length };
}

/**
 * Batch match: find all unmatched buyers and match them.
 */
export async function batchMatchBuyers(
  limit: number = 50,
  supabase?: any
): Promise<{ processed: number; total_matches: number }> {
  const sb = supabase || getSupabase();

  // Get unmatched buyers (discovered or phone_found, matches_count = 0)
  const { data: buyers } = await sb
    .from("bhe_buyers")
    .select("id")
    .in("pipeline_status", ["discovered", "phone_found"])
    .eq("matches_count", 0)
    .order("buyer_score", { ascending: false })
    .limit(limit);

  if (!buyers || buyers.length === 0) {
    return { processed: 0, total_matches: 0 };
  }

  let totalMatches = 0;
  for (const buyer of buyers) {
    const result = await matchBuyerToListings(buyer.id, sb);
    totalMatches += result.matched_count;
  }

  return { processed: buyers.length, total_matches: totalMatches };
}
