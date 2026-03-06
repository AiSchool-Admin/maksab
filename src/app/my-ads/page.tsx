"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  CheckCircle,
  Trash2,
  RefreshCw,
  Edit3,
  AlertTriangle,
  Copy,
  DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { EmptyMyAds, EmptyOffers } from "@/components/ui/EmptyState";
import ErrorMessage, { FullPageError } from "@/components/ui/ErrorMessage";
import { MyAdsListSkeleton } from "@/components/ui/SkeletonLoader";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSessionToken } from "@/lib/supabase/auth";
import {
  fetchMyAds,
  updateAdStatus,
  deleteAd,
  getStatusLabel,
  type MyAd,
} from "@/lib/my-ads/my-ads-service";
import {
  getAdOffers,
  respondToOffer,
  getOfferStatusLabel,
  getOfferStatusColor,
  type PriceOffer,
} from "@/lib/offers/offers-service";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";
import Image from "next/image";
import type { AdStatus } from "@/types";

type TabFilter = "all" | "active" | "sold" | "expired" | "offers";

/** Calculate days until expiry; returns null if no expiry date or already expired */
function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Expiry warning text and color */
function getExpiryWarning(daysLeft: number | null): { text: string; color: string } | null {
  if (daysLeft === null) return null;
  if (daysLeft === 0) return { text: "ينتهي النهاردة!", color: "text-error" };
  if (daysLeft <= 3) return { text: `ينتهي خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`, color: "text-error" };
  if (daysLeft <= 7) return { text: `ينتهي خلال ${daysLeft} أيام`, color: "text-warning" };
  return null;
}

const tabs: { id: TabFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "active", label: "شغال" },
  { id: "offers", label: "العروض" },
  { id: "sold", label: "اتباع" },
  { id: "expired", label: "خلص" },
];

