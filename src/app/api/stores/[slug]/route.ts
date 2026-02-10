import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  // Decode Arabic slugs that may be URL-encoded
  const slug = decodeURIComponent(rawSlug);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
    return NextResponse.json(
      { error: "Server configuration missing" },
      { status: 500 },
    );
  }

  // Use service role key to bypass RLS for public store reads
  const client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey!, {
    auth: { persistSession: false },
  });

  // Get store
  const { data: store, error } = await client
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !store) {
    return NextResponse.json(
      { error: "المتجر غير موجود" },
      { status: 404 },
    );
  }

  // Get stats
  const [followers, reviews, products, badges] = await Promise.all([
    client
      .from("store_followers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id),
    client
      .from("store_reviews")
      .select("overall_rating")
      .eq("store_id", store.id),
    client
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("status", "active"),
    client
      .from("store_badges")
      .select("*")
      .eq("store_id", store.id)
      .eq("is_active", true),
  ]);

  const reviewsData = (reviews.data || []) as { overall_rating: number }[];
  const avgRating =
    reviewsData.length > 0
      ? reviewsData.reduce((sum: number, r) => sum + r.overall_rating, 0) /
        reviewsData.length
      : 0;

  return NextResponse.json({
    ...store,
    avg_rating: Math.round(avgRating * 10) / 10,
    total_reviews: reviewsData.length,
    total_followers: followers.count || 0,
    total_products: products.count || 0,
    badges: badges.data || [],
  });
}
