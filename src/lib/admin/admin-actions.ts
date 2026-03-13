/**
 * Admin actions service — moderation and management operations.
 * Uses service role key for privileged operations.
 */

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Ad Moderation Actions ────────────────────────────────────

export type AdAction = "activate" | "deactivate" | "feature" | "unfeature" | "delete" | "mark_sold";

export async function moderateAd(
  adId: string,
  action: AdAction,
  adminId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const sb = getServiceClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  switch (action) {
    case "activate":
      updates.status = "active";
      break;
    case "deactivate":
      updates.status = "expired";
      break;
    case "delete":
      updates.status = "deleted";
      break;
    case "mark_sold":
      updates.status = "sold";
      break;
    case "feature":
      updates.is_featured = true;
      break;
    case "unfeature":
      updates.is_featured = false;
      break;
    default:
      return { success: false, error: "إجراء غير معروف" };
  }

  const { error } = await sb.from("ads").update(updates).eq("id", adId);
  if (error) {
    console.error("[admin-actions] moderateAd error:", error.message);
    return { success: false, error: error.message };
  }

  // Log the action
  await logAdminAction(sb, adminId, "ad_moderation", adId, { action, reason });

  return { success: true };
}

export async function bulkModerateAds(
  adIds: string[],
  action: AdAction,
  adminId: string,
  reason?: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const sb = getServiceClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  switch (action) {
    case "activate":
      updates.status = "active";
      break;
    case "deactivate":
      updates.status = "expired";
      break;
    case "delete":
      updates.status = "deleted";
      break;
    case "mark_sold":
      updates.status = "sold";
      break;
    case "feature":
      updates.is_featured = true;
      break;
    case "unfeature":
      updates.is_featured = false;
      break;
    default:
      return { success: false, count: 0, error: "إجراء غير معروف" };
  }

  const { error, count } = await sb
    .from("ads")
    .update(updates)
    .in("id", adIds);

  if (error) {
    console.error("[admin-actions] bulkModerateAds error:", error.message);
    return { success: false, count: 0, error: error.message };
  }

  await logAdminAction(sb, adminId, "bulk_ad_moderation", null, {
    action,
    adIds,
    count: count || adIds.length,
    reason,
  });

  return { success: true, count: count || adIds.length };
}

// ── User Management Actions ──────────────────────────────────

export type UserAction = "ban" | "unban" | "make_admin" | "remove_admin" | "verify";

export async function manageUser(
  userId: string,
  action: UserAction,
  adminId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const sb = getServiceClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  switch (action) {
    case "ban":
      updates.is_banned = true;
      updates.banned_at = new Date().toISOString();
      updates.ban_reason = reason || "مخالفة سياسات المنصة";
      break;
    case "unban":
      updates.is_banned = false;
      updates.banned_at = null;
      updates.ban_reason = null;
      break;
    case "make_admin":
      updates.is_admin = true;
      break;
    case "remove_admin":
      updates.is_admin = false;
      break;
    case "verify":
      updates.is_verified = true;
      break;
    default:
      return { success: false, error: "إجراء غير معروف" };
  }

  const { error } = await sb.from("profiles").update(updates).eq("id", userId);
  if (error) {
    console.error("[admin-actions] manageUser error:", error.message);
    return { success: false, error: error.message };
  }

  await logAdminAction(sb, adminId, "user_management", userId, { action, reason });

  return { success: true };
}

// ── Get User Detail ──────────────────────────────────────────

export interface UserDetail {
  id: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  governorate: string | null;
  city: string | null;
  bio: string | null;
  sellerType: "individual" | "store";
  storeId: string | null;
  totalAds: number;
  rating: number;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  isVerified: boolean;
  isCommissionSupporter: boolean;
  createdAt: string;
  // Activity stats
  activeAdsCount: number;
  soldAdsCount: number;
  totalViewsOnAds: number;
  totalConversations: number;
  totalFavorites: number;
  lastActiveAt: string | null;
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const sb = getServiceClient();

