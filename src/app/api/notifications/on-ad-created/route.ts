/**
 * POST /api/notifications/on-ad-created
 *
 * Triggered after a new ad is created.
 * 1. Finds users who searched for similar items and notifies them.
 * 2. Finds buy requests matching this ad and notifies the buyers.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  notifyMatchingBuyers,
  notifyBuyRequestMatches,
  notifyExchangeMatch,
} from "@/lib/notifications/smart-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ad } = body;

    if (!ad || !ad.id || !ad.category_id || !ad.user_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const adData = {
      id: ad.id,
      title: ad.title || "",
      category_id: ad.category_id,
      subcategory_id: ad.subcategory_id || null,
      sale_type: ad.sale_type || "cash",
      price: ad.price ? Number(ad.price) : null,
      governorate: ad.governorate || null,
      user_id: ad.user_id,
      category_fields: ad.category_fields || {},
    };

    // Run all notifications in parallel
    const [signalMatchCount, buyRequestMatchCount, exchangeMatchCount] = await Promise.all([
      notifyMatchingBuyers(adData),
      notifyBuyRequestMatches(adData),
      ad.sale_type === "exchange" ? notifyExchangeMatch(adData) : Promise.resolve(0),
    ]);

    return NextResponse.json({
      success: true,
      signalMatches: signalMatchCount,
      buyRequestMatches: buyRequestMatchCount,
      exchangeMatches: exchangeMatchCount,
    });
  } catch (err) {
    console.error("on-ad-created notification error:", err);
    return NextResponse.json({ error: "خطأ في الإشعارات" }, { status: 500 });
  }
}
