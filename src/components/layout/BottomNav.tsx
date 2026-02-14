"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, MessageCircle, User, Plus, LayoutDashboard } from "lucide-react";

interface TabConfig {
  href: string;
  icon: typeof Home;
  label: string;
  isAdd?: boolean;
  hasBadge?: boolean;
}

const defaultTabs: TabConfig[] = [
  { href: "/", icon: Home, label: "الرئيسية" },
  { href: "/stores", icon: Store, label: "المتاجر" },
  { href: "/ad/create", icon: Plus, label: "أضف إعلانك", isAdd: true },
  { href: "/chat", icon: MessageCircle, label: "الرسائل", hasBadge: true },
  { href: "/profile", icon: User, label: "حسابي" },
];

const merchantTabs: TabConfig[] = [
  { href: "/", icon: Home, label: "الرئيسية" },
  { href: "/store/dashboard", icon: LayoutDashboard, label: "متجري" },
  { href: "/store/dashboard/products/quick-add", icon: Plus, label: "أضف منتج", isAdd: true },
  { href: "/chat", icon: MessageCircle, label: "الرسائل", hasBadge: true },
  { href: "/profile", icon: User, label: "حسابي" },
];

interface BottomNavProps {
  unreadMessages?: number;
  isMerchant?: boolean;
}

export default function BottomNav({ unreadMessages = 0, isMerchant = false }: BottomNavProps) {
  const pathname = usePathname();
  const tabs = isMerchant ? merchantTabs : defaultTabs;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-[#0f1117] border-t border-gray-light safe-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          // Prominent add button — elevated pill
          if (tab.isAdd) {
            const addBtnClass = isMerchant
              ? "relative -top-4 flex items-center gap-1.5 bg-orange-500 text-white px-5 py-2.5 rounded-full shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all"
              : "relative -top-4 flex items-center gap-1.5 bg-brand-green text-white px-5 py-2.5 rounded-full shadow-lg shadow-brand-green/30 hover:bg-brand-green-dark active:scale-95 transition-all";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={addBtnClass}
                aria-label={tab.label}
              >
                <Icon size={18} strokeWidth={2.5} />
                <span className="text-sm font-bold whitespace-nowrap">{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors ${
                isActive
                  ? "text-brand-green"
                  : "text-gray-text hover:text-brand-green-dark"
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {tab.hasBadge && unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -start-1.5 bg-error text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 btn-icon-sm">
                    {unreadMessages > 99 ? "+99" : unreadMessages}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] leading-tight ${isActive ? "font-bold" : "font-medium"}`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 bg-brand-green rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
