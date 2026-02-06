"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  unreadCount?: number;
  actions?: React.ReactNode;
}

export default function Header({
  title = "مكسب",
  showBack = false,
  showNotifications = true,
  unreadCount = 0,
  actions,
}: HeaderProps) {
  const router = useRouter();

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
        <div className="flex items-center gap-1">
          {actions}
          {showNotifications && (
            <button
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
          )}
        </div>
      </div>
    </header>
  );
}
