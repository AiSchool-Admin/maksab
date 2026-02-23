/**
 * Buy Request Service — مكسب
 *
 * Uses the dedicated `buy_requests` table.
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
      .from("buy_requests")
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
        status: "active",
      } as never)
      .select("id")
      .single();

    if (error) {
      console.error("[createBuyRequest]", error.message, error.code, error.details);
      // Show actual DB error for debugging
      const dbMsg = error.message || "";
      if (dbMsg.includes("violates foreign key")) {
        return { success: false, error: "مشكلة في الحساب — جرب سجل خروج وادخل تاني" };
      }
      if (dbMsg.includes("permission denied") || error.code === "42501") {
        return { success: false, error: "مفيش صلاحية — تأكد إنك مسجل دخول" };
      }
      return { success: false, error: `خطأ: ${dbMsg || "حصل مشكلة — جرب تاني"}` };
    }

    const id = (data as unknown as { id: string }).id;
    return { success: true, id };
  } catch (err) {
    console.error("[createBuyRequest] catch", err);
    return { success: false, error: "حصل مشكلة — جرب تاني" };
  }
}

export async function fetchMyBuyRequests(): Promise<BuyRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("buy_requests")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(mapRowToBuyRequest);
}

export async function fetchActiveBuyRequests(
  limit = 20,
  categoryId?: string,
): Promise<BuyRequest[]> {
  let query = supabase
    .from("buy_requests")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(mapRowToBuyRequest);
}

export async function deleteBuyRequest(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("buy_requests")
    .update({ status: "deleted" } as never)
    .eq("id", id);

  return !error;
}

export async function markFulfilled(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("buy_requests")
    .update({ status: "fulfilled" } as never)
    .eq("id", id);

  return !error;
}

// ── Smart Matching ─────────────────────────────────────

export async function getMatchesForRequest(
  requestId: string,
): Promise<BuyRequestMatch[]> {
  // Use the DB function for scored matching
  const { data, error } = await supabase.rpc(
    "find_matches_for_buy_request" as never,
    { p_request_id: requestId, p_limit: 20 } as never,
  );

  if (error || !data) {
    // Fallback: simple category match
    return fallbackMatches(requestId);
  }

  const rows = data as unknown as { ad_id: string; match_score: number; match_type: string }[];

  if (rows.length === 0) return fallbackMatches(requestId);

  // Fetch the matched ads' summary data
  const adIds = rows.map((r) => r.ad_id);
  const { data: adsData } = await supabase
    .from("ads")
    .select("id, title, price, sale_type, images, governorate, city, category_id, created_at")
    .in("id", adIds);

  const adsMap = new Map<string, Record<string, unknown>>();
  if (adsData) {
    for (const ad of adsData as unknown as Record<string, unknown>[]) {
      adsMap.set(ad.id as string, ad);
    }
  }

  return rows.map((row, i) => {
    const ad = adsMap.get(row.ad_id);
    return {
      id: `match-${i}`,
      adId: row.ad_id,
      matchScore: Number(row.match_score),
      matchType: row.match_type as BuyRequestMatch["matchType"],
      ad: ad
        ? {
            id: ad.id as string,
            title: ad.title as string,
            price: ad.price ? Number(ad.price) : null,
            saleType: ad.sale_type as "cash" | "auction" | "exchange",
            image: ((ad.images as string[]) ?? [])[0] ?? null,
            governorate: (ad.governorate as string) ?? null,
            city: (ad.city as string) ?? null,
            categoryId: (ad.category_id as string) ?? null,
            createdAt: ad.created_at as string,
          }
        : undefined,
    };
  });
}

/** Fallback: find ads in the same category if the RPC function fails */
async function fallbackMatches(requestId: string): Promise<BuyRequestMatch[]> {
  const { data: reqData } = await supabase
    .from("buy_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!reqData) return [];

  const req = reqData as unknown as Record<string, unknown>;
  const categoryId = req.category_id as string;
  const budgetMax = req.budget_max ? Number(req.budget_max) : null;

  let query = supabase
    .from("ads")
    .select("id, title, price, sale_type, images, governorate, city, category_id, created_at")
    .eq("status", "active")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (budgetMax) {
    query = query.lte("price", budgetMax);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map((row, i) => ({
    id: `match-${i}`,
    adId: row.id as string,
    matchScore: 70,
    matchType: "category" as const,
    ad: {
      id: row.id as string,
      title: row.title as string,
      price: row.price ? Number(row.price) : null,
      saleType: row.sale_type as "cash" | "auction" | "exchange",
      image: ((row.images as string[]) ?? [])[0] ?? null,
      governorate: (row.governorate as string) ?? null,
      city: (row.city as string) ?? null,
      categoryId: (row.category_id as string) ?? null,
      createdAt: row.created_at as string,
    },
  }));
}

/**
 * Find buy requests that match a sell ad (for seller notifications).
 */
export async function findBuyersForAd(adId: string): Promise<BuyRequest[]> {
  const { data: adData } = await supabase
    .from("ads")
    .select("category_id, price, title, sale_type")
    .eq("id", adId)
    .single();

  if (!adData) return [];

  const ad = adData as unknown as {
    category_id: string;
    price: number | null;
    title: string;
    sale_type: string;
  };

  const { data, error } = await supabase
    .from("buy_requests")
    .select("*")
    .eq("status", "active")
    .eq("category_id", ad.category_id)
    .limit(10);

  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[])
    .map(mapRowToBuyRequest)
    .filter((req) => {
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
    purchaseType: (row.purchase_type as PurchaseType) || "cash",
    budgetMin: row.budget_min ? Number(row.budget_min) : undefined,
    budgetMax: row.budget_max ? Number(row.budget_max) : undefined,
    exchangeOffer: (row.exchange_offer as string) || undefined,
    exchangeCategoryId: (row.exchange_category_id as string) || undefined,
    exchangeDescription: (row.exchange_description as string) || undefined,
    governorate: (row.governorate as string) || undefined,
    city: (row.city as string) || undefined,
    desiredSpecs: (row.desired_specs as Record<string, unknown>) || {},
    status: (row.status as BuyRequestStatus) || "active",
    matchesCount: row.matches_count ? Number(row.matches_count) : 0,
    createdAt: row.created_at as string,
    expiresAt: (row.expires_at as string) || "",
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
