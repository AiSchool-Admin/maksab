"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AlexStats {
  scopes: Array<{
    id: string;
    name: string;
    code: string;
    source_platform: string;
    maksab_category: string;
    is_active: boolean;
    priority: number;
    server_fetch_blocked: boolean;
  }>;
  cars: {
    total_listings: number;
    listings_today: number;
    total_sellers: number;
    sellers_with_phone: number;
  };
  properties: {
    total_listings: number;
    listings_today: number;
    total_sellers: number;
    sellers_with_phone: number;
  };
  recent_jobs: Array<{
    id: string;
    status: string;
    listings_new: number;
    sellers_new: number;
    phones_extracted: number;
    duration_seconds: number;
    created_at: string;
    ahe_scopes?: {
      name: string;
      code: string;
      maksab_category: string;
      source_platform: string;
    };
  }>;
  scope_stats: Array<{
    code: string;
    name: string;
    source_platform: string;
    maksab_category: string;
    last_harvest_at: string | null;
    last_harvest_new_listings: number;
    last_harvest_new_sellers: number;
    total_harvests: number;
    total_listings_found: number;
    total_sellers_found: number;
    total_phones_extracted: number;
    is_active: boolean;
    priority: number;
    server_fetch_blocked: boolean;
  }>;
  platform_comparison: Record<string, { listings: number; sellers: number; phones: number }>;
  daily_growth: Array<{ date: string; cars: number; properties: number }>;
}

