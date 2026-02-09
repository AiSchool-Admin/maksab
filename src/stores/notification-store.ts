import { create } from "zustand";
import type { AppNotification } from "@/lib/notifications/types";
import {
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/notifications/notification-service";

const DEV_USER_ID = "dev-00000000-0000-0000-0000-000000000000";

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  load: (userId?: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId?: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,

  setOpen: (open) => set({ isOpen: open }),

  load: async (userId) => {
    const uid = userId || DEV_USER_ID;
    // Skip DB queries for dev user — the fake UUID causes 400 errors
    if (uid === DEV_USER_ID) {
      set({ notifications: [], unreadCount: 0, isLoading: false });
      return;
    }
    set({ isLoading: true });
    const [notifications, unreadCount] = await Promise.all([
      fetchNotifications(uid),
      getUnreadCount(uid),
    ]);
    set({ notifications, unreadCount, isLoading: false });
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
    const uid = userId || DEV_USER_ID;
    if (uid !== DEV_USER_ID) {
      await markAllAsRead(uid);
    }
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));
