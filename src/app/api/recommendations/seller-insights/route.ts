/**
 * Seller Insights API — real data about potential buyers
 * "إعلانك ممكن يهم دول"
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, subcategoryId, governorate, brand } = body;

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc("get_seller_insights" as never, {
      p_category_id: categoryId,
      p_subcategory_id: subcategoryId || null,
      p_governorate: governorate || null,
      p_brand: brand || null,
    } as never);

    if (error) {
      // Fallback: count signals manually
      const { count: catCount } = await supabase
        .from("user_signals" as never)
        .select("user_id", { count: "exact", head: true })
        .eq("category_id", categoryId);

      return NextResponse.json({
        categorySearchers: catCount || 0,
        specificSearchers: 0,
        locationInterested: 0,
      });
    }

    const rows = (data as Record<string, unknown>[]) || [];
    const row = rows[0] || {};

    return NextResponse.json({
      categorySearchers: Number(row.category_searchers) || 0,
      specificSearchers: Number(row.specific_searchers) || 0,
      locationInterested: Number(row.location_interested) || 0,
    });
  } catch (err) {
    console.error("Seller insights error:", err);
    return NextResponse.json({
      categorySearchers: 0,
      specificSearchers: 0,
      locationInterested: 0,
    });
  }
}
