/**
 * Notification service — manages in-app and push notifications.
 * Dev mode uses in-memory storage. Production uses Supabase.
 */

import type { AppNotification, NotificationType } from "./types";
import { NOTIFICATION_ICONS } from "./types";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const now = Date.now();
const hour = 3600000;
const minute = 60000;

// ── Dev mode mock notifications ──────────────────────────────────────
const devNotifications: AppNotification[] = [
  {
    id: "notif-1",
    userId: "dev-00000000-0000-0000-0000-000000000000",
    type: "chat",
    title: "رسالة جديدة من محمد أ.",
    body: "السيارة لسه متاحة؟",
    icon: NOTIFICATION_ICONS.chat,
    adId: "rec-2",
    conversationId: "conv-1",
    isRead: false,
    createdAt: new Date(now - 15 * minute).toISOString(),
  },
  {
    id: "notif-2",
    userId: "dev-00000000-0000-0000-0000-000000000000",
    type: "auction_bid",
    title: "مزايدة جديدة على إعلانك",
    body: "حد زايد 280,000 جنيه على تويوتا كورولا 2021",
    icon: NOTIFICATION_ICONS.auction_bid,
    adId: "auc-1",
    isRead: false,
    createdAt: new Date(now - 1 * hour).toISOString(),
  },
  {
    id: "notif-3",
    userId: "dev-00000000-0000-0000-0000-000000000000",
    type: "auction_outbid",
    title: "حد تخطى مزايدتك!",
    body: "مزايدتك على آيفون 14 برو اتتخطت — زايد تاني عشان تكسب",
    icon: NOTIFICATION_ICONS.auction_outbid,
    adId: "auc-2",
    isRead: false,
    createdAt: new Date(now - 2 * hour).toISOString(),
  },
  {
    id: "notif-4",
    userId: "dev-00000000-0000-0000-0000-000000000000",
    type: "auction_ending",
    title: "مزاد بينتهي قريب!",
    body: "المزاد على شنطة Louis Vuitton هينتهي خلال 2 ساعة",
    icon: NOTIFICATION_ICONS.auction_ending,
    adId: "auc-3",
    isRead: true,
    createdAt: new Date(now - 4 * hour).toISOString(),
  },
  {
    id: "notif-5",
    userId: "dev-00000000-0000-0000-0000-000000000000",
    type: "recommendation",
    title: "إعلان جديد يناسبك",
    body: "تويوتا كورولا 2022 — يبدأ من 250,000 جنيه",
    icon: NOTIFICATION_ICONS.recommendation,
    adId: "rec-2",
    isRead: true,
    createdAt: new Date(now - 6 * hour).toISOString(),
  },
  {
    id: "notif-6",
    userId: "dev-00000000-0000-0000-0000-000000000000",
    type: "system",
    title: "أهلاً بيك في مكسب! 💚",
    body: "اكتشف العروض المميزة وابدأ أول صفقة",
    icon: NOTIFICATION_ICONS.system,
    isRead: true,
    createdAt: new Date(now - 24 * hour).toISOString(),
  },
];

// ── Service functions ────────────────────────────────────────────────

/**
 * Fetch notifications for a user, ordered by newest first.
 */
export async function fetchNotifications(
  userId: string,
): Promise<AppNotification[]> {
  if (IS_DEV) {
    return devNotifications
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data } = await supabase
      .from("notifications" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as NotificationType,
      title: row.title as string,
      body: row.body as string,
      icon: NOTIFICATION_ICONS[(row.type as NotificationType) || "system"],
      adId: row.ad_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      isRead: row.is_read as boolean,
      createdAt: row.created_at as string,
    }));
  } catch {
    return [];
  }
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (IS_DEV) {
    return devNotifications.filter((n) => n.userId === userId && !n.isRead)
      .length;
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { count } = await supabase
      .from("notifications" as never)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  if (IS_DEV) {
    const notif = devNotifications.find((n) => n.id === notificationId);
    if (notif) notif.isRead = true;
    return;
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");
    await supabase
      .from("notifications" as never)
      .update({ is_read: true } as never)
      .eq("id", notificationId);
  } catch {
    // silent
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  if (IS_DEV) {
    devNotifications.forEach((n) => {
      if (n.userId === userId) n.isRead = true;
    });
    return;
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");
    await supabase
      .from("notifications" as never)
      .update({ is_read: true } as never)
      .eq("user_id", userId)
      .eq("is_read", false);
  } catch {
    // silent
  }
}

// ── Push notifications (PWA Web Push) ────────────────────────────────

/**
 * Request push notification permission and register with service worker.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;

  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Show a local push notification (for dev/testing).
 */
export function showLocalNotification(title: string, body: string): void {
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      title,
      body,
    });
  } else {
    new Notification(title, { body, icon: "/icons/icon-192x192.png" });
  }
}
