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
} from "lucide-react";
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

const tabs: { id: TabFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "active", label: "نشط" },
  { id: "sold", label: "تم البيع" },
  { id: "expired", label: "منتهي" },
];

export default function MyAdsPage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();

  const [ads, setAds] = useState<MyAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Load ads
  useEffect(() => {
    setIsLoading(true);
    fetchMyAds().then((data) => {
      setAds(data);
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
        {isLoading ? (
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
                ? "مفيش إعلانات مباعة"
                : activeTab === "expired"
                  ? "مفيش إعلانات منتهية"
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
                <div className="flex gap-3">
                  {/* Image placeholder */}
                  <div className="w-20 h-20 bg-gray-light rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                    {ad.saleType === "auction"
                      ? "🔨"
                      : ad.saleType === "exchange"
                        ? "🔄"
                        : "📷"}
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
                                  تم البيع
                                </button>
                              </>
                            )}
                            {ad.status === "expired" && (
                              <button
                                onClick={() => handleRenew(ad.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand-green hover:bg-gray-light transition-colors"
                              >
                                <RefreshCw size={14} />
                                تجديد
                              </button>
                            )}
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

                    {/* Status + date */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                      <span className="text-[10px] text-gray-text">
                        {formatTimeAgo(ad.createdAt)}
                      </span>
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
