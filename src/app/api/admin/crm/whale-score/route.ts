/**
 * Whale Score V2 API
 * POST — تشغيل خوارزمية Whale Score V2 على كل البائعين
 * GET — إحصائيات التوزيع الحالي
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    // Try the V2 RPC function first
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "calculate_whale_scores_v2"
    );

    if (!rpcError && rpcResult) {
      const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
      return NextResponse.json({
        success: true,
        message: "تم تحديث whale_score لكل البائعين بالخوارزمية V2",
        result: {
          total_updated: result.total_updated,
          tiers: {
            whale: result.whales,
            big: result.big,
            medium: result.medium,
            small: result.small,
          },
        },
      });
    }

    // Fallback: run the SQL directly if RPC not available yet
    // Step 1: Update whale_score
    const { error: scoreError } = await supabase.rpc("calculate_whale_scores_v2_fallback" as string).then(
      () => ({ error: null }),
      () => ({ error: true })
    );

    // If RPC fallback also fails, use raw SQL via individual updates
    // This approach works without RPC by using Supabase's query builder
    if (rpcError || scoreError) {
      // We'll batch update using the Supabase client
      // First get all sellers
      const { count: totalCount } = await supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true });

      // Update in batches using individual conditions
      // Batch 1: whale_score calculation
      // Since Supabase JS doesn't support CASE in updates, we need to do it in groups

      // Group: total_listings_seen >= 50
      const updates = [
        // Score by total_listings_seen (base scores)
        { filter: "total_listings_seen.gte.50", scoreBase: 40 },
        { filter: "total_listings_seen.gte.20,total_listings_seen.lt.50", scoreBase: 25 },
        { filter: "total_listings_seen.gte.10,total_listings_seen.lt.20", scoreBase: 15 },
        { filter: "total_listings_seen.lt.10", scoreBase: 5 },
      ];

      // Since we can't do CASE statements via the Supabase JS client easily,
      // let's use a simpler approach: run the SQL via a temporary edge function
      // or just report that the migration needs to be applied

      return NextResponse.json({
        success: false,
        message: "الدالة calculate_whale_scores_v2 مش موجودة في قاعدة البيانات. لازم تطبّق الـ migration الأول.",
        migration_file: "supabase/migrations/00074_whale_score_v2.sql",
        manual_sql: `
-- شغّل الأوامر دي في Supabase SQL Editor:

-- 1. حساب whale_score
UPDATE ahe_sellers SET whale_score = (
  CASE
    WHEN total_listings_seen >= 50 THEN 40
    WHEN total_listings_seen >= 20 THEN 25
    WHEN total_listings_seen >= 10 THEN 15
    ELSE 5
  END +
  CASE
    WHEN active_listings >= 20 THEN 30
    WHEN active_listings >= 10 THEN 20
    WHEN active_listings >= 5 THEN 10
    ELSE 3
  END +
  CASE WHEN is_business = true THEN 20 ELSE 0 END +
  CASE WHEN is_verified = true THEN 10 ELSE 0 END
);

-- 2. تحديث seller_tier
UPDATE ahe_sellers SET seller_tier =
  CASE
    WHEN whale_score >= 70 THEN 'whale'
    WHEN whale_score >= 40 THEN 'big'
    WHEN whale_score >= 20 THEN 'medium'
    ELSE 'small'
  END;

-- 3. شوف النتيجة
SELECT seller_tier, COUNT(*), AVG(whale_score)::int as avg_score
FROM ahe_sellers GROUP BY seller_tier ORDER BY avg_score DESC;
        `,
        rpc_error: rpcError?.message,
        total_sellers: totalCount,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    // Get current tier distribution
    const [whaleRes, bigRes, mediumRes, smallRes, totalRes, withPhoneRes] =
      await Promise.all([
        supabase
          .from("ahe_sellers")
          .select("id", { count: "exact", head: true })
          .eq("seller_tier", "whale"),
        supabase
          .from("ahe_sellers")
          .select("id", { count: "exact", head: true })
          .eq("seller_tier", "big"),
        supabase
          .from("ahe_sellers")
          .select("id", { count: "exact", head: true })
          .eq("seller_tier", "medium"),
        supabase
          .from("ahe_sellers")
          .select("id", { count: "exact", head: true })
          .eq("seller_tier", "small"),
        supabase
          .from("ahe_sellers")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("ahe_sellers")
          .select("id", { count: "exact", head: true })
          .not("phone", "is", null),
      ]);

    // Get top whales sample
    const { data: topWhales } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, whale_score, seller_tier, total_listings_seen, active_listings, is_business, is_verified, primary_category, primary_governorate")
      .order("whale_score", { ascending: false })
      .limit(10);

    // Score distribution
    const { data: scoreDistribution } = await supabase
      .from("ahe_sellers")
      .select("whale_score")
      .order("whale_score", { ascending: false });

    const avgScore = scoreDistribution
      ? Math.round(
          scoreDistribution.reduce((sum, s) => sum + (s.whale_score || 0), 0) /
            scoreDistribution.length
        )
      : 0;

    return NextResponse.json({
      total_sellers: totalRes.count || 0,
      with_phone: withPhoneRes.count || 0,
      tiers: {
        whale: whaleRes.count || 0,
        big: bigRes.count || 0,
        medium: mediumRes.count || 0,
        small: smallRes.count || 0,
      },
      avg_whale_score: avgScore,
      top_whales: topWhales || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
