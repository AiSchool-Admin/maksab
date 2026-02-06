/**
 * Supabase Edge Function: get-recommendations
 * Returns personalized ad recommendations based on user signals.
 *
 * Called as: POST /functions/v1/get-recommendations
 * Body: { user_id: string, limit?: number }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const { user_id, limit = 20 } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Get user's recent signals (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: signals } = await supabase
      .from("user_signals")
      .select("category_id, subcategory_id, signal_data, governorate, weight")
      .eq("user_id", user_id)
      .gte("created_at", thirtyDaysAgo)
      .order("weight", { ascending: false })
      .limit(100);

    if (!signals || signals.length === 0) {
      // Fallback: return popular/recent ads
      const { data: fallbackAds } = await supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .neq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      return new Response(
        JSON.stringify({ ads: fallbackAds ?? [], has_signals: false }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Aggregate interest clusters from signals
    const interests = new Map<
      string,
      {
        category_id: string;
        subcategory_id: string | null;
        brand: string | null;
        total_weight: number;
        governorates: string[];
        price_min: number | null;
        price_max: number | null;
      }
    >();

    for (const sig of signals) {
      if (!sig.category_id) continue;
      const key = `${sig.category_id}:${sig.subcategory_id || ""}`;

      if (!interests.has(key)) {
        interests.set(key, {
          category_id: sig.category_id,
          subcategory_id: sig.subcategory_id,
          brand: null,
          total_weight: 0,
          governorates: [],
          price_min: null,
          price_max: null,
        });
      }

      const interest = interests.get(key)!;
      interest.total_weight += sig.weight;

      // Extract brand
      const brand = sig.signal_data?.brand as string | undefined;
      if (brand && !interest.brand) interest.brand = brand;

      // Track governorate
      if (sig.governorate) interest.governorates.push(sig.governorate);

      // Track price
      const price = sig.signal_data?.price as number | undefined;
      if (price) {
        if (!interest.price_min || price < interest.price_min)
          interest.price_min = price;
        if (!interest.price_max || price > interest.price_max)
          interest.price_max = price;
      }
    }

    // 3. Get top 5 interest clusters
    const topInterests = [...interests.values()]
      .sort((a, b) => b.total_weight - a.total_weight)
      .slice(0, 5);

    // 4. Query matching ads for each interest cluster
    const allMatchingAds: Record<string, unknown>[] = [];
    const seenIds = new Set<string>();

    for (const interest of topInterests) {
      let query = supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .eq("category_id", interest.category_id)
        .neq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(Math.ceil(limit / topInterests.length));

      if (interest.subcategory_id) {
        query = query.eq("subcategory_id", interest.subcategory_id);
      }

      // Price range with 30% flexibility
      if (interest.price_min != null && interest.price_max != null) {
        query = query
          .gte("price", interest.price_min * 0.7)
          .lte("price", interest.price_max * 1.3);
      }

      const { data: ads } = await query;

      if (ads) {
        for (const ad of ads) {
          const id = ad.id as string;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            allMatchingAds.push(ad);
          }
        }
      }
    }

    // 5. Return results
    return new Response(
      JSON.stringify({
        ads: allMatchingAds.slice(0, limit),
        has_signals: true,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
