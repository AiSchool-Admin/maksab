/**
 * Notification service — manages in-app and push notifications.
 * Always queries Supabase — no mock data.
 */

import type { AppNotification, NotificationType } from "./types";
import { NOTIFICATION_ICONS } from "./types";

// ── Service functions ────────────────────────────────────────────────

/**
 * Fetch notifications for a user, ordered by newest first.
 */
export async function fetchNotifications(
  userId: string,
): Promise<AppNotification[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await supabase
      .from("notifications" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    // Table might not exist yet — fail silently
    if (error) return [];

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
 * Request push notification permission and subscribe to Web Push.
 * Returns the PushSubscription if successful, null otherwise.
 */
export async function requestPushPermission(): Promise<PushSubscription | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  if (Notification.permission === "denied") return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidKey) {
      console.warn("VAPID public key not configured");
      return null;
    }

    // Convert VAPID key to Uint8Array
    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    return subscription;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return null;
  }
}

/**
 * Save push subscription to server so we can send push notifications later.
 */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  try {
    const subJson = subscription.toJSON();
    await fetch("/api/notifications/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        subscription: {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        },
      }),
    });
  } catch {
    // Silent — push is best-effort
  }
}

/**
 * Request permission and subscribe + save in one call.
 */
export async function setupPushNotifications(
  userId: string,
): Promise<boolean> {
  const subscription = await requestPushPermission();
  if (!subscription) return false;
  await savePushSubscription(userId, subscription);
  return true;
}

/**
 * Show a local push notification.
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
