"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Plus,
  Clock,
  Trash2,
  Check,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import {
  getStoreByUserId,
  getStoreProductsForDashboard,
} from "@/lib/stores/store-service";
import { formatPrice } from "@/lib/utils/format";
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
  const [promoType, setPromoType] =
    useState<StorePromotion["promo_type"]>("discount");
  const [discountPercent, setDiscountPercent] = useState("");
  const [endDate, setEndDate] = useState("");
  const [storeProducts, setStoreProducts] = useState<
    { id: string; title: string; price: number | null }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

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

      const [products] = await Promise.all([
        getStoreProductsForDashboard(s.id),
      ]);

      // Fetch ALL promotions (active + inactive)
      const { data: promos } = await supabase
        .from("store_promotions" as never)
        .select("*")
        .eq("store_id", s.id)
        .order("created_at", { ascending: false });

      setPromotions((promos || []) as unknown as StorePromotion[]);
      setStoreProducts(
        products.map((p) => ({ id: p.id, title: p.title, price: p.price })),
      );
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  const validateForm = (): boolean => {
    setFormError("");

    if (!adId) {
      setFormError("اختار المنتج الأول");
      return false;
    }

    if (promoType === "discount" || promoType === "timed") {
      const discount = parseInt(discountPercent);
      if (!discountPercent || isNaN(discount)) {
        setFormError("ادخل نسبة الخصم");
        return false;
      }
      if (discount < 1 || discount > 90) {
        setFormError("نسبة الخصم لازم تكون بين 1% و 90%");
        return false;
      }
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (endDateObj < today) {
        setFormError("تاريخ الانتهاء لازم يكون في المستقبل");
        return false;
      }
    }

    // Check if product already has an active promo
    const existingPromo = promotions.find(
      (p) => p.ad_id === adId && p.is_active,
    );
    if (existingPromo) {
      setFormError("المنتج ده عليه عرض نشط بالفعل");
      return false;
    }

    return true;
  };

  const handleCreatePromo = async () => {
    if (!store) return;
    if (!validateForm()) return;

    setIsSaving(true);

    const selectedProduct = storeProducts.find((p) => p.id === adId);
    const originalPrice = selectedProduct?.price || 0;
    const discount = parseInt(discountPercent) || 0;
    const salePrice =
      promoType === "discount" || promoType === "timed"
        ? Math.round(originalPrice * (1 - discount / 100))
        : originalPrice;

    const { error } = await supabase
      .from("store_promotions" as never)
      .insert({
        store_id: store.id,
        ad_id: adId,
        promo_type: promoType,
        discount_percent:
          promoType === "discount" || promoType === "timed" ? discount : null,
        original_price: originalPrice || null,
        sale_price:
          promoType === "discount" || promoType === "timed"
            ? salePrice
            : originalPrice || null,
        end_at: endDate || null,
        is_active: true,
      } as never);

    if (error) {
      setFormError("حصل مشكلة في إنشاء العرض. جرب تاني");
      setIsSaving(false);
      return;
    }

    // Reload all promotions
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
    setFormError("");
    setIsSaving(false);
    setSuccessMessage("تم إنشاء العرض بنجاح!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleTogglePromo = async (promoId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("store_promotions" as never)
      .update({ is_active: !currentActive } as never)
      .eq("id", promoId);

    if (!error) {
      setPromotions((prev) =>
        prev.map((p) =>
          p.id === promoId ? { ...p, is_active: !currentActive } : p,
        ),
      );
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    await supabase
      .from("store_promotions" as never)
      .delete()
      .eq("id", promoId);
    setPromotions((prev) => prev.filter((p) => p.id !== promoId));
    setConfirmDeleteId(null);
  };

  const getProductTitle = (promoAdId: string): string => {
    const product = storeProducts.find((p) => p.id === promoAdId);
    return product?.title || "منتج محذوف";
  };

  const promoTypeLabels: Record<string, string> = {
    discount: "🏷️ خصم",
    bundle: "📦 عرض مجمع",
    free_shipping: "🚚 شحن مجاني",
    timed: "⏰ عرض محدود",
  };

  // Filter promotions
  const filteredPromotions = promotions.filter((p) => {
    if (filter === "active") return p.is_active;
    if (filter === "inactive") return !p.is_active;
    return true;
  });

  // Check if promo is expired
  const isExpired = (promo: StorePromotion): boolean => {
    if (!promo.end_at) return false;
    return new Date(promo.end_at) < new Date();
  };

  // Get today's date as minimum for date input
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/store/dashboard")}
            className="p-1"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-bold text-dark">العروض والخصومات</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormError("");
          }}
          className="flex items-center gap-1 bg-brand-green text-white text-xs font-bold px-3 py-2 rounded-xl"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "إلغاء" : "عرض جديد"}
        </button>
      </header>

      {/* Success message */}
      {successMessage && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-semibold">
          <Check size={14} />
          {successMessage}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark">إنشاء عرض جديد</h3>

          {formError && (
            <div className="bg-error/10 border border-error/20 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-error font-semibold">
              <AlertTriangle size={12} />
              {formError}
            </div>
          )}

          {/* Product selection */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              المنتج <span className="text-error">*</span>
            </label>
            <select
              value={adId}
              onChange={(e) => {
                setAdId(e.target.value);
                setFormError("");
              }}
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">اختار المنتج</option>
              {storeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.price ? `— ${formatPrice(p.price)}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Promo type */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              نوع العرض
            </label>
            <select
              value={promoType}
              onChange={(e) =>
                setPromoType(e.target.value as StorePromotion["promo_type"])
              }
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="discount">🏷️ خصم</option>
              <option value="bundle">📦 عرض مجمع</option>
              <option value="free_shipping">🚚 شحن مجاني</option>
              <option value="timed">⏰ عرض محدود</option>
            </select>
          </div>

          {/* Discount percent (for discount and timed types) */}
          {(promoType === "discount" || promoType === "timed") && (
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">
                نسبة الخصم <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="مثال: 20"
                  value={discountPercent}
                  onChange={(e) => {
                    setDiscountPercent(e.target.value);
                    setFormError("");
                  }}
                  className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
                  min="1"
                  max="90"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-text">
                  %
                </span>
              </div>
              {/* Preview sale price */}
              {adId && discountPercent && parseInt(discountPercent) > 0 && parseInt(discountPercent) <= 90 && (
                <div className="mt-1.5 text-xs text-gray-text">
                  {(() => {
                    const product = storeProducts.find((p) => p.id === adId);
                    if (!product?.price) return null;
                    const salePrice = Math.round(
                      product.price * (1 - parseInt(discountPercent) / 100),
                    );
                    return (
                      <span>
                        السعر بعد الخصم:{" "}
                        <span className="font-bold text-brand-green">
                          {formatPrice(salePrice)}
                        </span>
                        {" "}
                        <span className="line-through text-gray-text/60">
                          {formatPrice(product.price)}
                        </span>
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* End date */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              تاريخ الانتهاء (اختياري)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
              min={todayStr}
            />
            <p className="text-[10px] text-gray-text mt-0.5">
              اتركه فاضي لو العرض مفتوح بدون نهاية
            </p>
          </div>

          <div className="flex gap-2 pt-1">
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
              onClick={() => {
                setShowForm(false);
                setFormError("");
              }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {!isLoading && promotions.length > 0 && (
        <div className="px-4 mt-3 flex gap-2">
          {(
            [
              { key: "all", label: `الكل (${promotions.length})` },
              {
                key: "active",
                label: `نشط (${promotions.filter((p) => p.is_active).length})`,
              },
              {
                key: "inactive",
                label: `موقف (${promotions.filter((p) => !p.is_active).length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                filter === tab.key
                  ? "bg-brand-green text-white"
                  : "bg-gray-100 text-gray-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Promotions list */}
      <div className="px-4 mt-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : filteredPromotions.length > 0 ? (
          filteredPromotions.map((promo) => (
            <div
              key={promo.id}
              className={`bg-white rounded-xl border p-3 ${
                !promo.is_active || isExpired(promo)
                  ? "border-gray-200 opacity-70"
                  : "border-gray-light"
              }`}
            >
              {/* Top row: type + status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-dark">
                    {promoTypeLabels[promo.promo_type]}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isExpired(promo)
                        ? "bg-error/10 text-error"
                        : promo.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isExpired(promo) ? "منتهي" : promo.is_active ? "نشط" : "موقف"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Toggle active/inactive */}
                  <button
                    onClick={() => handleTogglePromo(promo.id, promo.is_active)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      promo.is_active
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-50"
                    }`}
                    title={promo.is_active ? "إيقاف العرض" : "تفعيل العرض"}
                  >
                    {promo.is_active ? (
                      <ToggleRight size={20} />
                    ) : (
                      <ToggleLeft size={20} />
                    )}
                  </button>

                  {/* Delete with confirmation */}
                  {confirmDeleteId === promo.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeletePromo(promo.id)}
                        className="text-[10px] text-white bg-error px-2 py-1 rounded-lg font-bold"
                      >
                        تأكيد الحذف
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] text-gray-text px-1"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(promo.id)}
                      className="p-1.5 text-gray-400 hover:text-error hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Product name */}
              <p className="text-xs font-semibold text-dark mb-1 line-clamp-1">
                {getProductTitle(promo.ad_id)}
              </p>

              {/* Discount info */}
              {promo.discount_percent != null && promo.discount_percent > 0 && (
                <p className="text-xs text-error font-semibold">
                  خصم {promo.discount_percent}%
                </p>
              )}

              {/* Price comparison */}
              {promo.sale_price != null && promo.original_price != null && promo.sale_price !== promo.original_price && (
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

              {/* End date */}
              {promo.end_at && (
                <p className="text-[10px] text-gray-text flex items-center gap-1 mt-1">
                  <Clock size={10} />
                  {isExpired(promo) ? "انتهى في" : "ينتهي في"}:{" "}
                  {new Date(promo.end_at).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
              {!promo.end_at && (
                <p className="text-[10px] text-gray-text mt-1">مفتوح بدون نهاية</p>
              )}
            </div>
          ))
        ) : promotions.length > 0 && filteredPromotions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-text">مفيش عروض بالتصفية دي</p>
          </div>
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