  // Get profile
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile) return null;
  const p = profile as Record<string, unknown>;

  // Get ad stats
  const [activeRes, soldRes, viewsRes, convsRes, favsRes, lastAdRes] = await Promise.all([
    sb.from("ads").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
    sb.from("ads").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "sold"),
    sb.from("ads").select("views_count").eq("user_id", userId),
    sb.from("conversations").select("*", { count: "exact", head: true }).or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
    sb.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("ads").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
  ]);

  let totalViews = 0;
  if (viewsRes.data) {
    for (const r of viewsRes.data as { views_count: number }[]) {
      totalViews += Number(r.views_count) || 0;
    }
  }

  const lastAd = lastAdRes.data?.[0] as Record<string, unknown> | undefined;

  return {
    id: p.id as string,
    phone: (p.phone as string) || "",
    displayName: (p.display_name as string) || null,
    avatarUrl: (p.avatar_url as string) || null,
    governorate: (p.governorate as string) || null,
    city: (p.city as string) || null,
    bio: (p.bio as string) || null,
    sellerType: (p.seller_type as "individual" | "store") || "individual",
    storeId: (p.store_id as string) || null,
    totalAds: Number(p.total_ads_count) || 0,
    rating: Number(p.rating) || 0,
    isAdmin: Boolean(p.is_admin),
    isBanned: Boolean(p.is_banned),
    banReason: (p.ban_reason as string) || null,
    isVerified: Boolean(p.is_verified),
    isCommissionSupporter: Boolean(p.is_commission_supporter),
    createdAt: p.created_at as string,
    activeAdsCount: activeRes.count || 0,
    soldAdsCount: soldRes.count || 0,
    totalViewsOnAds: totalViews,
    totalConversations: convsRes.count || 0,
    totalFavorites: favsRes.count || 0,
    lastActiveAt: lastAd ? (lastAd.created_at as string) : null,
  };
}

// ── Get Ad Detail for Admin ──────────────────────────────────

export interface AdminAdDetail {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  saleType: string;
  status: string;
  categoryId: string;
  subcategoryId: string | null;
  governorate: string | null;
  city: string | null;
  viewsCount: number;
  favoritesCount: number;
  images: string[];
  categoryFields: Record<string, unknown>;
  isNegotiable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  userId: string;
  userName: string | null;
  userPhone: string | null;
  // Auction fields
  auctionStartPrice: number | null;
  auctionBuyNowPrice: number | null;
  auctionEndsAt: string | null;
  auctionStatus: string | null;
  bidsCount: number;
  highestBid: number | null;
}

export async function getAdDetail(adId: string): Promise<AdminAdDetail | null> {
  const sb = getServiceClient();

  const { data, error } = await sb
    .from("ads")
    .select("*")
    .eq("id", adId)
    .maybeSingle();

  if (error || !data) return null;
  const ad = data as Record<string, unknown>;

  // Get user info
  const { data: userProfile } = await sb
    .from("profiles")
    .select("display_name, phone")
    .eq("id", ad.user_id as string)
    .maybeSingle();
  const up = userProfile as Record<string, unknown> | null;

  // Get bids count + highest
  let bidsCount = 0;
  let highestBid: number | null = null;
  if (ad.sale_type === "auction") {
    const { data: bids, count } = await sb
      .from("auction_bids")
      .select("amount", { count: "exact" })
      .eq("ad_id", adId)
      .order("amount", { ascending: false })
      .limit(1);
    bidsCount = count || 0;
    if (bids?.[0]) {
      highestBid = Number((bids[0] as Record<string, unknown>).amount);
    }
  }

  return {
    id: ad.id as string,
    title: (ad.title as string) || "",
    description: (ad.description as string) || null,
    price: ad.price ? Number(ad.price) : null,
    saleType: (ad.sale_type as string) || "cash",
    status: (ad.status as string) || "active",
    categoryId: (ad.category_id as string) || "",
    subcategoryId: (ad.subcategory_id as string) || null,
    governorate: (ad.governorate as string) || null,
    city: (ad.city as string) || null,
    viewsCount: Number(ad.views_count) || 0,
    favoritesCount: Number(ad.favorites_count) || 0,
    images: (ad.images as string[]) || [],
    categoryFields: (ad.category_fields as Record<string, unknown>) || {},
    isNegotiable: Boolean(ad.is_negotiable),
    isFeatured: Boolean(ad.is_featured),
    createdAt: ad.created_at as string,
    updatedAt: ad.updated_at as string,
    expiresAt: (ad.expires_at as string) || null,
    userId: ad.user_id as string,
    userName: up?.display_name as string | null,
    userPhone: up?.phone as string | null,
    auctionStartPrice: ad.auction_start_price ? Number(ad.auction_start_price) : null,
    auctionBuyNowPrice: ad.auction_buy_now_price ? Number(ad.auction_buy_now_price) : null,
    auctionEndsAt: (ad.auction_ends_at as string) || null,
    auctionStatus: (ad.auction_status as string) || null,
    bidsCount,
    highestBid,
  };
}

// ── Admin Action Logging ─────────────────────────────────────

async function logAdminAction(
  sb: ReturnType<typeof getServiceClient>,
  adminId: string,
  actionType: string,
  targetId: string | null,
  details: Record<string, unknown>,
) {
  try {
    await sb.from("admin_audit_log").insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      details,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Don't fail the main operation if logging fails
    console.warn("[admin-actions] Failed to log action:", actionType);
  }
}
