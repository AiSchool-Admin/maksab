"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Plus, LogIn, LogOut, Home, Moon, Sun } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { useThemeStore } from "@/stores/theme-store";
import { useAuth } from "@/components/auth/AuthProvider";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import MaksabLogo from "@/components/ui/MaksabLogo";

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
  const { user, isLoading, logout } = useAuth();
  const { unreadCount, isOpen, setOpen, load } = useNotificationStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  // Load unread count on mount
  useEffect(() => {
    if (showNotifications) {
      load(user?.id);
    }
  }, [showNotifications, load, user?.id]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      }
    }
    await logout();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-light">
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
            <>
              <h1 className="text-2xl font-bold text-dark">{title}</h1>
              <Link
                href="/"
                className="p-1.5 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors"
                aria-label="الرئيسية"
              >
                <Home size={18} />
              </Link>
            </>
          ) : (
            <Link href="/" className="flex items-center">
              <MaksabLogo size="sm" variant="full" />
            </Link>
          )}
        </div>

        {/* Left side: Actions */}
        <div className="flex items-center gap-2 relative">
          {/* Login / Logout button */}
          {!isLoading && !showBack && (
            user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-error px-3 py-1.5 rounded-full transition-all text-sm font-bold"
              >
                <LogOut size={16} />
                <span>خروج</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-dark text-white px-3 py-1.5 rounded-full transition-all text-sm font-bold"
              >
                <LogIn size={16} />
                <span>دخول</span>
              </Link>
            )
          )}

          {!showBack && (
            user?.seller_type === "store" && user?.store_id ? (
              <Link
                href="/store/dashboard/products/quick-add"
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3 py-1.5 rounded-full transition-all shadow-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span className="text-sm font-bold">أضف منتج</span>
              </Link>
            ) : (
              <Link
                href="/ad/create"
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3 py-1.5 rounded-full transition-all shadow-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span className="text-sm font-bold">أضف إعلان</span>
              </Link>
            )
          )}
          {!showBack && (
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-text hover:text-brand-green transition-colors rounded-full hover:bg-gray-light"
              aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الليلي"}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
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
