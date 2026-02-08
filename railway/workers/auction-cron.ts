/**
 * Railway Background Worker: Auction Cron
 *
 * Runs every minute to:
 * 1. Finalize expired auctions directly via DB query
 * 2. Send push notifications for auctions ending within 1 hour
 * 3. Expire old ads (30+ days)
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Deploy: Railway service with `npx tsx workers/auction-cron.ts`
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Environment Validation ──────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  if (!SUPABASE_URL) console.error("   - SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("");
  console.error("Set these in Railway Dashboard → Service → Variables");
  console.error("Get values from: Supabase Dashboard → Settings → API");
  console.error("");
  console.error("Worker will stay alive and retry every 30 seconds...");
}

// Check interval: every 60 seconds
const INTERVAL_MS = 60 * 1000;

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  return supabase;
}

/**
 * Finalize expired auctions directly via DB queries.
 * Sets auction_status to 'ended' and picks winner (highest bidder).
 */
async function finalizeExpiredAuctions(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const now = new Date().toISOString();

    // Find expired auctions that are still active
    const { data: expiredAuctions, error: fetchError } = await client
      .from("ads")
      .select("id, title, user_id, auction_ends_at")
      .eq("sale_type", "auction")
      .eq("auction_status", "active")
      .lte("auction_ends_at", now);

    if (fetchError) {
      console.error(`[${now}] Error fetching expired auctions:`, fetchError.message);
      return;
    }

    if (!expiredAuctions || expiredAuctions.length === 0) return;

    for (const auction of expiredAuctions) {
      // Get highest bid
      const { data: topBid } = await client
        .from("auction_bids")
        .select("bidder_id, amount")
        .eq("ad_id", auction.id)
        .order("amount", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (topBid) {
        // Auction ended with winner
        await client
          .from("ads")
          .update({
            auction_status: "ended",
            auction_winner_id: topBid.bidder_id,
            status: "sold",
          })
          .eq("id", auction.id);

        // Notify winner
        await client.from("notifications").insert({
          user_id: topBid.bidder_id,
          type: "auction_won",
          title: "مبروك! كسبت المزاد 🎉",
          body: `فزت بمزاد "${auction.title}" بمبلغ ${topBid.amount.toLocaleString()} جنيه`,
          data: { ad_id: auction.id },
        });

        // Notify seller
        await client.from("notifications").insert({
          user_id: auction.user_id,
          type: "auction_ended",
          title: "المزاد انتهى! 🔨",
          body: `مزاد "${auction.title}" انتهى. الفائز زايد بـ ${topBid.amount.toLocaleString()} جنيه`,
          data: { ad_id: auction.id, winner_id: topBid.bidder_id },
        });
      } else {
        // Auction ended with no bids
        await client
          .from("ads")
          .update({ auction_status: "ended" })
          .eq("id", auction.id);

        // Notify seller
        await client.from("notifications").insert({
          user_id: auction.user_id,
          type: "auction_ended_no_bids",
          title: "المزاد انتهى بدون مزايدات",
          body: `مزاد "${auction.title}" انتهى ومحدش زايد. ممكن تعيد نشره.`,
          data: { ad_id: auction.id },
        });
      }

      console.log(
        `[${now}] Finalized auction ${auction.id}: ${topBid ? `winner=${topBid.bidder_id}` : "no bids"}`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error finalizing auctions:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Notify bidders about auctions ending within 1 hour.
 */
async function notifyEndingSoonAuctions(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: endingSoon } = await client
      .from("ads")
      .select("id, title, auction_ends_at")
      .eq("sale_type", "auction")
      .eq("auction_status", "active")
      .gte("auction_ends_at", now)
      .lte("auction_ends_at", oneHourFromNow);

    if (!endingSoon || endingSoon.length === 0) return;

    for (const auction of endingSoon) {
      const { data: bidders } = await client
        .from("auction_bids")
        .select("bidder_id")
        .eq("ad_id", auction.id);

      if (!bidders || bidders.length === 0) continue;

      const uniqueBidderIds = [...new Set(bidders.map((b) => b.bidder_id))];

      // Check existing notifications to avoid spam
      const { data: existingNotifs } = await client
        .from("notifications")
        .select("user_id")
        .eq("type", "auction_ending")
        .eq("ad_id", auction.id)
        .in("user_id", uniqueBidderIds);

      const alreadyNotified = new Set(
        (existingNotifs || []).map((n) => n.user_id),
      );

      const toNotify = uniqueBidderIds.filter(
        (id) => !alreadyNotified.has(id),
      );

      if (toNotify.length > 0) {
        const notifications = toNotify.map((userId) => ({
          user_id: userId,
          type: "auction_ending",
          title: "المزاد بينتهي قريب! ⏰",
          body: `مزاد "${auction.title}" بينتهي خلال أقل من ساعة`,
          data: { ad_id: auction.id },
          ad_id: auction.id,
        }));

        await client.from("notifications").insert(notifications);
        console.log(
          `[${new Date().toISOString()}] Notified ${toNotify.length} bidders about ending auction: ${auction.id}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error notifying ending-soon auctions:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Expire old ads (30 days past creation).
 */
async function expireOldAds(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const { data, error } = await client
      .from("ads")
      .update({ status: "expired" })
      .eq("status", "active")
      .neq("sale_type", "auction")
      .lte("expires_at", new Date().toISOString())
      .select("id, user_id, title");

    if (error) {
      console.error("Error expiring ads:", error.message);
      return;
    }

    if (data && data.length > 0) {
      const notifications = data.map((ad) => ({
        user_id: ad.user_id,
        type: "system" as const,
        title: "إعلانك انتهى",
        body: `إعلان "${ad.title}" انتهت مدته. ممكن تجدده من إعلاناتي.`,
        data: { ad_id: ad.id },
      }));

      await client.from("notifications").insert(notifications);
      console.log(
        `[${new Date().toISOString()}] Expired ${data.length} ads`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error expiring ads:`,
      error instanceof Error ? error.message : error,
    );
  }
}

// ─── Main Loop ──────────────────────────────────────────────
let tickCount = 0;

async function tick(): Promise<void> {
  tickCount++;

  const client = getClient();
  if (!client) {
    if (tickCount % 30 === 1) {
      console.log(`[${new Date().toISOString()}] ⏳ Waiting for env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)...`);
    }
    return;
  }

  // Every minute: finalize expired auctions
  await finalizeExpiredAuctions();

  // Every 15 minutes: notify about ending-soon auctions
  if (tickCount % 15 === 0) {
    await notifyEndingSoonAuctions();
  }

  // Every 60 minutes: expire old ads
  if (tickCount % 60 === 0) {
    await expireOldAds();
    tickCount = 0;
  }
}

console.log(`[${new Date().toISOString()}] 🟢 مكسب Auction Worker started`);
console.log(`  - Auction finalization: every ${INTERVAL_MS / 1000}s`);
console.log(`  - Ending-soon notifications: every 15 minutes`);
console.log(`  - Ad expiry check: every 60 minutes`);

if (getClient()) {
  console.log(`  - Supabase: connected ✓`);
} else {
  console.log(`  - Supabase: waiting for env vars...`);
}

// Run immediately, then on interval
tick();
setInterval(tick, INTERVAL_MS);

// Keep process alive — prevent Railway from thinking it crashed
process.on("uncaughtException", (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught exception:`, err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
});
