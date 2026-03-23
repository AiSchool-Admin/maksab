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

export default function AlexandriaMVPDashboard() {
  const [data, setData] = useState<AlexStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
}
