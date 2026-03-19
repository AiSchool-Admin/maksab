"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import type {
  AheEngineStatus,
  AheHarvestJob,
  AheScope,
} from "@/lib/crm/harvester/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface ScopesBreakdown {
  total: number;
  active: number;
  paused: number;
  blocked: number;
  inactive: number;
}

interface DashboardData {
  engine: AheEngineStatus;
  daily_metrics: {
    total_harvests: number;
    total_listings_new: number;
    total_sellers_new: number;
    total_phones_extracted: number;
    total_auto_queued: number;
  };
  active_scopes_count: number;
  scopes_breakdown: ScopesBreakdown;
  recent_jobs: (AheHarvestJob & { ahe_scopes?: { name: string; code: string } })[];
  scopes: AheScope[];
}

interface StatsData {
  today: {
    harvests: number;
    listings: number;
    sellers: number;
    phones: number;
    whales: number;
    contacted: number;
    signed_up: number;
    lost: number;
  };
  tiers?: {
    whale: number;
    big_fish: number;
    regular: number;
    small_fish: number;
    visitor: number;
  };
  estimated_monthly_value?: number;
  buyer_tiers?: {
    whale_buyer: number;
    big_buyer: number;
    regular_buyer: number;
    small_buyer: number;
    cold_buyer: number;
  };
  buyer_readiness?: {
    ready_now: number;
    actively_searching: number;
    interested: number;
  };
  buyer_total_purchase_value?: number;
  chart: { date: string; listings: number; phones: number }[];
}

