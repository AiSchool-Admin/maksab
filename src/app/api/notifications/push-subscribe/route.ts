/**
 * POST /api/notifications/push-subscribe
 *
 * Saves a Web Push subscription for a user.
 * Called from the client after requesting push permission.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, subscription } = body;

    if (!user_id || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
    }

    const keys = subscription.keys || {};

    // Upsert subscription (one per user+endpoint)
    const { error } = await client.from("push_subscriptions").upsert(
      {
        user_id,
        endpoint: subscription.endpoint,
        keys_p256dh: keys.p256dh || "",
        keys_auth: keys.auth || "",
      },
      { onConflict: "user_id,endpoint" },
    );

    if (error) {
      console.error("Push subscription save error:", error);
      return NextResponse.json({ error: "فشل حفظ الاشتراك" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("push-subscribe error:", err);
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}
