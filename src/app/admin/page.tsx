"use client";

import { useState, useEffect } from "react";
import {
  Users,
  ShoppingBag,
  Eye,
  Store,
  MessageCircle,
  TrendingUp,
  UserPlus,
  PlusCircle,
  DollarSign,
  Activity,
} from "lucide-react";
import { useAdmin } from "./layout";
import type { OverviewStats, DailyGrowth } from "@/lib/admin/admin-service";

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-US");
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US") + " جنيه";
}

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function KPICard({ label, value, subtitle, icon, color, bgColor }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-dark">{value}</p>
      <p className="text-xs text-gray-text mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-brand-green mt-1 font-medium">{subtitle}</p>}
    </div>
  );
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-12">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm min-w-[3px] ${color}`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, opacity: 0.3 + (i / data.length) * 0.7 }}
        />
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const admin = useAdmin();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [growth, setGrowth] = useState<DailyGrowth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;

    async function load() {
      setIsLoading(true);
      try {
        const headers = { "x-admin-id": admin!.id };
        const [overviewRes, growthRes] = await Promise.all([
          fetch("/api/admin/stats?type=overview", { headers }),
          fetch("/api/admin/stats?type=growth&days=30", { headers }),
        ]);

        if (overviewRes.ok) setStats(await overviewRes.json());
        if (growthRes.ok) setGrowth(await growthRes.json());
      } catch {
        // Silent fail
      }
      setIsLoading(false);
    }

    load();
  }, [admin]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-28 animate-pulse border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-text">مفيش بيانات متاحة حالياً</p>
      </div>
    );
  }

  const userGrowthData = growth.map((d) => d.users);
  const adGrowthData = growth.map((d) => d.ads);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-lg font-bold text-dark">أهلاً بيك يا أدمن 👋</h2>
        <p className="text-sm text-gray-text">ملخص أداء مكسب</p>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="إجمالي المستخدمين"
          value={formatNum(stats.totalUsers)}
          subtitle={`+${stats.newUsersToday} النهاردة`}
          icon={<Users size={20} />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <KPICard
          label="إجمالي الإعلانات"
          value={formatNum(stats.totalAds)}
          subtitle={`+${stats.newAdsToday} النهاردة`}
          icon={<ShoppingBag size={20} />}
          color="text-brand-green"
          bgColor="bg-brand-green-light"
        />
        <KPICard
          label="إعلانات نشطة"
          value={formatNum(stats.activeAds)}
          icon={<Activity size={20} />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <KPICard
          label="إجمالي المشاهدات"
          value={formatNum(stats.totalViews)}
          icon={<Eye size={20} />}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Secondary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="المتاجر"
          value={formatNum(stats.totalStores)}
          icon={<Store size={20} />}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <KPICard
          label="أفراد"
          value={formatNum(stats.individualUsers)}
          icon={<UserPlus size={20} />}
          color="text-cyan-600"
          bgColor="bg-cyan-50"
        />
        <KPICard
          label="إعلانات مباعة"
          value={formatNum(stats.soldAds)}
          icon={<DollarSign size={20} />}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <KPICard
          label="المحادثات"
          value={formatNum(stats.totalConversations)}
          subtitle={`${formatNum(stats.totalMessages)} رسالة`}
          icon={<MessageCircle size={20} />}
          color="text-pink-600"
          bgColor="bg-pink-50"
        />
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-l from-brand-green to-[#145C2E] rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} />
          <span className="text-sm font-medium opacity-80">إجمالي قيمة المبيعات</span>
        </div>
        <p className="text-3xl font-bold">{formatPrice(stats.totalSoldValue)}</p>
        <p className="text-xs opacity-60 mt-1">من {stats.soldAds} صفقة مكتملة</p>
      </div>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users Growth */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-dark">نمو المستخدمين</h3>
              <p className="text-xs text-gray-text">آخر 30 يوم</p>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-blue-600">+{stats.newUsersMonth}</p>
              <p className="text-[10px] text-gray-text">هذا الشهر</p>
            </div>
          </div>
          <MiniChart data={userGrowthData} color="bg-blue-500" />
        </div>

        {/* Ads Growth */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-dark">نمو الإعلانات</h3>
              <p className="text-xs text-gray-text">آخر 30 يوم</p>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-brand-green">+{stats.newAdsWeek}</p>
              <p className="text-[10px] text-gray-text">هذا الأسبوع</p>
            </div>
          </div>
          <MiniChart data={adGrowthData} color="bg-brand-green" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <h3 className="text-sm font-bold text-dark mb-3">ملخص سريع</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-dark">{stats.newUsersToday}</p>
            <p className="text-[10px] text-gray-text">مستخدم جديد النهاردة</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-dark">{stats.newUsersWeek}</p>
            <p className="text-[10px] text-gray-text">مستخدم جديد هذا الأسبوع</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-dark">{stats.newAdsToday}</p>
            <p className="text-[10px] text-gray-text">إعلان جديد النهاردة</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-dark">{stats.newAdsWeek}</p>
            <p className="text-[10px] text-gray-text">إعلان جديد هذا الأسبوع</p>
          </div>
        </div>
      </div>
    </div>
  );
}
