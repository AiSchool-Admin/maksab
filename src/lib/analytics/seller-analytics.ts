/**
 * Seller Analytics Service — مكسب
 *
 * Fetches seller-specific analytics data:
 * - KPI cards (total views, total messages, total ads, total sales)
 * - Views trend (last 30 days)
 * - Top performing ads
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface SellerKPIs {
  totalViews: number;
  totalMessages: number;
  totalAds: number;
  totalSales: number;
  activeAds: number;
}

export interface ViewsTrendPoint {
  date: string;
  views: number;
}

export interface TopAd {
  id: string;
  title: string;
  image: string | null;
  views: number;
  favorites: number;
  messages: number;
  price: number | null;
  status: string;
  createdAt: string;
}

export interface SellerAnalyticsData {
  kpis: SellerKPIs;
  viewsTrend: ViewsTrendPoint[];
  topAds: TopAd[];
}

// ── Fetchers ───────────────────────────────────────────

/**
 * Fetch all analytics data for a seller.
 */
export async function getSellerAnalytics(userId: string): Promise<SellerAnalyticsData> {
  const [kpis, topAds] = await Promise.all([
    fetchKPIs(userId),
    fetchTopAds(userId),
  ]);

  // Generate a synthetic views trend from top ads data
  const viewsTrend = generateViewsTrend(kpis.totalViews);

  return { kpis, viewsTrend, topAds };
}

async function fetchKPIs(userId: string): Promise<SellerKPIs> {
  // Fetch ads with counts
  const { data: ads } = await supabase
    .from("ads" as never)
    .select("id, status, views_count, favorites_count" as never)
    .eq("user_id" as never, userId as never);

  const adsList = (ads as unknown as Array<{
    id: string;
    status: string;
    views_count: number;
    favorites_count: number;
  }>) || [];

  const totalViews = adsList.reduce((sum, ad) => sum + (ad.views_count || 0), 0);
  const totalAds = adsList.length;
  const activeAds = adsList.filter((a) => a.status === "active").length;
  const totalSales = adsList.filter((a) => a.status === "sold").length;

  // Fetch conversations as proxy for messages
  const { count: messagesCount } = await supabase
    .from("conversations" as never)
    .select("id" as never, { count: "exact", head: true } as never)
    .eq("seller_id" as never, userId as never);

  return {
    totalViews,
    totalMessages: messagesCount || 0,
    totalAds,
    totalSales,
    activeAds,
  };
}

async function fetchTopAds(userId: string): Promise<TopAd[]> {
  const { data } = await supabase
    .from("ads" as never)
    .select("id, title, images, views_count, favorites_count, price, status, created_at" as never)
    .eq("user_id" as never, userId as never)
    .order("views_count" as never, { ascending: false } as never)
    .limit(10);

  if (!data) return [];

  return (data as unknown as Array<{
    id: string;
    title: string;
    images: string[];
    views_count: number;
    favorites_count: number;
    price: number | null;
    status: string;
    created_at: string;
  }>).map((ad) => ({
    id: ad.id,
    title: ad.title,
    image: ad.images?.[0] || null,
    views: ad.views_count || 0,
    favorites: ad.favorites_count || 0,
    messages: 0,
    price: ad.price,
    status: ad.status,
    createdAt: ad.created_at,
  }));
}

/**
 * Generate synthetic daily views trend (last 30 days).
 * In production, this would query a views_log table.
 */
function generateViewsTrend(totalViews: number): ViewsTrendPoint[] {
  const points: ViewsTrendPoint[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Distribute views roughly across 30 days with some variance
    const dailyBase = Math.max(0, Math.round(totalViews / 30));
    const variance = Math.round(dailyBase * 0.4 * (Math.random() - 0.5));
    const views = Math.max(0, dailyBase + variance);

    points.push({
      date: date.toISOString().slice(0, 10),
      views,
    });
  }

  return points;
}
