/**
 * Smart Notification Engine — Server-side service for creating intelligent notifications.
 *
 * Handles:
 * 1. New ad → notify buyers who searched for similar items
 * 2. Chat message → notify recipient (push + WhatsApp)
 * 3. Auction bid → notify seller + outbid bidders (push + WhatsApp)
 * 4. Price drop → notify users who favorited the ad
 * 5. Seller interest → aggregate buyer interest on seller's ads
 * 6. Price offers → notify seller/buyer (push + WhatsApp)
 *
 * Uses service role key (server-side only).
 * WhatsApp notifications are sent alongside push for critical events.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  sendWhatsAppChatNotification,
  sendWhatsAppAuctionNotification,
  sendWhatsAppOfferNotification,
  sendWhatsAppMatchNotification,
} from "./whatsapp-notifications";

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Prevent duplicate notifications: check if a similar one was sent in last N hours */
async function isDuplicate(
  client: SupabaseClient,
  userId: string,
  type: string,
  adId: string | null,
  hoursWindow: number = 24,
): Promise<boolean> {
  const since = new Date(Date.now() - hoursWindow * 3600000).toISOString();
  const query = client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", since);

  if (adId) query.eq("ad_id", adId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

/** Send push notification to a user (if they have a subscription) */
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

    // Dynamic import web-push (server-side only)
    const webpush = await import("web-push");

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || "mailto:support@maksab.app";

    if (!vapidPublic || !vapidPrivate) return;

    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

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
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          payload,
        );
      } catch (err: unknown) {
        // Remove expired/invalid subscriptions
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          ((err as { statusCode: number }).statusCode === 404 ||
            (err as { statusCode: number }).statusCode === 410)
        ) {
          await client
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }
  } catch {
    // Push notification is best-effort
  }
}

