/**
 * POST /api/auctions/buy-now
 * Buy now on an auction ad — ends the auction immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";
import { notifyBuyNow } from "@/lib/notifications/smart-notifications";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ad_id, buyer_id: bodyBuyerId, buyer_name, session_token } = body;

    // Authenticate via session token
    let buyer_id: string;
    if (session_token) {
      const tokenResult = verifySessionToken(session_token);
      if (!tokenResult.valid) {
        return NextResponse.json({ error: tokenResult.error }, { status: 401 });
      }
      buyer_id = tokenResult.userId;
      if (bodyBuyerId && bodyBuyerId !== buyer_id) {
        return NextResponse.json({ error: "بيانات المصادقة مش متطابقة" }, { status: 403 });
      }
    } else if (bodyBuyerId) {
      buyer_id = bodyBuyerId;
    } else {
      return NextResponse.json({ error: "مطلوب توكن الجلسة" }, { status: 401 });
    }

    if (!ad_id) {
      return NextResponse.json(
        { error: "بيانات ناقصة" },
        { status: 400 },
      );
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json(
        { error: "خطأ في الخادم" },
        { status: 500 },
      );
    }

    // Fetch ad
    const { data: adData, error: adError } = await client
      .from("ads")
      .select("*")
      .eq("id", ad_id)
      .single();

    if (adError || !adData) {
      return NextResponse.json(
        { error: "المزاد مش موجود" },
        { status: 404 },
      );
    }

    const ad = adData as Record<string, unknown>;

    // Validate
    if (ad.sale_type !== "auction" || ad.auction_status !== "active") {
      return NextResponse.json(
        { error: "المزاد مش نشط" },
        { status: 400 },
      );
    }

    if (!ad.auction_buy_now_price) {
      return NextResponse.json(
        { error: "مفيش سعر شراء فوري لهذا المزاد" },
        { status: 400 },
      );
    }

    if (ad.user_id === buyer_id) {
      return NextResponse.json(
        { error: "مش ممكن تشتري إعلانك" },
        { status: 400 },
      );
    }

    // Update ad: set status to bought_now, set winner
    const { error: updateError } = await client
      .from("ads")
      .update({
        auction_status: "bought_now",
        auction_winner_id: buyer_id,
        status: "sold",
      } as never)
      .eq("id", ad_id);

    if (updateError) {
      console.error("Buy-now update error:", updateError);
      return NextResponse.json(
        { error: "حصل مشكلة. جرب تاني" },
        { status: 500 },
      );
    }

    // Notify seller + other bidders (fire and forget)
    notifyBuyNow({
      adId: ad_id,
      adTitle: (ad.title as string) || "",
      sellerId: ad.user_id as string,
      buyerId: buyer_id,
      buyerName: buyer_name || "مشتري",
      buyNowPrice: Number(ad.auction_buy_now_price),
    }).catch(() => {});

    // Fetch bids for state
    const { data: bidsData } = await client
      .from("auction_bids")
      .select("*")
      .eq("ad_id", ad_id)
      .order("amount", { ascending: false })
      .limit(20);

    // Batch-fetch bidder names from profiles
    const bidRows = (bidsData as Record<string, unknown>[]) || [];
    const bidderIds = [...new Set(bidRows.map((b) => b.bidder_id as string))];
    const bidderNames = new Map<string, string>();
    if (bidderIds.length > 0) {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, display_name")
        .in("id", bidderIds);
      if (profiles) {
        for (const p of profiles as Record<string, unknown>[]) {
          bidderNames.set(p.id as string, (p.display_name as string) || "مزايد");
        }
      }
    }

    const bids = bidRows.map((b) => ({
      id: b.id as string,
      adId: b.ad_id as string,
      bidderId: b.bidder_id as string,
      bidderName: bidderNames.get(b.bidder_id as string) || "مزايد",
      amount: Number(b.amount),
      createdAt: b.created_at as string,
    }));

    return NextResponse.json({
      success: true,
      auctionState: {
        adId: ad_id,
        status: "bought_now",
        startPrice: Number(ad.auction_start_price),
        buyNowPrice: Number(ad.auction_buy_now_price),
        currentHighestBid: Number(ad.auction_buy_now_price),
        highestBidderName: buyer_name || "مشتري",
        highestBidderId: buyer_id,
        bidsCount: bids.length,
        minIncrement: Number(ad.auction_min_increment) || 50,
        endsAt: ad.auction_ends_at,
        originalEndsAt: ad.auction_ends_at,
        bids,
        winnerId: buyer_id,
        winnerName: buyer_name || "مشتري",
        wasExtended: false,
      },
    });
  } catch (err) {
    console.error("Buy-now API error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
