"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Search,
  MoreHorizontal,
  Phone,
  Calendar,
  Crown,
  Users,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Subscriber {
  id: string;
  name: string;
  phone: string;
  tier: "free" | "silver" | "gold" | "diamond";
  startDate: string;
  renewalDate: string;
  status: "active" | "expired" | "cancelled";
}

const tierConfig: Record<
  string,
  { label: string; price: string; color: string; bgColor: string; icon: string }
> = {
  free: { label: "Free", price: "مجاني", color: "text-gray-600", bgColor: "bg-gray-100", icon: "🆓" },
  silver: { label: "Silver", price: "99 ج.م/شهر", color: "text-gray-700", bgColor: "bg-gray-200", icon: "🥈" },
  gold: { label: "Gold", price: "199 ج.م/شهر", color: "text-amber-700", bgColor: "bg-amber-100", icon: "🥇" },
  diamond: { label: "Diamond", price: "499 ج.م/شهر", color: "text-blue-700", bgColor: "bg-blue-100", icon: "💎" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-50 text-green-700" },
  expired: { label: "منتهي", color: "bg-red-50 text-red-600" },
  cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-500" },
};

type FilterTab = "all" | "active" | "expired" | "cancelled";

export default function SubscriptionsPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      // No subscription API exists yet — will return empty
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/finance/subscriptions", { headers });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
      }
    } catch {
      // Keep empty
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // No subscriptions table yet — show empty state
    setLoading(false);
  }, []);

  const filteredSubscribers = subscribers.filter((sub) => {
    if (activeTab !== "all" && sub.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        sub.name.toLowerCase().includes(q) ||
        sub.phone.includes(q) ||
        tierConfig[sub.tier].label.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "active", label: "نشط" },
    { key: "expired", label: "منتهي" },
    { key: "cancelled", label: "ملغي" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 h-16 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
          <CreditCard size={24} className="text-[#1B7A3D]" />
          إدارة الاشتراكات
        </h2>
        <p className="text-xs text-gray-500 mt-1">باقات التجار والمشتركين المدفوعين</p>
      </div>

      {/* ── Tier Summary Cards — zeros ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["free", "silver", "gold", "diamond"] as const).map((tier) => {
          const cfg = tierConfig[tier];
          return (
            <div key={tier} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <div className={`w-12 h-12 ${cfg.bgColor} rounded-xl mx-auto mb-3 flex items-center justify-center text-xl`}>
                {cfg.icon}
              </div>
              <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-2xl font-bold text-dark mt-1">0</p>
              <p className="text-[11px] text-gray-text mt-0.5">{cfg.price}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filter Tabs + Search ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-[#1B7A3D] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الموبايل..."
              className="w-full sm:w-64 pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1B7A3D] focus:ring-1 focus:ring-[#1B7A3D]/20"
            />
          </div>
        </div>

        {/* ── Table / Empty State ───────────────────────────────── */}
        <div className="p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا توجد اشتراكات بعد</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر البيانات بعد تفعيل نظام الاشتراكات</p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">عرض 0 مشتركين</p>
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-[#D4A843]" />
            <span className="text-xs text-gray-500">
              إجمالي المشتركين المدفوعين: <span className="font-bold text-dark">0</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
