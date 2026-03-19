"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Trash2,
  Star,
  ShoppingBag,
  Download,
  Check,
  Square,
  CheckSquare,
  X,
  Loader2,
  Calendar,
  MapPin,
  User,
  Clock,
  Gavel,
  Phone,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAdmin, getAdminHeaders } from "../layout";
import { getCategoryById, categoriesConfig } from "@/lib/categories/categories-config";
import type { AdminAd } from "@/lib/admin/admin-service";
import type { AdminAdDetail } from "@/lib/admin/admin-actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US") + " جنيه";
}

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-50 text-green-600 border-green-200" },
  sold: { label: "مباع", color: "bg-blue-50 text-blue-600 border-blue-200" },
  exchanged: { label: "مُبدّل", color: "bg-purple-50 text-purple-600 border-purple-200" },
  expired: { label: "منتهي", color: "bg-gray-100 text-gray-500 border-gray-200" },
  deleted: { label: "محذوف", color: "bg-red-50 text-red-500 border-red-200" },
};

const saleTypeLabels: Record<string, { label: string; icon: string }> = {
  cash: { label: "نقدي", icon: "💰" },
  auction: { label: "مزاد", icon: "🔨" },
  exchange: { label: "تبديل", icon: "🔄" },
};

type AdAction = "activate" | "deactivate" | "feature" | "unfeature" | "delete" | "mark_sold";

