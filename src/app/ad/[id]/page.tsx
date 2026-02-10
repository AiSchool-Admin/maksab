"use client";

import { useState, useEffect, useCallback, use } from "react";
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
  Radio,
  Star,
  Home,
} from "lucide-react";
import Link from "next/link";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTrackSignal } from "@/lib/hooks/useTrackSignal";
import ImageGallery from "@/components/ad/ImageGallery";
import SpecsTable from "@/components/ad/SpecsTable";
import AuctionSection from "@/components/ad/AuctionSection";
import ExchangeMatchSection from "@/components/ad/ExchangeMatchSection";
import ContactBar from "@/components/ad/ContactBar";
import AdCard from "@/components/ad/AdCard";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { fetchAdDetail, getSimilarAds } from "@/lib/mock-ad-detail";
import type { MockAdDetail } from "@/lib/mock-ad-detail";
import type { MockAd } from "@/lib/mock-data";
import type { AuctionState } from "@/lib/auction/types";
import {
  placeBid,
  buyNow,
  subscribeToAuction,
  checkAuctionEnd,
  fetchAuctionState,
} from "@/lib/auction/auction-service";
import {
  formatPrice,
  formatTimeAgo,
  formatPhone,
  formatNumber,
} from "@/lib/utils/format";
import SellerRatingSummaryComponent from "@/components/reviews/SellerRatingSummary";
import ReviewForm from "@/components/reviews/ReviewForm";
import Modal from "@/components/ui/Modal";
import VerificationBadge, { TrustedSellerBadge, IdVerifiedBadge } from "@/components/verification/VerificationBadge";
import PriceOfferButton from "@/components/offers/PriceOfferButton";
import OffersListSection from "@/components/offers/OffersListSection";
import AddToCompareButton from "@/components/comparison/AddToCompareButton";
import ComparisonFab from "@/components/comparison/ComparisonFab";
import PriceBadge from "@/components/price/PriceBadge";
import LoyaltyBadge from "@/components/loyalty/LoyaltyBadge";

/** Convert MockAdDetail to AuctionState for the auction component */
function toAuctionState(ad: MockAdDetail): AuctionState {
  return {
    adId: ad.id,
    status: ad.auctionStatus ?? "active",
    startPrice: ad.auctionStartPrice ?? 0,
    buyNowPrice: ad.auctionBuyNowPrice,
    currentHighestBid: ad.auctionHighestBid,
    highestBidderName: ad.auctionHighestBidderName ?? null,
    highestBidderId: ad.auctionHighestBidderId ?? null,
    bidsCount: ad.auctionBidsCount,
    minIncrement: ad.auctionMinIncrement,
    endsAt: ad.auctionEndsAt ?? new Date().toISOString(),
    originalEndsAt: ad.auctionEndsAt ?? new Date().toISOString(),
    bids: ad.bids.map((b) => ({
      id: b.id,
      adId: ad.id,
      bidderId: "",
      bidderName: b.bidderName,
      amount: b.amount,
      createdAt: b.createdAt,
    })),
    winnerId: ad.auctionWinnerId ?? null,
    winnerName: ad.auctionWinnerName ?? null,
    wasExtended: false,
  };
}

