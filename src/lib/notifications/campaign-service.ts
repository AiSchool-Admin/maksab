/**
 * Push Notification Campaigns — مكسب
 *
 * Trigger-based notification system for:
 * - Welcome, Activation Nudge, New in Category,
 * - New Message, Price Drop, Weekly Digest, Inactive Return
 */

import { supabase } from "@/lib/supabase/client";
import { ga4Event } from "@/lib/analytics/ga4";

// ── Types ──────────────────────────────────────────────

export type CampaignType =
  | "welcome"
  | "activation_nudge"
  | "new_in_category"
  | "new_message"
  | "price_drop"
  | "weekly_digest"
  | "inactive_return"
  | "custom";

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
}

interface CampaignTemplate {
  type: CampaignType;
  title: string;
  body: string;
  delay?: string; // e.g., "24h", "7d"
}

// ── Campaign Templates ─────────────────────────────────

export const CAMPAIGN_TEMPLATES: Record<string, CampaignTemplate> = {
  welcome: {
    type: "welcome",
    title: "أهلاً بيك في مكسب! 💚",
    body: "ابدأ بيع أو شراء — أول إعلانك مجاناً",
  },
  activation_nudge: {
    type: "activation_nudge",
    title: "عندك حاجة تبيعها؟",
    body: "أضف أول إعلان في 30 ثانية — مجاناً!",
    delay: "24h",
  },
  new_in_category: {
    type: "new_in_category",
    title: "🆕 إعلان جديد",
    body: "في القسم اللي بتتابعه — شوف التفاصيل!",
  },
  new_message: {
    type: "new_message",
    title: "رسالة جديدة",
    body: "حد بعتلك رسالة — شوف إيه",
  },
  price_drop: {
    type: "price_drop",
    title: "📉 سعر نزل!",
    body: "حاجة بتدور عليها سعرها نزل",
  },
  weekly_digest: {
    type: "weekly_digest",
    title: "أهم إعلانات الأسبوع 🔥",
    body: "شوف إيه الجديد على مكسب",
    delay: "7d",
  },
  inactive_return: {
    type: "inactive_return",
    title: "وحشتنا! 😊",
    body: "شوف إيه الجديد على مكسب",
    delay: "7d",
  },
};

// ── Core Functions ─────────────────────────────────────

/**
 * Send a push notification via the browser's Push API.
 * Falls back to in-app notification if push isn't available.
 */
export async function sendPushNotification(
  payload: NotificationPayload,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Check if we have push permission
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) {
        await reg.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          data: { url: payload.url, ...payload.data },
          dir: "rtl",
          lang: "ar",
        });
        return true;
      }
    } catch {
      // Fall through to return false
    }
  }

  return false;
}

/**
 * Log a campaign notification in the database.
 */
export async function logCampaignNotification(
  userId: string,
  campaignType: CampaignType,
  title: string,
  body: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("notification_campaigns" as never).insert({
      user_id: userId,
      campaign_type: campaignType,
      title,
      body,
      metadata: metadata || {},
    } as never);
  } catch {
    // Fire and forget
  }

  // Track in GA4
  ga4Event("notification", {
    type: campaignType,
    action: "sent",
  });
}

/**
 * Track when a user clicks a notification.
 */
export function trackNotificationClick(
  campaignType: CampaignType,
): void {
  ga4Event("notification", {
    type: campaignType,
    action: "clicked",
  });
}

// ── Trigger Functions ──────────────────────────────────

/**
 * Send welcome notification to a new user.
 */
export async function triggerWelcomeNotification(userId: string): Promise<void> {
  const template = CAMPAIGN_TEMPLATES.welcome;
  await sendPushNotification({
    title: template.title,
    body: template.body,
    url: "/",
  });
  await logCampaignNotification(userId, "welcome", template.title, template.body);
}

/**
 * Send new message notification.
 */
export async function triggerNewMessageNotification(
  userId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
): Promise<void> {
  const title = `رسالة جديدة من ${senderName}`;
  const body = messagePreview.length > 50
    ? messagePreview.slice(0, 50) + "..."
    : messagePreview;

  await sendPushNotification({
    title,
    body,
    url: `/chat/${conversationId}`,
  });
  await logCampaignNotification(userId, "new_message", title, body, {
    sender: senderName,
    conversation_id: conversationId,
  });
}

/**
 * Send price drop notification.
 */
export async function triggerPriceDropNotification(
  userId: string,
  adTitle: string,
  oldPrice: number,
  newPrice: number,
  adId: string,
): Promise<void> {
  const title = "📉 سعر نزل!";
  const body = `${adTitle} بقى ${newPrice.toLocaleString("en-US")} بدل ${oldPrice.toLocaleString("en-US")} جنيه`;

  await sendPushNotification({
    title,
    body,
    url: `/ad/${adId}`,
  });
  await logCampaignNotification(userId, "price_drop", title, body, {
    ad_id: adId,
    old_price: oldPrice,
    new_price: newPrice,
  });
}

/**
 * Send new-in-category notification.
 */
export async function triggerNewInCategoryNotification(
  userId: string,
  adTitle: string,
  categoryName: string,
  price: number | null,
  adId: string,
): Promise<void> {
  const title = `🆕 ${adTitle} في ${categoryName}`;
  const body = price
    ? `بـ ${price.toLocaleString("en-US")} جنيه — شوف التفاصيل!`
    : "شوف التفاصيل!";

  await sendPushNotification({
    title,
    body,
    url: `/ad/${adId}`,
  });
  await logCampaignNotification(userId, "new_in_category", title, body, {
    ad_id: adId,
    category: categoryName,
  });
}

// ── Preferences ────────────────────────────────────────

/**
 * Get notification preferences for a user.
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<Record<string, boolean>> {
  const defaults = {
    push_enabled: true,
    new_message: true,
    auction_updates: true,
    price_drops: true,
    new_in_category: true,
    weekly_digest: true,
    marketing: true,
  };

  try {
    const { data } = await supabase
      .from("notification_preferences" as never)
      .select("*")
      .eq("user_id" as never, userId as never)
      .maybeSingle();

    if (data) {
      return { ...defaults, ...(data as Record<string, boolean>) };
    }
  } catch {
    // Return defaults
  }

  return defaults;
}

/**
 * Update notification preferences.
 */
export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<Record<string, boolean>>,
): Promise<void> {
  try {
    await supabase
      .from("notification_preferences" as never)
      .upsert({
        user_id: userId,
        ...prefs,
        updated_at: new Date().toISOString(),
      } as never);
  } catch {
    // Fire and forget
  }
}
