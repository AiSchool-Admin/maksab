/**
 * Buy Request Service — مكسب
 *
 * Stores buy requests as ads in the existing `ads` table
 * using category_fields._type = "buy_request" as a marker.
 * This avoids needing a separate buy_requests table.
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

// ── Buy request marker in category_fields ─────────────
// We store buy requests in the `ads` table with this marker
const BUY_REQUEST_MARKER = { _type: "buy_request" };

// Map purchase type → ads sale_type
function toSaleType(pt: PurchaseType): "cash" | "exchange" {
  return pt === "exchange" ? "exchange" : "cash";
}

// Map ads status → buy request status
function toBuyRequestStatus(adsStatus: string): BuyRequestStatus {
  switch (adsStatus) {
    case "active": return "active";
    case "sold": return "fulfilled";
    case "expired": return "expired";
    case "deleted": return "deleted";
    default: return "active";
  }
}

// ── CRUD ───────────────────────────────────────────────

export async function createBuyRequest(
  input: CreateBuyRequestInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول أولاً" };

    // Build category_fields with buy request marker + extra data
    const categoryFields = {
      ...BUY_REQUEST_MARKER,
      purchase_type: input.purchaseType,
      budget_min: input.budgetMin || null,
      budget_max: input.budgetMax || null,
      exchange_offer: input.exchangeOffer || null,
      exchange_category_id: input.exchangeCategoryId || null,
      exchange_description: input.exchangeDescription || null,
      desired_specs: input.desiredSpecs || {},
    };

    // Build description that includes exchange info
    let fullDescription = input.description || "";
    if (input.exchangeOffer) {
      fullDescription += (fullDescription ? "\n" : "") + "عايز يبدل بـ: " + input.exchangeOffer;
    }

    const { data, error } = await supabase
      .from("ads")
      .insert({
        user_id: user.id,
        category_id: input.categoryId,
        subcategory_id: input.subcategoryId || null,
        title: input.title,
        description: fullDescription || null,
        sale_type: toSaleType(input.purchaseType),
        price: input.budgetMax || null,
        is_negotiable: true,
        governorate: input.governorate || null,
        city: input.city || null,
        category_fields: categoryFields,
        status: "active",
        images: [],
      } as never)
      .select("id")
      .single();

    if (error) {
      console.error("[createBuyRequest]", error.message);
      return { success: false, error: "حصل مشكلة — جرب تاني" };
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
    .from("ads")
    .select("*")
    .eq("user_id", user.id)
    .contains("category_fields", BUY_REQUEST_MARKER)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(mapAdRowToBuyRequest);
}

export async function fetchActiveBuyRequests(
  limit = 20,
  categoryId?: string,
): Promise<BuyRequest[]> {
  let query = supabase
    .from("ads")
    .select("*")
    .eq("status", "active")
    .contains("category_fields", BUY_REQUEST_MARKER)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(mapAdRowToBuyRequest);
}

export async function deleteBuyRequest(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("ads")
    .update({ status: "deleted" } as never)
    .eq("id", id)
    .contains("category_fields", BUY_REQUEST_MARKER);

  return !error;
}

export async function markFulfilled(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("ads")
    .update({ status: "sold" } as never)
    .eq("id", id)
    .contains("category_fields", BUY_REQUEST_MARKER);

  return !error;
}

// ── Smart Matching (simplified — uses existing ads) ───

export async function getMatchesForRequest(
  requestId: string,
): Promise<BuyRequestMatch[]> {
  // Get the buy request (which is an ad)
  const { data: reqData } = await supabase
    .from("ads")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!reqData) return [];

  const req = reqData as unknown as Record<string, unknown>;
  const categoryId = req.category_id as string;
  const cf = (req.category_fields as Record<string, unknown>) || {};
  const budgetMax = cf.budget_max ? Number(cf.budget_max) : null;

  // Find matching sell ads in the same category
  let query = supabase
    .from("ads")
    .select("id, title, price, sale_type, images, governorate, city, category_id, views_count, favorites_count, created_at")
    .eq("status", "active")
    .eq("category_id", categoryId)
    .not("category_fields", "cs", JSON.stringify(BUY_REQUEST_MARKER))
    .neq("id", requestId)
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
  // Get the ad
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

  // Find buy requests in the same category
  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .eq("status", "active")
    .eq("category_id", ad.category_id)
    .contains("category_fields", BUY_REQUEST_MARKER)
    .limit(10);

  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[])
    .map(mapAdRowToBuyRequest)
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

function mapAdRowToBuyRequest(row: Record<string, unknown>): BuyRequest {
  const cf = (row.category_fields as Record<string, unknown>) || {};
  return {
    id: row.id as string,
    userId: row.user_id as string,
    categoryId: row.category_id as string,
    subcategoryId: (row.subcategory_id as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || undefined,
    purchaseType: (cf.purchase_type as PurchaseType) || "cash",
    budgetMin: cf.budget_min ? Number(cf.budget_min) : undefined,
    budgetMax: cf.budget_max ? Number(cf.budget_max) : undefined,
    exchangeOffer: (cf.exchange_offer as string) || undefined,
    exchangeCategoryId: (cf.exchange_category_id as string) || undefined,
    exchangeDescription: (cf.exchange_description as string) || undefined,
    governorate: (row.governorate as string) || undefined,
    city: (row.city as string) || undefined,
    desiredSpecs: (cf.desired_specs as Record<string, unknown>) || {},
    status: toBuyRequestStatus(row.status as string),
    matchesCount: 0,
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
