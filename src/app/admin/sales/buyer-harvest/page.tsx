"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  RefreshCw,
  ShoppingCart,
  Phone,
  Flame,
  ArrowLeftRight,
  MessageSquare,
  UserCheck,
  Filter,
  ChevronDown,
} from "lucide-react";

interface BuyerStats {
  today: {
    discovered: number;
    with_phones: number;
    hot: number;
    matched: number;
    contacted: number;
    signed_up: number;
  };
  total: number;
}

interface Buyer {
  id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  product_wanted: string | null;
  category: string | null;
  governorate: string | null;
  budget_min: number | null;
  budget_max: number | null;
  buyer_tier: string;
  buyer_score: number;
  matches_count: number;
  pipeline_status: string;
  source: string;
  created_at: string;
}

const TIER_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  hot_buyer: { emoji: "🔥", label: "hot", color: "bg-red-100 text-red-700" },
  warm_buyer: { emoji: "🟡", label: "warm", color: "bg-yellow-100 text-yellow-700" },
  cold_buyer: { emoji: "🔵", label: "cold", color: "bg-blue-100 text-blue-700" },
  unknown: { emoji: "⚪", label: "?", color: "bg-gray-100 text-gray-500" },
};

const TABS = [
  { id: "buyers", label: "المشترين" },
  { id: "matches", label: "المطابقات" },
  { id: "paste", label: "Paste & Parse", href: "/admin/sales/buyer-harvest/paste" },
];

export default function BuyerHarvestPage() {
  const [stats, setStats] = useState<BuyerStats | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("buyers");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();

      const [statsRes, buyersRes] = await Promise.all([
        fetch("/api/admin/sales/buyer-harvest/stats", { headers }),
        fetch(
          `/api/admin/sales/buyer-harvest?${new URLSearchParams({
            ...(tierFilter && { tier: tierFilter }),
            ...(categoryFilter && { category: categoryFilter }),
            limit: "50",
          })}`,
          { headers }
        ),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (buyersRes.ok) {
        const data = await buyersRes.json();
        setBuyers(data.buyers || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tierFilter, categoryFilter]);

  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse border border-gray-100" />
          ))}
        </div>
        <div className="bg-white rounded-xl p-6 h-96 animate-pulse border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">🛒 محرك حصاد المشترين</h1>
          <p className="text-sm text-gray-text mt-1">
            اكتشاف وتصنيف ومطابقة المشترين المحتملين
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<ShoppingCart size={18} />} label="اكتشفوا" value={stats.today.discovered} color="text-blue-600" bgColor="bg-blue-50" />
          <StatCard icon={<Phone size={18} />} label="بأرقام" value={stats.today.with_phones} color="text-green-600" bgColor="bg-green-50" />
          <StatCard icon={<Flame size={18} />} label="hot" value={stats.today.hot} color="text-red-600" bgColor="bg-red-50" />
          <StatCard icon={<ArrowLeftRight size={18} />} label="مطابقات" value={stats.today.matched} color="text-purple-600" bgColor="bg-purple-50" />
          <StatCard icon={<MessageSquare size={18} />} label="تواصل" value={stats.today.contacted} color="text-[#D4A843]" bgColor="bg-[#FFF8E1]" />
          <StatCard icon={<UserCheck size={18} />} label="سجّلوا" value={stats.today.signed_up} color="text-[#1B7A3D]" bgColor="bg-[#E8F5E9]" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {TABS.map((tab) =>
          tab.href ? (
            <Link
              key={tab.id}
              href={tab.href}
              className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-[#1B7A3D] border-b-2 border-transparent hover:border-[#1B7A3D] transition-colors"
            >
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-[#1B7A3D] border-[#1B7A3D]"
                  : "text-gray-500 border-transparent hover:text-[#1B7A3D]"
              }`}
            >
              {tab.label}
            </button>
          )
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setTierFilter(tierFilter === "hot_buyer" ? "" : "hot_buyer")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            tierFilter === "hot_buyer" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🔥 hot
        </button>
        <button
          onClick={() => setTierFilter(tierFilter === "warm_buyer" ? "" : "warm_buyer")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            tierFilter === "warm_buyer" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🟡 warm
        </button>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border-0"
        >
          <option value="">كل الفئات</option>
          <option value="phones">📱 موبايلات</option>
          <option value="vehicles">🚗 سيارات</option>
          <option value="properties">🏠 عقارات</option>
          <option value="electronics">💻 إلكترونيات</option>
          <option value="furniture">🪑 أثاث</option>
          <option value="gold">💰 ذهب</option>
          <option value="appliances">🏠 أجهزة</option>
        </select>
      </div>

      {/* Buyers Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-bold text-gray-text text-xs">الشريحة</th>
                <th className="px-4 py-3 text-right font-bold text-gray-text text-xs">المشتري</th>
                <th className="px-4 py-3 text-right font-bold text-gray-text text-xs">الرقم</th>
                <th className="px-4 py-3 text-right font-bold text-gray-text text-xs">عايز إيه</th>
                <th className="px-4 py-3 text-right font-bold text-gray-text text-xs">الميزانية</th>
                <th className="px-4 py-3 text-right font-bold text-gray-text text-xs">مطابقات</th>
                <th className="px-4 py-3 text-right font-bold text-gray-text text-xs">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-text">
                    <span className="text-3xl mb-2 block">🛒</span>
                    لا يوجد مشترين بعد — استخدم Paste & Parse أو انتظر الحصاد التلقائي
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => {
                  const tier = TIER_CONFIG[buyer.buyer_tier] || TIER_CONFIG.unknown;
                  return (
                    <tr key={buyer.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.color}`}>
                          {tier.emoji} {tier.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-dark text-sm">{buyer.buyer_name || "—"}</div>
                        <div className="text-[10px] text-gray-text">{buyer.source}</div>
                      </td>
                      <td className="px-4 py-3">
                        {buyer.buyer_phone ? (
                          <span dir="ltr" className="font-mono text-xs text-[#1B7A3D] font-bold">
                            {buyer.buyer_phone}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-dark max-w-[200px] truncate">
                          {buyer.product_wanted || "—"}
                        </div>
                        {buyer.governorate && (
                          <div className="text-[10px] text-gray-text">📍 {buyer.governorate}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {buyer.budget_max
                          ? `${buyer.budget_max.toLocaleString()} جنيه`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${buyer.matches_count > 0 ? "text-[#1B7A3D]" : "text-gray-300"}`}>
                          {buyer.matches_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {buyer.buyer_phone && buyer.matches_count > 0 ? (
                          <a
                            href={`https://wa.me/2${buyer.buyer_phone}?text=${encodeURIComponent(
                              `السلام عليكم 👋\nشفنا إنك بتدوّر على ${buyer.product_wanted || "منتج"}.\nلقينا ${buyer.matches_count} إعلان مطابق على مكسب!\nسجّل مجاناً وشوفهم: https://maksab.com`
                            )}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors"
                          >
                            📱 واتساب
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor} mb-2`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-lg font-bold text-dark">{value}</p>
      <p className="text-[10px] text-gray-text">{label}</p>
    </div>
  );
}
