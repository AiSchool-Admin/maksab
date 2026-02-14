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
} from "lucide-react";
import toast from "react-hot-toast";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fetchMyAds,
  updateAdStatus,
  deleteAd,
  getStatusLabel,
  type MyAd,
} from "@/lib/my-ads/my-ads-service";
import { formatTimeAgo } from "@/lib/utils/format";
import type { AdStatus } from "@/types";

type TabFilter = "all" | "active" | "sold" | "expired";

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

  // Load ads
  useEffect(() => {
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
      }
      setActionMenuId(null);
    },
    [user, requireAuth],
  );

  const handleDelete = useCallback(
    async (adId: string) => {
      const authedUser = user || (await requireAuth());
      if (!authedUser) return;
      const result = await deleteAd(adId);
      if (result.success) {
        setAds((prev) =>
          prev.map((a) => (a.id === adId ? { ...a, status: "deleted" as AdStatus } : a)),
        );
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
        const response = await fetch("/api/ads/duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ad_id: adId, user_id: authedUser.id }),
        });
        const result = await response.json();
        if (result.success) {
          toast.success("تم نسخ الإعلان — بيتم فتحه دلوقتي");
          router.push(`/ad/${result.newAdId}/edit`);
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
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm text-gray-text mb-3">حصل مشكلة في تحميل إعلاناتك</p>
            <button
              onClick={() => {
                setError(false);
                setIsLoading(true);
                fetchMyAds()
                  .then((data) => { setAds(data); setIsLoading(false); })
                  .catch(() => { setError(true); setIsLoading(false); });
              }}
              className="text-sm font-bold text-brand-green hover:text-brand-green-dark"
            >
              جرب تاني
            </button>
          </div>
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-light rounded-xl skeleton"
            />
          ))
        ) : filteredAds.length === 0 ? (
          <EmptyState
            icon={activeTab === "sold" ? "🎉" : activeTab === "expired" ? "⏰" : "📦"}
            title={
              activeTab === "sold"
                ? "لسه مبعتش حاجة"
                : activeTab === "expired"
                  ? "مفيش إعلانات خلصت"
                  : "مفيش إعلانات"
            }
            description={
              activeTab === "all"
                ? "لسه مضفتش أي إعلانات. ابدأ أول صفقة دلوقتي!"
                : "هتظهر إعلاناتك هنا لما يكون فيه"
            }
            actionLabel={activeTab === "all" ? "أضف إعلان" : undefined}
            actionHref={activeTab === "all" ? "/ad/create" : undefined}
          />
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
                      <img
                        src={ad.image}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
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
                          onClick={() =>
                            setActionMenuId(isMenuOpen ? null : ad.id)
                          }
                          className="p-1 text-gray-text hover:text-dark rounded transition-colors"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute top-full end-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-light py-1 z-30 min-w-[140px]">
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
