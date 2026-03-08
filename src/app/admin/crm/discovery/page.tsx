"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target, Users, TrendingUp, Upload, Plus, Globe, BarChart3,
  RefreshCw, ExternalLink
} from "lucide-react";
import { CATEGORY_LABELS, SOURCE_LABELS } from "@/types/crm";
import { getAdminHeaders } from "@/app/admin/layout";

export default function CrmDiscoveryPage() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    week: 0,
    month: 0,
    bySource: {} as Record<string, number>,
  });
  const [recentCustomers, setRecentCustomers] = useState<Array<{
    id: string; full_name: string; phone: string; source: string;
    primary_category: string | null; governorate: string | null; created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch recent leads
        const res = await fetch(
          "/api/admin/crm/customers?limit=20&lifecycle=lead&sort_by=created_at&sort_order=desc",
          { headers: getAdminHeaders() }
        );
        const data = await res.json();
        setRecentCustomers(data.customers || []);
        setStats(s => ({ ...s, total: data.total || 0 }));
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleRunLifecycle = async () => {
    setRecalculating(true);
    try {
      await fetch("/api/admin/crm/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      });
    } catch { /* ignore */ }
    setRecalculating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Target size={20} className="text-[#1B7A3D]" />
          محرك الاكتشاف
        </h2>
        <div className="flex gap-2">
          <button onClick={handleRunLifecycle} disabled={recalculating}
            className="flex items-center gap-1 px-3 py-2 border rounded-xl text-xs hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
            تحديث تلقائي
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">إجمالي المكتشفين</span>
          </div>
          <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-xs text-green-700">عملاء محتملين (leads)</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500">مصادر نشطة</span>
          </div>
          <p className="text-2xl font-bold">8</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-amber-600" />
            <span className="text-xs text-gray-500">معدل التحويل</span>
          </div>
          <p className="text-2xl font-bold">—%</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link href="/admin/crm/customers" className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">قائمة العملاء</h3>
              <p className="text-xs text-gray-500">عرض وإدارة كل العملاء</p>
            </div>
            <ExternalLink size={14} className="mr-auto text-gray-300 group-hover:text-[#1B7A3D]" />
          </div>
        </Link>
        <Link href="/admin/crm/discovery/bulk-import"
          className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow text-right group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Upload size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">استيراد CSV</h3>
              <p className="text-xs text-gray-500">استيراد قائمة عملاء من ملف</p>
            </div>
            <ExternalLink size={14} className="mr-auto text-gray-300 group-hover:text-[#1B7A3D]" />
          </div>
        </Link>
        <Link href="/admin/crm/discovery/competitor-sources"
          className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow text-right group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Globe size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">مصادر المنافسين</h3>
              <p className="text-xs text-gray-500">إدارة وتتبع مصادر الاكتشاف</p>
            </div>
            <ExternalLink size={14} className="mr-auto text-gray-300 group-hover:text-[#1B7A3D]" />
          </div>
        </Link>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">آخر العملاء المكتشفين</h3>
          <Link href="/admin/crm/customers?lifecycle=lead" className="text-xs text-[#1B7A3D] hover:underline">عرض الكل</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2 text-right">الاسم</th>
                <th className="px-3 py-2 text-right">الهاتف</th>
                <th className="px-3 py-2 text-right">المصدر</th>
                <th className="px-3 py-2 text-right">الفئة</th>
                <th className="px-3 py-2 text-right">الموقع</th>
                <th className="px-3 py-2 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    <td className="px-3 py-2.5"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-3 py-2.5"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-3 py-2.5"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-2.5"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-2.5"><div className="h-4 bg-gray-200 rounded w-14" /></td>
                    <td className="px-3 py-2.5"><div className="h-4 bg-gray-200 rounded w-14" /></td>
                  </tr>
                ))
              ) : recentCustomers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">لا يوجد عملاء محتملين بعد</td></tr>
              ) : (
                recentCustomers.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/crm/customers/${c.id}`} className="text-[#1B7A3D] hover:underline font-medium">
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono" dir="ltr">{c.phone}</td>
                    <td className="px-3 py-2.5 text-xs">{SOURCE_LABELS[c.source] || c.source}</td>
                    <td className="px-3 py-2.5 text-xs">{CATEGORY_LABELS[c.primary_category || ''] || '—'}</td>
                    <td className="px-3 py-2.5 text-xs">{c.governorate || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
