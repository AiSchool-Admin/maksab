/**
 * Railway Background Worker: Auction Cron
 *
 * Runs every minute to:
 * 1. Call the Supabase Edge Function `auction-end` to finalize expired auctions
 * 2. Send push notifications for auctions ending within 1 hour
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Deploy: Railway service with `npx tsx railway/workers/auction-cron.ts`
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AUCTION_END_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/auction-end`;

// Check interval: every 60 seconds
const INTERVAL_MS = 60 * 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Call the auction-end Edge Function to finalize expired auctions.
 */
async function finalizeExpiredAuctions(): Promise<void> {
  try {
    const response = await fetch(AUCTION_END_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    if (data.count > 0 || (data.results && data.results.length > 0)) {
      console.log(
        `[${new Date().toISOString()}] Finalized auctions:`,
        JSON.stringify(data),
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error finalizing auctions:`,
      error,
    );
  }
}

/**
 * Notify bidders about auctions ending within 1 hour.
 * Runs less frequently — every 15 minutes.
 */
async function notifyEndingSoonAuctions(): Promise<void> {
  try {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Find active auctions ending within 1 hour
    const { data: endingSoon } = await supabase
      .from("ads")
      .select("id, title, auction_ends_at")
      .eq("sale_type", "auction")
      .eq("auction_status", "active")
      .gte("auction_ends_at", now)
      .lte("auction_ends_at", oneHourFromNow);

    if (!endingSoon || endingSoon.length === 0) return;

    for (const auction of endingSoon) {
      // Find unique bidders for this auction
      const { data: bidders } = await supabase
        .from("auction_bids")
        .select("bidder_id")
        .eq("ad_id", auction.id);

      if (!bidders || bidders.length === 0) continue;

      // Deduplicate bidder IDs
      const uniqueBidderIds = [
        ...new Set(bidders.map((b) => b.bidder_id)),
      ];

      // Check if we already notified them (avoid spam)
      const { data: existingNotifs } = await supabase
        .from("notifications")
        .select("user_id")
        .eq("type", "auction_ending")
        .eq("data->>ad_id", auction.id)
        .in("user_id", uniqueBidderIds);

      const alreadyNotified = new Set(
        (existingNotifs || []).map((n) => n.user_id),
      );

      // Send notifications to bidders not yet notified
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
        }));

        await supabase.from("notifications").insert(notifications);
        console.log(
          `[${new Date().toISOString()}] Notified ${toNotify.length} bidders about ending auction: ${auction.id}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error notifying ending-soon auctions:`,
      error,
    );
  }
}

/**
 * Expire old ads (30 days past creation).
 * Runs once per hour.
 */
async function expireOldAds(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("ads")
      .update({ status: "expired" })
      .eq("status", "active")
      .neq("sale_type", "auction")
      .lte("expires_at", new Date().toISOString())
      .select("id, user_id, title");

    if (error) {
      console.error("Error expiring ads:", error);
      return;
    }

    if (data && data.length > 0) {
      // Notify sellers about expired ads
      const notifications = data.map((ad) => ({
        user_id: ad.user_id,
        type: "system",
        title: "إعلانك انتهى",
        body: `إعلان "${ad.title}" انتهت مدته. ممكن تجدده من إعلاناتي.`,
        data: { ad_id: ad.id },
      }));

      await supabase.from("notifications").insert(notifications);
      console.log(
        `[${new Date().toISOString()}] Expired ${data.length} ads`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error expiring ads:`,
      error,
    );
  }
}

// ─── Main Loop ──────────────────────────────────────────────
let tickCount = 0;

async function tick(): Promise<void> {
  tickCount++;

  // Every minute: finalize expired auctions
  await finalizeExpiredAuctions();

  // Every 15 minutes: notify about ending-soon auctions
  if (tickCount % 15 === 0) {
    await notifyEndingSoonAuctions();
  }

  // Every 60 minutes: expire old ads
  if (tickCount % 60 === 0) {
    await expireOldAds();
    tickCount = 0; // Reset counter
  }
}

console.log(`[${new Date().toISOString()}] 🟢 مكسب Auction Worker started`);
console.log(`  - Auction finalization: every ${INTERVAL_MS / 1000}s`);
console.log(`  - Ending-soon notifications: every 15 minutes`);
console.log(`  - Ad expiry check: every 60 minutes`);

// Run immediately, then on interval
tick();
setInterval(tick, INTERVAL_MS);
