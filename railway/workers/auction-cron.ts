/**
 * Railway Background Worker: Auction Cron + Smart Notifications
 *
 * Runs every minute to:
 * 1. Finalize expired auctions directly via DB query
 * 2. Send push notifications for auctions ending within 1 hour
 * 3. Expire old ads (30+ days)
 * 4. Notify sellers about buyer interest (every 6 hours)
 * 5. Match new ads to buyer search signals (every 5 minutes)
 * 6. Notify users about price drops on favorited ads (every 30 minutes)
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
 * Send push notification to a user (if they have a push subscription).
 * Best-effort — failures are silently caught.
 */
async function sendPushToUser(
  client: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  url?: string,
): Promise<void> {
  try {
    const { data: subs } = await client
      .from("push_subscriptions")
      .select("endpoint, keys_p256dh, keys_auth")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) return;

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) return;

    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:support@maksab.app",
      vapidPublic,
      vapidPrivate,
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: { url: url || "/" },
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
          payload,
        );
      } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err) {
          const code = (err as { statusCode: number }).statusCode;
          if (code === 404 || code === 410) {
            await client.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
    }
  } catch {
    // Push is best-effort
  }
}

/**
 * Finalize expired auctions directly via DB queries.
 * Sets auction_status to 'ended_winner' or 'ended_no_bids' and picks winner (highest bidder).
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
        // Auction ended with winner — guard against race condition
        const { data: updated } = await client
          .from("ads")
          .update({
            auction_status: "ended_winner",
            auction_winner_id: topBid.bidder_id,
            status: "sold",
          })
          .eq("id", auction.id)
          .eq("auction_status", "active")
          .select("id");

        // Skip if another worker already processed this auction
        if (!updated || updated.length === 0) continue;

        // Notify winner (DB + push)
        await client.from("notifications").insert({
          user_id: topBid.bidder_id,
          type: "auction_won",
          title: "مبروك! كسبت المزاد 🎉",
          body: `فزت بمزاد "${auction.title}" بمبلغ ${topBid.amount.toLocaleString()} جنيه`,
          data: { ad_id: auction.id },
        });
        await sendPushToUser(client, topBid.bidder_id, "مبروك! كسبت المزاد 🎉", `فزت بمزاد "${auction.title}" بمبلغ ${topBid.amount.toLocaleString()} جنيه`, `/ad/${auction.id}`).catch((err) => console.warn("[auction-cron] push to winner failed:", err));

        // Notify seller (DB + push)
        await client.from("notifications").insert({
          user_id: auction.user_id,
          type: "auction_ended",
          title: "المزاد انتهى — تم البيع! 💰",
          body: `مزاد "${auction.title}" انتهى. الفائز زايد بـ ${topBid.amount.toLocaleString()} جنيه`,
          data: { ad_id: auction.id, winner_id: topBid.bidder_id },
        });
        await sendPushToUser(client, auction.user_id, "المزاد انتهى — تم البيع! 💰", `مزاد "${auction.title}" انتهى وتم البيع بمبلغ ${topBid.amount.toLocaleString()} جنيه`, `/ad/${auction.id}`).catch((err) => console.warn("[auction-cron] push to seller failed:", err));
      } else {
        // Auction ended with no bids — guard against race condition
        const { data: updated } = await client
          .from("ads")
          .update({ auction_status: "ended_no_bids" })
          .eq("id", auction.id)
          .eq("auction_status", "active")
          .select("id");

        if (!updated || updated.length === 0) continue;

        // Notify seller (DB + push)
        await client.from("notifications").insert({
          user_id: auction.user_id,
          type: "auction_ended_no_bids",
          title: "المزاد انتهى بدون مزايدات",
          body: `مزاد "${auction.title}" انتهى ومحدش زايد. ممكن تعيد نشره.`,
          data: { ad_id: auction.id },
        });
        await sendPushToUser(client, auction.user_id, "المزاد انتهى بدون مزايدات", `مزاد "${auction.title}" انتهى ومحدش زايد. ممكن تنزل إعلان جديد.`, `/ad/${auction.id}`).catch((err) => console.warn("[auction-cron] push to seller (no bids) failed:", err));
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
    // Expire non-auction ads that passed their expiry date
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

    // Also expire ended auction ads (ended_winner/ended_no_bids/cancelled) older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const { data: expiredAuctions } = await client
      .from("ads")
      .update({ status: "expired" })
      .eq("sale_type", "auction")
      .eq("status", "active")
      .in("auction_status", ["ended_winner", "ended_no_bids", "cancelled"])
      .lte("updated_at", sevenDaysAgo)
      .select("id");

    if (expiredAuctions && expiredAuctions.length > 0) {
      console.log(
        `[${new Date().toISOString()}] Expired ${expiredAuctions.length} ended auction ads`,
      );
    }

    // Safety net: forcefully finalize auctions that are still "active" but
    // their auction_ends_at passed more than 24 hours ago (in case finalizeExpiredAuctions missed them)
    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
    const { data: stuckAuctions } = await client
      .from("ads")
      .select("id, title, user_id")
      .eq("sale_type", "auction")
      .eq("status", "active")
      .eq("auction_status", "active")
      .lte("auction_ends_at", oneDayAgo);

    if (stuckAuctions && stuckAuctions.length > 0) {
      for (const auction of stuckAuctions) {
        const { data: topBid } = await client
          .from("auction_bids")
          .select("bidder_id, amount")
          .eq("ad_id", auction.id)
          .order("amount", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (topBid) {
          await client
            .from("ads")
            .update({
              auction_status: "ended_winner",
              auction_winner_id: topBid.bidder_id,
              status: "sold",
            })
            .eq("id", auction.id)
            .eq("auction_status", "active");
        } else {
          await client
            .from("ads")
            .update({ auction_status: "ended_no_bids" })
            .eq("id", auction.id)
            .eq("auction_status", "active");
        }
      }
      console.log(
        `[${new Date().toISOString()}] Force-finalized ${stuckAuctions.length} stuck auction(s)`,
      );
    }

    // Absolute expiry: auction ads (any auction_status) older than 30 days past their end time
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
    const { data: ancientAuctions } = await client
      .from("ads")
      .update({ status: "expired" })
      .eq("sale_type", "auction")
      .eq("status", "active")
      .lte("auction_ends_at", thirtyDaysAgo)
      .select("id");

    if (ancientAuctions && ancientAuctions.length > 0) {
      console.log(
        `[${new Date().toISOString()}] Expired ${ancientAuctions.length} ancient auction ad(s) (30+ days past end)`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error expiring ads:`,
      error instanceof Error ? error.message : error,
    );
  }
}

// ─── Smart Notifications ────────────────────────────────────

/**
 * Notify sellers about buyer interest on their active ads.
 * Groups views/favorites/chats from last 24 hours per ad.
 */
