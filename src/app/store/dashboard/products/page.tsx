"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  Package,
  Pin,
  MoreVertical,
  Trash2,
  Edit,
  CheckCircle,
  RotateCcw,
  Eye,
  X,
  Zap,
  Copy,
  FileSpreadsheet,
  Camera,
  Loader2,
  Rocket,
} from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth-store";
import { getStoreByUserId, getStoreProductsForDashboard } from "@/lib/stores/store-service";
import { getSessionToken } from "@/lib/supabase/auth";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import type { Store } from "@/types";

type StatusFilter = "all" | "active" | "sold" | "expired";

interface Product {
  id: string;
  title: string;
  price: number | null;
  images: string[];
  status: string;
  sale_type: string;
  is_pinned: boolean;
  views_count: number;
  created_at: string;
}

export default function DashboardProductsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    async function load() {
      setIsLoading(true);
      const s = await getStoreByUserId(user!.id);

      if (!s) {
        setIsLoading(false);
        return;
      }
      setStore(s);

      const prods = await getStoreProductsForDashboard(s.id);
      setProducts(prods as unknown as Product[]);
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!activeMenu) return;
    const handleClick = () => setActiveMenu(null);
    const timer = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [activeMenu]);

  const callUpdateApi = useCallback(async (adId: string, action: string) => {
    if (!user) return false;
    try {
      const res = await fetch("/api/ads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, session_token: getSessionToken(), ad_id: adId, action }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [user]);

  const handleTogglePin = useCallback(async (productId: string, currentlyPinned: boolean) => {
    const action = currentlyPinned ? "unpin" : "pin";
    const ok = await callUpdateApi(productId, action);
    if (ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, is_pinned: !currentlyPinned } : p,
        ),
      );
    }
    setActiveMenu(null);
  }, [callUpdateApi]);

  const handleMarkSold = useCallback(async (productId: string) => {
    const ok = await callUpdateApi(productId, "mark_sold");
    if (ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: "sold" } : p,
        ),
      );
    }
    setActiveMenu(null);
  }, [callUpdateApi]);

  const handleReactivate = useCallback(async (productId: string) => {
    const ok = await callUpdateApi(productId, "reactivate");
    if (ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: "active" } : p,
        ),
      );
    }
    setActiveMenu(null);
  }, [callUpdateApi]);

  const handleDelete = useCallback(async (productId: string) => {
    const ok = await callUpdateApi(productId, "delete");
    if (ok) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
    setActiveMenu(null);
    setDeleteConfirm(null);
  }, [callUpdateApi]);

  const [duplicating, setDuplicating] = useState<string | null>(null);

  const handleDuplicate = useCallback(async (productId: string) => {
    if (!user) return;
    setDuplicating(productId);
    setActiveMenu(null);
    try {
      const res = await fetch("/api/ads/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, session_token: getSessionToken(), ad_id: productId }),
      });
      const result = await res.json();
      if (res.ok && result.ad) {
        // Add the duplicate to the list
        const original = products.find(p => p.id === productId);
        if (original) {
          setProducts(prev => [{
            ...original,
            id: result.ad.id,
            title: result.ad.title,
            status: "active",
            views_count: 0,
            created_at: new Date().toISOString(),
          }, ...prev]);
        }
      }
    } catch {
      // Silent fail
    }
    setDuplicating(null);
  }, [user, products]);

  const saleTypeLabel: Record<string, string> = {
    cash: "💰 للبيع",
    auction: "🔥 مزاد",
    exchange: "🔄 للتبديل",
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    active: { label: "شغال", color: "bg-green-50 text-green-700" },
    sold: { label: "اتباع", color: "bg-blue-50 text-blue-700" },
    expired: { label: "خلص", color: "bg-gray-100 text-gray-500" },
  };

  const filteredProducts = statusFilter === "all"
    ? products
    : products.filter((p) => p.status === statusFilter);

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === "active").length,
    sold: products.filter((p) => p.status === "sold").length,
    expired: products.filter((p) => p.status === "expired").length,
  };

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: `الكل (${counts.all})` },
    { key: "active", label: `نشط (${counts.active})` },
    { key: "sold", label: `مباع (${counts.sold})` },
    { key: "expired", label: `منتهي (${counts.expired})` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/store/dashboard")} className="p-1">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-bold text-dark">المنتجات</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/store/dashboard/products/rapid-entry"
            className="flex items-center gap-1 bg-brand-green text-white text-xs font-bold px-2.5 py-2 rounded-xl"
          >
            <Rocket size={13} />
            إدخال سريع
          </Link>
          <Link
            href="/store/dashboard/products/bulk-photos"
            className="flex items-center gap-1 bg-white text-brand-green text-xs font-bold px-2 py-2 rounded-xl border border-brand-green"
            title="رفع صور بالجملة"
          >
            <Camera size={13} />
          </Link>
          <Link
            href="/store/dashboard/products/bulk-import"
            className="flex items-center gap-1 bg-white text-brand-green text-xs font-bold px-2 py-2 rounded-xl border border-brand-green"
            title="استيراد من Excel"
          >
            <FileSpreadsheet size={13} />
          </Link>
          <Link
            href="/ad/create"
            className="flex items-center gap-1 bg-white text-brand-green text-xs font-bold px-2 py-2 rounded-xl border border-brand-green"
          >
            <Plus size={13} />
          </Link>
        </div>
      </header>

      {/* Status filter tabs */}
      {!isLoading && products.length > 0 && (
        <div className="px-4 mt-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  statusFilter === tab.key
                    ? "bg-brand-green text-white"
                    : "bg-white text-gray-text border border-gray-light"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products list */}
      <div className="px-4 mt-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const status = statusLabel[product.status] || statusLabel.active;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border border-gray-light p-3 flex gap-3 relative ${
                  product.status === "sold" ? "opacity-75" : ""
                }`}
              >
                {/* Image */}
                <Link href={`/ad/${product.id}`} className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt=""
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📷
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <Link href={`/ad/${product.id}`} className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-dark line-clamp-1">
                        {product.is_pinned && (
                          <Pin
                            size={11}
                            className="inline text-brand-gold ms-1"
                          />
                        )}
                        {product.title}
                      </h3>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(
                          activeMenu === product.id ? null : product.id,
                        );
                      }}
                      className="p-1 text-gray-text"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {product.price != null && (
                      <span className="text-xs font-bold text-brand-green">
                        {formatPrice(product.price)}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${status.color}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-[10px] text-gray-text">
                      {saleTypeLabel[product.sale_type] || ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-text">
                    <span className="flex items-center gap-0.5">
                      <Eye size={10} />
                      {product.views_count}
                    </span>
                    <span>{formatTimeAgo(product.created_at)}</span>
                  </div>
                </div>

                {/* Dropdown menu */}
                {activeMenu === product.id && (
                  <div className="absolute top-10 start-3 bg-white border border-gray-light rounded-xl shadow-lg z-10 overflow-hidden min-w-[160px]">
                    <Link
                      href={`/ad/${product.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50"
                    >
                      <Eye size={14} />
                      عرض
                    </Link>
                    <Link
                      href={`/ad/${product.id}/edit`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50"
                    >
                      <Edit size={14} />
                      تعديل
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(product.id);
                      }}
                      disabled={duplicating === product.id}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-green hover:bg-green-50 w-full disabled:opacity-50"
                    >
                      {duplicating === product.id ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                      نسخ المنتج
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(product.id, product.is_pinned);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50 w-full"
                    >
                      <Pin size={14} />
                      {product.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                    </button>

                    {product.status === "active" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSold(product.id);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 w-full"
                      >
                        <CheckCircle size={14} />
                        تم البيع
                      </button>
                    )}

                    {(product.status === "sold" || product.status === "expired") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactivate(product.id);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-green hover:bg-green-50 w-full"
                      >
                        <RotateCcw size={14} />
                        إعادة النشر
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(product.id);
                        setActiveMenu(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-red-50 w-full"
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : products.length > 0 ? (
          /* Has products but none match filter */
          <div className="text-center py-8">
            <Package size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-text">
              مفيش منتجات {statusFilter === "active" ? "نشطة" : statusFilter === "sold" ? "مباعة" : "منتهية"}
            </p>
          </div>
        ) : (
          <EmptyState
            icon="📦"
            title="مفيش منتجات لسه"
            description="ابدأ بإضافة أول منتج في متجرك"
            actionLabel="أضف منتج"
            actionHref="/ad/create"
          />
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-dark">تأكيد الحذف</h3>
              <button onClick={() => setDeleteConfirm(null)} className="p-1 text-gray-text">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-text">
              متأكد إنك عايز تحذف المنتج ده؟ المنتج هيختفي من المتجر لكن ممكن تتواصل مع الدعم لاسترجاعه.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-light text-sm font-semibold text-dark hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-error text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