function formatNumber(n: number): string {
  return n.toLocaleString("ar-EG");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function getPriorityLabel(p: number): string {
  if (p === 1) return "أساسي";
  if (p === 2) return "ثانوي";
  return "إضافي";
}

function getPriorityColor(p: number): string {
  if (p === 1) return "bg-green-100 text-green-800";
  if (p === 2) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

function getStatusBadge(scope: { is_active: boolean; server_fetch_blocked: boolean }): React.ReactNode {
  if (scope.server_fetch_blocked) {
    return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">محظور</span>;
  }
  if (scope.is_active) {
    return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">نشط</span>;
  }
  return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">متوقف</span>;
}

interface InspectResult {
  scope: string;
  platform: string;
  category: string;
  governorate: string;
  priority: number;
  harvest_interval_minutes: number;
  last_harvest_at: string | null;
  total_listings: number;
  total_sellers: number;
  sellers_with_phone: number;
  last_harvest_new_listings: number;
  last_harvest_new_sellers: number;
  consecutive_failures: number;
  server_fetch_blocked: boolean;
  status: "healthy" | "paused" | "failing";
  last_job: {
    id: string;
    status: string;
    listings_new: number;
    sellers_new: number;
    phones_extracted: number;
    duration_seconds: number;
    created_at: string;
    errors: string[];
  } | null;
}

export default function AlexandriaMVPDashboard() {
  const [data, setData] = useState<AlexStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [inspectResult, setInspectResult] = useState<InspectResult | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/crm/harvester/alexandria", { headers });
      if (res.ok) {
        setData(await res.json());
      } else {
        setError("فشل في تحميل البيانات");
      }
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, []);

  const inspectScope = useCallback(async (scopeCode: string) => {
    setInspecting(scopeCode);
    setInspectResult(null);
    setInspectError(null);
    try {
      const headers = getAdminHeaders();
      const res = await fetch(`/api/admin/harvest/status?scope=${scopeCode}`, { headers });
      if (res.ok) {
        setInspectResult(await res.json());
      } else {
        const data = await res.json();
        setInspectError(data.error || "فشل في الفحص");
      }
    } catch {
      setInspectError("خطأ في الاتصال");
    }
  }, []);

  const closeInspect = useCallback(() => {
    setInspecting(null);
    setInspectResult(null);
    setInspectError(null);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data || error) return;
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [data, error, loadData]);

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const platformData = Object.entries(data.platform_comparison).map(([platform, stats]) => ({
    platform,
    ...stats,
  }));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            الإسكندرية MVP — حصاد السيارات والعقارات
          </h1>
          <p className="text-gray-500 mt-1">
            {data.scopes.length} نطاق حصاد نشط — {data.scopes.filter(s => s.maksab_category === "سيارات").length} سيارات + {data.scopes.filter(s => s.maksab_category === "عقارات").length} عقارات
          </p>
        </div>
        <Link
          href="/admin/crm/harvester"
          className="text-sm text-blue-600 hover:underline"
        >
          ← لوحة الحصاد الرئيسية
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Cars */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">إعلانات سيارات</div>
          <div className="text-2xl font-bold text-blue-600">{formatNumber(data.cars.total_listings)}</div>
          <div className="text-xs text-green-600 mt-1">+{formatNumber(data.cars.listings_today)} اليوم</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">بائعي سيارات بأرقام</div>
          <div className="text-2xl font-bold text-green-600">{formatNumber(data.cars.sellers_with_phone)}</div>
          <div className="text-xs text-gray-400 mt-1">من {formatNumber(data.cars.total_sellers)} بائع</div>
        </div>

        {/* Properties */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">إعلانات عقارات</div>
          <div className="text-2xl font-bold text-purple-600">{formatNumber(data.properties.total_listings)}</div>
          <div className="text-xs text-green-600 mt-1">+{formatNumber(data.properties.listings_today)} اليوم</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">بائعي عقارات بأرقام</div>
          <div className="text-2xl font-bold text-green-600">{formatNumber(data.properties.sellers_with_phone)}</div>
          <div className="text-xs text-gray-400 mt-1">من {formatNumber(data.properties.total_sellers)} بائع</div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-800 mb-4">معدل النمو اليومي (آخر 7 أيام)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.daily_growth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => {
                const date = new Date(String(d));
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(d) => {
                const date = new Date(String(d));
                return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
              }}
            />
            <Legend />
            <Bar dataKey="cars" name="سيارات" fill="#3B82F6" />
            <Bar dataKey="properties" name="عقارات" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Comparison */}
      {platformData.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-800 mb-4">مقارنة بين المصادر</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={platformData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="platform" width={100} />
              <Tooltip />
              <Bar dataKey="listings" name="إعلانات" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scope Stats Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">حالة كل مصدر</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-right">المصدر</th>
                <th className="px-4 py-2 text-right">المنصة</th>
                <th className="px-4 py-2 text-right">الفئة</th>
                <th className="px-4 py-2 text-center">الأولوية</th>
                <th className="px-4 py-2 text-center">الحالة</th>
                <th className="px-4 py-2 text-center">آخر حصاد</th>
                <th className="px-4 py-2 text-center">إعلانات جديدة</th>
                <th className="px-4 py-2 text-center">إجمالي الحصاد</th>
                <th className="px-4 py-2 text-center">أرقام مستخرجة</th>
                <th className="px-4 py-2 text-center">فحص</th>
              </tr>
            </thead>
            <tbody>
              {data.scope_stats.map((scope) => (
                <tr key={scope.code} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{scope.code}</td>
                  <td className="px-4 py-2">{scope.source_platform}</td>
                  <td className="px-4 py-2">
                    <span className={scope.maksab_category === "سيارات" ? "text-blue-600" : "text-purple-600"}>
                      {scope.maksab_category}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(scope.priority)}`}>
                      {getPriorityLabel(scope.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">{getStatusBadge(scope)}</td>
                  <td className="px-4 py-2 text-center text-gray-500">
                    {scope.last_harvest_at ? timeAgo(scope.last_harvest_at) : "لم يبدأ"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {scope.last_harvest_new_listings || 0}
                  </td>
                  <td className="px-4 py-2 text-center font-medium">
                    {formatNumber(scope.total_listings_found || 0)}
                  </td>
                  <td className="px-4 py-2 text-center text-green-600 font-medium">
                    {formatNumber(scope.total_phones_extracted || 0)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => inspectScope(scope.code)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      disabled={inspecting === scope.code}
                    >
                      {inspecting === scope.code ? "جاري..." : "فحص"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">آخر عمليات الحصاد</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-right">المصدر</th>
                <th className="px-4 py-2 text-center">الحالة</th>
                <th className="px-4 py-2 text-center">إعلانات جديدة</th>
                <th className="px-4 py-2 text-center">بائعين جدد</th>
                <th className="px-4 py-2 text-center">أرقام</th>
                <th className="px-4 py-2 text-center">المدة</th>
                <th className="px-4 py-2 text-center">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_jobs.slice(0, 15).map((job) => (
                <tr key={job.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    {job.ahe_scopes?.code || "—"}
                    <span className="text-gray-400 text-xs mr-2">
                      {job.ahe_scopes?.source_platform}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        job.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : job.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {job.status === "completed" ? "مكتمل" : job.status === "failed" ? "فشل" : "جاري"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">{job.listings_new}</td>
                  <td className="px-4 py-2 text-center">{job.sellers_new}</td>
                  <td className="px-4 py-2 text-center text-green-600">{job.phones_extracted}</td>
                  <td className="px-4 py-2 text-center text-gray-500">
                    {job.duration_seconds ? `${job.duration_seconds.toFixed(0)}ث` : "—"}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-500">
                    {timeAgo(job.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Inspect Modal */}
      {inspecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeInspect}>
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">فحص النطاق: {inspecting}</h3>
              <button onClick={closeInspect} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-4">
              {inspectError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">{inspectError}</div>
              )}
              {!inspectResult && !inspectError && (
                <div className="text-center py-8 text-gray-400">جاري الفحص...</div>
              )}
              {inspectResult && (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      inspectResult.status === "healthy" ? "bg-green-100 text-green-800" :
                      inspectResult.status === "paused" ? "bg-gray-100 text-gray-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {inspectResult.status === "healthy" ? "يعمل بشكل طبيعي" :
                       inspectResult.status === "paused" ? "متوقف" : "فشل متكرر"}
                    </span>
                    {inspectResult.server_fetch_blocked && (
                      <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">محظور WAF</span>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-500">المنصة</div>
                      <div className="font-medium">{inspectResult.platform}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-500">الفئة</div>
                      <div className="font-medium">{inspectResult.category}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-500">إجمالي الإعلانات</div>
                      <div className="font-bold text-blue-600">{formatNumber(inspectResult.total_listings)}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-500">إجمالي البائعين</div>
                      <div className="font-bold">{formatNumber(inspectResult.total_sellers)}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-500">بائعين بأرقام</div>
                      <div className="font-bold text-green-600">{formatNumber(inspectResult.sellers_with_phone)}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-500">فشل متتالي</div>
                      <div className={`font-bold ${inspectResult.consecutive_failures > 0 ? "text-red-600" : "text-gray-600"}`}>
                        {inspectResult.consecutive_failures}
                      </div>
                    </div>
                  </div>

                  {/* Last Harvest */}
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">آخر حصاد</div>
                    <div className="text-sm">
                      {inspectResult.last_harvest_at ? timeAgo(inspectResult.last_harvest_at) : "لم يبدأ بعد"}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      إعلانات جديدة: {inspectResult.last_harvest_new_listings} | بائعين جدد: {inspectResult.last_harvest_new_sellers}
                    </div>
                  </div>

                  {/* Last Job */}
                  {inspectResult.last_job && (
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">آخر عملية</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          inspectResult.last_job.status === "completed" ? "bg-green-100 text-green-800" :
                          inspectResult.last_job.status === "failed" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {inspectResult.last_job.status === "completed" ? "مكتمل" :
                           inspectResult.last_job.status === "failed" ? "فشل" : "جاري"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {inspectResult.last_job.duration_seconds
                            ? `${inspectResult.last_job.duration_seconds.toFixed(0)} ثانية`
                            : ""}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {inspectResult.last_job.listings_new} إعلان | {inspectResult.last_job.sellers_new} بائع | {inspectResult.last_job.phones_extracted} رقم
                      </div>
                      {inspectResult.last_job.errors && inspectResult.last_job.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
                          {inspectResult.last_job.errors.slice(0, 3).map((err, i) => (
                            <div key={i}>{err}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
