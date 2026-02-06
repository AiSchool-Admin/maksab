"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { useAuth } from "@/components/auth/AuthProvider";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  actions?: React.ReactNode;
}

export default function Header({
  title = "مكسب",
  showBack = false,
  showNotifications = true,
  actions,
}: HeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount, isOpen, setOpen, load } = useNotificationStore();

  // Load unread count on mount
  useEffect(() => {
    if (showNotifications) {
      load(user?.id);
    }
  }, [showNotifications, load, user?.id]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Right side: Back or Logo */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="p-1 -me-1 text-gray-text hover:text-dark transition-colors btn-icon-sm"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
          ) : null}
          {showBack ? (
            <h1 className="text-lg font-bold text-dark">{title}</h1>
          ) : (
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-brand-green">{title}</h1>
            </Link>
          )}
        </div>

        {/* Left side: Actions */}
        <div className="flex items-center gap-1 relative">
          {actions}
          {showNotifications && (
            <>
              <button
                onClick={() => setOpen(!isOpen)}
                className="relative p-2 text-gray-text hover:text-brand-green transition-colors rounded-full hover:bg-gray-light"
                aria-label="الإشعارات"
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 end-1 bg-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 btn-icon-sm">
                    {unreadCount > 99 ? "+99" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
