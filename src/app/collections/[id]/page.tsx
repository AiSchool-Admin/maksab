"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Share2,
  Trash2,
  Globe,
  Lock,
  Loader2,
  Settings,
  X,
} from "lucide-react";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import AdCard from "@/components/ad/AdCard";
import { formatTimeAgo } from "@/lib/utils/format";

interface CollectionAd {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  saleType: string;
  status: string;
  governorate: string;
}

interface CollectionDetail {
  id: string;
  name: string;
  icon: string;
  description?: string;
  isPublic: boolean;
  shareCode: string;
  adIds: string[];
  ads: CollectionAd[];
  updatedAt: string;
}

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    setIsLoading(true);
    try {
      const { getCollectionWithAds } = await import(
        "@/lib/collections/collections-service"
      );
      const result = await getCollectionWithAds(id);
      if (result.success && result.collection) {
        setCollection(result.collection);
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAd = async (adId: string) => {
    if (!collection) return;
    try {
      const { removeFromCollection } = await import(
        "@/lib/collections/collections-service"
      );
      removeFromCollection(collection.id, adId);
      setCollection((prev) =>
        prev
          ? {
              ...prev,
              adIds: prev.adIds.filter((id) => id !== adId),
              ads: prev.ads.filter((a) => a.id !== adId),
            }
          : prev
      );
    } catch {
      // Silent
    }
  };

  const handleTogglePublic = async () => {
    if (!collection) return;
    try {
      const { updateCollection } = await import(
        "@/lib/collections/collections-service"
      );
      updateCollection(collection.id, { isPublic: !collection.isPublic });
      setCollection((prev) =>
        prev ? { ...prev, isPublic: !prev.isPublic } : prev
      );
    } catch {
      // Silent
    }
  };

  const handleShare = async () => {
    if (!collection) return;
    try {
      const { generateWhatsAppShareUrl } = await import(
        "@/lib/collections/collections-service"
      );
      const url = generateWhatsAppShareUrl({
        name: collection.name,
        shareCode: collection.shareCode,
        adCount: collection.ads.length,
      });
      window.open(url, "_blank");
    } catch {
      const link = `${window.location.origin}/collections/shared/${collection.shareCode}`;
      navigator.clipboard?.writeText(link);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
          <div className="flex items-center gap-2 px-4 h-14">
            <button type="button" onClick={() => router.back()} className="p-1 text-gray-text">
              <ChevronRight size={24} />
            </button>
            <div className="h-5 w-32 bg-gray-light rounded animate-pulse" />
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-green" />
        </div>
      </main>
    );
  }

  if (!collection) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-dark mb-2">القائمة مش موجودة</h2>
          <button
            type="button"
            onClick={() => router.push("/collections")}
            className="text-sm text-brand-green font-semibold mt-3"
          >
            رجوع للقوائم
          </button>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.back()} className="p-1 text-gray-text">
              <ChevronRight size={24} />
            </button>
            <span className="text-lg">{collection.icon}</span>
            <h1 className="text-xl font-bold text-dark">{collection.name}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-brand-green hover:bg-brand-green-light rounded-full"
              aria-label="مشاركة"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-text hover:bg-gray-light rounded-full"
              aria-label="إعدادات"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Info bar */}
        <div className="flex items-center gap-3 text-[11px] text-gray-text">
          <span>{collection.ads.length} إعلان</span>
          <span className="flex items-center gap-0.5">
            {collection.isPublic ? (
              <>
                <Globe size={10} /> عامة
              </>
            ) : (
              <>
                <Lock size={10} /> خاصة
              </>
            )}
          </span>
          <span>آخر تحديث: {formatTimeAgo(collection.updatedAt)}</span>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="p-3 bg-gray-light rounded-xl space-y-3">
            <button
              type="button"
              onClick={handleTogglePublic}
              className="w-full flex items-center justify-between p-2 bg-white rounded-lg"
            >
              <span className="text-xs text-dark font-semibold">
                {collection.isPublic ? "قائمة عامة" : "قائمة خاصة"}
              </span>
              <span className="text-[10px] text-gray-text">
                {collection.isPublic ? "أي حد يقدر يشوفها بالرابط" : "أنت بس اللي تشوفها"}
              </span>
            </button>
          </div>
        )}

        {/* Ads grid */}
        {collection.ads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm text-gray-text mb-4">
              القائمة فاضية. احفظ إعلانات من صفحة أي إعلان
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {collection.ads.map((ad) => (
              <div key={ad.id} className="relative">
                <AdCard
                  id={ad.id}
                  title={ad.title}
                  price={ad.price}
                  saleType={ad.saleType as "cash" | "auction" | "exchange"}
                  image={ad.image}
                  governorate={ad.governorate}
                  city=""
                  createdAt={new Date().toISOString()}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAd(ad.id)}
                  className="absolute top-2 start-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-error shadow-sm hover:bg-error hover:text-white transition-colors"
                  aria-label="إزالة من القائمة"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