async function notifySellerInterest(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

    // Get recent signals on specific ads
    const { data: recentSignals } = await client
      .from("user_signals")
      .select("ad_id, user_id, signal_type")
      .in("signal_type", ["view", "favorite", "chat_initiated"])
      .gte("created_at", oneDayAgo)
      .not("ad_id", "is", null)
      .limit(500);

    if (!recentSignals || recentSignals.length === 0) return;

    // Group by ad_id → unique users
    const adInterest = new Map<string, Set<string>>();
    for (const signal of recentSignals) {
      if (!signal.ad_id) continue;
      const adId = signal.ad_id as string;
      if (!adInterest.has(adId)) adInterest.set(adId, new Set());
      adInterest.get(adId)!.add(signal.user_id as string);
    }

    // Only notify for ads with 3+ unique interested users
    const qualifiedAds = Array.from(adInterest.entries()).filter(
      ([, users]) => users.size >= 3,
    );
    if (qualifiedAds.length === 0) return;

    const adIds = qualifiedAds.map(([adId]) => adId);
    const { data: ads } = await client
      .from("ads")
      .select("id, user_id, title")
      .in("id", adIds)
      .eq("status", "active");

    if (!ads || ads.length === 0) return;

    let count = 0;
    for (const ad of ads) {
      const interestedCount = adInterest.get(ad.id)?.size || 0;

      // Check if already notified today
      const { count: existingCount } = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ad.user_id)
        .eq("type", "seller_interest")
        .eq("ad_id", ad.id)
        .gte("created_at", oneDayAgo);

      if ((existingCount ?? 0) > 0) continue;

      await client.from("notifications").insert({
        user_id: ad.user_id,
        type: "seller_interest",
        title: `${interestedCount} أشخاص مهتمين بإعلانك 👥`,
        body: `"${ad.title}" عليه اهتمام! ${interestedCount} شخص شافوا أو حفظوا إعلانك النهارده`,
        ad_id: ad.id,
        data: { interested_count: interestedCount },
      });
      count++;
    }

    if (count > 0) {
      console.log(
        `[${new Date().toISOString()}] Sent ${count} seller interest notifications`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in seller interest notifications:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Match new ads (created in last 5 minutes) to buyer signals
 * and create notifications for matching buyers.
 */
async function matchNewAdsToBuyers(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

    // Get recently created ads
    const { data: newAds } = await client
      .from("ads")
      .select("id, title, category_id, subcategory_id, sale_type, price, governorate, user_id, category_fields")
      .eq("status", "active")
      .gte("created_at", fiveMinAgo)
      .limit(20);

    if (!newAds || newAds.length === 0) return;

    let totalNotified = 0;

    for (const ad of newAds) {
      // Check if we already sent notifications for this ad
      const { count: existingCount } = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", "new_match")
        .eq("ad_id", ad.id);

      if ((existingCount ?? 0) > 0) continue;

      // Find matching buyer signals
      const { data: signals } = await client
        .from("user_signals")
        .select("user_id, signal_type, signal_data, weight, governorate")
        .eq("category_id", ad.category_id)
        .gte("weight", 3)
        .gte("created_at", thirtyDaysAgo)
        .neq("user_id", ad.user_id)
        .limit(200);

      if (!signals || signals.length === 0) continue;

      // Score users
      const userScores = new Map<string, { score: number; reason: string }>();
      const fields = (ad.category_fields || {}) as Record<string, unknown>;

      for (const signal of signals) {
        const userId = signal.user_id as string;
        if (!userId) continue;
        const data = (signal.signal_data ?? {}) as Record<string, unknown>;
        const existing = userScores.get(userId) || { score: 0, reason: "" };

        let matchScore = signal.weight as number;
        let reason = "";

        // Subcategory match
        if (ad.subcategory_id && data.subcategory === ad.subcategory_id) {
          matchScore += 3;
        }

        // Brand match
        const adBrand = fields.brand || fields["الماركة"];
        const signalBrand = data.brand || data.query;
        if (
          adBrand &&
          signalBrand &&
          typeof adBrand === "string" &&
          typeof signalBrand === "string" &&
          (signalBrand as string).includes(adBrand as string)
        ) {
          matchScore += 5;
          reason = adBrand as string;
        }

        // Governorate match
        if (ad.governorate && signal.governorate === ad.governorate) {
          matchScore += 2;
        }

        // Keyword match in title
        if (data.query && typeof data.query === "string" && ad.title) {
          const words = (data.query as string).split(/\s+/);
          for (const word of words) {
            if (word.length >= 2 && (ad.title as string).includes(word)) {
              matchScore += 2;
              if (!reason) reason = data.query as string;
              break;
            }
          }
        }

        existing.score += matchScore;
        if (reason && !existing.reason) existing.reason = reason;
        userScores.set(userId, existing);
      }

      // Filter qualified users (score >= 8)
      const qualified = Array.from(userScores.entries())
        .filter(([, v]) => v.score >= 8)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 50);

      if (qualified.length === 0) continue;

      const saleLabel =
        ad.sale_type === "auction"
          ? "🔨 مزاد"
          : ad.sale_type === "exchange"
            ? "🔄 تبديل"
            : "💵 نقدي";

      const notifications = qualified.map(([userId, { reason }]) => ({
        user_id: userId,
        type: "new_match",
        title: "إعلان جديد يطابق بحثك! 🎯",
        body: reason
          ? `${ad.title} — ${saleLabel}\nبناءً على بحثك عن "${reason}"`
          : `${ad.title} — ${saleLabel}`,
        ad_id: ad.id,
        data: { ad_id: ad.id, sale_type: ad.sale_type },
      }));

      await client.from("notifications").insert(notifications);
      totalNotified += notifications.length;
    }

    if (totalNotified > 0) {
      console.log(
        `[${new Date().toISOString()}] Matched new ads → ${totalNotified} buyer notifications`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error matching new ads to buyers:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Check for price drops on favorited ads and notify users.
 */
async function checkPriceDrops(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Find ads that were recently updated (price might have changed)
    const { data: recentlyUpdated } = await client
      .from("ads")
      .select("id, title, price, user_id")
      .eq("status", "active")
      .eq("sale_type", "cash")
      .gte("updated_at", thirtyMinAgo)
      .not("price", "is", null)
      .limit(50);

    if (!recentlyUpdated || recentlyUpdated.length === 0) return;

    let notifCount = 0;

    for (const ad of recentlyUpdated) {
      // Check if there are existing "view" signals with higher prices
      // (indicating the price was reduced)
      const { data: oldSignals } = await client
        .from("user_signals")
        .select("signal_data")
        .eq("ad_id", ad.id)
        .eq("signal_type", "view")
        .not("signal_data->price", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!oldSignals || oldSignals.length === 0) continue;

      const signalData = oldSignals[0]?.signal_data as Record<string, unknown> | null;
      const oldPrice = Number(signalData?.price);
      const newPrice = Number(ad.price);

      // Only notify if price actually dropped by at least 5%
      if (!oldPrice || !newPrice || newPrice >= oldPrice * 0.95) continue;

      // Find users who favorited this ad
      const { data: favorites } = await client
        .from("favorites")
        .select("user_id")
        .eq("ad_id", ad.id)
        .neq("user_id", ad.user_id);

      if (!favorites || favorites.length === 0) continue;

      // Check dedup
      const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const { count: existing } = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", "favorite_price_drop")
        .eq("ad_id", ad.id)
        .gte("created_at", oneDayAgo);

      if ((existing ?? 0) > 0) continue;

      const dropPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
      const formattedNew = newPrice.toLocaleString("en-US");

      const notifications = favorites.map((f) => ({
        user_id: f.user_id,
        type: "favorite_price_drop",
        title: "السعر نزل! 💰",
        body: `"${ad.title}" نزل ${dropPercent}% — دلوقتي ${formattedNew} جنيه`,
        ad_id: ad.id,
        data: { old_price: oldPrice, new_price: newPrice, drop_percent: dropPercent },
      }));

      await client.from("notifications").insert(notifications);
      notifCount += notifications.length;
    }

    if (notifCount > 0) {
      console.log(
        `[${new Date().toISOString()}] Sent ${notifCount} price drop notifications`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error checking price drops:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Auto-enrich listings without phone numbers.
 * After each harvest, opensooq/aqarmap listings often lack phone numbers.
 * This calls the Vercel enrichment endpoint to fetch detail pages and extract phones.
 */
async function autoEnrichListings(): Promise<void> {
  const client = getClient();
  if (!client) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!appUrl) {
    console.log(`[${new Date().toISOString()}] ⚠️ Skipping auto-enrich: no APP_URL configured`);
    return;
  }

  try {
    const platforms = ["opensooq", "aqarmap"];

    for (const platform of platforms) {
      // Check if there are unenriched listings for this platform
      const { count } = await client
        .from("ahe_listings")
        .select("id", { count: "exact", head: true })
        .eq("source_platform", platform)
        .is("extracted_phone", null)
        .eq("is_duplicate", false);

      if (!count || count === 0) continue;

      console.log(`[${new Date().toISOString()}] 🔍 ${platform}: ${count} listings without phone — enriching...`);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout

        const response = await fetch(
          `${appUrl}/api/admin/crm/harvester/enrich-vercel?platform=${platform}&limit=5`,
          {
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
          }
        );
        clearTimeout(timeout);

        if (response.ok) {
          const result = await response.json();
          console.log(
            `[${new Date().toISOString()}] ✅ ${platform} enrichment: ${result.phones_found || 0} phones found from ${result.listings_processed || 0} listings (${result.duration_ms || 0}ms)`
          );
        } else {
          console.warn(
            `[${new Date().toISOString()}] ⚠️ ${platform} enrichment failed: HTTP ${response.status}`
          );
        }
      } catch (err) {
        console.warn(
          `[${new Date().toISOString()}] ⚠️ ${platform} enrichment error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in auto-enrich:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Clean up old signals (older than 60 days) to keep DB performant.
 */
async function cleanupOldSignals(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600000).toISOString();
    const { data } = await client
      .from("user_signals")
      .delete()
      .lt("created_at", sixtyDaysAgo)
      .select("id");

    if (data && data.length > 0) {
      console.log(`[${new Date().toISOString()}] Cleaned up ${data.length} old signals`);
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error cleaning up signals:`,
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

  // Every 5 minutes: match new ads to buyer signals
  if (tickCount % 5 === 0) {
    await matchNewAdsToBuyers();
  }

  // Every 15 minutes: notify about ending-soon auctions
  if (tickCount % 15 === 0) {
    await notifyEndingSoonAuctions();
  }

  // Every 30 minutes: check for price drops on favorited ads
  if (tickCount % 30 === 0) {
    await checkPriceDrops();
  }

  // Every 10 minutes: auto-enrich listings without phone
  if (tickCount % 10 === 0) {
    await autoEnrichListings();
  }

  // Every 60 minutes: expire old ads
  if (tickCount % 60 === 0) {
    await expireOldAds();
  }

  // Every 360 minutes (6 hours): notify sellers about buyer interest
  if (tickCount % 360 === 0) {
    await notifySellerInterest();
  }

  // Every 1440 minutes (24 hours): cleanup old signals
  if (tickCount % 1440 === 0) {
    await cleanupOldSignals();
    tickCount = 0;
  }
}

console.log(`[${new Date().toISOString()}] 🟢 مكسب Worker started (Auctions + Smart Notifications + Enrichment)`);
console.log(`  - Auction finalization: every ${INTERVAL_MS / 1000}s`);
console.log(`  - New ad → buyer matching: every 5 minutes`);
console.log(`  - Auto-enrich (phone extraction): every 10 minutes`);
console.log(`  - Ending-soon notifications: every 15 minutes`);
console.log(`  - Price drop notifications: every 30 minutes`);
console.log(`  - Ad expiry check: every 60 minutes`);
console.log(`  - Seller interest notifications: every 6 hours`);
console.log(`  - Signal cleanup: every 24 hours`);

// ─── Startup: DB Health Check ────────────────────────────────
async function healthCheck(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from("categories")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ DB health check failed:`, error.message);
      return false;
    }
    console.log(`[${new Date().toISOString()}] ✅ DB health check passed`);
    return true;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ DB health check error:`, err);
    return false;
  }
}

// ─── Graceful Shutdown ──────────────────────────────────────
let intervalId: ReturnType<typeof setInterval> | null = null;
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[${new Date().toISOString()}] 🛑 Received ${signal}, shutting down gracefully...`);

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  // Allow in-flight operations 5 seconds to complete
  setTimeout(() => {
    console.log(`[${new Date().toISOString()}] 👋 Worker stopped`);
    process.exit(0);
  }, 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Keep process alive — prevent Railway from thinking it crashed
process.on("uncaughtException", (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught exception:`, err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
});

// ─── Start ──────────────────────────────────────────────────
(async () => {
  if (getClient()) {
    await healthCheck();
  }

  // Run immediately, then on interval
  tick();
  intervalId = setInterval(tick, INTERVAL_MS);
})();