export default function AdminAdsPage() {
  const admin = useAdmin();
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Action menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Ad detail drawer
  const [detailAd, setDetailAd] = useState<AdminAdDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Bulk action loading
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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
      if (categoryFilter) params.set("category", categoryFilter);
      if (featuredFilter) params.set("featured", featuredFilter);

      const res = await fetch(`/api/admin/stats?${params}`, {
        headers: getAdminHeaders(),
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
  }, [admin, page, search, statusFilter, saleTypeFilter, categoryFilter, featuredFilter]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  // Clear selection on filter/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, search, statusFilter, saleTypeFilter, categoryFilter, featuredFilter]);

  const totalPages = Math.ceil(total / limit);

  // ── Ad Actions ──────────────────────────────────────────

  async function performAction(adId: string, action: AdAction) {
    setActionLoading(adId);
    setActionMenuId(null);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ action, adId }),
      });
      if (res.ok) {
        // Refresh list
        loadAds();
      }
    } catch {
      // Silent
    }
    setActionLoading(null);
  }

  async function performBulkAction(action: AdAction) {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ action, adIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setIsBulkMode(false);
        loadAds();
      }
    } catch {
      // Silent
    }
    setBulkActionLoading(false);
  }

  // ── Ad Detail ───────────────────────────────────────────

  async function openDetail(adId: string) {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/ads?id=${adId}`, {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailAd(data);
      }
    } catch {
      // Silent
    }
    setIsLoadingDetail(false);
  }

  // ── Selection helpers ───────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === ads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ads.map((a) => a.id)));
    }
  }

  // ── Export ──────────────────────────────────────────────

  function exportCsv() {
    const header = "ID,العنوان,السعر,النوع,الحالة,القسم,المحافظة,المشاهدات,المفضلة,التاريخ\n";
    const rows = ads
      .map((ad) => {
        const cat = getCategoryById(ad.categoryId);
        return [
          ad.id,
          `"${ad.title.replace(/"/g, '""')}"`,
          ad.price ?? "",
          ad.saleType,
          ad.status,
          cat?.name || ad.categoryId,
          ad.governorate || "",
          ad.viewsCount,
          ad.favoritesCount,
          ad.createdAt,
        ].join(",");
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maksab-ads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <ShoppingBag size={24} className="text-brand-green" />
            إدارة الإعلانات
          </h2>
          <p className="text-xs text-gray-text mt-1">{total} إعلان</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsBulkMode(!isBulkMode); setSelectedIds(new Set()); }}
            className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              isBulkMode ? "bg-brand-green text-white" : "bg-gray-100 text-gray-text hover:bg-gray-200"
            }`}
          >
            {isBulkMode ? "إلغاء التحديد" : "تحديد متعدد"}
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-gray-100 text-gray-text hover:bg-gray-200 font-medium transition-colors"
          >
            <Download size={14} />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Filters */}
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
          <option value="exchanged">مُبدّل</option>
          <option value="expired">منتهي</option>
          <option value="deleted">محذوف</option>
        </select>
        <select
          value={saleTypeFilter}
          onChange={(e) => { setSaleTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        >
          <option value="">كل الأنواع</option>
          <option value="cash">💰 نقدي</option>
          <option value="auction">🔨 مزاد</option>
          <option value="exchange">🔄 تبديل</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        >
          <option value="">كل الأقسام</option>
          {categoriesConfig.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => { setFeaturedFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        >
          <option value="">كل الإعلانات</option>
          <option value="featured">⭐ مميزة فقط</option>
          <option value="not_featured">غير مميزة</option>
        </select>
      </div>

      {/* Bulk actions bar */}
      {isBulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-brand-green-light/20 rounded-xl border border-brand-green/20">
          <span className="text-sm font-medium text-brand-green-dark">
            {selectedIds.size} محدد
          </span>
          <div className="flex-1" />
          {bulkActionLoading ? (
            <Loader2 size={16} className="animate-spin text-brand-green" />
          ) : (
            <>
              <button
                onClick={() => performBulkAction("activate")}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 font-medium transition-colors"
              >
                <CheckCircle2 size={12} />
                تنشيط
              </button>
              <button
                onClick={() => performBulkAction("deactivate")}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-500 text-white hover:bg-gray-600 font-medium transition-colors"
              >
                <XCircle size={12} />
                إيقاف
              </button>
              <button
                onClick={() => performBulkAction("feature")}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium transition-colors"
              >
                <Star size={12} />
                تمييز
              </button>
              <button
                onClick={() => performBulkAction("delete")}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium transition-colors"
              >
                <Trash2 size={12} />
                حذف
              </button>
            </>
          )}
        </div>
      )}

      {/* Ads List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-text">لا يوجد إعلانات</p>
          </div>
        ) : (
          <>
            {/* Select all header */}
            {isBulkMode && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <button onClick={toggleSelectAll} className="text-gray-text hover:text-dark transition-colors">
                  {selectedIds.size === ads.length ? <CheckSquare size={18} className="text-brand-green" /> : <Square size={18} />}
                </button>
                <span className="text-xs text-gray-text">
                  {selectedIds.size === ads.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                </span>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {ads.map((ad) => {
                const catConfig = getCategoryById(ad.categoryId);
                const st = statusLabels[ad.status] || statusLabels.active;
                const stl = saleTypeLabels[ad.saleType] || saleTypeLabels.cash;
                const isSelected = selectedIds.has(ad.id);
                const isActionLoading = actionLoading === ad.id;

                return (
                  <div
                    key={ad.id}
                    className={`p-4 transition-colors ${
                      isSelected ? "bg-brand-green-light/10" : "hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Checkbox */}
                      {isBulkMode && (
                        <button
                          onClick={() => toggleSelect(ad.id)}
                          className="mt-1 flex-shrink-0 text-gray-text hover:text-dark transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={20} className="text-brand-green" />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      )}

                      {/* Image */}
                      <button
                        onClick={() => openDetail(ad.id)}
                        className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        {ad.image ? (
                          <Image src={ad.image} alt="" width={64} height={64} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">
                            {catConfig?.icon || "📦"}
                          </div>
                        )}
                      </button>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => openDetail(ad.id)}
                            className="text-sm font-medium text-dark truncate text-start hover:text-brand-green transition-colors"
                          >
                            {ad.title}
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isActionLoading ? (
                              <Loader2 size={14} className="animate-spin text-brand-green" />
                            ) : (
                              <>
                                <Link
                                  href={`/ad/${ad.id}`}
                                  target="_blank"
                                  className="p-1 text-gray-text hover:text-brand-green transition-colors"
                                  title="فتح الإعلان"
                                >
                                  <ExternalLink size={14} />
                                </Link>
                                <div className="relative">
                                  <button
                                    onClick={() => setActionMenuId(actionMenuId === ad.id ? null : ad.id)}
                                    className="p-1 text-gray-text hover:text-dark transition-colors"
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                  {actionMenuId === ad.id && (
                                    <ActionMenu
                                      ad={ad}
                                      onAction={(action) => performAction(ad.id, action)}
                                      onClose={() => setActionMenuId(null)}
                                    />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.color}`}>
                            {st.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-text">
                            {stl.icon} {stl.label}
                          </span>
                          {catConfig && (
                            <span className="text-[10px] text-gray-text">
                              {catConfig.icon} {catConfig.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-text">
                          {ad.price != null && (
                            <span className="font-semibold text-dark">{formatPrice(ad.price)}</span>
                          )}
                          <span className="flex items-center gap-0.5"><Eye size={10} /> {ad.viewsCount}</span>
                          <span className="flex items-center gap-0.5"><Heart size={10} /> {ad.favoritesCount}</span>
                          {ad.governorate && (
                            <span className="flex items-center gap-0.5"><MapPin size={10} /> {ad.governorate}</span>
                          )}
                          <span className="flex items-center gap-0.5"><Calendar size={10} /> {formatDate(ad.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-text">
            صفحة {page} من {totalPages} — عرض {(page - 1) * limit + 1}-{Math.min(page * limit, total)} من {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Ad Detail Drawer */}
      {(detailAd || isLoadingDetail) && (
        <AdDetailDrawer
          ad={detailAd}
          isLoading={isLoadingDetail}
          onClose={() => setDetailAd(null)}
          onAction={(action) => {
            if (detailAd) {
              performAction(detailAd.id, action);
              setDetailAd(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ── Action Menu Component ──────────────────────────────────

function ActionMenu({
  ad,
  onAction,
  onClose,
}: {
  ad: AdminAd;
  onAction: (action: AdAction) => void;
  onClose: () => void;
}) {
  const actions: { action: AdAction; label: string; icon: React.ReactNode; color: string; show: boolean }[] = [
    {
      action: "activate",
      label: "تنشيط",
      icon: <CheckCircle2 size={14} />,
      color: "text-green-600",
      show: ad.status !== "active",
    },
    {
      action: "deactivate",
      label: "إيقاف",
      icon: <XCircle size={14} />,
      color: "text-gray-600",
      show: ad.status === "active",
    },
    {
      action: "feature",
      label: "تمييز ⭐",
      icon: <Star size={14} />,
      color: "text-amber-600",
      show: true,
    },
    {
      action: "mark_sold",
      label: "تحديد كمباع",
      icon: <Check size={14} />,
      color: "text-blue-600",
      show: ad.status === "active",
    },
    {
      action: "delete",
      label: "حذف",
      icon: <Trash2 size={14} />,
      color: "text-red-600",
      show: ad.status !== "deleted",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg min-w-[160px] overflow-hidden">
        {actions
          .filter((a) => a.show)
          .map((a) => (
            <button
              key={a.action}
              onClick={() => onAction(a.action)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors ${a.color}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
      </div>
    </>
  );
}

// ── Ad Detail Drawer ───────────────────────────────────────

function AdDetailDrawer({
  ad,
  isLoading,
  onClose,
  onAction,
}: {
  ad: AdminAdDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onAction: (action: AdAction) => void;
}) {
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 start-0 w-full max-w-lg bg-white z-50 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark">تفاصيل الإعلان</h3>
          <button onClick={onClose} className="p-2 text-gray-text hover:text-dark rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {isLoading || !ad ? (
          <div className="p-8 text-center">
            <Loader2 size={24} className="animate-spin text-brand-green mx-auto" />
            <p className="text-sm text-gray-text mt-2">جاري التحميل...</p>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Images */}
            {ad.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ad.images.map((img, i) => (
                  <div key={i} className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <Image src={img} alt="" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                  </div>
                ))}
              </div>
            )}
            {ad.images.length === 0 && (
              <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center">
                <ImageIcon size={24} className="text-gray-300" />
              </div>
            )}

            {/* Title & Status */}
            <div>
              <h4 className="text-base font-bold text-dark">{ad.title}</h4>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-lg border ${(statusLabels[ad.status] || statusLabels.active).color}`}>
                  {(statusLabels[ad.status] || statusLabels.active).label}
                </span>
                <span className="text-xs px-2 py-1 rounded-lg bg-gray-50 text-gray-text">
                  {(saleTypeLabels[ad.saleType] || saleTypeLabels.cash).icon}{" "}
                  {(saleTypeLabels[ad.saleType] || saleTypeLabels.cash).label}
                </span>
                {ad.isFeatured && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600">⭐ مميز</span>
                )}
                {(() => {
                  const cat = getCategoryById(ad.categoryId);
                  return cat ? (
                    <span className="text-xs text-gray-text">{cat.icon} {cat.name}</span>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Price */}
            {ad.price != null && (
              <div className="bg-brand-green-light/20 rounded-xl p-3">
                <p className="text-lg font-bold text-brand-green-dark">{formatPrice(ad.price)}</p>
                {ad.isNegotiable && <p className="text-xs text-brand-green">قابل للتفاوض</p>}
              </div>
            )}

            {/* Auction info */}
            {ad.saleType === "auction" && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <Gavel size={16} />
                  معلومات المزاد
                </div>
                {ad.auctionStartPrice != null && (
                  <p className="text-xs text-amber-700">سعر الافتتاح: {formatPrice(ad.auctionStartPrice)}</p>
                )}
                {ad.auctionBuyNowPrice != null && (
                  <p className="text-xs text-amber-700">اشتري الآن: {formatPrice(ad.auctionBuyNowPrice)}</p>
                )}
                {ad.highestBid != null && (
                  <p className="text-xs text-amber-700 font-bold">أعلى مزايدة: {formatPrice(ad.highestBid)}</p>
                )}
                <p className="text-xs text-amber-700">عدد المزايدات: {ad.bidsCount}</p>
                {ad.auctionEndsAt && (
                  <p className="text-xs text-amber-700">ينتهي: {formatFullDate(ad.auctionEndsAt)}</p>
                )}
                {ad.auctionStatus && (
                  <p className="text-xs text-amber-700">حالة المزاد: {ad.auctionStatus}</p>
                )}
              </div>
            )}

            {/* Description */}
            {ad.description && (
              <div>
                <h5 className="text-xs font-semibold text-gray-text mb-1">الوصف</h5>
                <p className="text-sm text-dark leading-relaxed whitespace-pre-line">{ad.description}</p>
              </div>
            )}

            {/* Category Fields */}
            {Object.keys(ad.categoryFields).length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-text mb-2">المواصفات</h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ad.categoryFields)
                    .filter(([, v]) => v != null && v !== "" && v !== false)
                    .map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-text">{key}</p>
                        <p className="text-xs font-medium text-dark">{String(value)}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Eye size={16} className="mx-auto text-gray-400 mb-1" />
                <p className="text-lg font-bold text-dark">{ad.viewsCount}</p>
                <p className="text-[10px] text-gray-text">مشاهدة</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Heart size={16} className="mx-auto text-gray-400 mb-1" />
                <p className="text-lg font-bold text-dark">{ad.favoritesCount}</p>
                <p className="text-[10px] text-gray-text">مفضلة</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <ImageIcon size={16} className="mx-auto text-gray-400 mb-1" />
                <p className="text-lg font-bold text-dark">{ad.images.length}</p>
                <p className="text-[10px] text-gray-text">صورة</p>
              </div>
            </div>

            {/* Location */}
            {(ad.governorate || ad.city) && (
              <div className="flex items-center gap-2 text-sm text-gray-text">
                <MapPin size={14} />
                <span>{[ad.governorate, ad.city].filter(Boolean).join(" — ")}</span>
              </div>
            )}

            {/* Seller */}
            <div className="bg-gray-50 rounded-xl p-3">
              <h5 className="text-xs font-semibold text-gray-text mb-2">البائع</h5>
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-dark">{ad.userName || "بدون اسم"}</p>
                  {ad.userPhone && (
                    <p className="text-xs text-gray-text font-mono" dir="ltr">
                      <Phone size={10} className="inline me-1" />
                      {ad.userPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-1 text-xs text-gray-text">
              <div className="flex items-center gap-2">
                <Clock size={12} />
                <span>نُشر: {formatFullDate(ad.createdAt)}</span>
              </div>
              {ad.updatedAt !== ad.createdAt && (
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>آخر تعديل: {formatFullDate(ad.updatedAt)}</span>
                </div>
              )}
              {ad.expiresAt && (
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>ينتهي: {formatFullDate(ad.expiresAt)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h5 className="text-xs font-semibold text-gray-text mb-2">إجراءات سريعة</h5>
              <div className="flex flex-wrap gap-2">
                {ad.status !== "active" && (
                  <button
                    onClick={() => onAction("activate")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 font-medium transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    تنشيط
                  </button>
                )}
                {ad.status === "active" && (
                  <button
                    onClick={() => onAction("deactivate")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-gray-500 text-white hover:bg-gray-600 font-medium transition-colors"
                  >
                    <XCircle size={14} />
                    إيقاف
                  </button>
                )}
                <button
                  onClick={() => onAction(ad.isFeatured ? "unfeature" : "feature")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium transition-colors"
                >
                  <Star size={14} />
                  {ad.isFeatured ? "إلغاء التمييز" : "تمييز"}
                </button>
                {ad.status === "active" && (
                  <button
                    onClick={() => onAction("mark_sold")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors"
                  >
                    <Check size={14} />
                    مباع
                  </button>
                )}
                {ad.status !== "deleted" && (
                  <button
                    onClick={() => onAction("delete")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium transition-colors"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                )}
                <Link
                  href={`/ad/${ad.id}`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-brand-green text-white hover:bg-brand-green-dark font-medium transition-colors"
                >
                  <ExternalLink size={14} />
                  فتح الإعلان
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
