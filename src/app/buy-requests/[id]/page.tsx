"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ShoppingCart,
  MessageCircle,
  Send,
  Check,
  X,
  Sparkles,
  Clock,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import MatchResults from "@/components/buy/MatchResults";
import { useAuth } from "@/components/auth/AuthProvider";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { formatTimeAgo, formatPrice } from "@/lib/utils/format";
import {
  type BuyRequest,
  getPurchaseTypeLabel,
} from "@/lib/buy-requests/buy-request-service";
import {
  submitBuyRequestOffer,
  getOffersForRequest,
  respondToOffer,
  getOfferTypeLabel,
  getOfferStatusLabel,
  type BuyRequestOffer,
  type OfferType,
} from "@/lib/buy-requests/buy-request-offers-service";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function BuyRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const requestId = params.id as string;

  const [request, setRequest] = useState<BuyRequest | null>(null);
  const [offers, setOffers] = useState<BuyRequestOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Offer form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerType, setOfferType] = useState<OfferType>("cash");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    // Fetch buy request
    const { data, error } = await supabase
      .from("buy_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (error || !data) {
      setIsLoading(false);
      return;
    }

    const row = data as Record<string, unknown>;
    setRequest({
      id: row.id as string,
      userId: row.user_id as string,
      categoryId: row.category_id as string,
      subcategoryId: (row.subcategory_id as string) || undefined,
      title: row.title as string,
      description: (row.description as string) || undefined,
      purchaseType: (row.purchase_type as BuyRequest["purchaseType"]) || "cash",
      budgetMin: row.budget_min ? Number(row.budget_min) : undefined,
      budgetMax: row.budget_max ? Number(row.budget_max) : undefined,
      exchangeOffer: (row.exchange_offer as string) || undefined,
      exchangeCategoryId: (row.exchange_category_id as string) || undefined,
      exchangeDescription: (row.exchange_description as string) || undefined,
      governorate: (row.governorate as string) || undefined,
      city: (row.city as string) || undefined,
      desiredSpecs: (row.desired_specs as Record<string, unknown>) || {},
      status: (row.status as BuyRequest["status"]) || "active",
      matchesCount: row.matches_count ? Number(row.matches_count) : 0,
      createdAt: row.created_at as string,
      expiresAt: (row.expires_at as string) || "",
    });

    // Fetch offers
    const offersData = await getOffersForRequest(requestId);
    setOffers(offersData);

    setIsLoading(false);
  }, [requestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is inside async loadData callback
    loadData();
  }, [loadData]);

  const isOwner = user?.id === request?.userId;
  const category = request
    ? categoriesConfig.find((c) => c.id === request.categoryId)
    : null;
  const purchaseLabel = request ? getPurchaseTypeLabel(request.purchaseType) : null;

  const handleSubmitOffer = async () => {
    const authed = await requireAuth();
    if (!authed) return;

    if (offerType === "cash" && !offerPrice) {
      toast.error("حدد السعر");
      return;
    }

    setIsSubmitting(true);
    const result = await submitBuyRequestOffer({
      buyRequestId: requestId,
      offerType,
      price: offerPrice ? Number(offerPrice) : undefined,
      message: offerMessage.trim() || undefined,
    });

    if (result.success) {
      toast.success("تم إرسال عرضك! المشتري هيتواصل معاك");
      setShowOfferForm(false);
      setOfferPrice("");
      setOfferMessage("");
      loadData();
    } else {
      toast.error(result.error || "حصل مشكلة");
    }
    setIsSubmitting(false);
  };

  const handleRespondToOffer = async (offerId: string, action: "accepted" | "rejected") => {
    const result = await respondToOffer({ offerId, action });
    if (result.success) {
      toast.success(action === "accepted" ? "تم قبول العرض!" : "تم رفض العرض");
      loadData();
    } else {
      toast.error(result.error || "حصل مشكلة");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Header title="طلب شراء" />
        <div className="px-4 py-6 space-y-4">
          <div className="h-8 w-3/4 bg-gray-light rounded-lg animate-pulse" />
          <div className="h-20 bg-gray-light rounded-xl animate-pulse" />
          <div className="h-40 bg-gray-light rounded-xl animate-pulse" />
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-white">
        <Header title="طلب شراء" />
        <div className="text-center py-12">
          <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-dark mb-2">الطلب غير موجود</p>
          <button onClick={() => router.back()} className="text-sm text-brand-green font-bold">
            ← رجوع
          </button>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-28">
      <Header title="طلب شراء" />

      {/* Request details */}
      <div className="px-4 py-4">
        {/* Category & status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-brand-gold text-white shadow-sm">
              مطلوب شراء 🛒
            </span>
            <span className="text-2xl">{category?.icon || "📦"}</span>
            <span className="text-sm font-bold text-gray-text">{category?.name}</span>
          </div>
          {request.status === "active" ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
              نشط
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              {request.status === "fulfilled" ? "تم" : "منتهي"}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-dark mb-2">{request.title}</h1>

        {/* Description */}
        {request.description && (
          <p className="text-sm text-gray-text mb-3 leading-relaxed">{request.description}</p>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Purchase type */}
          {purchaseLabel && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-text mb-0.5">طريقة الشراء</p>
              <p className="text-sm font-bold text-dark">
                {purchaseLabel.emoji} {purchaseLabel.label}
              </p>
            </div>
          )}

          {/* Budget */}
          {(request.budgetMin || request.budgetMax) && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-text mb-0.5">الميزانية</p>
              <p className="text-sm font-bold text-brand-green">
                {request.budgetMin && request.budgetMax
                  ? `${formatPrice(request.budgetMin)} — ${formatPrice(request.budgetMax)}`
                  : request.budgetMax
                    ? `حتى ${formatPrice(request.budgetMax)}`
                    : `من ${formatPrice(request.budgetMin!)}`}
              </p>
            </div>
          )}

          {/* Exchange offer */}
          {request.exchangeOffer && (
            <div className="bg-purple-50 rounded-xl p-3 col-span-2">
              <p className="text-[10px] text-gray-text mb-0.5">عايز يبدل بـ</p>
              <p className="text-sm font-bold text-purple-700">🔄 {request.exchangeOffer}</p>
            </div>
          )}

          {/* Location */}
          {request.governorate && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-text mb-0.5">الموقع</p>
              <p className="text-sm font-bold text-dark">📍 {request.governorate}{request.city ? ` — ${request.city}` : ""}</p>
            </div>
          )}

          {/* Time */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-text mb-0.5">تاريخ النشر</p>
            <p className="text-sm font-bold text-dark flex items-center gap-1">
              <Clock size={12} />
              {formatTimeAgo(request.createdAt)}
            </p>
          </div>
        </div>

        {/* Seller Offers Section */}
        <div className="mb-6">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-dark mb-3">
            <Send size={14} />
            عروض البائعين
            {offers.filter((o) => o.status === "pending").length > 0 && (
              <span className="bg-brand-green text-white text-[9px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {offers.filter((o) => o.status === "pending").length}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {offers.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <Send size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-text">لسه مفيش عروض من بائعين</p>
                {!isOwner && (
                  <p className="text-xs text-gray-text mt-1">كن أول بائع يقدم عرض!</p>
                )}
              </div>
            ) : (
              offers.map((offer) => {
                const typeLabel = getOfferTypeLabel(offer.offerType);
                const statusLabel = getOfferStatusLabel(offer.status);

                return (
                  <div key={offer.id} className="border border-gray-200 rounded-xl p-3.5">
                    {/* Seller info + status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                          {offer.sellerAvatar ? (
                            <Image src={offer.sellerAvatar} alt="" width={32} height={32} className="w-full h-full rounded-full object-cover" unoptimized />
                          ) : (
                            "👤"
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-dark">{offer.sellerName}</p>
                          <p className="text-[10px] text-gray-text">{formatTimeAgo(offer.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${typeLabel.color}`}>
                          {typeLabel.emoji} {typeLabel.label}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusLabel.color}`}>
                          {statusLabel.label}
                        </span>
                      </div>
                    </div>

                    {/* Offer details */}
                    {offer.price && (
                      <div className="bg-green-50 rounded-lg px-3 py-2 mb-2">
                        <p className="text-base font-bold text-brand-green">
                          💵 {formatPrice(offer.price)}
                        </p>
                      </div>
                    )}

                    {offer.adId && offer.adTitle && (
                      <Link
                        href={`/ad/${offer.adId}`}
                        className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2 mb-2 hover:bg-purple-100 transition-colors"
                      >
                        {offer.adImage && (
                          <Image src={offer.adImage} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" unoptimized />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-purple-700 truncate">🔄 {offer.adTitle}</p>
                          <p className="text-[10px] text-purple-600">اضغط لعرض الإعلان</p>
                        </div>
                        <ArrowRight size={14} className="text-purple-400 rotate-180" />
                      </Link>
                    )}

                    {offer.message && (
                      <p className="text-xs text-gray-text mb-2 bg-gray-50 rounded-lg px-3 py-2">
                        &quot;{offer.message}&quot;
                      </p>
                    )}

                    {/* Action buttons (for buyer only) */}
                    {isOwner && offer.status === "pending" && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleRespondToOffer(offer.id, "accepted")}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-green text-white rounded-lg text-xs font-bold active:scale-[0.98]"
                        >
                          <Check size={14} />
                          قبول
                        </button>
                        <button
                          onClick={() => handleRespondToOffer(offer.id, "rejected")}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-text rounded-lg text-xs font-bold active:scale-[0.98]"
                        >
                          <X size={14} />
                          رفض
                        </button>
                        {offer.sellerPhone && (
                          <Link
                            href={`https://wa.me/2${offer.sellerPhone}?text=${encodeURIComponent(`مرحباً، بخصوص عرضك على طلبي "${request.title}" في مكسب`)}`}
                            target="_blank"
                            className="flex items-center justify-center px-3 py-2 bg-[#25D366] text-white rounded-lg text-xs font-bold"
                          >
                            <MessageCircle size={14} />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Similar Ads Section */}
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-dark mb-3">
            <Sparkles size={14} />
            إعلانات مشابهة
          </h3>
          <MatchResults requestId={requestId} requestTitle={request.title} />
        </div>
      </div>

      {/* Fixed bottom: Submit offer button (for sellers) */}
      {!isOwner && request.status === "active" && (
        <div className="fixed bottom-16 inset-x-0 px-4 py-3 bg-white border-t border-gray-100 shadow-lg z-40">
          {!showOfferForm ? (
            <button
              onClick={async () => {
                const authed = await requireAuth();
                if (authed) setShowOfferForm(true);
              }}
              className="w-full py-3.5 bg-brand-green text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <Send size={18} />
              قدّم عرض للمشتري
            </button>
          ) : (
            <div className="space-y-3">
              {/* Offer type */}
              <div className="flex gap-2">
                {(["cash", "exchange"] as OfferType[]).map((type) => {
                  const label = getOfferTypeLabel(type);
                  return (
                    <button
                      key={type}
                      onClick={() => setOfferType(type)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                        offerType === type
                          ? "bg-brand-green text-white"
                          : "bg-gray-100 text-dark"
                      }`}
                    >
                      {label.emoji} {label.label}
                    </button>
                  );
                })}
              </div>

              {/* Price (for cash) */}
              {offerType === "cash" && (
                <div className="relative">
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="السعر اللي تقدر تبيع بيه"
                    className="w-full bg-gray-light rounded-xl px-4 py-2.5 text-sm text-dark placeholder:text-gray-text outline-none"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-text">جنيه</span>
                </div>
              )}

              {/* Message */}
              <input
                type="text"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="رسالة للمشتري (اختياري)"
                className="w-full bg-gray-light rounded-xl px-4 py-2.5 text-sm text-dark placeholder:text-gray-text outline-none"
              />

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOfferForm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-dark font-bold rounded-xl text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmitOffer}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-brand-green text-white font-bold rounded-xl text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? "جاري الإرسال..." : (
                    <>
                      <Send size={14} />
                      إرسال العرض
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNavWithBadge />
    </main>
  );
}
