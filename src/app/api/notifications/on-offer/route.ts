/**
 * POST /api/notifications/on-offer
 *
 * Triggered after a price offer action (submit, accept, reject, counter).
 * Creates in-app notification + push notification for the recipient.
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyPriceOffer } from "@/lib/notifications/smart-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      ad_id,
      ad_title,
      recipient_id,
      sender_name,
      amount,
      counter_amount,
    } = body;

    if (!type || !ad_id || !recipient_id || !amount) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    await notifyPriceOffer({
      type,
      adId: ad_id,
      adTitle: ad_title || "إعلان",
      recipientId: recipient_id,
      senderName: sender_name || "مستخدم",
      amount: Number(amount),
      counterAmount: counter_amount ? Number(counter_amount) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("on-offer notification error:", err);
    return NextResponse.json({ error: "خطأ في الإشعارات" }, { status: 500 });
  }
}
