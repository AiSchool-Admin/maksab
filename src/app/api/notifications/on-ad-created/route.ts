/**
 * POST /api/notifications/on-ad-created
 *
 * Triggered after a new ad is created.
 * Finds buyers who searched for similar items and notifies them.
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyMatchingBuyers } from "@/lib/notifications/smart-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ad } = body;

    if (!ad || !ad.id || !ad.category_id || !ad.user_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // Fire and forget — don't block the response
    const count = await notifyMatchingBuyers({
      id: ad.id,
      title: ad.title || "",
      category_id: ad.category_id,
      subcategory_id: ad.subcategory_id || null,
      sale_type: ad.sale_type || "cash",
      price: ad.price ? Number(ad.price) : null,
      governorate: ad.governorate || null,
      user_id: ad.user_id,
      category_fields: ad.category_fields || {},
    });

    return NextResponse.json({ success: true, notified: count });
  } catch (err) {
    console.error("on-ad-created notification error:", err);
    return NextResponse.json({ error: "خطأ في الإشعارات" }, { status: 500 });
  }
}
