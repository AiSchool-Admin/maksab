/**
 * Buy Request Service — مكسب
 *
 * CRUD operations for buy requests + smart matching with sell ads.
 */

import { supabase } from "@/lib/supabase/client";
import type { AdSummary } from "@/lib/ad-data";

// ── Types ──────────────────────────────────────────────

export type PurchaseType = "cash" | "exchange" | "both";
export type BuyRequestStatus = "active" | "fulfilled" | "expired" | "deleted";

export interface BuyRequest {
  id: string;
  userId: string;
  categoryId: string;
  subcategoryId?: string;
  title: string;
  description?: string;
  purchaseType: PurchaseType;
  budgetMin?: number;
  budgetMax?: number;
  exchangeOffer?: string;
  exchangeCategoryId?: string;
  exchangeDescription?: string;
  governorate?: string;
  city?: string;
  desiredSpecs: Record<string, unknown>;
  status: BuyRequestStatus;
  matchesCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface BuyRequestMatch {
  id: string;
  adId: string;
  matchScore: number;
  matchType: "exact" | "category" | "exchange" | "price";
  ad?: AdSummary;
}

export interface CreateBuyRequestInput {
  categoryId: string;
  subcategoryId?: string;
  title: string;
  description?: string;
  purchaseType: PurchaseType;
  budgetMin?: number;
  budgetMax?: number;
  exchangeOffer?: string;
  exchangeCategoryId?: string;
  exchangeDescription?: string;
  governorate?: string;
  city?: string;
  desiredSpecs?: Record<string, unknown>;
}

// ── CRUD ───────────────────────────────────────────────

export async function createBuyRequest(
  input: CreateBuyRequestInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول أولاً" };

    const { data, error } = await supabase
      .from("buy_requests" as never)
      .insert({
        user_id: user.id,
        category_id: input.categoryId,
        subcategory_id: input.subcategoryId || null,
        title: input.title,
        description: input.description || null,
        purchase_type: input.purchaseType,
        budget_min: input.budgetMin || null,
        budget_max: input.budgetMax || null,
        exchange_offer: input.exchangeOffer || null,
        exchange_category_id: input.exchangeCategoryId || null,
        exchange_description: input.exchangeDescription || null,
        governorate: input.governorate || null,
        city: input.city || null,
        desired_specs: input.desiredSpecs || {},
      } as never)
      .select("id" as never)
      .single();

    if (error) return { success: false, error: "حصل مشكلة — جرب تاني" };

    const id = (data as unknown as { id: string }).id;

    // Trigger matching in background (fire-and-forget)
    findAndSaveMatches(id).catch(() => {});

    return { success: true, id };
  } catch {
    return { success: false, error: "حصل مشكلة — جرب تاني" };
  }
}

export async function fetchMyBuyRequests(): Promise<BuyRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("buy_requests" as never)
    .select("*" as never)
    .eq("user_id" as never, user.id as never)
    .neq("status" as never, "deleted" as never)
    .order("created_at" as never, { ascending: false } as never);

  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(mapRowToBuyRequest);
}

