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
    query = query.ilike("name", `%${search}%`);
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return NextResponse.json({ stores: [], total: 0 });
  }

  // Enrich with stats — errors must not prevent store display
  const stores = await Promise.all(
    data.map(async (store) => {
      let totalFollowers = 0;
      let totalReviews = 0;
      let avgRating = 0;
      let totalProducts = 0;

      try {
        const [followers, reviews, products] = await Promise.all([
          client
            .from("store_followers")
            .select("id", { count: "exact", head: true })
            .eq("store_id", store.id)
            .then((r) => r, () => ({ count: 0 })),
          client
            .from("store_reviews")
            .select("overall_rating")
            .eq("store_id", store.id)
            .then((r) => r, () => ({ data: [] })),
          client
            .from("ads")
            .select("id", { count: "exact", head: true })
            .eq("store_id", store.id)
            .eq("status", "active")
            .then((r) => r, () => ({ count: 0 })),
        ]);

        totalFollowers = followers.count || 0;
        totalProducts = products.count || 0;

        const reviewsData = (reviews.data || []) as { overall_rating: number }[];
        totalReviews = reviewsData.length;
        avgRating =
          reviewsData.length > 0
            ? reviewsData.reduce((sum: number, r) => sum + r.overall_rating, 0) /
              reviewsData.length
            : 0;
      } catch {
        // Stats failed — return store with zero stats
      }

      return {
        ...store,
        avg_rating: Math.round(avgRating * 10) / 10,
        total_reviews: totalReviews,
        total_followers: totalFollowers,
        total_products: totalProducts,
        total_sales: 0,
        avg_response_time: null,
        is_following: false,
        badges: [],
      };
    }),
  );

  return NextResponse.json({ stores, total: count || 0 });
}
