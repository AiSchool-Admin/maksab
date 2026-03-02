import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "";
  const governorate = searchParams.get("governorate") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const from = (page - 1) * limit;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
    return NextResponse.json(
      { stores: [], total: 0, error: "Server configuration missing" },
      { status: 500 },
    );
  }

  // Use service role key to bypass RLS for public store reads
  const client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey!, {
    auth: { persistSession: false },
  });

  let query = client
    .from("stores")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (category) {
    query = query.eq("main_category", category);
  }
  if (governorate) {
    query = query.eq("location_gov", governorate);
  }
  if (search) {
    // Escape SQL wildcards to prevent wildcard injection
    const sanitized = search.replace(/[%_\\]/g, "\\$&").replace(/[(),."']/g, "");
    if (sanitized.trim()) {
      query = query.ilike("name", `%${sanitized}%`);
    }
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return NextResponse.json({ stores: [], total: 0 });
  }

  // Batch-fetch stats for all stores in 3 queries instead of 3×N
  const storeIds = data.map((s) => s.id);

  let followersMap = new Map<string, number>();
  let reviewsMap = new Map<string, { count: number; avg: number }>();
  let productsMap = new Map<string, number>();

  try {
    const [followersRes, reviewsRes, productsRes] = await Promise.all([
      // Batch followers count
      client
        .from("store_followers")
        .select("store_id")
        .in("store_id", storeIds),
      // Batch reviews with ratings
      client
        .from("store_reviews")
        .select("store_id, overall_rating")
        .in("store_id", storeIds),
      // Batch product counts
      client
        .from("ads")
        .select("store_id")
        .in("store_id", storeIds)
        .eq("status", "active"),
    ]);

    // Aggregate followers
    if (followersRes.data) {
      for (const row of followersRes.data as { store_id: string }[]) {
        followersMap.set(row.store_id, (followersMap.get(row.store_id) || 0) + 1);
      }
    }

    // Aggregate reviews
    if (reviewsRes.data) {
      const reviewsByStore = new Map<string, number[]>();
      for (const row of reviewsRes.data as { store_id: string; overall_rating: number }[]) {
        if (!reviewsByStore.has(row.store_id)) reviewsByStore.set(row.store_id, []);
        reviewsByStore.get(row.store_id)!.push(Number(row.overall_rating) || 0);
      }
      for (const [storeId, ratings] of reviewsByStore) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        reviewsMap.set(storeId, { count: ratings.length, avg });
      }
    }

    // Aggregate products
    if (productsRes.data) {
      for (const row of productsRes.data as { store_id: string }[]) {
        productsMap.set(row.store_id, (productsMap.get(row.store_id) || 0) + 1);
      }
    }
  } catch {
    // Stats failed — return stores with zero stats
  }

  const stores = data.map((store) => {
    const review = reviewsMap.get(store.id);
    return {
      ...store,
      avg_rating: review ? Math.round(review.avg * 10) / 10 : 0,
      total_reviews: review?.count || 0,
      total_followers: followersMap.get(store.id) || 0,
      total_products: productsMap.get(store.id) || 0,
      total_sales: 0,
      avg_response_time: null,
      is_following: false,
      badges: [],
    };
  });

  return NextResponse.json({ stores, total: count || 0 });
}
