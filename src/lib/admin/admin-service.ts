/**
 * Admin service — server-side analytics queries using service role key.
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

// ── Overview Stats ──────────────────────────────────────────────

export interface OverviewStats {
  totalUsers: number;
  individualUsers: number;
  storeUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  totalAds: number;
  activeAds: number;
  soldAds: number;
  newAdsToday: number;
  newAdsWeek: number;
  totalSoldValue: number;
  totalViews: number;
  totalStores: number;
  totalConversations: number;
  totalMessages: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const sb = getServiceClient();

  const [
    usersRes,
    individualRes,
    storeUsersRes,
    newTodayRes,
    newWeekRes,
    newMonthRes,
    totalAdsRes,
    activeAdsRes,
    soldAdsRes,
    newAdsTodayRes,
    newAdsWeekRes,
    soldValueRes,
    viewsRes,
    storesRes,
    convsRes,
    msgsRes,
  ] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("profiles").select("*", { count: "exact", head: true }).eq("seller_type", "individual"),
    sb.from("profiles").select("*", { count: "exact", head: true }).eq("seller_type", "store"),
    sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    sb.from("ads").select("*", { count: "exact", head: true }),
    sb.from("ads").select("*", { count: "exact", head: true }).eq("status", "active"),
    sb.from("ads").select("*", { count: "exact", head: true }).eq("status", "sold"),
    sb.from("ads").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    sb.from("ads").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    sb.from("ads").select("price").eq("status", "sold").not("price", "is", null),
    sb.from("ads").select("views_count"),
    sb.from("stores").select("*", { count: "exact", head: true }).eq("status", "active"),
    sb.from("conversations").select("*", { count: "exact", head: true }),
    sb.from("messages").select("*", { count: "exact", head: true }),
  ]);

  // Calculate sold value
  let totalSoldValue = 0;
  if (soldValueRes.data) {
    for (const row of soldValueRes.data as { price: number }[]) {
      totalSoldValue += Number(row.price) || 0;
    }
  }

  // Calculate total views
  let totalViews = 0;
  if (viewsRes.data) {
    for (const row of viewsRes.data as { views_count: number }[]) {
      totalViews += Number(row.views_count) || 0;
    }
  }

  return {
    totalUsers: usersRes.count || 0,
    individualUsers: individualRes.count || 0,
    storeUsers: storeUsersRes.count || 0,
    newUsersToday: newTodayRes.count || 0,
    newUsersWeek: newWeekRes.count || 0,
    newUsersMonth: newMonthRes.count || 0,
    totalAds: totalAdsRes.count || 0,
    activeAds: activeAdsRes.count || 0,
    soldAds: soldAdsRes.count || 0,
    newAdsToday: newAdsTodayRes.count || 0,
    newAdsWeek: newAdsWeekRes.count || 0,
    totalSoldValue,
    totalViews,
    totalStores: storesRes.count || 0,
    totalConversations: convsRes.count || 0,
    totalMessages: msgsRes.count || 0,
  };
}

// ── Ads by Category ─────────────────────────────────────────────

export interface CategoryBreakdown {
  categoryId: string;
  count: number;
  activeCount: number;
  soldCount: number;
  totalValue: number;
}

export async function getAdsByCategory(): Promise<CategoryBreakdown[]> {
  const sb = getServiceClient();
  const { data } = await sb.from("ads").select("category_id, status, price");
  if (!data) return [];

  const map = new Map<string, CategoryBreakdown>();
  for (const row of data as { category_id: string; status: string; price: number | null }[]) {
    const cat = row.category_id || "other";
    if (!map.has(cat)) {
      map.set(cat, { categoryId: cat, count: 0, activeCount: 0, soldCount: 0, totalValue: 0 });
    }
    const entry = map.get(cat)!;
    entry.count++;
    if (row.status === "active") entry.activeCount++;
    if (row.status === "sold") {
      entry.soldCount++;
      entry.totalValue += Number(row.price) || 0;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ── Ads by Governorate ──────────────────────────────────────────

export interface GovernorateBreakdown {
  governorate: string;
  count: number;
  activeCount: number;
}

export async function getAdsByGovernorate(): Promise<GovernorateBreakdown[]> {
  const sb = getServiceClient();
  const { data } = await sb.from("ads").select("governorate, status");
  if (!data) return [];

  const map = new Map<string, GovernorateBreakdown>();
  for (const row of data as { governorate: string; status: string }[]) {
    const gov = row.governorate || "غير محدد";
    if (!map.has(gov)) {
      map.set(gov, { governorate: gov, count: 0, activeCount: 0 });
    }
    const entry = map.get(gov)!;
    entry.count++;
    if (row.status === "active") entry.activeCount++;
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ── Ads by Sale Type ────────────────────────────────────────────

export interface SaleTypeBreakdown {
  saleType: string;
  count: number;
  totalValue: number;
}

export async function getAdsBySaleType(): Promise<SaleTypeBreakdown[]> {
  const sb = getServiceClient();
  const { data } = await sb.from("ads").select("sale_type, price, status");
  if (!data) return [];

  const map = new Map<string, SaleTypeBreakdown>();
  for (const row of data as { sale_type: string; price: number | null; status: string }[]) {
    const st = row.sale_type || "cash";
    if (!map.has(st)) {
      map.set(st, { saleType: st, count: 0, totalValue: 0 });
    }
    const entry = map.get(st)!;
    entry.count++;
    if (row.status === "sold") {
      entry.totalValue += Number(row.price) || 0;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ── Recent Users ────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  governorate: string | null;
  sellerType: "individual" | "store";
  storeId: string | null;
  totalAds: number;
  rating: number;
  isAdmin: boolean;
  createdAt: string;
}

export async function getUsers(page = 1, limit = 20, search?: string): Promise<{ users: AdminUser[]; total: number }> {
  const sb = getServiceClient();
  let query = sb.from("profiles").select("*", { count: "exact" });

  if (search) {
    query = query.or(`phone.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (!data) return { users: [], total: 0 };

  const users = (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    phone: (row.phone as string) || "",
    displayName: (row.display_name as string) || null,
    avatarUrl: (row.avatar_url as string) || null,
    governorate: (row.governorate as string) || null,
    sellerType: (row.seller_type as "individual" | "store") || "individual",
    storeId: (row.store_id as string) || null,
    totalAds: Number(row.total_ads_count) || 0,
    rating: Number(row.rating) || 0,
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at as string,
  }));

  return { users, total: count || 0 };
}

// ── Recent Ads ──────────────────────────────────────────────────

export interface AdminAd {
  id: string;
  title: string;
  price: number | null;
  saleType: string;
  status: string;
  categoryId: string;
  governorate: string | null;
  viewsCount: number;
  favoritesCount: number;
  image: string | null;
  createdAt: string;
  userName: string | null;
}

export async function getAds(page = 1, limit = 20, filters?: {
  category?: string;
  status?: string;
  sale_type?: string;
  governorate?: string;
  search?: string;
}): Promise<{ ads: AdminAd[]; total: number }> {
  const sb = getServiceClient();
  let query = sb.from("ads").select("*", { count: "exact" });

  if (filters?.category) query = query.eq("category_id", filters.category);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.sale_type) query = query.eq("sale_type", filters.sale_type);
  if (filters?.governorate) query = query.eq("governorate", filters.governorate);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (!data) return { ads: [], total: 0 };

  const ads = (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || "",
    price: row.price ? Number(row.price) : null,
    saleType: (row.sale_type as string) || "cash",
    status: (row.status as string) || "active",
    categoryId: (row.category_id as string) || "",
    governorate: (row.governorate as string) || null,
    viewsCount: Number(row.views_count) || 0,
    favoritesCount: Number(row.favorites_count) || 0,
    image: ((row.images as string[]) ?? [])[0] ?? null,
    createdAt: row.created_at as string,
    userName: null,
  }));

  return { ads, total: count || 0 };
}

// ── Growth over time (last 30 days) ─────────────────────────────

export interface DailyGrowth {
  date: string;
  users: number;
  ads: number;
}

export async function getDailyGrowth(days = 30): Promise<DailyGrowth[]> {
  const sb = getServiceClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [usersRes, adsRes] = await Promise.all([
    sb.from("profiles").select("created_at").gte("created_at", since),
    sb.from("ads").select("created_at").gte("created_at", since),
  ]);

  // Group by date
  const map = new Map<string, DailyGrowth>();
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    const key = d.toISOString().split("T")[0];
    map.set(key, { date: key, users: 0, ads: 0 });
  }

  if (usersRes.data) {
    for (const row of usersRes.data as { created_at: string }[]) {
      const key = row.created_at.split("T")[0];
      if (map.has(key)) map.get(key)!.users++;
    }
  }

  if (adsRes.data) {
    for (const row of adsRes.data as { created_at: string }[]) {
      const key = row.created_at.split("T")[0];
      if (map.has(key)) map.get(key)!.ads++;
    }
  }

  return Array.from(map.values());
}

// ── Verify admin ────────────────────────────────────────────────

export async function verifyAdmin(userId: string): Promise<boolean> {
  const sb = getServiceClient();
  const { data } = await sb
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return Boolean((data as Record<string, unknown>)?.is_admin);
}
