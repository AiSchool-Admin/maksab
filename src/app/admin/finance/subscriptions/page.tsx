"use client";

import { useState } from "react";
import {
  CreditCard,
  Search,
  MoreHorizontal,
  Phone,
  Calendar,
  Crown,
  Users,
} from "lucide-react";

/* ── Mock Data ────────────────────────────────────────────────── */

interface Subscriber {
  id: string;
  name: string;
  phone: string;
  tier: "free" | "silver" | "gold" | "diamond";
  startDate: string;
  renewalDate: string;
  status: "active" | "expired" | "cancelled";
}

const subscribers: Subscriber[] = [
  {
    id: "1",
    name: "محمد أحمد",
    phone: "01012345678",
    tier: "diamond",
    startDate: "1 يناير 2026",
    renewalDate: "1 أبريل 2026",
    status: "active",
  },
  {
    id: "2",
    name: "أحمد سعيد",
    phone: "01198765432",
    tier: "gold",
    startDate: "15 ديسمبر 2025",
    renewalDate: "15 مارس 2026",
    status: "active",
  },
  {
    id: "3",
    name: "سارة محمود",
    phone: "01055512345",
    tier: "gold",
    startDate: "1 فبراير 2026",
    renewalDate: "1 مايو 2026",
    status: "active",
  },
  {
    id: "4",
    name: "خالد عبدالله",
    phone: "01223456789",
    tier: "silver",
    startDate: "10 نوفمبر 2025",
    renewalDate: "10 فبراير 2026",
    status: "expired",
  },
  {
    id: "5",
    name: "فاطمة حسن",
    phone: "01567890123",
    tier: "gold",
    startDate: "20 يناير 2026",
    renewalDate: "20 أبريل 2026",
    status: "active",
  },
  {
    id: "6",
    name: "عمر يوسف",
    phone: "01034567890",
    tier: "silver",
    startDate: "5 أكتوبر 2025",
    renewalDate: "5 يناير 2026",
    status: "cancelled",
  },
  {
    id: "7",
    name: "نور الدين",
    phone: "01187654321",
    tier: "gold",
    startDate: "1 مارس 2026",
    renewalDate: "1 يونيو 2026",
    status: "active",
  },
  {
    id: "8",
    name: "ياسمين علي",
    phone: "01298765432",
    tier: "silver",
    startDate: "15 فبراير 2026",
    renewalDate: "15 مايو 2026",
    status: "active",
  },
];

const tierConfig: Record<
  string,
  { label: string; price: string; color: string; bgColor: string; icon: string }
> = {
  free: {
    label: "Free",
    price: "مجاني",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "🆓",
  },
  silver: {
    label: "Silver",
    price: "99 ج.م/شهر",
    color: "text-gray-700",
    bgColor: "bg-gray-200",
    icon: "🥈",
  },
  gold: {
    label: "Gold",
    price: "199 ج.م/شهر",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: "🥇",
  },
  diamond: {
    label: "Diamond",
    price: "499 ج.م/شهر",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: "💎",
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-50 text-green-700" },
  expired: { label: "منتهي", color: "bg-red-50 text-red-600" },
  cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-500" },
};

type FilterTab = "all" | "active" | "expired" | "cancelled";

/* ── Component ────────────────────────────────────────────────── */

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const tierCounts = {
    free: 1200,
    silver: subscribers.filter((s) => s.tier === "silver").length + 12,
    gold: subscribers.filter((s) => s.tier === "gold").length,
    diamond: subscribers.filter((s) => s.tier === "diamond").length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "active", label: "نشط" },
    { key: "expired", label: "منتهي" },
    { key: "cancelled", label: "ملغي" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
          <CreditCard size={24} className="text-[#1B7A3D]" />
          إدارة الاشتراكات
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          باقات التجار والمشتركين المدفوعين
        </p>
      </div>

      {/* ── Tier Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["free", "silver", "gold", "diamond"] as const).map((tier) => {
          const cfg = tierConfig[tier];
          return (
            <div
              key={tier}
              className="bg-white rounded-2xl border border-gray-200 p-4 text-center"
            >
              <div
                className={`w-12 h-12 ${cfg.bgColor} rounded-xl mx-auto mb-3 flex items-center justify-center text-xl`}
              >
                {cfg.icon}
              </div>
              <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-2xl font-bold text-dark mt-1">
                {tierCounts[tier].toLocaleString("en-US")}
              </p>
              <p className="text-[11px] text-gray-text mt-0.5">{cfg.price}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filter Tabs + Search ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
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

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الموبايل..."
              className="w-full sm:w-64 pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1B7A3D] focus:ring-1 focus:ring-[#1B7A3D]/20"
            />
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-medium">المشترك</th>
                <th className="text-center px-4 py-3 font-medium">الموبايل</th>
                <th className="text-center px-4 py-3 font-medium">الباقة</th>
                <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">
                  تاريخ البدء
                </th>
                <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">
                  تاريخ التجديد
                </th>
                <th className="text-center px-4 py-3 font-medium">الحالة</th>
                <th className="text-center px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <Users size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">لا توجد نتائج</p>
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => {
                  const tier = tierConfig[sub.tier];
                  const status = statusConfig[sub.status];
                  return (
                    <tr
                      key={sub.id}
                      className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                            {sub.name[0]}
                          </div>
                          <span className="font-medium text-dark">
                            {sub.name}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600 flex items-center justify-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          <span dir="ltr">{sub.phone}</span>
                        </span>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${tier.bgColor} ${tier.color}`}
                        >
                          {tier.icon} {tier.label}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">
                        <span className="flex items-center justify-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          {sub.startDate}
                        </span>
                      </td>

                      {/* Renewal Date */}
                      <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">
                        {sub.renewalDate}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <button className="p-1.5 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            عرض {filteredSubscribers.length} من {subscribers.length} مشترك
          </p>
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-[#D4A843]" />
            <span className="text-xs text-gray-500">
              إجمالي المشتركين المدفوعين:{" "}
              <span className="font-bold text-dark">21</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
