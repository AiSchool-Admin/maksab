/**
 * POST /api/ads/auto-price-drop
 * Calculate and optionally apply smart auto price drop for an ad.
 * Also used by the background worker to process all eligible ads.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateSmartPriceDrop } from "@/lib/ai/chat-intelligence";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ad_id, apply } = body;

    if (!ad_id) {
      return NextResponse.json({ error: "ad_id مطلوب" }, { status: 400 });
    }

    // Fetch ad data
    const { data: ad, error: adErr } = await supabase
      .from("ads")
      .select("id, title, price, category_id, category_fields, views_count, favorites_count, created_at, user_id")
      .eq("id", ad_id)
      .eq("status", "active")
      .eq("sale_type", "cash")
      .single();

    if (adErr || !ad) {
      return NextResponse.json({ error: "الإعلان مش موجود أو مش نقدي" }, { status: 404 });
    }

    if (!ad.price || ad.price <= 0) {
      return NextResponse.json({ error: "الإعلان مالوش سعر" }, { status: 400 });
    }

    // Check if auto-price-drop is enabled for this ad
    const autoDropEnabled = (ad.category_fields as Record<string, unknown>)?.auto_price_drop === true;

    const daysListed = Math.floor(
      (Date.now() - new Date(ad.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get original price (stored when auto-drop was first enabled)
    const originalPrice =
      ((ad.category_fields as Record<string, unknown>)?.original_price as number) || ad.price;

    const suggestion = await calculateSmartPriceDrop({
      currentPrice: ad.price,
      originalPrice,
      daysListed,
      viewsCount: ad.views_count || 0,
      favoritesCount: ad.favorites_count || 0,
      categoryId: ad.category_id,
      categoryFields: (ad.category_fields as Record<string, unknown>) || {},
      title: ad.title,
    });

    // If apply=true and auto-drop is enabled, update the price
    if (apply && autoDropEnabled && suggestion.shouldDrop) {
      const oldPrice = ad.price;
      const newPrice = suggestion.suggestedNewPrice;

      // Update price
      await supabase
        .from("ads")
        .update({
          price: newPrice,
          updated_at: new Date().toISOString(),
          category_fields: {
            ...(ad.category_fields as Record<string, unknown>),
            auto_price_drop: true,
            original_price: originalPrice,
            last_auto_drop_at: new Date().toISOString(),
            price_drop_history: [
              ...((ad.category_fields as Record<string, unknown>)?.price_drop_history as unknown[] || []),
              { from: oldPrice, to: newPrice, date: new Date().toISOString() },
            ],
          },
        })
        .eq("id", ad_id);

      // Notify users who favorited this ad
      const { notifyPriceDrop } = await import("@/lib/notifications/smart-notifications");
      await notifyPriceDrop({
        adId: ad_id,
        adTitle: ad.title,
        oldPrice,
        newPrice,
        sellerId: ad.user_id,
      });

      return NextResponse.json({
        success: true,
        applied: true,
        suggestion,
        oldPrice,
        newPrice,
      });
    }

    return NextResponse.json({
      success: true,
      applied: false,
      suggestion,
      autoDropEnabled,
    });
  } catch (err) {
    console.error("[auto-price-drop] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "حصل مشكلة" },
      { status: 500 },
    );
  }
}
