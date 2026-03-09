"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import type { AheSeller } from "@/lib/crm/harvester/types";

interface SellersData {
  sellers: AheSeller[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  pipeline_stats: Record<string, number>;
}

const pipelineLabels: Record<string, { label: string; color: string }> = {
  discovered: { label: "مكتشف", color: "bg-gray-100 text-gray-600" },
  auto_queued: { label: "في الطابور", color: "bg-blue-100 text-blue-700" },
  linked_existing: { label: "موجود بالـ CRM", color: "bg-green-100 text-green-700" },
  contacted: { label: "تم التواصل", color: "bg-purple-100 text-purple-700" },
  responded: { label: "ردّ", color: "bg-indigo-100 text-indigo-700" },
  converted: { label: "مُحوّل", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "رفض", color: "bg-red-100 text-red-700" },
};

export default function SellersPage() {
  const [data, setData] = useState<SellersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    pipeline_status: "",
    has_phone: "",
    category: "",
    search: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (filters.pipeline_status) params.set("pipeline_status", filters.pipeline_status);
      if (filters.has_phone) params.set("has_phone", filters.has_phone);
      if (filters.category) params.set("category", filters.category);
      if (filters.search) params.set("search", filters.search);

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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div>
        <Link
          href="/admin/crm/harvester"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← محرك الحصاد
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">👥 المعلنين المكتشفين</h1>
        {data && (
          <p className="text-gray-500 text-sm">
            {data.total.toLocaleString("ar-EG")} معلن
          </p>
        )}
      </div>

      {/* Pipeline Stats */}
      {data?.pipeline_stats && Object.keys(data.pipeline_stats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.pipeline_stats).map(([status, count]) => {
            const config = pipelineLabels[status] || {
              label: status,
              color: "bg-gray-100 text-gray-600",
            };
            return (
              <button
                key={status}
                onClick={() => {
                  setFilters({
                    ...filters,
                    pipeline_status:
                      filters.pipeline_status === status ? "" : status,
                  });
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  filters.pipeline_status === status
                    ? "ring-2 ring-green-500 ring-offset-1"
                    : ""
                } ${config.color}`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="🔍 بحث بالاسم أو الرقم..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          />
          <select
            value={filters.has_phone}
            onChange={(e) => {
              setFilters({ ...filters, has_phone: e.target.value });
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">الكل</option>
            <option value="true">📱 بدون رقم</option>
            <option value="false">❌ بدون رقم</option>
          </select>
        </div>
      </div>

      {/* Sellers Table */}
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
                    <th className="text-right py-3 px-4">المعلن</th>
                    <th className="text-right py-3 px-2">📱 الرقم</th>
                    <th className="text-right py-3 px-2">المنصة</th>
                    <th className="text-right py-3 px-2">القسم</th>
                    <th className="text-right py-3 px-2">المحافظة</th>
                    <th className="text-right py-3 px-2">الإعلانات</th>
                    <th className="text-right py-3 px-2">النقاط</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                    <th className="text-right py-3 px-2">CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellers.map((seller) => {
                    const pipeline = pipelineLabels[seller.pipeline_status] || {
                      label: seller.pipeline_status,
                      color: "bg-gray-100 text-gray-600",
                    };

                    return (
                      <tr key={seller.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                              {seller.is_business ? "🏪" : "👤"}
                            </div>
                            <div>
                              <p className="font-medium">{seller.name || "بدون اسم"}</p>
                              <p className="text-xs text-gray-400">
                                {seller.is_verified && "✅ موثق "}
                                {seller.is_business && "🏪 متجر"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {seller.phone ? (
                            <span className="text-green-600 font-mono text-xs">
                              {seller.phone}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-xs">{seller.source_platform}</td>
                        <td className="py-3 px-2 text-xs">{seller.primary_category}</td>
                        <td className="py-3 px-2 text-xs">{seller.primary_governorate}</td>
                        <td className="py-3 px-2 text-center">
                          {seller.total_listings_seen}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <div
                              className="h-2 bg-green-500 rounded-full"
                              style={{ width: `${seller.priority_score}%`, maxWidth: "60px" }}
                            />
                            <span className="text-xs text-gray-500">
                              {seller.priority_score}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${pipeline.color}`}
                          >
                            {pipeline.label}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {seller.crm_customer_id ? (
                            <Link
                              href={`/admin/crm/customers/${seller.crm_customer_id}`}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              عرض
                            </Link>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-500">
                  صفحة {data.page} من {data.total_pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
                  >
                    → السابق
                  </button>
                  <button
                    onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                    disabled={page >= data.total_pages}
                    className="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
                  >
                    التالي ←
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
