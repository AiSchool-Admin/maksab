"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ExternalLink } from "lucide-react";
import { getAdminHeaders } from "../layout";

/* ─── Types ─── */

interface DashboardData {
  alexCarsSellers: number;
  alexCarsWithPhone: number;
  alexPropertiesSellers: number;
  alexPropertiesWithPhone: number;
  waleedMessagesToday: number;
  waleedMessagesWeek: number;
  ahmedMessagesToday: number;
  ahmedMessagesWeek: number;
  growthChart: Array<{ date: string; cars: number; properties: number }>;
  harvestStatus: Array<{
    code: string;
    platform: string;
    category: string;
    last_harvest_at: string | null;
    listings_today: number;
    is_paused: boolean;
  }>;
}

/* ─── Helpers ─── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

const PLATFORM_LABELS: Record<string, string> = {
  dubizzle: "Dubizzle",
  opensooq: "OpenSooq",
  aqarmap: "AqarMap",
  propertyfinder: "PropertyFinder",
  olx: "OLX",
  hatla2ee: "Hatla2ee",
  contactcars: "ContactCars",
};

const CATEGORY_LABELS: Record<string, string> = {
  vehicles: "سيارات",
  properties: "عقارات",
};

/* ─── Main Dashboard ─── */

export default function AlexandriaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/dashboard/alexandria", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("حصل مشكلة في تحميل البيانات");
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 h-32 animate-pulse border border-gray-100" />
          ))}
        </div>
        <div className="bg-white rounded-xl h-48 animate-pulse border border-gray-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-bold text-dark mb-3">{error || "لا توجد بيانات"}</p>
        <button onClick={load} className="px-4 py-2 bg-brand-green text-white rounded-xl text-sm font-medium">
          حاول تاني
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">مكسب — الإسكندرية</h1>
          <p className="text-sm text-gray-text">سيارات + عقارات</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* بائعو السيارات */}
        <Link href="/admin/crm/sellers?category=vehicles" className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🚗</span>
            <span className="text-xs font-bold text-gray-400">بائعو السيارات</span>
          </div>
          <p className="text-3xl font-bold text-dark">{data.alexCarsSellers.toLocaleString()}</p>
          <p className="text-xs text-brand-green font-medium mt-1">
            {data.alexCarsWithPhone.toLocaleString()} بأرقام 📱
          </p>
        </Link>

        {/* بائعو العقارات */}
        <Link href="/admin/crm/sellers?category=properties" className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏠</span>
            <span className="text-xs font-bold text-gray-400">بائعو العقارات</span>
          </div>
          <p className="text-3xl font-bold text-dark">{data.alexPropertiesSellers.toLocaleString()}</p>
          <p className="text-xs text-purple-600 font-medium mt-1">
            {data.alexPropertiesWithPhone.toLocaleString()} بأرقام 📱
          </p>
        </Link>

        {/* رسائل وليد */}
        <Link href="/admin/sales/outreach?tab=waleed" className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📱</span>
            <span className="text-xs font-bold text-gray-400">رسائل وليد 🚗</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{data.waleedMessagesToday}</p>
          <p className="text-xs text-gray-text mt-1">
            الأسبوع: {data.waleedMessagesWeek}
          </p>
        </Link>

        {/* رسائل أحمد */}
        <Link href="/admin/sales/outreach?tab=ahmed" className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📱</span>
            <span className="text-xs font-bold text-gray-400">رسائل أحمد 🏠</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{data.ahmedMessagesToday}</p>
          <p className="text-xs text-gray-text mt-1">
            الأسبوع: {data.ahmedMessagesWeek}
          </p>
        </Link>
      </div>

      {/* Growth Chart — simple bars */}
      {data.growthChart.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-dark mb-4">نمو البائعين — آخر 7 أيام</h3>
          <div className="flex items-end gap-2 h-32">
            {data.growthChart.map((day, i) => {
              const maxVal = Math.max(...data.growthChart.map(d => d.cars + d.properties), 1);
              const totalH = ((day.cars + day.properties) / maxVal) * 100;
              const carsH = day.cars > 0 ? (day.cars / (day.cars + day.properties)) * totalH : 0;
              const propsH = totalH - carsH;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center" style={{ height: "100px" }}>
                    <div className="w-full flex flex-col justify-end h-full">
                      {propsH > 0 && (
                        <div className="w-full bg-purple-400 rounded-t" style={{ height: `${propsH}%` }} />
                      )}
                      {carsH > 0 && (
                        <div className={`w-full bg-blue-400 ${propsH === 0 ? "rounded-t" : ""}`} style={{ height: `${carsH}%` }} />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">{day.date.slice(5)}</span>
                  <span className="text-[10px] font-bold text-gray-600">{day.cars + day.properties}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-3 h-3 bg-blue-400 rounded" /> سيارات
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-3 h-3 bg-purple-400 rounded" /> عقارات
            </span>
          </div>
        </div>
      )}

      {/* Harvest Status Table */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-dark">حالة الحصاد</h3>
          <Link href="/admin/crm/harvester/alexandria" className="flex items-center gap-1 text-xs text-brand-green hover:text-brand-green-dark">
            التفاصيل <ExternalLink size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
                <th className="text-right py-2 font-medium">المصدر</th>
                <th className="text-right py-2 font-medium">الفئة</th>
                <th className="text-right py-2 font-medium">آخر حصاد</th>
                <th className="text-center py-2 font-medium">إعلانات اليوم</th>
                <th className="text-center py-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.harvestStatus.map((scope) => (
                <tr key={scope.code} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 font-medium text-dark">
                    {PLATFORM_LABELS[scope.platform] || scope.platform}
                  </td>
                  <td className="py-2.5 text-gray-600">
                    {scope.category === "vehicles" ? "🚗 سيارات" : "🏠 عقارات"}
                  </td>
                  <td className="py-2.5 text-gray-500 text-xs">
                    {timeAgo(scope.last_harvest_at)}
                  </td>
                  <td className="py-2.5 text-center font-bold text-dark">
                    {scope.listings_today}
                  </td>
                  <td className="py-2.5 text-center">
                    {scope.is_paused ? (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">متوقف</span>
                    ) : (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">نشط</span>
                    )}
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
