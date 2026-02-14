/**
 * My ads service — fetches user's own ads from Supabase.
 */

import { supabase } from "@/lib/supabase/client";
import type { AdStatus } from "@/types";

export interface MyAd {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  image: string | null;
  status: AdStatus;
  viewsCount: number;
  favoritesCount: number;
  messagesCount: number;
  createdAt: string;
  expiresAt: string | null;
  governorate: string | null;
  city: string | null;
}

/**
 * Fetch user's own ads from Supabase.
 */
export async function fetchMyAds(): Promise<MyAd[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      price: row.price ? Number(row.price) : null,
      saleType: row.sale_type as MyAd["saleType"],
      image: ((row.images as string[]) ?? [])[0] ?? null,
      status: (row.status as AdStatus) || "active",
      viewsCount: Number(row.views_count) || 0,
      favoritesCount: Number(row.favorites_count) || 0,
      messagesCount: 0,
      createdAt: row.created_at as string,
      governorate: (row.governorate as string) ?? null,
      city: (row.city as string) ?? null,
      expiresAt: (row.expires_at as string) ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Update an ad's status (sold, deleted, etc.)
 */
export async function updateAdStatus(
  adId: string,
  status: AdStatus,
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from("ads" as never)
      .update({ status } as never)
      .eq("id", adId);

    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Delete an ad (soft-delete by setting status to "deleted").
 */
export async function deleteAd(
  adId: string,
): Promise<{ success: boolean }> {
  return updateAdStatus(adId, "deleted");
}

/**
 * Status labels in Egyptian Arabic.
 */
export function getStatusLabel(status: AdStatus): { label: string; color: string } {
  switch (status) {
    case "active":
      return { label: "نشط", color: "bg-brand-green/10 text-brand-green" };
    case "sold":
      return { label: "تم البيع", color: "bg-blue-100 text-blue-700" };
    case "exchanged":
      return { label: "تم التبديل", color: "bg-purple-100 text-purple-700" };
    case "expired":
      return { label: "منتهي", color: "bg-orange-100 text-orange-700" };
    case "deleted":
      return { label: "محذوف", color: "bg-gray-200 text-gray-text" };
    default:
      return { label: status, color: "bg-gray-200 text-gray-text" };
  }
}