/** Get user's phone number for WhatsApp notification */
async function getUserPhone(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await client
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .maybeSingle();
    return (data?.phone as string) || null;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// 1. NEW AD → NOTIFY MATCHING BUYERS
// ────────────────────────────────────────────────────────────────────────

interface NewAdData {
  id: string;
  title: string;
  category_id: string;
  subcategory_id?: string | null;
  sale_type: string;
  price?: number | null;
  governorate?: string | null;
  user_id: string;
  category_fields?: Record<string, unknown>;
}

/**
 * When a new ad is created, find buyers who searched/viewed/favorited
 * similar items and notify them.
 */
export async function notifyMatchingBuyers(ad: NewAdData): Promise<number> {
  const client = getServiceClient();
  if (!client) return 0;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

    // Find users who showed interest in this category recently
    // Weight >= 5 means search, favorite, ad_created, bid, or chat (strong signals)
    const { data: signals } = await client
      .from("user_signals")
      .select("user_id, signal_type, signal_data, weight, governorate")
      .eq("category_id", ad.category_id)
      .gte("weight", 3) // view=3, search=5, favorite=6, etc.
      .gte("created_at", thirtyDaysAgo)
      .neq("user_id", ad.user_id) // Don't notify the seller
      .limit(200);

    if (!signals || signals.length === 0) return 0;

    // Score each user based on how well the ad matches their signals
    const userScores = new Map<string, { score: number; reason: string }>();

    for (const signal of signals) {
      const userId = signal.user_id as string;
      const data = (signal.signal_data || {}) as Record<string, unknown>;
      const existing = userScores.get(userId) || { score: 0, reason: "" };

      let matchScore = signal.weight as number;
      let reason = "";

      // Boost score for subcategory match
      if (ad.subcategory_id && data.subcategory === ad.subcategory_id) {
        matchScore += 3;
      }

      // Boost score for brand match
      const adBrand = ad.category_fields?.brand || ad.category_fields?.["الماركة"];
      const signalBrand = data.brand || data.query;
      if (
        adBrand &&
        signalBrand &&
        typeof adBrand === "string" &&
        typeof signalBrand === "string" &&
        signalBrand.includes(adBrand as string)
      ) {
        matchScore += 5;
        reason = `${adBrand}`;
      }

      // Boost for same governorate
      if (ad.governorate && signal.governorate === ad.governorate) {
        matchScore += 2;
      }

      // Boost for price range match (if user searched with price filter)
      if (ad.price && data.price_max && data.price_min) {
        const pMin = Number(data.price_min) * 0.7;
        const pMax = Number(data.price_max) * 1.3;
        if (ad.price >= pMin && ad.price <= pMax) {
          matchScore += 3;
        }
      }

      // Boost for search query keyword match
      if (data.query && typeof data.query === "string" && ad.title) {
        const queryWords = (data.query as string).split(/\s+/);
        const titleLower = ad.title.toLowerCase();
        for (const word of queryWords) {
          if (word.length >= 2 && titleLower.includes(word.toLowerCase())) {
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

    // Only notify users with score >= 8 (meaningful match)
    const qualifiedUsers = Array.from(userScores.entries())
      .filter(([, v]) => v.score >= 8)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 50); // Max 50 notifications per ad

    if (qualifiedUsers.length === 0) return 0;

    const notifications = [];

    for (const [userId, { reason }] of qualifiedUsers) {
      // Deduplicate
      const dup = await isDuplicate(client, userId, "new_match", ad.id, 24);
      if (dup) continue;

      const saleTypeLabel =
        ad.sale_type === "auction"
          ? "🔥 مزاد"
          : ad.sale_type === "exchange"
            ? "🔄 للتبديل"
            : "💰 للبيع";

      const bodyText = reason
        ? `${ad.title} — ${saleTypeLabel}\nعشان أنت دورت على "${reason}"`
        : `${ad.title} — ${saleTypeLabel}`;

      notifications.push({
        user_id: userId,
        type: "new_match",
        title: "فيه إعلان جديد يناسبك! 🎯",
        body: bodyText,
        ad_id: ad.id,
        data: { ad_id: ad.id, sale_type: ad.sale_type },
      });
    }

    if (notifications.length > 0) {
      await client.from("notifications").insert(notifications);

      // Send push notifications (fire and forget, max 10)
      for (const notif of notifications.slice(0, 10)) {
        sendPushToUser(
          client,
          notif.user_id,
          notif.title,
          notif.body,
          `/ad/${ad.id}`,
        );
      }
    }

    return notifications.length;
  } catch (err) {
    console.error("notifyMatchingBuyers error:", err);
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────────────
// 1b. NEW EXCHANGE AD → NOTIFY OWNERS OF MATCHING EXCHANGE ADS
// ────────────────────────────────────────────────────────────────────────

/**
 * When a new exchange ad is created, find existing exchange ads that match
 * bidirectionally and notify their owners about a potential exchange.
 */
export async function notifyExchangeMatch(ad: NewAdData): Promise<number> {
  const client = getServiceClient();
  if (!client) return 0;

  try {
    const categoryFields = ad.category_fields || {};
    const exchangeWanted = categoryFields.exchange_wanted as Record<string, unknown> | undefined;
    if (!exchangeWanted?.category_id) return 0;

    const wantedCategoryId = exchangeWanted.category_id as string;

    // Find exchange ads in the wanted category whose owners might want our category
    const { data: candidates } = await client
      .from("ads")
      .select("id, title, user_id, category_id, category_fields, exchange_description")
      .eq("status", "active")
      .eq("sale_type", "exchange")
      .eq("category_id", wantedCategoryId)
      .neq("user_id", ad.user_id)
      .limit(30);

    if (!candidates || candidates.length === 0) return 0;

    const notifications = [];

    for (const candidate of candidates) {
      const cFields = (candidate.category_fields as Record<string, unknown>) || {};
      const cWanted = cFields.exchange_wanted as Record<string, unknown> | undefined;

      // Check bidirectional match: does the other person want our category?
      const isBidirectional = cWanted?.category_id === ad.category_id;
      if (!isBidirectional) continue;

      // Dedup check
      const dup = await isDuplicate(
        client,
        candidate.user_id as string,
        "exchange_match",
        ad.id,
        48,
      );
      if (dup) continue;

      notifications.push({
        user_id: candidate.user_id,
        type: "exchange_match",
        title: "فيه حد عايز يبدّل معاك! 🔄",
        body: `"${ad.title}" — ممكن يتبدل بإعلانك "${candidate.title}"`,
        ad_id: ad.id,
        data: {
          ad_id: ad.id,
          matching_ad_id: candidate.id,
          sale_type: "exchange",
        },
      });
    }

    if (notifications.length > 0) {
      await client.from("notifications").insert(notifications);

      // Push to first 10
      for (const notif of notifications.slice(0, 10)) {
        sendPushToUser(
          client,
          notif.user_id as string,
          notif.title,
          notif.body,
          `/ad/${ad.id}`,
        );
      }
    }

    return notifications.length;
  } catch (err) {
    console.error("notifyExchangeMatch error:", err);
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────────────
// 2. CHAT MESSAGE → NOTIFY RECIPIENT
// ────────────────────────────────────────────────────────────────────────

export async function notifyChatMessage(params: {
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  messageContent: string;
  adId?: string;
}): Promise<void> {
  const client = getServiceClient();
  if (!client) return;

  try {
    // Don't send notification if one was sent in the last 2 minutes for same conversation
    const dup = await isDuplicate(client, params.recipientId, "chat", null, 2 / 60);
    if (dup) return;

    const preview =
      params.messageContent.length > 50
        ? params.messageContent.slice(0, 50) + "..."
        : params.messageContent;

    await client.from("notifications").insert({
      user_id: params.recipientId,
      type: "chat",
      title: `رسالة جديدة من ${params.senderName}`,
      body: preview || "📷 صورة",
      conversation_id: params.conversationId,
      ad_id: params.adId || null,
      data: {
        conversation_id: params.conversationId,
        sender_id: params.senderId,
      },
    });

    // Push notification
    await sendPushToUser(
      client,
      params.recipientId,
      `رسالة من ${params.senderName}`,
      preview || "📷 صورة",
      `/chat/${params.conversationId}`,
    );

    // WhatsApp notification (best effort — fire and forget)
    const recipientPhone = await getUserPhone(client, params.recipientId);
    if (recipientPhone) {
      // Get ad title for context
      let adTitle: string | undefined;
      if (params.adId) {
        const { data: ad } = await client
          .from("ads")
          .select("title")
          .eq("id", params.adId)
          .maybeSingle();
        adTitle = (ad?.title as string) || undefined;
      }
      sendWhatsAppChatNotification(
        recipientPhone,
        params.senderName,
        preview || "صورة",
        adTitle,
      ).catch(() => {}); // fire and forget
    }
  } catch (err) {
    console.error("notifyChatMessage error:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 3. AUCTION BID → NOTIFY SELLER + OUTBID PREVIOUS BIDDER
// ────────────────────────────────────────────────────────────────────────

export async function notifyAuctionBid(params: {
  adId: string;
  adTitle: string;
  sellerId: string;
  bidderId: string;
  bidderName: string;
  bidAmount: number;
  previousHighBidderId?: string | null;
}): Promise<void> {
  const client = getServiceClient();
  if (!client) return;

  try {
    const formattedAmount = params.bidAmount.toLocaleString("en-US");

    // Notify seller about new bid
    const sellerDup = await isDuplicate(client, params.sellerId, "auction_bid", params.adId, 1 / 60);
    if (!sellerDup) {
      await client.from("notifications").insert({
        user_id: params.sellerId,
        type: "auction_bid",
        title: "مزايدة جديدة! 🔥",
        body: `${params.bidderName} زايد بـ ${formattedAmount} جنيه على "${params.adTitle}"`,
        ad_id: params.adId,
        data: { bidder_id: params.bidderId, amount: params.bidAmount },
      });

      await sendPushToUser(
        client,
        params.sellerId,
        "مزايدة جديدة! 🔥",
        `${params.bidderName} زايد بـ ${formattedAmount} جنيه`,
        `/ad/${params.adId}`,
      );

      // WhatsApp notification to seller
      const sellerPhone = await getUserPhone(client, params.sellerId);
      if (sellerPhone) {
        sendWhatsAppAuctionNotification(
          sellerPhone,
          "new_bid",
          params.adTitle,
          params.bidAmount,
          params.bidderName,
        ).catch(() => {});
      }
    }

    // Notify previous highest bidder they've been outbid
    if (
      params.previousHighBidderId &&
      params.previousHighBidderId !== params.bidderId
    ) {
      const outbidDup = await isDuplicate(
        client,
        params.previousHighBidderId,
        "auction_outbid",
        params.adId,
        5 / 60, // 5 min dedup window
      );
      if (!outbidDup) {
        await client.from("notifications").insert({
          user_id: params.previousHighBidderId,
          type: "auction_outbid",
          title: "حد زايد عليك! ⚠️",
          body: `مزايدتك على "${params.adTitle}" اتخطت. المبلغ الجديد: ${formattedAmount} جنيه`,
          ad_id: params.adId,
          data: { new_amount: params.bidAmount },
        });

        await sendPushToUser(
          client,
          params.previousHighBidderId,
          "حد زايد عليك! ⚠️",
          `المبلغ الجديد: ${formattedAmount} جنيه — زايد تاني!`,
          `/ad/${params.adId}`,
        );

        // WhatsApp notification to outbid user
        const outbidPhone = await getUserPhone(client, params.previousHighBidderId);
        if (outbidPhone) {
          sendWhatsAppAuctionNotification(
            outbidPhone,
            "outbid",
            params.adTitle,
            params.bidAmount,
          ).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("notifyAuctionBid error:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 4. BUY NOW → NOTIFY SELLER + OTHER BIDDERS
// ────────────────────────────────────────────────────────────────────────

export async function notifyBuyNow(params: {
  adId: string;
  adTitle: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyNowPrice: number;
}): Promise<void> {
  const client = getServiceClient();
  if (!client) return;

  try {
    const formattedPrice = params.buyNowPrice.toLocaleString("en-US");

    // Notify seller
    await client.from("notifications").insert({
      user_id: params.sellerId,
      type: "auction_ended",
      title: "تم الشراء الفوري! 🎉",
      body: `${params.buyerName} اشترى "${params.adTitle}" بسعر ${formattedPrice} جنيه`,
      ad_id: params.adId,
      data: { buyer_id: params.buyerId, amount: params.buyNowPrice },
    });

    await sendPushToUser(
      client,
      params.sellerId,
      "تم الشراء الفوري! 🎉",
      `${params.buyerName} اشترى إعلانك بـ ${formattedPrice} جنيه`,
      `/ad/${params.adId}`,
    );

    // WhatsApp notification to seller
    const sellerPhone = await getUserPhone(client, params.sellerId);
    if (sellerPhone) {
      sendWhatsAppAuctionNotification(
        sellerPhone,
        "buy_now",
        params.adTitle,
        params.buyNowPrice,
        params.buyerName,
      ).catch(() => {});
    }

    // Notify all other bidders that auction ended
    const { data: bidders } = await client
      .from("auction_bids")
      .select("bidder_id")
      .eq("ad_id", params.adId)
      .neq("bidder_id", params.buyerId);

    if (bidders && bidders.length > 0) {
      const uniqueIds = [...new Set(bidders.map((b) => b.bidder_id as string))];
      const notifications = uniqueIds.map((bidderId) => ({
        user_id: bidderId,
        type: "auction_ended",
        title: "المزاد انتهى — شراء فوري",
        body: `مزاد "${params.adTitle}" انتهى بشراء فوري بـ ${formattedPrice} جنيه`,
        ad_id: params.adId,
        data: { ended_by: "buy_now" },
      }));

      await client.from("notifications").insert(notifications);
    }
  } catch (err) {
    console.error("notifyBuyNow error:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 5. PRICE DROP → NOTIFY USERS WHO FAVORITED THE AD
// ────────────────────────────────────────────────────────────────────────

export async function notifyPriceDrop(params: {
  adId: string;
  adTitle: string;
  oldPrice: number;
  newPrice: number;
  sellerId: string;
}): Promise<void> {
  const client = getServiceClient();
  if (!client) return;

  try {
    // Find users who favorited this ad
    const { data: favorites } = await client
      .from("favorites")
      .select("user_id")
      .eq("ad_id", params.adId)
      .neq("user_id", params.sellerId);

    if (!favorites || favorites.length === 0) return;

    const dropPercent = Math.round(
      ((params.oldPrice - params.newPrice) / params.oldPrice) * 100,
    );
    const formattedNew = params.newPrice.toLocaleString("en-US");

    const notifications = favorites.map((f) => ({
      user_id: f.user_id,
      type: "favorite_price_drop",
      title: "السعر نزل! 💰",
      body: `"${params.adTitle}" نزل ${dropPercent}% — دلوقتي ${formattedNew} جنيه`,
      ad_id: params.adId,
      data: {
        old_price: params.oldPrice,
        new_price: params.newPrice,
        drop_percent: dropPercent,
      },
    }));

    await client.from("notifications").insert(notifications);

    // Push to first 20 users
    for (const notif of notifications.slice(0, 20)) {
      sendPushToUser(
        client,
        notif.user_id,
        notif.title,
        notif.body,
        `/ad/${params.adId}`,
      );
    }
  } catch (err) {
    console.error("notifyPriceDrop error:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 6. PRICE OFFER → NOTIFY SELLER (new offer) / BUYER (accept/reject/counter)
// ────────────────────────────────────────────────────────────────────────

export async function notifyPriceOffer(params: {
  type: "new_offer" | "accepted" | "rejected" | "countered";
  adId: string;
  adTitle: string;
  recipientId: string;
  senderName: string;
  amount: number;
  counterAmount?: number;
}): Promise<void> {
  const client = getServiceClient();
  if (!client) return;

  try {
    const formattedAmount = params.amount.toLocaleString("ar-EG");
    let title = "";
    let body = "";
    let notifType = "";

    switch (params.type) {
      case "new_offer":
        notifType = "price_offer_new";
        title = `عرض سعر جديد — ${formattedAmount} جنيه`;
        body = `${params.senderName} قدّم عرض ${formattedAmount} جنيه على "${params.adTitle}"`;
        break;
      case "accepted":
        notifType = "price_offer_accepted";
        title = "تم قبول عرضك! 🎉";
        body = `البائع قبل عرضك ${formattedAmount} جنيه على "${params.adTitle}"`;
        break;
      case "rejected":
        notifType = "price_offer_rejected";
        title = "تم رفض عرضك";
        body = `البائع رفض عرضك ${formattedAmount} جنيه على "${params.adTitle}"`;
        break;
      case "countered": {
        const counterFormatted = (params.counterAmount || 0).toLocaleString("ar-EG");
        notifType = "price_offer_countered";
        title = `عرض مضاد — ${counterFormatted} جنيه`;
        body = `البائع قدّم عرض مضاد ${counterFormatted} جنيه على "${params.adTitle}"`;
        break;
      }
    }

    // Dedup: 1 minute window
    const dup = await isDuplicate(client, params.recipientId, notifType, params.adId, 1 / 60);
    if (dup) return;

    await client.from("notifications").insert({
      user_id: params.recipientId,
      type: notifType,
      title,
      body,
      ad_id: params.adId,
      data: { amount: params.amount, counter_amount: params.counterAmount },
    });

    // Push notification
    await sendPushToUser(
      client,
      params.recipientId,
      title,
      body,
      `/ad/${params.adId}`,
    );

    // WhatsApp notification
    const recipientPhone = await getUserPhone(client, params.recipientId);
    if (recipientPhone) {
      sendWhatsAppOfferNotification(
        recipientPhone,
        params.type,
        params.adTitle,
        params.amount,
        params.senderName,
        params.counterAmount,
      ).catch(() => {});
    }
  } catch (err) {
    console.error("notifyPriceOffer error:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 7. SELLER INTEREST — Aggregate buyer activity on seller's ads
// ────────────────────────────────────────────────────────────────────────

/**
 * Called periodically by background worker.
 * Counts recent views/searches on seller's active ads and notifies them.
 */
export async function notifySellerInterest(): Promise<number> {
  const client = getServiceClient();
  if (!client) return 0;

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

    // Get active ads with recent views (from user_signals)
    const { data: recentSignals } = await client
      .from("user_signals")
      .select("ad_id, user_id, signal_type")
      .in("signal_type", ["view", "favorite", "chat_initiated"])
      .gte("created_at", oneDayAgo)
      .not("ad_id", "is", null)
      .limit(500);

    if (!recentSignals || recentSignals.length === 0) return 0;

    // Group by ad_id
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
    if (qualifiedAds.length === 0) return 0;

    // Get ad owners
    const adIds = qualifiedAds.map(([adId]) => adId);
    const { data: ads } = await client
      .from("ads")
      .select("id, user_id, title")
      .in("id", adIds)
      .eq("status", "active");

    if (!ads || ads.length === 0) return 0;

    let notifCount = 0;
    for (const ad of ads) {
      const adId = ad.id as string;
      const sellerId = ad.user_id as string;
      const title = ad.title as string;
      const interestedCount = adInterest.get(adId)?.size || 0;

      // Don't send if already notified today
      const dup = await isDuplicate(client, sellerId, "seller_interest", adId, 24);
      if (dup) continue;

      await client.from("notifications").insert({
        user_id: sellerId,
        type: "seller_interest",
        title: `${interestedCount} أشخاص مهتمين بإعلانك 👥`,
        body: `"${title}" عليه اهتمام! ${interestedCount} شخص شافوا أو حفظوا إعلانك النهارده`,
        ad_id: adId,
        data: { interested_count: interestedCount },
      });

      await sendPushToUser(
        client,
        sellerId,
        `${interestedCount} أشخاص مهتمين بإعلانك!`,
        `"${title}" عليه اهتمام النهارده`,
        `/ad/${adId}`,
      );

      notifCount++;
    }

    return notifCount;
  } catch (err) {
    console.error("notifySellerInterest error:", err);
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────────────
// 8. NEW AD → NOTIFY BUYERS WITH MATCHING BUY REQUESTS
// ────────────────────────────────────────────────────────────────────────

/**
 * When a new ad is created, find active buy requests that match it
 * and notify the buyers proactively.
 */
export async function notifyBuyRequestMatches(ad: NewAdData): Promise<number> {
  const client = getServiceClient();
  if (!client) return 0;

  try {
    // Try RPC function first
    const { data: matches, error: rpcError } = await client.rpc(
      "find_buy_requests_for_ad",
      { p_ad_id: ad.id, p_limit: 20 },
    );

    let buyerMatches: { buy_request_id: string; buyer_id: string; match_score: number; title?: string }[] = [];

    if (rpcError || !matches || (matches as unknown[]).length === 0) {
      // Fallback: simple category match
      const { data: fallbackRequests } = await client
        .from("buy_requests")
        .select("id, user_id, title, budget_max")
        .eq("status", "active")
        .eq("category_id", ad.category_id)
        .neq("user_id", ad.user_id)
        .limit(20);

      if (!fallbackRequests || (fallbackRequests as unknown[]).length === 0) return 0;

      buyerMatches = (fallbackRequests as Record<string, unknown>[])
        .filter((br) => {
          // Check price fits budget
          if (br.budget_max && ad.price && Number(ad.price) > Number(br.budget_max) * 1.2) return false;
          return true;
        })
        .map((br) => ({
          buy_request_id: br.id as string,
          buyer_id: br.user_id as string,
          match_score: 50,
          title: br.title as string,
        }));
    } else {
      buyerMatches = (matches as Record<string, unknown>[]).map((m) => ({
        buy_request_id: m.buy_request_id as string,
        buyer_id: m.buyer_id as string,
        match_score: Number(m.match_score),
      }));

      // Fetch request titles for notification body
      if (buyerMatches.length > 0) {
        const reqIds = buyerMatches.map((m) => m.buy_request_id);
        const { data: reqTitles } = await client
          .from("buy_requests")
          .select("id, title")
          .in("id", reqIds);

        if (reqTitles) {
          const titleMap = new Map<string, string>();
          for (const r of reqTitles as Record<string, unknown>[]) {
            titleMap.set(r.id as string, r.title as string);
          }
          buyerMatches = buyerMatches.map((m) => ({
            ...m,
            title: titleMap.get(m.buy_request_id) || "",
          }));
        }
      }
    }

    if (buyerMatches.length === 0) return 0;

    const notifications = [];
    const saleTypeLabel =
      ad.sale_type === "auction" ? "🔨 مزاد"
        : ad.sale_type === "exchange" ? "🔄 للتبديل"
          : "💰 للبيع";

    const priceText = ad.price ? ` — ${Number(ad.price).toLocaleString("en-US")} جنيه` : "";

    for (const match of buyerMatches) {
      // Dedup: don't notify same buyer for same ad
      const dup = await isDuplicate(client, match.buyer_id, "buy_request_match", ad.id, 24);
      if (dup) continue;

      notifications.push({
        user_id: match.buyer_id,
        type: "buy_request_match",
        title: "فيه بائع عنده اللي بتدور عليه! 🎯",
        body: match.title
          ? `"${ad.title}" ${saleTypeLabel}${priceText}\nمتوافق مع طلبك "${match.title}"`
          : `${ad.title} ${saleTypeLabel}${priceText}`,
        ad_id: ad.id,
        data: {
          ad_id: ad.id,
          buy_request_id: match.buy_request_id,
          match_score: match.match_score,
          sale_type: ad.sale_type,
        },
      });

      // Also insert into buy_request_matches table (non-critical)
      try {
        await client
          .from("buy_request_matches")
          .upsert({
            buy_request_id: match.buy_request_id,
            ad_id: ad.id,
            match_score: match.match_score,
            match_type: match.match_score >= 70 ? "exact" : "category",
          }, { onConflict: "buy_request_id,ad_id" });
      } catch {
        // Non-critical
      }
    }

    if (notifications.length > 0) {
      await client.from("notifications").insert(notifications);

      // Push notifications (max 20)
      for (const notif of notifications.slice(0, 20)) {
        sendPushToUser(
          client,
          notif.user_id,
          notif.title,
          notif.body,
          `/buy-requests/${(notif.data as Record<string, unknown>).buy_request_id}`,
        );
      }

      // WhatsApp to first 5 buyers
      for (const notif of notifications.slice(0, 5)) {
        const phone = await getUserPhone(client, notif.user_id);
        if (phone) {
          sendWhatsAppMatchNotification(
            phone,
            "buy_request",
            ad.title,
            notif.body,
          ).catch(() => {});
        }
      }
    }

    return notifications.length;
  } catch (err) {
    console.error("notifyBuyRequestMatches error:", err);
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────────────
// 9. NEW BUY REQUEST → NOTIFY SELLERS WITH MATCHING ADS
// ────────────────────────────────────────────────────────────────────────

interface BuyRequestData {
  id: string;
  title: string;
  category_id: string;
  subcategory_id?: string | null;
  purchase_type: string;
  budget_min?: number | null;
  budget_max?: number | null;
  governorate?: string | null;
  user_id: string;
}

/**
 * When a new buy request is created, find sellers with matching ads
 * and notify them about a potential buyer.
 */
export async function notifyMatchingSellers(request: BuyRequestData): Promise<number> {
  const client = getServiceClient();
  if (!client) return 0;

  try {
    // Find active ads in the same category
    let query = client
      .from("ads")
      .select("id, title, user_id, price, sale_type, governorate")
      .eq("status", "active")
      .eq("category_id", request.category_id)
      .neq("user_id", request.user_id)
      .order("created_at", { ascending: false })
      .limit(30);

    // Filter by price if budget is specified
    if (request.budget_max) {
      query = query.lte("price", Number(request.budget_max) * 1.3); // 30% flexibility
    }

    const { data: ads } = await query;
    if (!ads || (ads as unknown[]).length === 0) return 0;

    const notifications = [];
    const budgetText = request.budget_max
      ? `ميزانية حتى ${Number(request.budget_max).toLocaleString("en-US")} جنيه`
      : "";
    const purchaseLabel =
      request.purchase_type === "exchange" ? "عايز يبدّل"
        : request.purchase_type === "both" ? "عايز يشتري أو يبدّل"
          : "عايز يشتري";

    // Deduplicate by seller (one notification per seller)
    const notifiedSellers = new Set<string>();

    for (const ad of ads as Record<string, unknown>[]) {
      const sellerId = ad.user_id as string;
      if (notifiedSellers.has(sellerId)) continue;
      notifiedSellers.add(sellerId);

      // Dedup in DB
      const dup = await isDuplicate(client, sellerId, "buyer_looking", request.id, 24);
      if (dup) continue;

      notifications.push({
        user_id: sellerId,
        type: "buyer_looking",
        title: "فيه مشتري بيدور على اللي عندك! 🛒",
        body: `${purchaseLabel}: "${request.title}"${budgetText ? ` — ${budgetText}` : ""}`,
        ad_id: ad.id as string,
        data: {
          buy_request_id: request.id,
          ad_id: ad.id,
          purchase_type: request.purchase_type,
        },
      });
    }

    if (notifications.length > 0) {
      await client.from("notifications").insert(notifications);

      // Push to first 15 sellers
      for (const notif of notifications.slice(0, 15)) {
        sendPushToUser(
          client,
          notif.user_id,
          notif.title,
          notif.body,
          `/buy-requests/${request.id}`,
        );
      }
    }

    return notifications.length;
  } catch (err) {
    console.error("notifyMatchingSellers error:", err);
    return 0;
  }
}
