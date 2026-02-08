/**
 * POST /api/auctions/buy-now
 * Buy now on an auction ad — ends the auction immediately.
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
    const { ad_id, buyer_id, buyer_name } = body;

    if (!ad_id || !buyer_id) {
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

    // Fetch bids for state
    const { data: bidsData } = await client
      .from("auction_bids")
      .select("*")
      .eq("ad_id", ad_id)
      .order("amount", { ascending: false })
      .limit(20);

    const bids = ((bidsData as Record<string, unknown>[]) || []).map((b) => ({
      id: b.id as string,
      adId: b.ad_id as string,
      bidderId: b.bidder_id as string,
      bidderName: "مزايد",
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
