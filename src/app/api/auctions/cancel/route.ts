/**
 * POST /api/auctions/cancel
 * Cancel an active auction — seller only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "لازم تسجل دخول الأول" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const body = await request.json();
    const { ad_id } = body;

    if (!ad_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
    }

    // Fetch ad and verify ownership
    const { data: adData, error: adError } = await client
      .from("ads")
      .select("id, user_id, sale_type, auction_status, title")
      .eq("id", ad_id)
      .maybeSingle();

    if (adError || !adData) {
      return NextResponse.json({ error: "الإعلان مش موجود" }, { status: 404 });
    }

    const ad = adData as Record<string, unknown>;

    if (ad.user_id !== session.userId) {
      return NextResponse.json({ error: "مش مسموح — أنت مش صاحب الإعلان" }, { status: 403 });
    }

    if (ad.sale_type !== "auction" || ad.auction_status !== "active") {
      return NextResponse.json({ error: "المزاد مش نشط" }, { status: 400 });
    }

    // Atomic update: only cancel if still active
    const { data: updated, error: updateError } = await client
      .from("ads")
      .update({ auction_status: "cancelled" } as never)
      .eq("id", ad_id)
      .eq("auction_status", "active")
      .select("id");

    if (updateError || !updated || (updated as unknown[]).length === 0) {
      return NextResponse.json({ error: "المزاد اتغير حالته — جرب تاني" }, { status: 409 });
    }

    // Notify bidders that the auction was cancelled (fire and forget)
    (async () => {
      try {
        const { data: bids } = await client
          .from("auction_bids")
          .select("bidder_id")
          .eq("ad_id", ad_id);

        if (bids && (bids as unknown[]).length > 0) {
          const bidderIds = [...new Set((bids as Record<string, unknown>[]).map((b) => b.bidder_id as string))];
          const notifications = bidderIds.map((bidderId) => ({
            user_id: bidderId,
            type: "auction_cancelled" as const,
            title: "مزاد ملغي",
            body: `البائع لغى المزاد على "${ad.title as string}"`,
            ad_id,
            data: {},
          }));
          await client.from("notifications").insert(notifications);
        }
      } catch (err) {
        console.warn("[auctions/cancel] notify bidders failed:", err);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel auction API error:", err);
    return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
  }
}
