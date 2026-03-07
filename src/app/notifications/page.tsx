"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Loader2,
  Settings,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNotificationStore } from "@/stores/notification-store";
import {
  fetchNotificationsPaginated,
  markAsRead,
  markAllAsRead,
} from "@/lib/notifications/notification-service";
import type { AppNotification } from "@/lib/notifications/types";
import { NOTIFICATION_ICONS } from "@/lib/notifications/types";
import { formatTimeAgo } from "@/lib/utils/format";
import BottomNav from "@/components/layout/BottomNav";

/** Filter categories for the notification page */
const FILTER_TABS: { key: string; label: string; icon: string }[] = [
  { key: "all", label: "الكل", icon: "🔔" },
  { key: "chat", label: "الرسائل", icon: "💬" },
  { key: "auction", label: "المزادات", icon: "🔨" },
  { key: "match", label: "تطابقات", icon: "🎯" },
  { key: "price", label: "الأسعار", icon: "💰" },
  { key: "system", label: "النظام", icon: "📢" },
];

function matchesFilter(notif: AppNotification, filterKey: string): boolean {
  if (filterKey === "all") return true;
  if (filterKey === "chat") return notif.type === "chat";
  if (filterKey === "auction")
    return notif.type.startsWith("auction_");
  if (filterKey === "match")
    return ["new_match", "exchange_match", "buy_request_match", "buyer_looking", "seller_interest"].includes(notif.type);
  if (filterKey === "price")
    return ["favorite_price_drop", "buy_request_offer", "commission_thank_you", "commission_reminder", "commission_verified"].includes(notif.type);
  if (filterKey === "system")
    return notif.type === "system" || notif.type === "recommendation";
  return true;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { markAllRead } = useNotificationStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const loadNotifications = useCallback(
    async (pageNum: number, append = false) => {
      if (!user?.id) return;
      if (pageNum === 1) setIsLoading(true);
      else setLoadingMore(true);

      const result = await fetchNotificationsPaginated(user.id, {
        page: pageNum,
        limit: 20,
      });

      if (append) {
        setNotifications((prev) => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }
      setHasMore(result.hasMore);
      setIsLoading(false);
      setLoadingMore(false);
    },
    [user?.id],
  );

  useEffect(() => {
    if (user?.id) {
      loadNotifications(1);
    }
  }, [user?.id, loadNotifications]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadNotifications(nextPage, true);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
    }

    if (notif.conversationId) {
      router.push(`/chat/${notif.conversationId}`);
    } else if (notif.adId) {
      router.push(`/ad/${notif.adId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllRead(user.id);
  };

  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter));
  const hasUnread = notifications.some((n) => !n.isRead);

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <Bell size={48} className="text-gray-300 mb-4" />
        <h1 className="text-lg font-bold text-dark mb-2">سجّل دخول الأول</h1>
        <p className="text-sm text-gray-text mb-4">
          لازم تسجل دخول عشان تشوف الإشعارات
        </p>
        <button
          onClick={() => router.push("/login")}
          className="bg-brand-green text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
        >
          تسجيل الدخول
        </button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-dark">الإشعارات</h1>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-brand-green font-semibold px-2 py-1 rounded-lg hover:bg-brand-green-light/30 transition-colors"
              >
                <CheckCheck size={14} />
                قراءة الكل
              </button>
            )}
            <button
              onClick={() => router.push("/settings")}
              className="p-2 text-gray-text hover:text-dark rounded-lg transition-colors"
              title="إعدادات الإشعارات"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.key
                  ? "bg-brand-green text-white"
                  : "bg-gray-100 text-gray-text hover:bg-gray-200"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pb-24">
        {isLoading ? (
          <div className="space-y-1 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 bg-white rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <span className="text-4xl mb-3">
              {activeFilter === "all" ? "🔔" : FILTER_TABS.find((t) => t.key === activeFilter)?.icon || "🔔"}
            </span>
            <p className="text-sm text-gray-text">
              {activeFilter === "all"
                ? "مفيش إشعارات دلوقتي"
                : `مفيش إشعارات في قسم "${FILTER_TABS.find((t) => t.key === activeFilter)?.label}"`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-gray-50 ${
                  !notif.isRead ? "bg-brand-green-light/20" : "bg-white"
                }`}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {notif.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-snug ${
                      !notif.isRead
                        ? "font-bold text-dark"
                        : "font-medium text-gray-600"
                    }`}
                  >
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-text mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatTimeAgo(notif.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                  {!notif.isRead && (
                    <span className="w-2.5 h-2.5 bg-brand-green rounded-full" />
                  )}
                  <ChevronRight
                    size={14}
                    className="text-gray-300 rtl:rotate-180"
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && activeFilter === "all" && (
          <div className="px-4 py-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-text hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جاري التحميل...
                </>
              ) : (
                "عرض المزيد"
              )}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
