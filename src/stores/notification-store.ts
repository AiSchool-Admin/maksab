import { create } from "zustand";
import type { AppNotification } from "@/lib/notifications/types";
import { NOTIFICATION_ICONS } from "@/lib/notifications/types";
import type { NotificationType } from "@/lib/notifications/types";
import {
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/notifications/notification-service";

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  _realtimeCleanup: (() => void) | null;
  setOpen: (open: boolean) => void;
  load: (userId?: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId?: string) => Promise<void>;
  subscribeRealtime: (userId: string) => void;
  unsubscribeRealtime: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,
  _realtimeCleanup: null,

  setOpen: (open) => set({ isOpen: open }),

  load: async (userId) => {
    if (!userId) {
      set({ notifications: [], unreadCount: 0, isLoading: false });
      return;
    }
    const uid = userId;
    set({ isLoading: true });
    const [notifications, unreadCount] = await Promise.all([
      fetchNotifications(uid),
      getUnreadCount(uid),
    ]);
    set({ notifications, unreadCount, isLoading: false });

    // Start real-time subscription if not already active
    if (!get()._realtimeCleanup) {
      get().subscribeRealtime(uid);
    }
  },

  markRead: async (id) => {
    await markAsRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async (userId) => {
    if (userId) {
      await markAllAsRead(userId);
    }
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  subscribeRealtime: (userId: string) => {
    if (typeof window === "undefined") return;

    import("@/lib/supabase/client").then(({ supabase }) => {
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes" as never,
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new;
            const newNotif: AppNotification = {
              id: row.id as string,
              userId: row.user_id as string,
              type: row.type as NotificationType,
              title: row.title as string,
              body: row.body as string,
              icon: NOTIFICATION_ICONS[(row.type as NotificationType) || "system"],
              adId: row.ad_id as string | undefined,
              conversationId: row.conversation_id as string | undefined,
              isRead: false,
              createdAt: row.created_at as string,
            };

            set((state) => ({
              notifications: [newNotif, ...state.notifications].slice(0, 30),
              unreadCount: state.unreadCount + 1,
            }));
          },
        )
        .subscribe();

      set({
        _realtimeCleanup: () => {
          supabase.removeChannel(channel);
        },
      });
    });
  },

  unsubscribeRealtime: () => {
    const cleanup = get()._realtimeCleanup;
    if (cleanup) {
      cleanup();
      set({ _realtimeCleanup: null });
    }
  },
}));
