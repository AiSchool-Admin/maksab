/**
 * Notification Preferences Service
 *
 * Manages user notification preferences (push, in-app).
 * Controls which notification types are sent to which channels.
 */

export interface NotificationPreferences {
  pushEnabled: boolean;
  pushNewMessage: boolean;
  pushPriceOffer: boolean;
  pushAuctionUpdates: boolean;
  pushPriceDrops: boolean;
  pushNewMatch: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  pushNewMessage: true,
  pushPriceOffer: true,
  pushAuctionUpdates: true,
  pushPriceDrops: true,
  pushNewMatch: true,
};

const STORAGE_KEY = "maksab_notification_prefs";

/**
 * Get notification preferences (local + server merge).
 */
export async function getNotificationPreferences(
  userId?: string,
): Promise<NotificationPreferences> {
  // Start with defaults
  let prefs = { ...DEFAULT_PREFERENCES };

  // Try local storage first (for non-logged-in users)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        prefs = { ...prefs, ...JSON.parse(stored) };
      }
    } catch {
      // invalid JSON
    }
  }

  // If logged in, try to fetch from server
  if (userId) {
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        const row = data as Record<string, unknown>;
        prefs = {
          pushEnabled: row.push_enabled !== false,
          pushNewMessage: row.push_new_message !== false,
          pushPriceOffer: row.push_price_offer !== false,
          pushAuctionUpdates: row.push_auction_updates !== false,
          pushPriceDrops: row.push_price_drops !== false,
          pushNewMatch: row.push_new_match !== false,
        };
      }
    } catch {
      // Table might not exist, use local/defaults
    }
  }

  return prefs;
}

/**
 * Save notification preferences (both local + server).
 */
export async function saveNotificationPreferences(
  prefs: NotificationPreferences,
  userId?: string,
): Promise<void> {
  // Always save locally
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  // Save to server if logged in
  if (userId) {
    try {
      const { supabase } = await import("@/lib/supabase/client");
      await supabase
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          push_enabled: prefs.pushEnabled,
          push_new_message: prefs.pushNewMessage,
          push_price_offer: prefs.pushPriceOffer,
          push_auction_updates: prefs.pushAuctionUpdates,
          push_price_drops: prefs.pushPriceDrops,
          push_new_match: prefs.pushNewMatch,
          updated_at: new Date().toISOString(),
        } as never, { onConflict: "user_id" });
    } catch {
      // silent
    }
  }
}

/**
 * Check if a specific notification type should send a push.
 * Maps notification types to preference fields.
 */
export function shouldSendPush(
  prefs: NotificationPreferences,
  notificationType: string,
): boolean {
  if (!prefs.pushEnabled) return false;

  const typeMap: Record<string, keyof NotificationPreferences> = {
    chat: "pushNewMessage",
    price_offer_new: "pushPriceOffer",
    price_offer_accepted: "pushPriceOffer",
    price_offer_rejected: "pushPriceOffer",
    price_offer_countered: "pushPriceOffer",
    auction_bid: "pushAuctionUpdates",
    auction_outbid: "pushAuctionUpdates",
    auction_ending: "pushAuctionUpdates",
    auction_ended: "pushAuctionUpdates",
    auction_won: "pushAuctionUpdates",
    favorite_price_drop: "pushPriceDrops",
    new_match: "pushNewMatch",
    exchange_match: "pushNewMatch",
    buy_request_match: "pushNewMatch",
    buyer_looking: "pushNewMatch",
    recommendation: "pushNewMatch",
  };

  const prefKey = typeMap[notificationType];
  if (!prefKey) return true; // default: send for unknown types

  return prefs[prefKey] !== false;
}

/**
 * Check push notification support in the current browser.
 */
export function getPushSupport(): {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  hasServiceWorker: boolean;
} {
  if (typeof window === "undefined") {
    return { isSupported: false, permission: "unsupported", hasServiceWorker: false };
  }

  const hasNotification = "Notification" in window;
  const hasSW = "serviceWorker" in navigator;
  const hasPushManager = "PushManager" in window;

  return {
    isSupported: hasNotification && hasSW && hasPushManager,
    permission: hasNotification ? Notification.permission : "unsupported",
    hasServiceWorker: hasSW,
  };
}