export async function fetchActiveBuyRequests(
  limit = 20,
  categoryId?: string,
): Promise<BuyRequest[]> {
  let query = supabase
    .from("buy_requests" as never)
    .select("*" as never)
    .eq("status" as never, "active" as never)
    .order("created_at" as never, { ascending: false } as never)
    .limit(limit);

  if (categoryId) {
    query = query.eq("category_id" as never, categoryId as never);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(mapRowToBuyRequest);
}

export async function deleteBuyRequest(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("buy_requests" as never)
    .update({ status: "deleted" } as never)
    .eq("id" as never, id as never);

  return !error;
}

export async function markFulfilled(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("buy_requests" as never)
    .update({ status: "fulfilled" } as never)
    .eq("id" as never, id as never);

  return !error;
}

// ── Smart Matching ─────────────────────────────────────

async function findAndSaveMatches(requestId: string): Promise<void> {
  try {
    const { data } = await supabase
      .rpc("find_matches_for_buy_request" as never, {
        p_request_id: requestId,
        p_limit: 20,
      } as never);

    if (!data || (data as unknown[]).length === 0) return;

    const matches = (data as unknown as Array<{
      ad_id: string;
      match_score: number;
      match_type: string;
    }>);

    // Insert matches
    const inserts = matches.map((m) => ({
      buy_request_id: requestId,
      ad_id: m.ad_id,
      match_score: m.match_score,
      match_type: m.match_type,
    }));

    await supabase
      .from("buy_request_matches" as never)
      .upsert(inserts as never, { onConflict: "buy_request_id,ad_id" } as never);

    // Update matches_count
    await supabase
      .from("buy_requests" as never)
      .update({
        matches_count: matches.length,
        last_matched_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, requestId as never);
  } catch {
    // Silently fail — matching is not critical
  }
}

export async function getMatchesForRequest(
  requestId: string,
): Promise<BuyRequestMatch[]> {
  const { data, error } = await supabase
    .from("buy_request_matches" as never)
    .select("id, ad_id, match_score, match_type" as never)
    .eq("buy_request_id" as never, requestId as never)
    .eq("is_dismissed" as never, false as never)
    .order("match_score" as never, { ascending: false } as never)
    .limit(20);

  if (error || !data) return [];

  const matches = (data as unknown as Array<{
    id: string;
    ad_id: string;
    match_score: number;
    match_type: string;
  }>);

  // Fetch the actual ads
  const adIds = matches.map((m) => m.ad_id);
  if (adIds.length === 0) return [];

  const { data: adsData } = await supabase
    .from("ads" as never)
    .select("id, title, price, sale_type, images, governorate, city, category_id, views_count, favorites_count, created_at" as never)
    .in("id" as never, adIds as never);

  const adsMap = new Map<string, AdSummary>();
  if (adsData) {
    for (const row of adsData as unknown as Record<string, unknown>[]) {
      adsMap.set(row.id as string, {
        id: row.id as string,
        title: row.title as string,
        price: row.price ? Number(row.price) : null,
        saleType: row.sale_type as "cash" | "auction" | "exchange",
        image: ((row.images as string[]) ?? [])[0] ?? null,
        governorate: (row.governorate as string) ?? null,
        city: (row.city as string) ?? null,
        categoryId: (row.category_id as string) ?? null,
        createdAt: row.created_at as string,
      });
    }
  }

  return matches.map((m) => ({
    id: m.id,
    adId: m.ad_id,
    matchScore: m.match_score,
    matchType: m.match_type as BuyRequestMatch["matchType"],
    ad: adsMap.get(m.ad_id),
  }));
}

/**
 * Find buy requests that match a sell ad (for seller notifications).
 */
export async function findBuyersForAd(adId: string): Promise<BuyRequest[]> {
  // Get the ad
  const { data: adData } = await supabase
    .from("ads" as never)
    .select("category_id, price, title, sale_type" as never)
    .eq("id" as never, adId as never)
    .single();

  if (!adData) return [];

  const ad = adData as unknown as {
    category_id: string;
    price: number | null;
    title: string;
    sale_type: string;
  };

  // Find matching buy requests
  let query = supabase
    .from("buy_requests" as never)
    .select("*" as never)
    .eq("status" as never, "active" as never)
    .eq("category_id" as never, ad.category_id as never);

  const { data, error } = await query.limit(10);
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[])
    .map(mapRowToBuyRequest)
    .filter((req) => {
      // Filter by budget if applicable
      if (req.purchaseType === "cash" || req.purchaseType === "both") {
        if (req.budgetMax && ad.price && ad.price > req.budgetMax) return false;
        if (req.budgetMin && ad.price && ad.price < req.budgetMin) return false;
      }
      return true;
    });
}

// ── Helpers ────────────────────────────────────────────

function mapRowToBuyRequest(row: Record<string, unknown>): BuyRequest {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    categoryId: row.category_id as string,
    subcategoryId: (row.subcategory_id as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || undefined,
    purchaseType: row.purchase_type as PurchaseType,
    budgetMin: row.budget_min ? Number(row.budget_min) : undefined,
    budgetMax: row.budget_max ? Number(row.budget_max) : undefined,
    exchangeOffer: (row.exchange_offer as string) || undefined,
    exchangeCategoryId: (row.exchange_category_id as string) || undefined,
    exchangeDescription: (row.exchange_description as string) || undefined,
    governorate: (row.governorate as string) || undefined,
    city: (row.city as string) || undefined,
    desiredSpecs: (row.desired_specs as Record<string, unknown>) || {},
    status: row.status as BuyRequestStatus,
    matchesCount: Number(row.matches_count) || 0,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  };
}

// ── Purchase type labels ───────────────────────────────

export function getPurchaseTypeLabel(type: PurchaseType): { label: string; emoji: string; color: string } {
  switch (type) {
    case "cash":
      return { label: "شراء نقدي", emoji: "💵", color: "text-brand-green" };
    case "exchange":
      return { label: "استبدال", emoji: "🔄", color: "text-purple-600" };
    case "both":
      return { label: "نقدي أو استبدال", emoji: "💵🔄", color: "text-blue-600" };
  }
}

export function getStatusLabel(status: BuyRequestStatus): { label: string; color: string } {
  switch (status) {
    case "active":
      return { label: "نشط", color: "bg-brand-green/10 text-brand-green" };
    case "fulfilled":
      return { label: "تم", color: "bg-blue-100 text-blue-700" };
    case "expired":
      return { label: "انتهى", color: "bg-orange-100 text-orange-700" };
    case "deleted":
      return { label: "محذوف", color: "bg-gray-200 text-gray-text" };
  }
}
