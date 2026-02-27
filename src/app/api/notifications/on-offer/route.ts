/**
 * POST /api/notifications/on-offer
 *
 * Triggered after a price offer action (submit, accept, reject, counter).
 * Creates in-app notification + push notification for the recipient.
 * Requires authentication via session token.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import { notifyPriceOffer } from "@/lib/notifications/smart-notifications";

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
