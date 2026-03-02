/**
 * Supabase Edge Function: auction-end
 *
 * Finalizes auctions that have ended and notifies the winner and seller.
 * Should be invoked periodically via a cron job (e.g., every minute).
 *
 * Logic:
 * 1. Query active auctions where auction_ends_at <= NOW()
 * 2. For each: determine winner (highest bidder) or no-bid status
 * 3. Update auction_status and auction_winner_id
 * 4. Insert notifications for seller and winner
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    // 1. Find active auctions that have ended
    const { data: endedAuctions, error: fetchError } = await supabase
      .from("ads")
      .select("id, user_id, title, auction_start_price, auction_buy_now_price")
      .eq("sale_type", "auction")
      .eq("auction_status", "active")
      .lte("auction_ends_at", new Date().toISOString());

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!endedAuctions || endedAuctions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No auctions to finalize", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const results = [];

    for (const auction of endedAuctions) {
      // 2. Find highest bid for this auction
      const { data: topBid } = await supabase
        .from("auction_bids")
        .select("bidder_id, amount")
        .eq("ad_id", auction.id)
        .order("amount", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (topBid) {
        // Auction ended with winner — guard against race condition
        const { data: updated, error: updateError } = await supabase
          .from("ads")
          .update({
            auction_status: "ended_winner",
            auction_winner_id: topBid.bidder_id,
            status: "sold",
          })
          .eq("id", auction.id)
          .eq("auction_status", "active")
          .select("id");

        // Skip if another process already finalized this auction
        if (updateError || !updated || updated.length === 0) {
          continue;
        }

        if (!updateError) {
          // Notify winner
          await supabase.from("notifications").insert({
            user_id: topBid.bidder_id,
            type: "auction_won",
            title: "مبروك! كسبت المزاد 🎉",
            body: `كسبت مزاد "${auction.title}" بمبلغ ${Number(topBid.amount).toLocaleString("en-US")} جنيه`,
            data: { ad_id: auction.id },
          });

          // Notify seller
          await supabase.from("notifications").insert({
            user_id: auction.user_id,
            type: "auction_ended",
            title: "انتهى المزاد — تم البيع! 💰",
            body: `انتهى مزاد "${auction.title}" وتم البيع بمبلغ ${Number(topBid.amount).toLocaleString("en-US")} جنيه`,
            data: { ad_id: auction.id, winner_id: topBid.bidder_id },
          });

          results.push({
            ad_id: auction.id,
            status: "ended_winner",
            winner: topBid.bidder_id,
            amount: topBid.amount,
          });
        }
      } else {
        // Auction ended with no bids — guard against race condition
        const { data: updated, error: updateError } = await supabase
          .from("ads")
          .update({
            auction_status: "ended_no_bids",
          })
          .eq("id", auction.id)
          .eq("auction_status", "active")
          .select("id");

        // Skip if another process already finalized this auction
        if (updateError || !updated || updated.length === 0) {
          continue;
        }

        if (!updateError) {
          // Notify seller
          await supabase.from("notifications").insert({
            user_id: auction.user_id,
            type: "auction_ended_no_bids",
            title: "انتهى المزاد بدون مزايدات",
            body: `انتهى مزاد "${auction.title}" بدون ما حد يزايد. ممكن تنزل إعلان جديد.`,
            data: { ad_id: auction.id },
          });

          results.push({
            ad_id: auction.id,
            status: "ended_no_bids",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Finalized ${results.length} auctions`,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