export default function MyAdsPage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();

  const [ads, setAds] = useState<MyAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const [error, setError] = useState(false);

  // Offers tab state
  const [allOffers, setAllOffers] = useState<(PriceOffer & { _adTitle: string })[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [isRespondingOffer, setIsRespondingOffer] = useState<string | null>(null);

  // Load ads
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous reset before async fetch
    setIsLoading(true);
    setError(false);
    fetchMyAds()
      .then((data) => {
        setAds(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  }, []);

  // Load offers when switching to offers tab
  useEffect(() => {
    if (activeTab !== "offers" || ads.length === 0) return;
    const adsWithOffers = ads.filter((a) => a.offersCount > 0 && a.saleType === "cash");
    if (adsWithOffers.length === 0) return;

    setIsLoadingOffers(true);
    Promise.all(
      adsWithOffers.map(async (ad) => {
        const offers = await getAdOffers(ad.id);
        return offers.map((o) => ({ ...o, _adTitle: ad.title }));
      }),
    ).then((results) => {
      const flat = results.flat().sort((a, b) => {
        // Pending first, then by date
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setAllOffers(flat);
      setIsLoadingOffers(false);
    });
  }, [activeTab, ads]);

  const handleOfferAction = async (offerId: string, action: "accepted" | "rejected") => {
    if (!user) return;
    setIsRespondingOffer(offerId);
    const result = await respondToOffer({ offerId, sellerId: user.id, action });
    setIsRespondingOffer(null);
    if (result.success) {
      toast.success(action === "accepted" ? "تم قبول العرض" : "تم رفض العرض");
      // Update locally
      setAllOffers((prev) =>
        prev.map((o) =>
          o.id === offerId ? { ...o, status: action } : o,
        ),
      );
    } else {
      toast.error(result.error || "حصل مشكلة");
    }
  };

  // Filter ads by tab
  const filteredAds = ads.filter((ad) => {
    if (activeTab === "all") return ad.status !== "deleted";
    if (activeTab === "sold") return ad.status === "sold" || ad.status === "exchanged";
    return ad.status === activeTab;
  });

  // Actions
  const handleMarkSold = useCallback(
    async (adId: string) => {
      const authedUser = user || (await requireAuth());
      if (!authedUser) return;
      const result = await updateAdStatus(adId, "sold");
      if (result.success) {
        setAds((prev) =>
          prev.map((a) => (a.id === adId ? { ...a, status: "sold" as AdStatus } : a)),
        );
        toast.success("تم تحديث الإعلان — مبروك على البيعة!");
      } else {
        toast.error("حصل مشكلة، جرب تاني");
      }
      setActionMenuId(null);
    },
    [user, requireAuth],
  );

  const handleDelete = useCallback(
    async (adId: string) => {
      const confirmed = window.confirm("متأكد إنك عايز تحذف الإعلان ده؟ مش هتقدر ترجعه تاني.");
      if (!confirmed) {
        setActionMenuId(null);
        return;
      }
      const authedUser = user || (await requireAuth());
      if (!authedUser) return;
      const result = await deleteAd(adId);
      if (result.success) {
        setAds((prev) =>
          prev.map((a) => (a.id === adId ? { ...a, status: "deleted" as AdStatus } : a)),
        );
        toast.success("تم حذف الإعلان");
      } else {
        toast.error("حصل مشكلة في الحذف، جرب تاني");
      }
      setActionMenuId(null);
    },
    [user, requireAuth],
  );

  const handleRenew = useCallback(
    async (adId: string) => {
      const authedUser = user || (await requireAuth());
      if (!authedUser) return;
      const result = await updateAdStatus(adId, "active");
      if (result.success) {
        setAds((prev) =>
          prev.map((a) =>
            a.id === adId ? { ...a, status: "active" as AdStatus } : a,
          ),
        );
        toast.success("تم تجديد الإعلان بنجاح!");
      } else {
        toast.error("حصل مشكلة في التجديد، جرب تاني");
      }
      setActionMenuId(null);
    },
    [user, requireAuth],
  );

  const handleDuplicate = useCallback(
    async (adId: string) => {
      const authedUser = user || (await requireAuth());
      if (!authedUser) return;
      try {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
          toast.error("الجلسة انتهت — سجل دخول تاني");
          return;
        }
        const response = await fetch("/api/ads/duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ad_id: adId, user_id: authedUser.id, session_token: sessionToken }),
        });
        const result = await response.json();
        if (result.success && result.ad?.id) {
          toast.success("تم نسخ الإعلان — بيتم فتحه دلوقتي");
          router.push(`/ad/${result.ad.id}/edit`);
        } else {
          toast.error(result.error || "حصل مشكلة");
        }
      } catch {
        toast.error("حصل مشكلة، جرب تاني");
      }
      setActionMenuId(null);
    },
    [user, requireAuth, router],
  );

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="إعلاناتي" showBack />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-gray-light scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-brand-green text-white"
                : "bg-gray-light text-gray-text hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {tab.id === "all" && !isLoading && (
              <span className="ms-1 text-xs">
                ({ads.filter((a) => a.status !== "deleted").length})
              </span>
            )}
            {tab.id === "offers" && !isLoading && (() => {
              const total = ads.reduce((sum, a) => sum + a.offersCount, 0);
              return total > 0 ? (
                <span className="ms-1 text-xs bg-brand-gold text-white rounded-full px-1.5 py-0.5 min-w-[18px] inline-block text-center">
                  {total}
                </span>
              ) : null;
            })()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {error ? (
          <ErrorMessage
            message="حصلت مشكلة في تحميل إعلاناتك"
            onRetry={() => {
              setError(false);
              setIsLoading(true);
              fetchMyAds()
                .then((data) => { setAds(data); setIsLoading(false); })
                .catch(() => { setError(true); setIsLoading(false); });
            }}
          />
        ) : isLoading ? (
          <MyAdsListSkeleton count={3} />
        ) : activeTab === "offers" ? (
          // ── Offers Tab ──────────────────────────────────
          isLoadingOffers ? (
            <MyAdsListSkeleton count={3} />
          ) : allOffers.length === 0 ? (
            <EmptyOffers />
          ) : (
            allOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white border border-gray-light rounded-xl p-3 space-y-2"
              >
                {/* Ad title + offer header */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => router.push(`/ad/${offer.adId}`)}
                    className="text-xs text-brand-green font-semibold truncate hover:underline"
                  >
                    {offer._adTitle}
                  </button>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getOfferStatusColor(offer.status)}`}
                  >
                    {getOfferStatusLabel(offer.status)}
                  </span>
                </div>

                {/* Buyer info + amount */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-green-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {offer.buyerAvatar ? (
                      <Image
                        src={offer.buyerAvatar}
                        alt={offer.buyerName}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <DollarSign size={14} className="text-brand-green" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-dark">{offer.buyerName || "مشتري"}</p>
                    <p className="text-[10px] text-gray-text">{formatTimeAgo(offer.createdAt)}</p>
                  </div>
                  <p className="text-lg font-bold text-brand-green flex-shrink-0">
                    {formatPrice(offer.amount)}
                  </p>
                </div>

                {/* Message */}
                {offer.message && (
                  <p className="text-xs text-gray-text bg-gray-light rounded-lg px-3 py-2">
                    {offer.message}
                  </p>
                )}

                {/* Counter offer display */}
                {offer.status === "countered" && offer.counterAmount && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                    <p className="text-[10px] text-blue-600 mb-0.5">عرضك المضاد:</p>
                    <p className="text-sm font-bold text-blue-700">{formatPrice(offer.counterAmount)}</p>
                    {offer.counterMessage && (
                      <p className="text-xs text-blue-600 mt-0.5">{offer.counterMessage}</p>
                    )}
                  </div>
                )}

                {/* Actions for pending offers */}
                {offer.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleOfferAction(offer.id, "accepted")}
                      disabled={isRespondingOffer === offer.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-brand-green text-white rounded-lg text-xs font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      قبول
                    </button>
                    <button
                      onClick={() => router.push(`/ad/${offer.adId}#offers`)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-light text-dark rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      <MessageCircle size={14} />
                      تفاصيل
                    </button>
                    <button
                      onClick={() => handleOfferAction(offer.id, "rejected")}
                      disabled={isRespondingOffer === offer.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-error rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      رفض
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        ) : filteredAds.length === 0 ? (
          activeTab === "all" ? (
            <EmptyMyAds />
          ) : (
            <EmptyMyAds />
          )
        ) : (
          filteredAds.map((ad) => {
            const { label: statusLabel, color: statusColor } = getStatusLabel(
              ad.status,
            );
            const isMenuOpen = actionMenuId === ad.id;

            return (
              <div
                key={ad.id}
                className="bg-white border border-gray-light rounded-xl p-3 relative"
              >
                <div
                  className="flex gap-3 cursor-pointer"
                  onClick={() => router.push(`/ad/${ad.id}`)}
                >
                  {/* Image thumbnail */}
                  <div className="w-20 h-20 bg-gray-light rounded-lg flex-shrink-0 overflow-hidden">
                    {ad.image ? (
                      <Image
                        src={ad.image}
                        alt={ad.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {ad.saleType === "auction"
                          ? "🔥"
                          : ad.saleType === "exchange"
                            ? "🔄"
                            : "📷"}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-dark line-clamp-2 leading-snug">
                        {ad.title}
                      </h3>
                      {/* Action menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(isMenuOpen ? null : ad.id);
                          }}
                          className="p-1 text-gray-text hover:text-dark rounded transition-colors"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {isMenuOpen && (
                          <div onClick={(e) => e.stopPropagation()} className="absolute top-full end-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-light py-1 z-30 min-w-[140px]">
                            {ad.status === "active" && (
                              <>
                                <button
                                  onClick={() =>
                                    router.push(`/ad/${ad.id}/edit`)
                                  }
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark hover:bg-gray-light transition-colors"
                                >
                                  <Edit3 size={14} />
                                  تعديل
                                </button>
                                <button
                                  onClick={() => handleMarkSold(ad.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-light transition-colors"
                                >
                                  <CheckCircle size={14} />
                                  خلاص اتباع
                                </button>
                              </>
                            )}
                            {ad.status === "expired" && (
                              <button
                                onClick={() => handleRenew(ad.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand-green hover:bg-gray-light transition-colors"
                              >
                                <RefreshCw size={14} />
                                جدّد
                              </button>
                            )}
                            <button
                              onClick={() => handleDuplicate(ad.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-text hover:bg-gray-light transition-colors"
                            >
                              <Copy size={14} />
                              نسخ الإعلان
                            </button>
                            <button
                              onClick={() => handleDelete(ad.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-gray-light transition-colors"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    {ad.price != null && (
                      <p className="text-sm font-bold text-brand-green mt-1">
                        {ad.price.toLocaleString("en-US")} جنيه
                      </p>
                    )}
                    {ad.saleType === "exchange" && (
                      <p className="text-sm font-bold text-blue-600 mt-1">
                        🔄 للتبديل
                      </p>
                    )}

                    {/* Status + date + expiry warning */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                      <span className="text-[10px] text-gray-text">
                        {formatTimeAgo(ad.createdAt)}
                      </span>
                      {ad.status === "active" && (() => {
                        const daysLeft = getDaysUntilExpiry(ad.expiresAt);
                        const warning = getExpiryWarning(daysLeft);
                        if (!warning) return null;
                        return (
                          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${warning.color}`}>
                            <AlertTriangle size={10} />
                            {warning.text}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Offers badge — show when there are pending offers */}
                {ad.offersCount > 0 && ad.saleType === "cash" && (
                  <div
                    className="flex items-center gap-2 mt-2 bg-brand-gold-light rounded-lg px-3 py-2 cursor-pointer hover:bg-brand-gold-light/80 transition-colors"
                    onClick={(e) => { e.stopPropagation(); router.push(`/ad/${ad.id}#offers`); }}
                  >
                    <DollarSign size={14} className="text-brand-gold" />
                    <span className="text-xs font-bold text-brand-gold">
                      {ad.offersCount} عرض سعر
                    </span>
                    {ad.highestOffer && (
                      <span className="text-xs text-gray-text">
                        — أعلى عرض: {ad.highestOffer.toLocaleString("en-US")} جنيه
                      </span>
                    )}
                  </div>
                )}

                {/* Stats bar */}
                <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-gray-light">
                  <span className="flex items-center gap-1 text-[11px] text-gray-text">
                    <Eye size={12} />
                    {ad.viewsCount}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-text">
                    <Heart size={12} />
                    {ad.favoritesCount}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-text">
                    <MessageCircle size={12} />
                    {ad.messagesCount}
                  </span>
                  {ad.offersCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-brand-gold font-semibold">
                      <DollarSign size={12} />
                      {ad.offersCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