export default function HarvesterDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<{ error: string; setup_required?: boolean; details?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "listings" | "sellers" | "outreach">("dashboard");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const headers = getAdminHeaders();
      const [engineRes, statsRes] = await Promise.all([
        fetch("/api/admin/crm/harvester", { headers }),
        fetch("/api/admin/crm/harvester/stats", { headers }),
      ]);

      if (engineRes.ok) {
        setData(await engineRes.json());
      } else {
        const errBody = await engineRes.json().catch(() => ({ error: "فشل في تحميل البيانات" }));
        setError(errBody);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error("Load error:", err);
      setError({ error: "خطأ في الاتصال بالخادم" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data || error) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [data, error, loadData]);

  async function controlEngine(action: string) {
    setActionLoading(action);
    try {
      await fetch("/api/admin/crm/harvester", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ action }),
      });
      await loadData();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto" dir="rtl">
        {error?.setup_required ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 space-y-4">
            <p className="text-yellow-800 text-lg font-bold">⚙️ إعداد مطلوب</p>
            <p className="text-yellow-700 text-sm">{error.details}</p>
            <div className="bg-yellow-100 rounded-lg p-4 text-right text-sm text-yellow-800 space-y-2">
              <p className="font-bold">خطوات الإعداد:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>أضف <code className="bg-yellow-200 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> في متغيرات البيئة</li>
                <li>تأكد من تشغيل migration رقم 00039</li>
                <li>أعد تشغيل التطبيق</li>
              </ol>
            </div>
            <button onClick={loadData} className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div>
            <p className="text-red-600 text-lg">{error?.error || "فشل في تحميل البيانات"}</p>
            {error?.details && <p className="text-red-400 text-sm mt-2">{error.details}</p>}
            <button onClick={loadData} className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    );
  }

  const { engine, scopes_breakdown, recent_jobs } = data;

  const statusConfig = {
    running: { color: "bg-green-500", text: "يعمل", icon: "🟢" },
    paused: { color: "bg-yellow-500", text: "متوقف مؤقتاً", icon: "🟡" },
    stopped: { color: "bg-red-500", text: "متوقف", icon: "🔴" },
  };

  const status = statusConfig[engine.status] || statusConfig.stopped;

  const todayStats = stats?.today || {
    harvests: 0, listings: 0, sellers: 0, phones: 0,
    whales: 0, contacted: 0, signed_up: 0, lost: 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header with tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌾 محرك الحصاد الآلي</h1>
          <p className="text-gray-500 text-sm mt-1">نظام جمع البيانات التلقائي من المنصات المنافسة</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/crm/harvester/scopes" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            📋 النطاقات
          </Link>
          <Link href="/admin/crm/harvester/bookmarklet" className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
            🔖 Bookmarklet
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: "dashboard" as const, label: "📊 الرئيسية" },
          { key: "listings" as const, label: "📰 الإعلانات" },
          { key: "sellers" as const, label: "👥 المعلنين" },
          { key: "outreach" as const, label: "📨 التواصل" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-[#1B5E20] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <>
          {/* Engine Control */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${status.color} animate-pulse`} />
                <div>
                  <h2 className="text-lg font-bold">{status.icon} حالة المحرك: {status.text}</h2>
                  {engine.status_reason && <p className="text-sm text-gray-500">{engine.status_reason}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => controlEngine("start")}
                  disabled={actionLoading !== null || engine.status === "running"}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === "start" ? "..." : "▶️ تشغيل"}
                </button>
                <button
                  onClick={() => controlEngine("pause")}
                  disabled={actionLoading !== null || engine.status !== "running"}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === "pause" ? "..." : "⏸️ إيقاف مؤقت"}
                </button>
                <button
                  onClick={() => controlEngine("stop")}
                  disabled={actionLoading !== null || engine.status === "stopped"}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === "stop" ? "..." : "⏹️ إيقاف"}
                </button>
              </div>
            </div>

            {/* Engine quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">النطاقات</p>
                <p className="text-2xl font-bold">{scopes_breakdown?.total ?? 0}</p>
                {scopes_breakdown && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{scopes_breakdown.active} نشط</span>
                    {scopes_breakdown.paused > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{scopes_breakdown.paused} متوقف</span>}
                    {scopes_breakdown.blocked > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{scopes_breakdown.blocked} محظور</span>}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">عمليات جارية</p>
                <p className="text-2xl font-bold">{engine.running_jobs_count}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">طلبات/الساعة</p>
                <p className="text-2xl font-bold">{engine.current_requests_this_hour}/{engine.global_max_requests_per_hour}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">أخطاء متتالية</p>
                <p className={`text-2xl font-bold ${engine.consecutive_errors > 5 ? "text-red-600" : ""}`}>
                  {engine.consecutive_errors}/{engine.auto_pause_threshold}
                </p>
              </div>
            </div>
          </div>

          {/* 8 Stat Cards (2 rows × 4) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="🌾" label="حصادات اليوم" value={todayStats.harvests} />
            <StatCard icon="📋" label="إعلانات جديدة" value={todayStats.listings} highlight />
            <StatCard icon="👤" label="معلنين جدد" value={todayStats.sellers} />
            <StatCard icon="📞" label="أرقام مستخرجة" value={todayStats.phones} highlight />
            <StatCard icon="📨" label="تم التواصل" value={todayStats.contacted} />
            <StatCard icon="✅" label="سجّلوا" value={todayStats.signed_up} highlight />
            <StatCard icon="🐋" label="حيتان" value={todayStats.whales} />
            <StatCard icon="❌" label="لم يردوا" value={todayStats.lost} />
          </div>

          {/* Whale Tier Breakdown */}
          {stats?.tiers && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <h2 className="text-lg font-bold">🎯 تصنيف البائعين</h2>
                {stats.estimated_monthly_value != null && stats.estimated_monthly_value > 0 && (
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-bold">
                    💰 القيمة الشهرية المتوقعة: {stats.estimated_monthly_value.toLocaleString()} ج.م
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{stats.tiers.whale}</p>
                  <p className="text-xs text-yellow-600">🐋 حيتان</p>
                  <p className="text-[10px] text-yellow-500">≥60 نقطة • 999 ج/شهر</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{stats.tiers.big_fish}</p>
                  <p className="text-xs text-blue-600">🦈 كبار</p>
                  <p className="text-[10px] text-blue-500">≥45 نقطة • 499 ج/شهر</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{stats.tiers.regular}</p>
                  <p className="text-xs text-green-600">🐟 عاديين</p>
                  <p className="text-[10px] text-green-500">≥30 نقطة • 199 ج/شهر</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">{stats.tiers.small_fish}</p>
                  <p className="text-xs text-gray-500">🐠 صغار</p>
                  <p className="text-[10px] text-gray-400">≥15 نقطة • 15 ج/شهر</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-400">{stats.tiers.visitor}</p>
                  <p className="text-xs text-gray-400">👻 زوار</p>
                  <p className="text-[10px] text-gray-300">&lt;15 نقطة • 0 ج/شهر</p>
                </div>
              </div>
            </div>
          )}

          {/* Buyer Tier Breakdown */}
          {stats?.buyer_tiers && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <h2 className="text-lg font-bold">🛒 تصنيف المشترين</h2>
                {stats.buyer_total_purchase_value != null && stats.buyer_total_purchase_value > 0 && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
                    💎 القيمة الشرائية المتوقعة: {stats.buyer_total_purchase_value.toLocaleString()} ج.م
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">{stats.buyer_tiers.whale_buyer}</p>
                  <p className="text-xs text-purple-600">🐋 حوت مشتري</p>
                  <p className="text-[10px] text-purple-500">≥80 نقطة</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{stats.buyer_tiers.big_buyer}</p>
                  <p className="text-xs text-blue-600">🦈 مشتري كبير</p>
                  <p className="text-[10px] text-blue-500">≥60 نقطة</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{stats.buyer_tiers.regular_buyer}</p>
                  <p className="text-xs text-green-600">🐟 مشتري عادي</p>
                  <p className="text-[10px] text-green-500">≥40 نقطة</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">{stats.buyer_tiers.small_buyer}</p>
                  <p className="text-xs text-gray-500">🐠 مشتري صغير</p>
                  <p className="text-[10px] text-gray-400">≥20 نقطة</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-400">{stats.buyer_tiers.cold_buyer}</p>
                  <p className="text-xs text-gray-400">❄️ بارد</p>
                  <p className="text-[10px] text-gray-300">&lt;20 نقطة</p>
                </div>
              </div>
              {/* Readiness */}
              {stats.buyer_readiness && (
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-medium">🔥 جاهز للشراء: {stats.buyer_readiness.ready_now}</span>
                  <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg font-medium">🔍 يبحث بنشاط: {stats.buyer_readiness.actively_searching}</span>
                  <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg font-medium">👀 مهتم: {stats.buyer_readiness.interested}</span>
                </div>
              )}
            </div>
          )}

          {/* Chart - Last 7 days */}
          {stats?.chart && stats.chart.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-4">📈 آخر 7 أيام</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => {
                        const date = new Date(d);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(d) => {
                        const date = new Date(String(d));
                        return date.toLocaleDateString("ar-EG", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="listings"
                      name="إعلانات جديدة"
                      stroke="#1B5E20"
                      strokeWidth={2}
                      dot={{ fill: "#1B5E20", r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="phones"
                      name="أرقام مستخرجة"
                      stroke="#D4A017"
                      strokeWidth={2}
                      dot={{ fill: "#D4A017", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Blocked Scopes Warning */}
          {data.scopes?.some((s: AheScope) => s.server_fetch_blocked) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h2 className="text-md font-bold text-orange-800 mb-2">⚠️ نطاقات محظورة</h2>
              <p className="text-orange-600 text-sm mb-3">تحتاج Bookmarklet — server-side محظور</p>
              <div className="space-y-2">
                {data.scopes.filter((s: AheScope) => s.server_fetch_blocked).map((s: AheScope) => (
                  <div key={s.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100">
                    <div>
                      <span className="font-bold text-sm">{s.name}</span>
                      <span className="text-gray-400 text-xs mr-2">({s.code})</span>
                    </div>
                    <Link href="/admin/crm/harvester/bookmarklet" className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs hover:bg-orange-700">
                      🔖 Bookmarklet
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Jobs */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">آخر عمليات الحصاد</h2>
            {recent_jobs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">لا توجد عمليات حصاد بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-gray-500">
                    <tr>
                      <th className="text-right py-3 pr-2">الوقت</th>
                      <th className="text-right py-3">النطاق</th>
                      <th className="text-right py-3">الحالة</th>
                      <th className="text-right py-3">الخطوة</th>
                      <th className="text-right py-3">جديد</th>
                      <th className="text-right py-3">مكرر</th>
                      <th className="text-right py-3">أرقام</th>
                      <th className="text-right py-3">المدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_jobs.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 pr-2 text-gray-500">
                          {new Date(job.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 font-medium">{job.ahe_scopes?.name || job.scope_id.slice(0, 8)}</td>
                        <td className="py-3"><JobStatusBadge status={job.status} /></td>
                        <td className="py-3 text-gray-500 text-xs">{job.current_step || "—"}</td>
                        <td className="py-3 font-bold text-green-700">{job.listings_new}</td>
                        <td className="py-3 text-gray-400">{job.listings_duplicate}</td>
                        <td className="py-3">{job.phones_extracted}</td>
                        <td className="py-3 text-gray-500">{job.duration_seconds ? `${job.duration_seconds}ث` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "listings" && <ListingsTab />}
      {activeTab === "sellers" && <SellersTab />}
      {activeTab === "outreach" && <OutreachTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Listings Tab                                    */
/* ═══════════════════════════════════════════════ */

interface ListingsData {
  listings: Array<{
    id: string;
    title: string;
    price: number | null;
    thumbnail_url: string | null;
    source_listing_url: string;
    governorate: string | null;
    city: string | null;
    created_at: string;
    estimated_posted_at: string | null;
    migration_status: string;
    is_expired: boolean;
    is_featured: boolean;
    supports_exchange: boolean;
    seller_name: string | null;
    seller_is_verified: boolean;
    seller_is_business: boolean;
    extracted_phone: string | null;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

function ListingsTab() {
  const [data, setData] = useState<ListingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    governorate: "",
    category: "",
    price_min: "",
    price_max: "",
    search: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (filters.category) params.set("category", filters.category);
      if (filters.governorate) params.set("governorate", filters.governorate);
      if (filters.price_min) params.set("price_min", filters.price_min);
      if (filters.price_max) params.set("price_max", filters.price_max);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(
        `/api/admin/crm/harvester/listings?${params.toString()}`,
        { headers: getAdminHeaders() }
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryLabels: Record<string, string> = {
    phones: "📱 موبايلات",
    electronics: "🖥️ إلكترونيات",
    vehicles: "🚗 سيارات",
    properties: "🏠 عقارات",
    furniture: "🪑 أثاث",
    fashion: "👗 ملابس",
    kids: "👶 أطفال",
    sports: "⚽ رياضة",
    pets: "🐾 حيوانات",
    services: "🔧 خدمات",
    other: "📦 أخرى",
  };

  const governorateLabels: Record<string, string> = {
    cairo: "القاهرة",
    alexandria: "الإسكندرية",
    giza: "الجيزة",
    qalyubia: "القليوبية",
    sharqia: "الشرقية",
    dakahlia: "الدقهلية",
    gharbia: "الغربية",
    monufia: "المنوفية",
    beheira: "البحيرة",
    kafr_el_sheikh: "كفر الشيخ",
    damietta: "دمياط",
    port_said: "بورسعيد",
    ismailia: "الإسماعيلية",
    suez: "السويس",
    fayoum: "الفيوم",
    beni_suef: "بني سويف",
    minya: "المنيا",
    assiut: "أسيوط",
    sohag: "سوهاج",
    qena: "قنا",
    luxor: "الأقصر",
    aswan: "أسوان",
    red_sea: "البحر الأحمر",
    matrouh: "مطروح",
  };

  const priceFormatter = new Intl.NumberFormat("ar-EG");

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `منذ ${days} يوم`;
    return new Date(dateStr).toLocaleDateString("ar-EG");
  }

  function statusIcon(status: string, isExpired: boolean): string {
    if (isExpired) return "⚪";
    switch (status) {
      case "harvested": return "🟢";
      case "ready": return "🔵";
      case "migrated": return "✅";
      default: return "⚪";
    }
  }

  return (
    <div className="space-y-4">
      {/* Counter */}
      {data && (
        <p className="text-sm text-gray-500">إجمالي: <span className="font-bold text-gray-900">{data.total.toLocaleString("ar-EG")}</span> إعلان</p>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="🔍 بحث بالعنوان..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          />
          <select
            value={filters.governorate}
            onChange={(e) => { setFilters({ ...filters, governorate: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل المحافظات</option>
            {Object.entries(governorateLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الأقسام</option>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="السعر من"
              value={filters.price_min}
              onChange={(e) => { setFilters({ ...filters, price_min: e.target.value }); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm w-28"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="إلى"
              value={filters.price_max}
              onChange={(e) => { setFilters({ ...filters, price_max: e.target.value }); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm w-28"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : !data || data.listings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-4">📭</p>
            <p>لا توجد إعلانات</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right py-3 px-3">الصورة</th>
                    <th className="text-right py-3 px-3">العنوان</th>
                    <th className="text-right py-3 px-3">السعر</th>
                    <th className="text-right py-3 px-3">الموقع</th>
                    <th className="text-right py-3 px-3">التاريخ</th>
                    <th className="text-right py-3 px-3">المعلن</th>
                    <th className="text-right py-3 px-3">📞 الرقم</th>
                    <th className="text-right py-3 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-gray-50">
                      {/* Image */}
                      <td className="py-3 px-3">
                        {listing.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.thumbnail_url}
                            alt=""
                            width={60}
                            height={45}
                            className="rounded object-cover"
                            style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 4 }}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const img = e.currentTarget;
                              // Replace broken image with placeholder
                              img.style.display = "none";
                              const placeholder = document.createElement("div");
                              placeholder.className = "bg-gray-200 rounded flex items-center justify-center text-gray-400";
                              placeholder.style.cssText = "width:60px;height:45px;border-radius:4px;display:flex;align-items:center;justify-content:center";
                              placeholder.textContent = "🖼️";
                              img.parentNode?.appendChild(placeholder);
                            }}
                          />
                        ) : (
                          <div className="bg-gray-200 rounded flex items-center justify-center text-gray-400" style={{ width: 60, height: 45, borderRadius: 4 }}>
                            🖼️
                          </div>
                        )}
                      </td>
                      {/* Title */}
                      <td className="py-3 px-3 max-w-[300px]">
                        <a
                          href={listing.source_listing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline block truncate"
                          title={listing.title}
                        >
                          {listing.title.length > 50 ? listing.title.slice(0, 50) + "..." : listing.title}
                        </a>
                        <div className="flex gap-1 mt-1">
                          {(listing.seller_is_verified || listing.seller_is_business) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">🏪</span>
                          )}
                          {listing.supports_exchange && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">↔ تبديل</span>
                          )}
                          {listing.is_featured && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⭐ مميز</span>
                          )}
                        </div>
                      </td>
                      {/* Price */}
                      <td className="py-3 px-3 font-bold whitespace-nowrap">
                        {listing.price != null ? `${priceFormatter.format(listing.price)} ج.م` : <span className="text-gray-400 font-normal">غير محدد</span>}
                      </td>
                      {/* Location */}
                      <td className="py-3 px-3 text-xs text-gray-500">
                        {listing.city && listing.governorate
                          ? `${listing.city}، ${governorateLabels[listing.governorate] || listing.governorate}`
                          : listing.governorate
                            ? governorateLabels[listing.governorate] || listing.governorate
                            : "—"
                        }
                      </td>
                      {/* Date */}
                      <td className="py-3 px-3 text-xs text-gray-400">
                        {listing.estimated_posted_at ? timeAgo(listing.estimated_posted_at) : timeAgo(listing.created_at)}
                      </td>
                      {/* Seller */}
                      <td className="py-3 px-3 text-xs">
                        {listing.seller_name || "—"}
                      </td>
                      {/* Phone */}
                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        {listing.extracted_phone ? (
                          <span className="flex items-center gap-1">
                            <span className="font-mono">{listing.extracted_phone}</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(listing.extracted_phone!); }}
                              className="text-gray-400 hover:text-gray-600"
                              title="نسخ"
                            >
                              📋
                            </button>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="py-3 px-3 text-center text-lg">
                        {statusIcon(listing.migration_status, listing.is_expired)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-500">
                  صفحة {data.page} من {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
                  >
                    ← السابق
                  </button>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
                  >
                    التالي →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Sellers Tab                                     */
/* ═══════════════════════════════════════════════ */

interface SellersData {
  sellers: Array<{
    id: string;
    name: string | null;
    phone: string | null;
    total_listings_seen: number;
    whale_score: number;
    is_whale: boolean;
    is_business: boolean;
    is_verified: boolean;
    has_featured_listings: boolean;
    pipeline_status: string;
    crm_customer_id: string | null;
    primary_governorate: string | null;
  }>;
  total: number;
  page: number;
  totalPages: number;
  stats: {
    with_phone: number;
    whales: number;
    contacted: number;
    signed_up: number;
  };
}

function SellersTab() {
  const [data, setData] = useState<SellersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    has_phone: false,
    whales_only: false,
    has_featured: false,
    status: "",
    governorate: "",
  });
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (filters.has_phone) params.set("has_phone", "true");
      if (filters.whales_only) params.set("whales_only", "true");
      if (filters.has_featured) params.set("has_featured", "true");
      if (filters.status) params.set("status", filters.status);
      if (filters.governorate) params.set("governorate", filters.governorate);

      const res = await fetch(
        `/api/admin/crm/harvester/sellers?${params.toString()}`,
        { headers: getAdminHeaders() }
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function copyPhone(sellerId: string) {
    try {
      const res = await fetch("/api/admin/crm/harvester/sellers/copy-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ seller_id: sellerId }),
      });
      if (res.ok) {
        const { phone } = await res.json();
        await navigator.clipboard.writeText(phone);
        setCopyFeedback(sellerId);
        setTimeout(() => setCopyFeedback(null), 2000);
      }
    } catch (err) {
      console.error("Copy error:", err);
    }
  }

  const pipelineLabels: Record<string, string> = {
    discovered: "جديد",
    phone_found: "وُجد رقم",
    auto_queued: "في الطابور",
    contacted: "تم التواصل",
    responded: "ردّ ✅",
    signed_up: "سجّل 🎉",
    activated: "نشط ⭐",
    lost: "لم يرد ❌",
    linked_existing: "موجود بالـ CRM",
    converted: "مُحوّل",
    rejected: "رفض",
  };

  const governorateLabels: Record<string, string> = {
    cairo: "القاهرة",
    alexandria: "الإسكندرية",
    giza: "الجيزة",
    qalyubia: "القليوبية",
    sharqia: "الشرقية",
    dakahlia: "الدقهلية",
    gharbia: "الغربية",
    monufia: "المنوفية",
    beheira: "البحيرة",
  };

  const TIER_LABELS: Record<string, { icon: string; label: string; color: string }> = {
    whale: { icon: "🐋", label: "حوت", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    big_fish: { icon: "🦈", label: "كبير", color: "text-blue-700 bg-blue-50 border-blue-200" },
    regular: { icon: "🐟", label: "عادي", color: "text-green-700 bg-green-50 border-green-200" },
    small_fish: { icon: "🐠", label: "صغير", color: "text-gray-600 bg-gray-50 border-gray-200" },
    visitor: { icon: "👻", label: "زائر", color: "text-gray-400 bg-gray-50 border-gray-100" },
  };

  function whaleScoreBar(score: number, tier?: string) {
    const tierInfo = TIER_LABELS[tier || "visitor"] || TIER_LABELS.visitor;
    const color = score >= 60 ? "bg-yellow-500" : score >= 45 ? "bg-blue-500" : score >= 30 ? "bg-green-500" : score >= 15 ? "bg-gray-400" : "bg-gray-200";
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(score, 75) / 75 * 100}%` }} />
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tierInfo.color}`}>
          {tierInfo.icon} {score}
        </span>
      </div>
    );
  }

  function sellerBadges(seller: SellersData["sellers"][0]) {
    const badges: string[] = [];
    const tier = (seller as unknown as Record<string, string>).seller_tier;
    const tierInfo = TIER_LABELS[tier || "visitor"];
    if (tierInfo && tier !== "visitor") badges.push(`${tierInfo.icon} ${tierInfo.label}`);
    if (seller.is_business) badges.push("🏪 تاجر");
    if (seller.is_verified) badges.push("✓ موثق");
    if (seller.has_featured_listings) badges.push("⭐ مميز");
    return badges;
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      {data?.stats && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">📞 بأرقام: {data.stats.with_phone}</span>
          <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg font-medium">🐋 حيتان: {data.stats.whales}</span>
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">🦈 كبار: {(data.stats as Record<string, number>).big_fish || 0}</span>
          <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">🐟 عاديين: {(data.stats as Record<string, number>).regulars || 0}</span>
          <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium">📨 تم التواصل: {data.stats.contacted}</span>
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium">✅ سجّلوا: {data.stats.signed_up}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => { setFilters({ ...filters, has_phone: !filters.has_phone }); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filters.has_phone ? "bg-green-100 border-green-300 text-green-700" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            📞 بأرقام فقط
          </button>
          <button
            onClick={() => { setFilters({ ...filters, whales_only: !filters.whales_only }); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filters.whales_only ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            🐋 حيتان فقط
          </button>
          <button
            onClick={() => { setFilters({ ...filters, has_featured: !filters.has_featured }); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filters.has_featured ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            ⭐ بإعلانات مميزة
          </button>
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            {Object.entries(pipelineLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.governorate}
            onChange={(e) => { setFilters({ ...filters, governorate: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل المحافظات</option>
            {Object.entries(governorateLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Counter */}
      {data && (
        <p className="text-sm text-gray-500">إجمالي: <span className="font-bold text-gray-900">{data.total.toLocaleString("ar-EG")}</span> معلن</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : !data || data.sellers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-4">👥</p>
            <p>لا يوجد معلنين</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right py-3 px-3">المعلن</th>
                    <th className="text-right py-3 px-3">الرقم</th>
                    <th className="text-right py-3 px-3">إعلانات</th>
                    <th className="text-right py-3 px-3">Score</th>
                    <th className="text-right py-3 px-3">الحالة</th>
                    <th className="text-right py-3 px-3">CRM</th>
                    <th className="text-right py-3 px-3">تحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellers.map((seller) => (
                    <tr key={seller.id} className="border-b hover:bg-gray-50">
                      {/* Name + Badges */}
                      <td className="py-3 px-3">
                        <p className="font-medium">{seller.name || "بدون اسم"}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {sellerBadges(seller).map((b, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{b}</span>
                          ))}
                        </div>
                      </td>
                      {/* Phone */}
                      <td className="py-3 px-3">
                        {seller.phone ? (
                          <span className="text-green-600 font-mono text-xs">{seller.phone}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      {/* Listings count */}
                      <td className="py-3 px-3 text-center font-medium">{seller.total_listings_seen}</td>
                      {/* Whale Score */}
                      <td className="py-3 px-3">{whaleScoreBar(seller.whale_score, (seller as unknown as Record<string, string>).seller_tier)}</td>
                      {/* Pipeline Status */}
                      <td className="py-3 px-3">
                        <span className="text-xs">{pipelineLabels[seller.pipeline_status] || seller.pipeline_status}</span>
                      </td>
                      {/* CRM */}
                      <td className="py-3 px-3">
                        {seller.crm_customer_id ? (
                          <Link href={`/admin/crm/customers/${seller.crm_customer_id}`} className="text-blue-600 hover:underline text-xs">
                            🔗 ملف العميل
                          </Link>
                        ) : (
                          <button className="text-xs text-green-600 hover:text-green-800">➕ نقل للـ CRM</button>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-3">
                        {seller.phone && (
                          <button
                            onClick={() => copyPhone(seller.id)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              copyFeedback === seller.id
                                ? "bg-green-100 border-green-300 text-green-700"
                                : "hover:bg-gray-100 border-gray-200"
                            }`}
                          >
                            {copyFeedback === seller.id ? "✅ تم النسخ" : "📋 نسخ الرقم"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-500">
                  صفحة {data.page} من {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
                  >
                    ← السابق
                  </button>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
                  >
                    التالي →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Shared Components                               */
/* ═══════════════════════════════════════════════ */

function StatCard({ icon, label, value, highlight }: { icon: string; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl shadow-sm border ${highlight ? "bg-[#E8F5E9] border-[#1B5E20]/20" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${highlight ? "text-[#1B5E20]" : ""}`}>
        {value.toLocaleString("ar-EG")}
      </p>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-gray-100", text: "text-gray-600", label: "في الانتظار" },
    fetching_list: { bg: "bg-blue-100", text: "text-blue-700", label: "جلب القوائم" },
    deduplicating: { bg: "bg-purple-100", text: "text-purple-700", label: "استبعاد المكرر" },
    fetching_details: { bg: "bg-indigo-100", text: "text-indigo-700", label: "جلب التفاصيل" },
    enriching: { bg: "bg-yellow-100", text: "text-yellow-700", label: "إثراء" },
    queuing: { bg: "bg-orange-100", text: "text-orange-700", label: "إرسال CRM" },
    recording_metrics: { bg: "bg-cyan-100", text: "text-cyan-700", label: "تسجيل" },
    completed: { bg: "bg-green-100", text: "text-green-700", label: "مكتمل" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "فشل" },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════ */
/* Outreach Tab — Hybrid (Manual WhatsApp)         */
/* ═══════════════════════════════════════════════ */

interface OutreachStats {
  today: {
    messages_sent: number;
    responses: number;
    signups: number;
    response_rate: number;
  };
  funnel: { name: string; count: number; color: string }[];
}

interface OutreachConversation {
  id: string;
  customer_name: string | null;
  phone: string;
  category: string | null;
  seller_type: string | null;
  stage: string;
  status: string;
  messages_sent: number;
  messages_received: number;
  last_message_at: string | null;
  last_message_direction: string | null;
  next_action: string | null;
  created_at: string;
  last_message_body?: string;
}

interface HybridSeller {
  id: string;
  name: string | null;
  phone: string;
  primary_category: string | null;
  primary_governorate: string | null;
  total_listings_seen: number;
  is_whale: boolean;
  whale_score: number;
  is_business: boolean;
  is_verified: boolean;
  detected_account_type: string | null;
  pipeline_status: string;
  profile_url: string | null;
  template_id: string;
  rendered_message: string;
  whatsapp_url: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  phones: '📱', vehicles: '🚗', properties: '🏠', electronics: '📻',
  furniture: '🪑', fashion: '👗', gold: '💰', luxury: '💎',
  appliances: '🏠', hobbies: '🎮', tools: '🔧', services: '🛠️', scrap: '♻️',
};

const CATEGORY_LABELS: Record<string, string> = {
  phones: 'موبايلات', vehicles: 'سيارات', properties: 'عقارات', electronics: 'إلكترونيات',
  furniture: 'أثاث', fashion: 'ملابس', gold: 'ذهب', luxury: 'فاخر',
  appliances: 'أجهزة', hobbies: 'هوايات', tools: 'عدد', services: 'خدمات', scrap: 'خردة',
};

const GOV_LABELS: Record<string, string> = {
  cairo: 'القاهرة', giza: 'الجيزة', alexandria: 'الإسكندرية',
  dakahlia: 'الدقهلية', beheira: 'البحيرة', monufia: 'المنوفية',
  gharbia: 'الغربية', sharqia: 'الشرقية', qalyubia: 'القليوبية',
};

const STAGE_LABELS: Record<string, string> = {
  initial_outreach: '1/3',
  conversation: '2/3',
  signup: '3/3',
  onboarding: '✅',
  active_user: '🌟',
};

function OutreachTab() {
  const [activeSubTab, setActiveSubTab] = useState<"send" | "history">("send");
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [conversations, setConversations] = useState<OutreachConversation[]>([]);
  const [sellers, setSellers] = useState<HybridSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const headers = getAdminHeaders();
      const [statsRes, convsRes, sellersRes] = await Promise.all([
        fetch("/api/admin/crm/harvester/outreach/stats", { headers }),
        fetch("/api/admin/crm/harvester/outreach/conversations", { headers }),
        fetch("/api/admin/crm/harvester/outreach/hybrid?limit=30", { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (convsRes.ok) {
        const data = await convsRes.json();
        setConversations(data.conversations || []);
      }
      if (sellersRes.ok) {
        const data = await sellersRes.json();
        setSellers(data.sellers || []);
      }
    } catch (err) {
      console.error("Outreach load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = async (seller: HybridSeller) => {
    try {
      await navigator.clipboard.writeText(seller.rendered_message);
      setCopiedId(seller.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = seller.rendered_message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(seller.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleWhatsApp = (seller: HybridSeller) => {
    window.open(seller.whatsapp_url, '_blank');
  };

  const handleAction = async (sellerId: string, action: "sent" | "skip") => {
    setActionLoading(sellerId);
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/crm/harvester/outreach/hybrid", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: sellerId, action }),
      });

      if (res.ok) {
        // Remove from list
        setSellers((prev) => prev.filter((s) => s.id !== sellerId));
        if (action === "sent") setSentCount((c) => c + 1);
        if (action === "skip") setSkippedCount((c) => c + 1);
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const todayStats = stats?.today || { messages_sent: 0, responses: 0, signups: 0, response_rate: 0 };
  const funnelData = stats?.funnel || [];
  const FUNNEL_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#1B7A3D'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{todayStats.messages_sent + sentCount}</p>
          <p className="text-sm text-gray-500 mt-1">رسائل أرسلت (اليوم)</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{todayStats.responses}</p>
          <p className="text-sm text-gray-500 mt-1">ردود (اليوم)</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{todayStats.signups}</p>
          <p className="text-sm text-gray-500 mt-1">سجّلوا (اليوم)</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{todayStats.response_rate}%</p>
          <p className="text-sm text-gray-500 mt-1">معدل الرد</p>
        </div>
      </div>

      {/* Sub-tabs: Send / History */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveSubTab("send")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "send"
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📨 إرسال رسائل ({sellers.length} جاهز)
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "history"
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📊 السجل والقمع
        </button>
      </div>

      {activeSubTab === "send" && (
        <div className="space-y-4">
          {/* Session progress */}
          {(sentCount > 0 || skippedCount > 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-4 text-sm">
              <span className="text-green-700 font-medium">الجلسة الحالية:</span>
              <span className="text-green-600">✅ أرسلت: {sentCount}</span>
              <span className="text-gray-500">⏭️ تخطيت: {skippedCount}</span>
              <span className="text-gray-400 mr-auto">متبقي: {sellers.length}</span>
            </div>
          )}

          {/* Sellers queue */}
          {sellers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-lg font-bold text-gray-900">مفيش بائعين جدد جاهزين للتواصل</p>
              <p className="text-sm text-gray-500 mt-2">كل البائعين اللي عندهم رقم تم التواصل معاهم أو تم تخطيهم</p>
              <button
                onClick={() => { setLoading(true); loadData(); }}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                تحديث القائمة
              </button>
            </div>
          ) : (
            sellers.map((seller) => (
              <div
                key={seller.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  seller.is_whale ? 'border-yellow-300 ring-1 ring-yellow-200' : ''
                }`}
              >
                {/* Header */}
                <div className="p-4 flex items-start gap-3">
                  {/* Avatar/icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    seller.is_whale
                      ? 'bg-yellow-100 text-yellow-700'
                      : seller.is_business
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {seller.is_whale ? '🐋' : (CATEGORY_ICONS[seller.primary_category || ''] || '👤')}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 truncate">
                        {seller.name || seller.phone}
                      </span>
                      {seller.is_whale && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          حوت {seller.whale_score}
                        </span>
                      )}
                      {seller.is_business && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          تاجر
                        </span>
                      )}
                      {seller.is_verified && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          موثق
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span dir="ltr">{seller.phone}</span>
                      {seller.primary_category && (
                        <span>{CATEGORY_ICONS[seller.primary_category] || '📦'} {CATEGORY_LABELS[seller.primary_category] || seller.primary_category}</span>
                      )}
                      {seller.primary_governorate && (
                        <span>📍 {GOV_LABELS[seller.primary_governorate] || seller.primary_governorate}</span>
                      )}
                      <span>{seller.total_listings_seen} إعلان</span>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(expandedId === seller.id ? null : seller.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="عرض الرسالة"
                  >
                    {expandedId === seller.id ? '▲' : '▼'}
                  </button>
                </div>

                {/* Expanded message preview */}
                {expandedId === seller.id && (
                  <div className="mx-4 mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-medium text-green-700 mb-2">📝 الرسالة ({seller.template_id}):</p>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-[Cairo] leading-relaxed">
                      {seller.rendered_message}
                    </pre>
                  </div>
                )}

                {/* Action buttons */}
                <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleCopy(seller)}
                    disabled={actionLoading === seller.id}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                      copiedId === seller.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {copiedId === seller.id ? '✅ تم النسخ!' : '📋 نسخ الرسالة'}
                  </button>

                  <button
                    onClick={() => handleWhatsApp(seller)}
                    disabled={actionLoading === seller.id}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-1"
                  >
                    📱 واتساب
                  </button>

                  <button
                    onClick={() => handleAction(seller.id, "sent")}
                    disabled={actionLoading === seller.id}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1"
                  >
                    {actionLoading === seller.id ? '...' : '✅ تم الإرسال'}
                  </button>

                  <button
                    onClick={() => handleAction(seller.id, "skip")}
                    disabled={actionLoading === seller.id}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1"
                  >
                    ⏭️ تخطي
                  </button>

                  {seller.profile_url && (
                    <a
                      href={seller.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors mr-auto"
                    >
                      🔗 البروفايل
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSubTab === "history" && (
        <div className="space-y-6">
          {/* Funnel Chart */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 قمع التحويل</h3>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical" margin={{ right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [String(value), 'عدد']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {funnelData.map((_entry, index) => (
                      <Cell key={index} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات بعد</p>
            )}
          </div>

          {/* Conversations Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">💬 آخر المحادثات</h3>
            </div>
            {conversations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-3 font-medium text-gray-600">العميل</th>
                      <th className="text-right p-3 font-medium text-gray-600">الفئة</th>
                      <th className="text-right p-3 font-medium text-gray-600">المرحلة</th>
                      <th className="text-right p-3 font-medium text-gray-600">آخر رسالة</th>
                      <th className="text-right p-3 font-medium text-gray-600">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {conversations.map((conv) => (
                      <tr key={conv.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">
                            {conv.customer_name || conv.phone}
                            {conv.seller_type === 'whale' && ' 🐋'}
                          </div>
                          <div className="text-xs text-gray-400">{conv.phone}</div>
                        </td>
                        <td className="p-3">
                          {CATEGORY_ICONS[conv.category || ''] || '📦'}{' '}
                          <span className="text-gray-600">{conv.category || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium">
                            {STAGE_LABELS[conv.stage] || conv.stage}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-600 max-w-[200px] truncate">
                            {conv.last_message_body?.substring(0, 30) || '-'}
                          </div>
                          {conv.last_message_at && (
                            <div className="text-xs text-gray-400">
                              {new Date(conv.last_message_at).toLocaleDateString('ar-EG')}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <OutreachStatusBadge
                            status={conv.status}
                            hasResponse={conv.messages_received > 0}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">لا توجد محادثات بعد</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OutreachStatusBadge({ status, hasResponse }: { status: string; hasResponse: boolean }) {
  if (hasResponse) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ ردّ</span>;
  if (status === 'completed') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">❌ لم يرد</span>;
  if (status === 'waiting' || status === 'scheduled') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">⏳ انتظار</span>;
  if (status === 'escalated') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">🚨 تصعيد</span>;
  return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">🤖 AI</span>;
}
