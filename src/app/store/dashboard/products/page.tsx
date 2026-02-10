"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { getStoreByUserId, getStoreProductsForDashboard } from "@/lib/stores/store-service";
import { supabase } from "@/lib/supabase/client";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import type { Store } from "@/types";

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

  const handleTogglePin = async (productId: string, currentlyPinned: boolean) => {
    await supabase
      .from("ads" as never)
      .update({ is_pinned: !currentlyPinned } as never)
      .eq("id", productId);

    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, is_pinned: !currentlyPinned } : p,
      ),
    );
    setActiveMenu(null);
  };

  const handleDelete = async (productId: string) => {
    await supabase
      .from("ads" as never)
      .update({ status: "deleted" } as never)
      .eq("id", productId);

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setActiveMenu(null);
  };

  const saleTypeLabel: Record<string, string> = {
    cash: "💵 نقدي",
    auction: "🔨 مزاد",
    exchange: "🔄 تبديل",
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    active: { label: "نشط", color: "bg-green-50 text-green-700" },
    sold: { label: "مباع", color: "bg-blue-50 text-blue-700" },
    expired: { label: "منتهي", color: "bg-gray-100 text-gray-500" },
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/store/dashboard")} className="p-1">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-base font-bold text-dark">المنتجات</h1>
        </div>
        <Link
          href="/ad/create"
          className="flex items-center gap-1 bg-brand-green text-white text-xs font-bold px-3 py-2 rounded-xl"
        >
          <Plus size={14} />
          إضافة
        </Link>
      </header>

      {/* Products list */}
      <div className="px-4 mt-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : products.length > 0 ? (
          products.map((product) => {
            const status = statusLabel[product.status] || statusLabel.active;
            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-light p-3 flex gap-3 relative"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📷
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-dark line-clamp-1">
                      {product.is_pinned && (
                        <Pin
                          size={11}
                          className="inline text-brand-gold ml-1"
                        />
                      )}
                      {product.title}
                    </h3>
                    <button
                      onClick={() =>
                        setActiveMenu(
                          activeMenu === product.id ? null : product.id,
                        )
                      }
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
                    <span>👁 {product.views_count}</span>
                    <span>{formatTimeAgo(product.created_at)}</span>
                  </div>
                </div>

                {/* Dropdown menu */}
                {activeMenu === product.id && (
                  <div className="absolute top-10 left-3 bg-white border border-gray-light rounded-xl shadow-lg z-10 overflow-hidden">
                    <Link
                      href={`/ad/${product.id}/edit`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50"
                    >
                      <Edit size={14} />
                      تعديل
                    </Link>
                    <button
                      onClick={() =>
                        handleTogglePin(product.id, product.is_pinned)
                      }
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50 w-full"
                    >
                      <Pin size={14} />
                      {product.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
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
    </div>
  );
}
