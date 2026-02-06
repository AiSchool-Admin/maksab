"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, User, Plus } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "الرئيسية" },
  { href: "/search", icon: Search, label: "البحث" },
  { href: "/ad/create", icon: Plus, label: "أضف إعلان", isAdd: true },
  { href: "/chat", icon: MessageCircle, label: "الرسائل" },
  { href: "/profile", icon: User, label: "حسابي" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-2 py-1 flex items-center justify-around z-50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        if (tab.isAdd) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative -top-4 bg-brand-green text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-brand-green-dark transition-colors"
              aria-label={tab.label}
            >
              <Icon size={28} />
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              isActive ? "text-brand-green" : "text-gray-text"
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
