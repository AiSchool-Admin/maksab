/**
 * POST /api/auctions/bid
 * Place a bid on an auction ad.
 * Handles validation, minimum bid check, and anti-sniping extension.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyAuctionBid } from "@/lib/notifications/smart-notifications";

const ANTI_SNIPE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const MIN_INCREMENT_EGP = 50;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ad_id, bidder_id, bidder_name, amount } = body;

    if (!ad_id || !bidder_id || !amount) {
      return NextResponse.json(
        { error: "بيانات ناقصة" },
        { status: 400 },
      );
    }

    const bidAmount = Number(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return NextResponse.json(
        { error: "مبلغ المزايدة غير صالح" },
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

    // Validate auction is active
    if (ad.sale_type !== "auction" || ad.auction_status !== "active") {
      return NextResponse.json(
        { error: "المزاد مش نشط" },
        { status: 400 },
      );
    }

    // Check seller can't bid on own auction
    if (ad.user_id === bidder_id) {
      return NextResponse.json(
        { error: "مش ممكن تزايد على إعلانك" },
        { status: 400 },
      );
    }

    // Check auction hasn't ended
    const endsAt = new Date(ad.auction_ends_at as string).getTime();
    const now = Date.now();
    if (now >= endsAt) {
      return NextResponse.json(
        { error: "المزاد انتهى" },
        { status: 400 },
      );
    }

    // Get current highest bid
    const { data: topBid } = await client
      .from("auction_bids")
      .select("amount, bidder_id")
      .eq("ad_id", ad_id)
      .order("amount", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentPrice = topBid
      ? Number((topBid as Record<string, unknown>).amount)
      : Number(ad.auction_start_price);

    // Check bidder isn't already highest
    if (topBid && (topBid as Record<string, unknown>).bidder_id === bidder_id) {
      return NextResponse.json(
        { error: "أنت بالفعل صاحب أعلى مزايدة" },
        { status: 400 },
      );
    }

    // Calculate minimum next bid — use seller-defined increment when set
    const sellerIncrement = Number(ad.auction_min_increment) || 0;
    const minIncrement = sellerIncrement > 0
      ? sellerIncrement
      : Math.max(Math.ceil(currentPrice * 0.02), MIN_INCREMENT_EGP);
    const minNextBid = currentPrice + minIncrement;

    if (bidAmount < minNextBid) {
      return NextResponse.json(
        {
          error: `الحد الأدنى للمزايدة ${minNextBid.toLocaleString("en-US")} جنيه`,
          min_next_bid: minNextBid,
        },
        { status: 400 },
      );
    }

    // Insert bid
    const { error: bidError } = await client
      .from("auction_bids")
      .insert({
        ad_id,
        bidder_id,
        amount: bidAmount,
      });

    if (bidError) {
      console.error("Bid insert error:", bidError);
      return NextResponse.json(
        { error: "حصل مشكلة في المزايدة. جرب تاني" },
        { status: 500 },
      );
    }

    // Notify seller + outbid previous bidder (fire and forget)
    notifyAuctionBid({
      adId: ad_id,
      adTitle: (ad.title as string) || "",
      sellerId: ad.user_id as string,
      bidderId: bidder_id,
      bidderName: bidder_name || "مزايد",
      bidAmount,
      previousHighBidderId: topBid
        ? ((topBid as Record<string, unknown>).bidder_id as string)
        : null,
    }).catch(() => {});

    // Anti-sniping: extend auction if bid placed in last 5 minutes
    const timeRemaining = endsAt - now;
    let antiSnipeExtended = false;

    if (timeRemaining <= ANTI_SNIPE_THRESHOLD_MS) {
      const newEndsAt = new Date(now + ANTI_SNIPE_THRESHOLD_MS).toISOString();
      await client
        .from("ads")
        .update({ auction_ends_at: newEndsAt } as never)
        .eq("id", ad_id);
      antiSnipeExtended = true;
    }

    // Fetch updated state to return
    const { data: updatedBids } = await client
      .from("auction_bids")
      .select("*")
      .eq("ad_id", ad_id)
      .order("amount", { ascending: false })
      .limit(20);

    // Get bidder names
    const bidderIds = [
      ...new Set(
        ((updatedBids as Record<string, unknown>[]) || []).map(
          (b) => b.bidder_id as string,
        ),
      ),
    ];

    const { data: profiles } = await client
      .from("profiles")
      .select("id, display_name")
      .in("id", bidderIds);

    const nameMap = new Map<string, string>();
    if (profiles) {
      for (const p of profiles as Record<string, unknown>[]) {
        nameMap.set(p.id as string, (p.display_name as string) || "مزايد");
      }
    }

    const bids = ((updatedBids as Record<string, unknown>[]) || []).map((b) => ({
      id: b.id as string,
      adId: b.ad_id as string,
      bidderId: b.bidder_id as string,
      bidderName: nameMap.get(b.bidder_id as string) || "مزايد",
      amount: Number(b.amount),
      createdAt: b.created_at as string,
    }));

    // Re-fetch ad for updated auction_ends_at
    const { data: updatedAd } = await client
      .from("ads")
      .select("auction_ends_at")
      .eq("id", ad_id)
      .single();

    return NextResponse.json({
      success: true,
      antiSnipeExtended,
      auctionState: {
        adId: ad_id,
        status: "active",
        startPrice: Number(ad.auction_start_price),
        buyNowPrice: ad.auction_buy_now_price
          ? Number(ad.auction_buy_now_price)
          : null,
        currentHighestBid: bids.length > 0 ? bids[0].amount : null,
        highestBidderName: bids.length > 0 ? bids[0].bidderName : null,
        highestBidderId: bids.length > 0 ? bids[0].bidderId : null,
        bidsCount: bids.length,
        minIncrement: Number(ad.auction_min_increment) || MIN_INCREMENT_EGP,
        endsAt: updatedAd
          ? (updatedAd as Record<string, unknown>).auction_ends_at
          : ad.auction_ends_at,
        originalEndsAt: ad.auction_ends_at,
        bids,
        winnerId: null,
        winnerName: null,
        wasExtended: antiSnipeExtended,
      },
    });
  } catch (err) {
    console.error("Bid API error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
