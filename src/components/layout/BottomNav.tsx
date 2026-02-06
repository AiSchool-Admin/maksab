"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, User, Plus } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "الرئيسية" },
  { href: "/search", icon: Search, label: "البحث" },
  { href: "/ad/create", icon: Plus, label: "أضف إعلان", isAdd: true },
  { href: "/chat", icon: MessageCircle, label: "الرسائل", hasBadge: true },
  { href: "/profile", icon: User, label: "حسابي" },
];

interface BottomNavProps {
  unreadMessages?: number;
}

export default function BottomNav({ unreadMessages = 0 }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light safe-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          // Prominent green "add" button — elevated
          if (tab.isAdd) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative -top-5 flex items-center justify-center w-14 h-14 bg-brand-green text-white rounded-full shadow-lg hover:bg-brand-green-dark active:scale-95 transition-all"
                aria-label={tab.label}
              >
                <Icon size={28} strokeWidth={2.5} />
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
                {/* Unread messages badge */}
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
              {/* Active indicator dot */}
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