export default function AdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { requireAuth, user } = useAuth();
  const { track } = useTrackSignal();

  const [ad, setAd] = useState<MockAdDetail | null>(null);
  const [similarAds, setSimilarAds] = useState<MockAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  // Auction state (separate from ad to support real-time updates)
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [isBidding, setIsBidding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  // Review & verification state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [sellerVerificationLevel, setSellerVerificationLevel] = useState<"basic" | "verified" | "premium">("basic");
  const [sellerIsTrusted, setSellerIsTrusted] = useState(false);
  const [sellerIsIdVerified, setSellerIsIdVerified] = useState(false);
  const [reviewsKey, setReviewsKey] = useState(0); // force refresh reviews
  const [sellerLoyaltyLevel, setSellerLoyaltyLevel] = useState<"member" | "silver" | "gold" | "diamond">("member");

  const currentUserId = user?.id || "";

  /* ── Load ad detail ──────────────────────────────────────── */
  useEffect(() => {
    setIsLoading(true);
    fetchAdDetail(id).then(async (data) => {
      if (!data) {
        setIsLoading(false);
        return;
      }
      setAd(data);
      setIsFavorited(data.isFavorited);
      const similar = await getSimilarAds(id, data.categoryId);
      setSimilarAds(similar);
      setIsLoading(false);

      // Initialize auction state
      if (data.saleType === "auction" && data.auctionStartPrice) {
        const state = toAuctionState(data);
        setAuctionState(state);
      }
    });
  }, [id]);

  /* ── Load seller verification data ──────────────────────── */
  useEffect(() => {
    if (!ad?.seller?.id) return;
    import("@/lib/verification/verification-service").then(({ getUserVerificationProfile }) => {
      getUserVerificationProfile(ad.seller.id).then((profile) => {
        setSellerVerificationLevel(profile.level);
        setSellerIsIdVerified(profile.isIdVerified);
      });
    });
    import("@/lib/reviews/reviews-service").then(({ getSellerRatingSummary }) => {
      getSellerRatingSummary(ad.seller.id).then((summary) => {
        setSellerIsTrusted(summary.isTrustedSeller);
      });
    });
    import("@/lib/loyalty/loyalty-service").then(({ getUserLoyaltyProfile }) => {
      const loyaltyProfile = getUserLoyaltyProfile(ad.seller.id);
      setSellerLoyaltyLevel(loyaltyProfile.currentLevel);
    });
  }, [ad?.seller?.id]);

  /* ── Track view signal after 3 seconds ──────────────────── */
  useEffect(() => {
    if (!ad) return;
    const timer = setTimeout(() => {
      track("view", {
        categoryId: ad.categoryId,
        adId: ad.id,
        signalData: {
          brand: (ad.categoryFields as Record<string, unknown>)?.brand,
          price: ad.price,
          title: ad.title,
        },
        governorate: ad.governorate,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [ad, track]);

  /* ── Subscribe to real-time auction updates ──────────────── */
  useEffect(() => {
    if (!auctionState || auctionState.status !== "active") return;

    const unsubscribe = subscribeToAuction(id, (updatedState) => {
      setAuctionState(updatedState);
    });

    // Periodic check: re-fetch when timer expires client-side
    const endCheckInterval = setInterval(async () => {
      if (auctionState.endsAt) {
        const remaining = new Date(auctionState.endsAt).getTime() - Date.now();
        if (remaining <= 0) {
          const fresh = await fetchAuctionState(id);
          if (fresh) setAuctionState(fresh);
        }
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(endCheckInterval);
    };
  }, [id, auctionState?.status, auctionState?.endsAt]);

  /* ── Handlers ────────────────────────────────────────────── */
  const handleToggleFavorite = async () => {
    const authedUser = await requireAuth();
    if (!authedUser) return;
    if (ad && !isFavorited) {
      track("favorite", {
        categoryId: ad.categoryId,
        adId: ad.id,
        signalData: {
          brand: (ad.categoryFields as Record<string, unknown>)?.brand,
          price: ad.price,
        },
        governorate: ad.governorate,
      });
    }
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
    const authedUser = await requireAuth();
    if (!authedUser || !ad) return;
    // Track chat_initiated signal
    track("chat_initiated", {
      categoryId: ad.categoryId,
      adId: ad.id,
      signalData: {
        brand: (ad.categoryFields as Record<string, unknown>)?.brand,
      },
      governorate: ad.governorate,
    });
    const { findOrCreateConversation } = await import(
      "@/lib/chat/chat-service"
    );
    const conv = await findOrCreateConversation(ad.id);
    if (conv) {
      router.push(`/chat/${conv.id}`);
    } else {
      router.push("/chat");
    }
  };

  const handlePlaceBid = useCallback(
    async (amount: number) => {
      const authedUser = await requireAuth();
      if (!authedUser) return;

      // Track bid_placed signal
      if (ad) {
        track("bid_placed", {
          categoryId: ad.categoryId,
          adId: ad.id,
          signalData: { bid_amount: amount },
          governorate: ad.governorate,
        });
      }

      setIsBidding(true);
      const result = await placeBid(
        id,
        authedUser.id,
        authedUser.display_name || "مستخدم",
        amount,
      );
      setIsBidding(false);

      if (result.success && result.updatedState) {
        setAuctionState(result.updatedState);
      }
      if (!result.success && result.error) {
        const { toast } = await import("react-hot-toast");
        toast.error(result.error);
      }
    },
    [id, requireAuth],
  );

  const handleBuyNow = useCallback(async () => {
    const authedUser = await requireAuth();
    if (!authedUser) return;

    setIsBuyingNow(true);
    const result = await buyNow(
      id,
      authedUser.id,
      authedUser.display_name || "مستخدم",
    );
    setIsBuyingNow(false);

    if (result.success && result.updatedState) {
      setAuctionState(result.updatedState);
    }
  }, [id, requireAuth]);

  /* ── Loading skeleton ──────────────────────────────────── */
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.back()}
              className="p-1 -me-1 text-gray-text hover:text-dark transition-colors"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <Link
              href="/"
              className="p-1.5 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors"
              aria-label="الرئيسية"
            >
              <Home size={18} />
            </Link>
          </div>
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

        {/* Price Intelligence Badge */}
        {ad.saleType === "cash" && ad.price != null && ad.price > 0 && (
          <PriceBadge
            categoryId={ad.categoryId}
            subcategoryId={ad.subcategoryId}
            brand={(ad.categoryFields as Record<string, unknown>)?.brand as string}
            model={(ad.categoryFields as Record<string, unknown>)?.model as string}
            price={ad.price}
            governorate={ad.governorate}
            variant="card"
          />
        )}

        {/* Title */}
        <h1 className="text-lg font-bold text-dark leading-relaxed">
          {ad.title}
        </h1>

        {/* Auction section */}
        {ad.saleType === "auction" && auctionState && (
          <AuctionSection
            auctionState={auctionState}
            currentUserId={currentUserId}
            onPlaceBid={handlePlaceBid}
            onBuyNow={handleBuyNow}
            isBidding={isBidding}
            isBuyingNow={isBuyingNow}
            isLiveAuction={Boolean((ad.categoryFields as Record<string, unknown>)?.is_live_auction)}
          />
        )}

        {/* Live auction broadcast button */}
        {ad.saleType === "auction" &&
          Boolean((ad.categoryFields as Record<string, unknown>)?.is_live_auction) && (
            <Link href={`/ad/${ad.id}/live`}>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 hover:bg-red-100 transition-colors">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <Radio size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-600">
                    {currentUserId === ad.seller?.id ? "ابدأ البث المباشر" : "شاهد البث المباشر"}
                  </p>
                  <p className="text-xs text-red-400">
                    {currentUserId === ad.seller?.id
                      ? "اعرض المنتج للمشاهدين وتلقى مزايدات حية"
                      : "شاهد المنتج مباشرة وزايد في الوقت الحقيقي"}
                  </p>
                </div>
                <span className="relative flex h-3 w-3 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              </div>
            </Link>
          )}

        {/* Exchange details — structured display */}
        {ad.saleType === "exchange" && Boolean(ad.exchangeDescription || (ad.categoryFields as Record<string, unknown>)?.exchange_wanted) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
              🔄 عايز يبدل بـ:
            </h3>
            <p className="text-base font-bold text-blue-700">
              {ad.exchangeDescription}
            </p>
            {ad.exchangeAcceptsPriceDiff && ad.exchangePriceDiff && (
              <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-text">يقبل فرق سعر:</span>
                <span className="text-xs font-bold text-brand-green">
                  {formatPrice(ad.exchangePriceDiff)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Exchange matching — smart matching with scores */}
        {ad.saleType === "exchange" && Boolean(ad.exchangeDescription || (ad.categoryFields as Record<string, unknown>)?.exchange_wanted) && (
          <ExchangeMatchSection
            adTitle={ad.title}
            exchangeDescription={ad.exchangeDescription || ""}
            categoryId={ad.categoryId}
            currentAdId={ad.id}
            categoryFields={ad.categoryFields as Record<string, unknown>}
          />
        )}

        {/* Price Offers — for cash sale type */}
        {ad.saleType === "cash" && ad.price != null && (
          <PriceOfferButton
            adId={ad.id}
            sellerId={ad.seller.id}
            adTitle={ad.title}
            currentPrice={ad.price}
          />
        )}

        {/* Add to compare button */}
        <AddToCompareButton
          ad={{
            id: ad.id,
            title: ad.title,
            price: ad.price,
            saleType: ad.saleType,
            image: ad.images[0] || null,
            governorate: ad.governorate,
            city: ad.city,
            categoryId: ad.categoryId,
            categoryFields: ad.categoryFields as Record<string, unknown>,
          }}
          variant="full"
        />

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
          <div className="bg-gray-light rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-dark text-sm">
                    {ad.seller.displayName}
                  </p>
                  <VerificationBadge level={sellerVerificationLevel} />
                  <LoyaltyBadge level={sellerLoyaltyLevel} size="sm" />
                  {sellerIsTrusted && <TrustedSellerBadge />}
                  {sellerIsIdVerified && <IdVerifiedBadge />}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-text mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    عضو منذ {memberYear}
                  </span>
                  <span>{ad.seller.totalAds} إعلان</span>
                  {ad.seller.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-brand-gold fill-brand-gold" />
                      {ad.seller.rating}
                    </span>
                  )}
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

            {/* Review button for non-sellers */}
            {user && user.id !== ad.seller.id && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="text-xs font-semibold text-brand-green hover:text-brand-green-dark transition-colors"
              >
                قيّم هذا البائع
              </button>
            )}
          </div>
        </div>

        {/* Seller Offers (visible to seller) */}
        {user?.id === ad.seller.id && (
          <OffersListSection
            adId={ad.id}
            sellerId={ad.seller.id}
            currentUserId={currentUserId}
          />
        )}

        {/* Seller Reviews */}
        <SellerRatingSummaryComponent key={reviewsKey} sellerId={ad.seller.id} />

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

      {/* Comparison FAB */}
      <ComparisonFab />

      {/* Review Form Modal */}
      <Modal
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        title="تقييم البائع"
      >
        <ReviewForm
          adId={ad.id}
          sellerId={ad.seller.id}
          reviewerId={user?.id || ""}
          adTitle={ad.title}
          onSuccess={() => {
            setShowReviewForm(false);
            setReviewsKey((k) => k + 1);
          }}
          onCancel={() => setShowReviewForm(false)}
        />
      </Modal>

      <BottomNavWithBadge />
    </main>
  );
}
