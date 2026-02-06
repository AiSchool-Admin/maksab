"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNotificationStore } from "@/stores/notification-store";
import { formatTimeAgo } from "@/lib/utils/format";

export default function NotificationDropdown() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    notifications,
    isLoading,
    isOpen,
    setOpen,
    load,
    markRead,
    markAllRead,
  } = useNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications on open
  useEffect(() => {
    if (isOpen) {
      load(user?.id);
    }
  }, [isOpen, load, user?.id]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.isRead) {
      await markRead(notif.id);
    }
    setOpen(false);

    if (notif.conversationId) {
      router.push(`/chat/${notif.conversationId}`);
    } else if (notif.adId) {
      router.push(`/ad/${notif.adId}`);
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full end-0 mt-1 w-80 max-h-[70vh] bg-white rounded-xl shadow-lg border border-gray-light overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-light">
        <h3 className="text-sm font-bold text-dark">الإشعارات</h3>
        <div className="flex items-center gap-2">
          {hasUnread && (
            <button
              onClick={() => markAllRead(user?.id)}
              className="flex items-center gap-1 text-[11px] text-brand-green font-semibold hover:underline"
            >
              <CheckCheck size={12} />
              قراءة الكل
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-gray-text hover:text-dark rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="overflow-y-auto max-h-[calc(70vh-52px)]">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-light rounded-lg skeleton" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm text-gray-text">مفيش إشعارات دلوقتي</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-gray-light/50 transition-colors border-b border-gray-light/50 ${
                !notif.isRead ? "bg-brand-green-light/30" : ""
              }`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">
                {notif.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${
                    !notif.isRead
                      ? "font-bold text-dark"
                      : "font-medium text-gray-text"
                  }`}
                >
                  {notif.title}
                </p>
                <p className="text-xs text-gray-text mt-0.5 line-clamp-2">
                  {notif.body}
                </p>
                <p className="text-[10px] text-gray-text/70 mt-1">
                  {formatTimeAgo(notif.createdAt)}
                </p>
              </div>
              {!notif.isRead && (
                <span className="w-2 h-2 bg-brand-green rounded-full flex-shrink-0 mt-2" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
