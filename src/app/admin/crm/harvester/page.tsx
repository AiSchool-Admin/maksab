"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import type {
  AheEngineStatus,
  AheDailyMetrics,
  AheHarvestJob,
  AheScope,
} from "@/lib/crm/harvester/types";

interface ScopesBreakdown {
  total: number;
  active: number;
  paused: number;
  blocked: number;
  inactive: number;
}

interface DashboardData {
  engine: AheEngineStatus;
  daily_metrics: AheDailyMetrics;
  active_scopes_count: number;
  scopes_breakdown: ScopesBreakdown;
  recent_jobs: (AheHarvestJob & { ahe_scopes?: { name: string; code: string } })[];
  scopes: AheScope[];
}

export default function HarvesterDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState<{ error: string; setup_required?: boolean; details?: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/crm/harvester", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        const errBody = await res.json().catch(() => ({ error: "فشل في تحميل البيانات" }));
        setError(errBody);
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

  // Auto-refresh only when data loaded successfully (avoids spamming 500s on setup errors)
  useEffect(() => {
    if (!data || error) return;
    const interval = setInterval(loadData, 10000);
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
                <li>أضف <code className="bg-yellow-200 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> في متغيرات البيئة (Vercel أو .env.local)</li>
                <li>تأكد من تشغيل migration رقم 00039</li>
                <li>أعد تشغيل التطبيق</li>
              </ol>
            </div>
            <button
              onClick={loadData}
              className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div>
            <p className="text-red-600 text-lg">{error?.error || "فشل في تحميل البيانات"}</p>
            {error?.details && (
              <p className="text-red-400 text-sm mt-2">{error.details}</p>
            )}
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    );
  }

  const { engine, daily_metrics, active_scopes_count, scopes_breakdown, recent_jobs } = data;

  const statusConfig = {
    running: { color: "bg-green-500", text: "يعمل", icon: "🟢" },
    paused: { color: "bg-yellow-500", text: "متوقف مؤقتاً", icon: "🟡" },
    stopped: { color: "bg-red-500", text: "متوقف", icon: "🔴" },
  };

  const status = statusConfig[engine.status] || statusConfig.stopped;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌾 محرك الحصاد الآلي</h1>
          <p className="text-gray-500 text-sm mt-1">
            نظام جمع البيانات التلقائي من المنصات المنافسة
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/crm/harvester/scopes"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            📋 النطاقات
          </Link>
          <Link
            href="/admin/crm/harvester/listings"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            📰 الإعلانات
          </Link>
          <Link
            href="/admin/crm/harvester/sellers"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            👥 المعلنين
          </Link>
          <Link
            href="/admin/crm/harvester/bookmarklet"
            className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
          >
            🔖 Bookmarklet
          </Link>
        </div>
      </div>

      {/* Engine Control */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`w-4 h-4 rounded-full ${status.color} animate-pulse`} />
            <div>
              <h2 className="text-lg font-bold">
                {status.icon} حالة المحرك: {status.text}
              </h2>
              {engine.status_reason && (
                <p className="text-sm text-gray-500">{engine.status_reason}</p>
              )}
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

        {/* Engine Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">النطاقات</p>
            <p className="text-2xl font-bold">{scopes_breakdown?.total ?? active_scopes_count}</p>
            {scopes_breakdown && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                  {scopes_breakdown.active} نشط
                </span>
                {scopes_breakdown.paused > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    {scopes_breakdown.paused} متوقف
                  </span>
                )}
                {scopes_breakdown.blocked > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    {scopes_breakdown.blocked} محظور
                  </span>
                )}
                {scopes_breakdown.inactive > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    {scopes_breakdown.inactive} غير مفعّل
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">عمليات جارية</p>
            <p className="text-2xl font-bold">{engine.running_jobs_count}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">طلبات/الساعة</p>
            <p className="text-2xl font-bold">
              {engine.current_requests_this_hour}/{engine.global_max_requests_per_hour}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">أخطاء متتالية</p>
            <p
              className={`text-2xl font-bold ${
                engine.consecutive_errors > 5 ? "text-red-600" : ""
              }`}
            >
              {engine.consecutive_errors}/{engine.auto_pause_threshold}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          label="حصادات اليوم"
          value={daily_metrics.total_harvests}
          icon="🌾"
        />
        <MetricCard
          label="إعلانات جديدة"
          value={daily_metrics.total_listings_new}
          icon="📰"
          highlight
        />
        <MetricCard
          label="معلنين جدد"
          value={daily_metrics.total_sellers_new}
          icon="👥"
        />
        <MetricCard
          label="أرقام مستخرجة"
          value={daily_metrics.total_phones_extracted}
          icon="📱"
        />
        <MetricCard
          label="أُرسلوا للـ CRM"
          value={daily_metrics.total_auto_queued}
          icon="🚀"
          highlight
        />
      </div>

      {/* Blocked Scopes Warning */}
      {data.scopes?.some((s: AheScope) => s.server_fetch_blocked) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h2 className="text-md font-bold text-orange-800 mb-2">
            ⚠️ نطاقات محظورة من Server-side Fetch
          </h2>
          <p className="text-orange-600 text-sm mb-3">
            هذه النطاقات تحتاج Bookmarklet — server-side محظور (403)
          </p>
          <div className="space-y-2">
            {data.scopes
              .filter((s: AheScope) => s.server_fetch_blocked)
              .map((s: AheScope) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100"
                >
                  <div>
                    <span className="font-bold text-sm">{s.name}</span>
                    <span className="text-gray-400 text-xs mr-2">({s.code})</span>
                    {s.server_fetch_blocked_at && (
                      <span className="text-orange-400 text-xs mr-2">
                        محظور منذ {new Date(s.server_fetch_blocked_at).toLocaleDateString("ar-EG")}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/admin/crm/harvester/bookmarklet"
                    className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs hover:bg-orange-700"
                  >
                    🔖 استخدم Bookmarklet
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
                      {new Date(job.created_at).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 font-medium">
                      {job.ahe_scopes?.name || job.scope_id.slice(0, 8)}
                    </td>
                    <td className="py-3">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="py-3 text-gray-500 text-xs">
                      {job.current_step || "—"}
                    </td>
                    <td className="py-3 font-bold text-green-700">
                      {job.listings_new}
                    </td>
                    <td className="py-3 text-gray-400">{job.listings_duplicate}</td>
                    <td className="py-3">{job.phones_extracted}</td>
                    <td className="py-3 text-gray-500">
                      {job.duration_seconds ? `${job.duration_seconds}ث` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl shadow-sm border ${
        highlight ? "bg-green-50 border-green-200" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${highlight ? "text-green-700" : ""}`}>
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
