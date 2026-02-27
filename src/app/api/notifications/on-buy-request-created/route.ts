/**
 * POST /api/notifications/on-buy-request-created
 *
 * Triggered after a new buy request is created.
 * Finds sellers with matching ads and notifies them about a potential buyer.
 * Requires authentication via session token.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import { notifyMatchingSellers } from "@/lib/notifications/smart-notifications";

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
    const { buyRequest } = body;

    if (!buyRequest || !buyRequest.id || !buyRequest.category_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const count = await notifyMatchingSellers({
      id: buyRequest.id,
      title: buyRequest.title || "",
      category_id: buyRequest.category_id,
      subcategory_id: buyRequest.subcategory_id || null,
      purchase_type: buyRequest.purchase_type || "cash",
      budget_min: buyRequest.budget_min ? Number(buyRequest.budget_min) : null,
      budget_max: buyRequest.budget_max ? Number(buyRequest.budget_max) : null,
      governorate: buyRequest.governorate || null,
      user_id: session.userId, // Use authenticated user ID, not from body
    });

    return NextResponse.json({ success: true, notified: count });
  } catch (err) {
    console.error("on-buy-request-created notification error:", err);
    return NextResponse.json({ error: "خطأ في الإشعارات" }, { status: 500 });
  }
}
