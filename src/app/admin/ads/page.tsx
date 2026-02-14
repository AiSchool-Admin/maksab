"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, Heart, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useAdmin } from "../layout";
import { getCategoryById } from "@/lib/categories/categories-config";
import type { AdminAd } from "@/lib/admin/admin-service";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US") + " جنيه";
}

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-50 text-green-600" },
  sold: { label: "مباع", color: "bg-blue-50 text-blue-600" },
  exchanged: { label: "مُبدّل", color: "bg-purple-50 text-purple-600" },
  expired: { label: "منتهي", color: "bg-gray-100 text-gray-500" },
  deleted: { label: "محذوف", color: "bg-red-50 text-red-500" },
};

const saleTypeLabels: Record<string, string> = {
  cash: "💰 للبيع",
  auction: "🔥 مزاد",
  exchange: "🔄 للتبديل",
};

export default function AdminAdsPage() {
  const admin = useAdmin();
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

  const loadAds = useCallback(async () => {
    if (!admin) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: "ads",
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (saleTypeFilter) params.set("sale_type", saleTypeFilter);

      const res = await fetch(`/api/admin/stats?${params}`, {
        headers: { "x-admin-id": admin.id },
      });
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads);
        setTotal(data.total);
      }
    } catch {
      // Silent
    }
    setIsLoading(false);
  }, [admin, page, search, statusFilter, saleTypeFilter]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-dark">الإعلانات</h2>
        <p className="text-xs text-gray-text">{total} إعلان</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث بالعنوان..."
            className="w-full ps-4 pe-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="sold">مباع</option>
          <option value="expired">منتهي</option>
          <option value="deleted">محذوف</option>
        </select>
        <select
          value={saleTypeFilter}
          onChange={(e) => { setSaleTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        >
          <option value="">كل الأنواع</option>
          <option value="cash">نقدي</option>
          <option value="auction">مزاد</option>
          <option value="exchange">تبديل</option>
        </select>
      </div>

      {/* Ads List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-text">جاري التحميل...</div>
        ) : ads.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-text">لا يوجد إعلانات</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {ads.map((ad) => {
              const catConfig = getCategoryById(ad.categoryId);
              const st = statusLabels[ad.status] || statusLabels.active;
              return (
                <div key={ad.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {ad.image ? (
                        <img src={ad.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">
                          {catConfig?.icon || "📦"}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-dark truncate">{ad.title}</h3>
                        <Link
                          href={`/ad/${ad.id}`}
                          target="_blank"
                          className="text-brand-green hover:text-brand-green-dark flex-shrink-0"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                        <span className="text-[10px] text-gray-text">{saleTypeLabels[ad.saleType] || ad.saleType}</span>
                        {catConfig && (
                          <span className="text-[10px] text-gray-text">{catConfig.icon} {catConfig.name}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-text">
                        {ad.price != null && (
                          <span className="font-medium text-dark">{formatPrice(ad.price)}</span>
                        )}
                        <span className="flex items-center gap-0.5"><Eye size={10} /> {ad.viewsCount}</span>
                        <span className="flex items-center gap-0.5"><Heart size={10} /> {ad.favoritesCount}</span>
                        <span>{ad.governorate || "—"}</span>
                        <span>{formatDate(ad.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-sm text-gray-text px-3">صفحة {page} من {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
