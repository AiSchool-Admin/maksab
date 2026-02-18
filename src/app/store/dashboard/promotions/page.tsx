"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Tag, Clock, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import { getStoreByUserId, getStorePromotions, getStoreProductsForDashboard } from "@/lib/stores/store-service";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import type { Store, StorePromotion } from "@/types";

export default function DashboardPromotionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [adId, setAdId] = useState("");
  const [promoType, setPromoType] = useState<StorePromotion["promo_type"]>("discount");
  const [discountPercent, setDiscountPercent] = useState("");
  const [endDate, setEndDate] = useState("");
  const [storeProducts, setStoreProducts] = useState<
    { id: string; title: string; price: number | null }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);

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

      const [promos, products] = await Promise.all([
        getStorePromotions(s.id),
        getStoreProductsForDashboard(s.id),
      ]);

      setPromotions(promos);
      setStoreProducts(
        products.map((p) => ({ id: p.id, title: p.title, price: p.price })),
      );
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  const handleCreatePromo = async () => {
    if (!store || !adId) return;
    setIsSaving(true);

    const selectedProduct = storeProducts.find((p) => p.id === adId);
    const originalPrice = selectedProduct?.price || 0;
    const discount = parseInt(discountPercent) || 0;
    const salePrice = originalPrice * (1 - discount / 100);

    await supabase.from("store_promotions" as never).insert({
      store_id: store.id,
      ad_id: adId,
      promo_type: promoType,
      discount_percent: discount || null,
      original_price: originalPrice || null,
      sale_price: salePrice || null,
      end_at: endDate || null,
      is_active: true,
    } as never);

    // Reload
    const { data: promos } = await supabase
      .from("store_promotions" as never)
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    setPromotions((promos || []) as unknown as StorePromotion[]);
    setShowForm(false);
    setAdId("");
    setDiscountPercent("");
    setEndDate("");
    setIsSaving(false);
  };

  const handleDeletePromo = async (promoId: string) => {
    await supabase
      .from("store_promotions" as never)
      .delete()
      .eq("id", promoId);
    setPromotions((prev) => prev.filter((p) => p.id !== promoId));
  };

  const promoTypeLabels: Record<string, string> = {
    discount: "🏷️ خصم",
    bundle: "📦 عرض مجمع",
    free_shipping: "🚚 شحن مجاني",
    timed: "⏰ عرض محدود",
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/store/dashboard")} className="p-1">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-bold text-dark">العروض والخصومات</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-brand-green text-white text-xs font-bold px-3 py-2 rounded-xl"
        >
          <Plus size={14} />
          عرض جديد
        </button>
      </header>

      {/* Create form */}
      {showForm && (
        <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark">إنشاء عرض جديد</h3>

          <select
            value={adId}
            onChange={(e) => setAdId(e.target.value)}
            className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-sm"
          >
            <option value="">اختار المنتج</option>
            {storeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.price ? `— ${formatPrice(p.price)}` : ""}
              </option>
            ))}
          </select>

          <select
            value={promoType}
            onChange={(e) =>
              setPromoType(e.target.value as StorePromotion["promo_type"])
            }
            className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-sm"
          >
            <option value="discount">🏷️ خصم</option>
            <option value="bundle">📦 عرض مجمع</option>
            <option value="free_shipping">🚚 شحن مجاني</option>
            <option value="timed">⏰ عرض محدود</option>
          </select>

          {promoType === "discount" && (
            <div className="relative">
              <input
                type="number"
                placeholder="نسبة الخصم"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-sm"
                min="1"
                max="90"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-text">
                %
              </span>
            </div>
          )}

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-sm"
            placeholder="تاريخ الانتهاء (اختياري)"
          />

          <div className="flex gap-2">
            <Button
              onClick={handleCreatePromo}
              isLoading={isSaving}
              disabled={!adId}
              fullWidth
            >
              إنشاء العرض
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* Promotions list */}
      <div className="px-4 mt-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : promotions.length > 0 ? (
          promotions.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-xl border border-gray-light p-3 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-dark">
                    {promoTypeLabels[promo.promo_type]}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      promo.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {promo.is_active ? "نشط" : "منتهي"}
                  </span>
                </div>
                {promo.discount_percent && (
                  <p className="text-xs text-error font-semibold">
                    خصم {promo.discount_percent}%
                  </p>
                )}
                {promo.sale_price != null && promo.original_price != null && (
                  <p className="text-xs text-gray-text">
                    <span className="line-through">
                      {formatPrice(promo.original_price)}
                    </span>{" "}
                    →{" "}
                    <span className="text-brand-green font-bold">
                      {formatPrice(promo.sale_price)}
                    </span>
                  </p>
                )}
                {promo.end_at && (
                  <p className="text-[10px] text-gray-text flex items-center gap-1 mt-1">
                    <Clock size={10} />
                    ينتهي:{" "}
                    {new Date(promo.end_at).toLocaleDateString("ar-EG")}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDeletePromo(promo.id)}
                className="p-2 text-error hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <EmptyState
            icon="🏷️"
            title="مفيش عروض لسه"
            description="أنشئ عروض وخصومات لجذب مشترين أكتر"
          />
        )}
      </div>
    </div>
  );
}
