"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  Users,
  Search,
  Link2,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { getStoreByUserId, getStoreAnalytics } from "@/lib/stores/store-service";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import EmptyState from "@/components/ui/EmptyState";
import type { Store } from "@/types";

interface AnalyticsData {
  date: string;
  total_views: number;
  unique_visitors: number;
  source_search: number;
  source_direct: number;
  source_followers: number;
  source_product_card: number;
}

export default function DashboardAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [allData, setAllData] = useState<AnalyticsData[]>([]);
  const [period, setPeriod] = useState<7 | 30>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBar, setSelectedBar] = useState<AnalyticsData | null>(null);

  // Always fetch 30 days, then filter client-side for 7 days
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    async function load() {
      setIsLoading(true);
      const s = await getStoreByUserId(user!.id);

      if (!s) {
        setIsLoading(false);
        return;
      }
      setStore(s);

      const analytics = await getStoreAnalytics(s.id, 30);
      setAllData(analytics);
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  // Filter data based on selected period
  const data = period === 7 ? allData.slice(-7) : allData;

  const totals = data.reduce(
    (acc, d) => ({
      views: acc.views + d.total_views,
      visitors: acc.visitors + d.unique_visitors,
      search: acc.search + d.source_search,
      direct: acc.direct + d.source_direct,
      followers: acc.followers + d.source_followers,
      productCard: acc.productCard + d.source_product_card,
    }),
    { views: 0, visitors: 0, search: 0, direct: 0, followers: 0, productCard: 0 },
  );

  const maxViews = Math.max(...data.map((d) => d.total_views), 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.push("/store/dashboard")} className="p-1">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-dark">الإحصائيات</h1>
      </header>

      {/* Period toggle */}
      <div className="px-4 mt-3 flex gap-2">
        <button
          onClick={() => setPeriod(7)}
          className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
            period === 7
              ? "bg-brand-green text-white"
              : "bg-white text-gray-text border border-gray-light"
          }`}
        >
          آخر 7 أيام
        </button>
        <button
          onClick={() => setPeriod(30)}
          className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
            period === 30
              ? "bg-brand-green text-white"
              : "bg-white text-gray-text border border-gray-light"
          }`}
        >
          آخر 30 يوم
        </button>
      </div>

      {isLoading ? (
        <div className="px-4 mt-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !store ? (
        <div className="px-4 mt-8">
          <EmptyState
            icon="🏪"
            title="مفيش متجر لسه"
            description="أنشئ متجرك الأول عشان تشوف الإحصائيات"
            actionLabel="أنشئ متجرك"
            actionHref="/store/create"
          />
        </div>
      ) : data.length === 0 ? (
        <div className="px-4 mt-8">
          <EmptyState
            icon="📊"
            title="مفيش بيانات لسه"
            description="الإحصائيات هتظهر لما حد يزور متجرك"
          />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="px-4 mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-light p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye size={14} className="text-blue-600" />
                <span className="text-xs text-gray-text">إجمالي المشاهدات</span>
              </div>
              <p className="text-xl font-bold text-dark">
                {totals.views.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-light p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={14} className="text-green-600" />
                <span className="text-xs text-gray-text">زوار فريدين</span>
              </div>
              <p className="text-xl font-bold text-dark">
                {totals.visitors.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Simple bar chart */}
          <div className="px-4 mt-4">
            <div className="bg-white rounded-xl border border-gray-light p-4">
              <h3 className="text-sm font-bold text-dark mb-3">
                المشاهدات اليومية
              </h3>
              {selectedBar && (
                <div className="mb-2 text-center bg-brand-green-light rounded-lg py-1.5 px-3">
                  <span className="text-xs font-bold text-brand-green">
                    {new Date(selectedBar.date).toLocaleDateString("ar-EG", { weekday: "short", month: "short", day: "numeric" })}
                    {" — "}
                    {selectedBar.total_views} مشاهدة، {selectedBar.unique_visitors} زائر
                  </span>
                </div>
              )}
              <div className="flex items-end gap-1 h-32">
                {data.map((d) => {
                  const height = Math.max(
                    (d.total_views / maxViews) * 100,
                    4,
                  );
                  const isSelected = selectedBar?.date === d.date;
                  return (
                    <button
                      key={d.date}
                      className="flex-1 flex flex-col items-center gap-1"
                      onClick={() => setSelectedBar(isSelected ? null : d)}
                    >
                      <div
                        className={`w-full rounded-t-sm min-w-[4px] transition-colors ${
                          isSelected ? "bg-brand-green" : "bg-brand-green/60"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-[9px] text-gray-text">
                <span>
                  {data[0]?.date
                    ? new Date(data[0].date).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </span>
                <span>
                  {data[data.length - 1]?.date
                    ? new Date(
                        data[data.length - 1].date,
                      ).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Traffic sources */}
          <div className="px-4 mt-4">
            <div className="bg-white rounded-xl border border-gray-light p-4">
              <h3 className="text-sm font-bold text-dark mb-3">
                مصادر الزيارات
              </h3>
              <div className="space-y-3">
                {[
                  {
                    icon: <Search size={14} />,
                    label: "البحث",
                    value: totals.search,
                    color: "bg-blue-500",
                  },
                  {
                    icon: <Link2 size={14} />,
                    label: "مباشر",
                    value: totals.direct,
                    color: "bg-green-500",
                  },
                  {
                    icon: <UserPlus size={14} />,
                    label: "المتابعين",
                    value: totals.followers,
                    color: "bg-purple-500",
                  },
                  {
                    icon: <TrendingUp size={14} />,
                    label: "كروت المنتجات",
                    value: totals.productCard,
                    color: "bg-orange-500",
                  },
                ].map((source) => {
                  const total =
                    totals.search +
                    totals.direct +
                    totals.followers +
                    totals.productCard;
                  const pct =
                    total > 0
                      ? Math.round((source.value / total) * 100)
                      : 0;
                  return (
                    <div key={source.label} className="flex items-center gap-3">
                      <div className="text-gray-text">{source.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-dark font-semibold">
                            {source.label}
                          </span>
                          <span className="text-xs text-gray-text">
                            {source.value} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${source.color} rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
