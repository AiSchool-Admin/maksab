/**
 * POST /api/auctions/extend
 * Extend an active auction's end time — seller only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";

const ALLOWED_EXTENSIONS_HOURS = [12, 24, 48];

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
    const { ad_id, hours } = body;

    if (!ad_id || !hours) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const extensionHours = Number(hours);
    if (!ALLOWED_EXTENSIONS_HOURS.includes(extensionHours)) {
      return NextResponse.json(
        { error: `مدة التمديد لازم تكون ${ALLOWED_EXTENSIONS_HOURS.join(" أو ")} ساعة` },
        { status: 400 },
      );
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
    }

    // Fetch ad and verify ownership
    const { data: adData, error: adError } = await client
      .from("ads")
      .select("id, user_id, sale_type, auction_status, auction_ends_at, title")
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

    // Calculate new end time: extend from current ends_at (or now if already passed)
    const currentEndsAt = ad.auction_ends_at
      ? new Date(ad.auction_ends_at as string).getTime()
      : Date.now();
    const base = Math.max(currentEndsAt, Date.now());
    const newEndsAt = new Date(base + extensionHours * 3600000).toISOString();

    // Atomic update: only extend if still active
    const { data: updated, error: updateError } = await client
      .from("ads")
      .update({ auction_ends_at: newEndsAt } as never)
      .eq("id", ad_id)
      .eq("auction_status", "active")
      .select("id, auction_ends_at");

    if (updateError || !updated || (updated as unknown[]).length === 0) {
      return NextResponse.json({ error: "المزاد اتغير حالته — جرب تاني" }, { status: 409 });
    }

    // Notify bidders about extension (fire and forget)
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
            type: "auction_extended" as const,
            title: "المزاد اتمدد ⏰",
            body: `البائع مدد المزاد على "${ad.title as string}" بـ ${extensionHours} ساعة`,
            ad_id,
            data: { new_ends_at: newEndsAt },
          }));
          await client.from("notifications").insert(notifications);
        }
      } catch (err) {
        console.warn("[auctions/extend] notify bidders failed:", err);
      }
    })();

    return NextResponse.json({
      success: true,
      newEndsAt: (updated as Record<string, unknown>[])[0].auction_ends_at,
    });
  } catch (err) {
    console.error("Extend auction API error:", err);
    return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
  }
}
