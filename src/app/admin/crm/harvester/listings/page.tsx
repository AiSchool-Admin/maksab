"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import type { AheListing } from "@/lib/crm/harvester/types";

interface ListingsData {
  listings: AheListing[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function ListingsPage() {
  const [data, setData] = useState<ListingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    category: "",
    governorate: "",
    has_phone: "",
    migration_status: "",
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
      if (filters.has_phone) params.set("has_phone", filters.has_phone);
      if (filters.migration_status)
        params.set("migration_status", filters.migration_status);
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
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mt-1">📰 الإعلانات المحصودة</h1>
        {data && (
          <p className="text-gray-500 text-sm">
            {data.total.toLocaleString("ar-EG")} إعلان
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="🔍 بحث بالعنوان..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          />
          <select
            value={filters.category}
            onChange={(e) => {
              setFilters({ ...filters, category: e.target.value });
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الأقسام</option>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={filters.has_phone}
            onChange={(e) => {
              setFilters({ ...filters, has_phone: e.target.value });
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الإعلانات</option>
            <option value="true">📱 فيها رقم</option>
          </select>
          <select
            value={filters.migration_status}
            onChange={(e) => {
              setFilters({ ...filters, migration_status: e.target.value });
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="harvested">محصود</option>
            <option value="migrated">منقول</option>
          </select>
        </div>
      </div>

      {/* Listings Table */}
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
                    <th className="text-right py-3 px-4">الإعلان</th>
                    <th className="text-right py-3 px-2">السعر</th>
                    <th className="text-right py-3 px-2">القسم</th>
                    <th className="text-right py-3 px-2">الموقع</th>
                    <th className="text-right py-3 px-2">📱 رقم</th>
                    <th className="text-right py-3 px-2">المعلن</th>
                    <th className="text-right py-3 px-2">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {listing.thumbnail_url && (
                            <Image
                              src={listing.thumbnail_url}
                              alt=""
                              width={48}
                              height={48}
                              className="w-12 h-12 object-cover rounded"
                              unoptimized
                            />
                          )}
                          <div className="min-w-0">
                            <a
                              href={listing.source_listing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline block truncate max-w-[250px]"
                            >
                              {listing.title}
                            </a>
                            {listing.is_featured && (
                              <span className="text-xs text-yellow-600">⭐ مميز</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-bold whitespace-nowrap">
                        {listing.price
                          ? `${listing.price.toLocaleString("ar-EG")} جنيه`
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-xs">
                        {categoryLabels[listing.maksab_category || ""] ||
                          listing.maksab_category}
                      </td>
                      <td className="py-3 px-2 text-xs text-gray-500">
                        {listing.governorate}
                        {listing.city && ` · ${listing.city}`}
                      </td>
                      <td className="py-3 px-2">
                        {listing.extracted_phone ? (
                          <span className="text-green-600 font-mono text-xs">
                            {listing.extracted_phone}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs">
                        {listing.seller_name || "—"}
                        {listing.seller_is_business && (
                          <span className="text-blue-500 mr-1">🏪</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-gray-400">
                        {new Date(listing.created_at).toLocaleDateString("ar-EG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
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
