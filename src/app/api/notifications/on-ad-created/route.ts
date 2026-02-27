/**
 * POST /api/notifications/on-ad-created
 *
 * Triggered after a new ad is created.
 * 1. Finds users who searched for similar items and notifies them.
 * 2. Finds buy requests matching this ad and notifies the buyers.
 * Requires authentication via session token.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import {
  notifyMatchingBuyers,
  notifyBuyRequestMatches,
  notifyExchangeMatch,
} from "@/lib/notifications/smart-notifications";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication — only logged-in users can trigger notifications
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const body = await request.json();
    const { ad } = body;

    if (!ad || !ad.id || !ad.category_id) {
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
      user_id: session.userId, // Use authenticated user ID, not from body
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
