"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Heart,
  Share2,
  MapPin,
  Eye,
  Clock,
  User,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import ImageGallery from "@/components/ad/ImageGallery";
import SpecsTable from "@/components/ad/SpecsTable";
import AuctionSection from "@/components/ad/AuctionSection";
import ContactBar from "@/components/ad/ContactBar";
import AdCard from "@/components/ad/AdCard";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { fetchAdDetail, getSimilarAds } from "@/lib/mock-ad-detail";
import type { MockAdDetail } from "@/lib/mock-ad-detail";
import type { MockAd } from "@/lib/mock-data";
import {
  formatPrice,
  formatTimeAgo,
  formatPhone,
  formatNumber,
} from "@/lib/utils/format";

export default function AdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { requireAuth } = useAuth();

  const [ad, setAd] = useState<MockAdDetail | null>(null);
  const [similarAds, setSimilarAds] = useState<MockAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchAdDetail(id).then((data) => {
      setAd(data);
      setIsFavorited(data.isFavorited);
      setSimilarAds(getSimilarAds(id));
      setIsLoading(false);
    });
  }, [id]);

  const handleToggleFavorite = async () => {
    const user = await requireAuth();
    if (!user) return;
    setIsFavorited((prev) => !prev);
  };

  const handleShare = async () => {
    if (navigator.share && ad) {
      try {
        await navigator.share({
          title: ad.title,
          text: `${ad.title} على مكسب`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const handleChat = async () => {
    const user = await requireAuth();
    if (!user || !ad) return;
    // In production: find or create conversation via Supabase
    // For now, navigate to the chat list (mock data uses conversation IDs)
    const { findOrCreateConversation } = await import(
      "@/lib/chat/mock-chat"
    );
    const conv = await findOrCreateConversation(ad.id);
    if (conv) {
      router.push(`/chat/${conv.id}`);
    } else {
      router.push("/chat");
    }
  };

  const handlePlaceBid = async (amount: number) => {
    const user = await requireAuth();
    if (!user) return;
    console.log("Bid placed:", amount);
  };

  const handleBuyNow = async () => {
    const user = await requireAuth();
    if (!user) return;
    console.log("Buy now!");
  };

  /* ── Loading skeleton ──────────────────────────────── */
  if (isLoading || !ad) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="aspect-[4/3] bg-gray-light animate-pulse" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ── Sale type label ───────────────────────────────── */
  const saleLabel =
    ad.saleType === "cash"
      ? `💵 بيع نقدي${ad.isNegotiable ? " — قابل للتفاوض" : ""}`
      : ad.saleType === "auction"
        ? "🔨 مزاد"
        : "🔄 تبديل";

  /* ── Member since ──────────────────────────────────── */
  const memberYear = new Date(ad.seller.memberSince).getFullYear();

  return (
    <main className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-1 -me-1 text-gray-text hover:text-dark transition-colors"
            aria-label="رجوع"
          >
            <ChevronRight size={24} />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              className="p-2 text-gray-text hover:text-dark rounded-full hover:bg-gray-light transition-colors"
              aria-label="مشاركة"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-full transition-colors ${
                isFavorited
                  ? "text-error bg-error/10"
                  : "text-gray-text hover:text-error hover:bg-gray-light"
              }`}
              aria-label={
                isFavorited ? "إزالة من المفضلة" : "إضافة للمفضلة"
              }
            >
              <Heart
                size={20}
                fill={isFavorited ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Image Gallery */}
      <ImageGallery images={ad.images} title={ad.title} />

      <div className="px-4 py-4 space-y-6">
        {/* Price & sale type */}
        <div>
          {ad.saleType === "cash" && ad.price != null && (
            <p className="text-2xl font-bold text-brand-green mb-1">
              {formatPrice(ad.price)}
            </p>
          )}
          {ad.saleType === "exchange" && (
            <p className="text-xl font-bold text-blue-700 mb-1">
              🔄 للتبديل
            </p>
          )}
          <span className="text-sm text-gray-text">{saleLabel}</span>
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-dark leading-relaxed">
          {ad.title}
        </h1>

        {/* Auction section */}
        {ad.saleType === "auction" &&
          ad.auctionStartPrice &&
          ad.auctionEndsAt && (
            <AuctionSection
              startPrice={ad.auctionStartPrice}
              buyNowPrice={ad.auctionBuyNowPrice}
              highestBid={ad.auctionHighestBid}
              bidsCount={ad.auctionBidsCount}
              minIncrement={ad.auctionMinIncrement}
              endsAt={ad.auctionEndsAt}
              bids={ad.bids}
              onPlaceBid={handlePlaceBid}
              onBuyNow={handleBuyNow}
            />
          )}

        {/* Exchange details */}
        {ad.saleType === "exchange" && ad.exchangeDescription && (
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-dark mb-1">
              عايز يبدل بـ:
            </h3>
            <p className="text-sm text-blue-700">{ad.exchangeDescription}</p>
            {ad.exchangeAcceptsPriceDiff && ad.exchangePriceDiff && (
              <p className="text-xs text-gray-text mt-2">
                يقبل فرق سعر: {formatPrice(ad.exchangePriceDiff)}
              </p>
            )}
          </div>
        )}

        {/* Specs table */}
        <SpecsTable
          categoryId={ad.categoryId}
          categoryFields={ad.categoryFields}
        />

        {/* Description */}
        <div>
          <h3 className="text-sm font-bold text-dark mb-2">الوصف</h3>
          <p className="text-sm text-gray-text leading-relaxed whitespace-pre-line">
            {ad.description}
          </p>
        </div>

        {/* Location */}
        <div>
          <h3 className="text-sm font-bold text-dark mb-2">الموقع</h3>
          <div className="flex items-center gap-2 text-sm text-gray-text">
            <MapPin size={16} className="text-brand-green flex-shrink-0" />
            <span>
              {ad.governorate}
              {ad.city ? ` — ${ad.city}` : ""}
            </span>
          </div>
        </div>

        {/* Seller */}
        <div>
          <h3 className="text-sm font-bold text-dark mb-3">البائع</h3>
          <div className="flex items-center gap-3 bg-gray-light rounded-xl p-4">
            <div className="w-12 h-12 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green flex-shrink-0">
              {ad.seller.avatarUrl ? (
                <img
                  src={ad.seller.avatarUrl}
                  alt={ad.seller.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-dark text-sm">
                {ad.seller.displayName}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-gray-text mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  عضو منذ {memberYear}
                </span>
                <span>{ad.seller.totalAds} إعلان</span>
              </div>
            </div>
            <a
              href={`tel:+2${ad.seller.phone}`}
              className="text-xs text-brand-green font-semibold"
              dir="ltr"
            >
              {formatPhone(ad.seller.phone)}
            </a>
          </div>
        </div>

        {/* Views & date */}
        <div className="flex items-center justify-between text-xs text-gray-text pt-2 border-t border-gray-light">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            نُشر {formatTimeAgo(ad.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {formatNumber(ad.viewsCount)} مشاهدة
          </span>
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {ad.favoritesCount} مفضلة
          </span>
        </div>

        {/* Similar ads section */}
        {similarAds.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-dark mb-3">
              🎯 شبيه اللي بتدور عليه
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {similarAds.map((simAd) => (
                <AdCard
                  key={simAd.id}
                  id={simAd.id}
                  title={simAd.title}
                  price={simAd.price}
                  saleType={simAd.saleType}
                  image={simAd.image}
                  governorate={simAd.governorate}
                  city={simAd.city}
                  createdAt={simAd.createdAt}
                  isNegotiable={simAd.isNegotiable}
                  auctionHighestBid={simAd.auctionHighestBid}
                  auctionEndsAt={simAd.auctionEndsAt}
                  auctionBidsCount={simAd.auctionBidsCount}
                  exchangeDescription={simAd.exchangeDescription}
                  isFavorited={simAd.isFavorited}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom contact bar */}
      <ContactBar
        sellerPhone={ad.seller.phone}
        adTitle={ad.title}
        adId={ad.id}
        onChat={handleChat}
      />
    </main>
  );
}
