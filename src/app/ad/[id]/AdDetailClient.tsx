"use client";

import { useState, useEffect, useCallback } from "react";
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
import { getCategoryById, getEffectiveFields } from "@/lib/categories/categories-config";
import { generateAutoTitle, generateAutoDescription } from "@/lib/categories/generate";
import { fetchAdDetail, getSimilarAds } from "@/lib/ad-detail";
import type { AdDetail } from "@/lib/ad-detail";
import type { AdSummary } from "@/lib/ad-data";
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
import ReportButton from "@/components/report/ReportButton";
import MarkAsSoldButton from "@/components/ad/MarkAsSoldButton";
import SmartPriceDrop from "@/components/ad/SmartPriceDrop";
import PriceMeter from "@/components/ai/PriceMeter";
import ShareButtons from "@/components/ad/ShareButtons";
import UserBadges from "@/components/badges/UserBadges";
import { useAnalytics } from "@/lib/analytics/useAnalytics";
import dynamic from "next/dynamic";

const ReactionsBar = dynamic(() => import("@/components/social/ReactionsBar"), { ssr: false });
const CommentsSection = dynamic(() => import("@/components/social/CommentsSection"), { ssr: false });
const SellerRankBadge = dynamic(() => import("@/components/social/SellerRankBadge"), { ssr: false });
const AddToCollectionButton = dynamic(() => import("@/components/collections/AddToCollectionButton"), { ssr: false });

/** Convert AdDetail to AuctionState for the auction component */
function toAuctionState(ad: AdDetail): AuctionState {
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

export default function AdDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { requireAuth, user } = useAuth();
  const { track } = useTrackSignal();
  const { track: trackAnalytics } = useAnalytics();

  const [ad, setAd] = useState<AdDetail | null>(null);
  const [similarAds, setSimilarAds] = useState<AdSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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
  const [sellerRank, setSellerRank] = useState<"beginner" | "good" | "pro" | "elite">("beginner");

  const [notFound, setNotFound] = useState(false);
  const [autoDropEnabled, setAutoDropEnabled] = useState(false);
  const currentUserId = user?.id || "";

  /* ── Load ad detail ──────────────────────────────────────── */
  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);
    fetchAdDetail(id).then(async (data) => {
      if (!data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setAd(data);
      setIsFavorited(data.isFavorited);

      // Track recently viewed
      import("@/lib/hooks/useRecentlyViewed").then(({ addToRecentlyViewed }) => {
        addToRecentlyViewed({
          id: data.id,
          title: data.title,
          image: data.images?.[0] ?? null,
          price: data.price,
          saleType: data.saleType as "cash" | "auction" | "exchange",
        });
      });

      // Initialize auction state
      if (data.saleType === "auction" && data.auctionStartPrice) {
        const state = toAuctionState(data);
        setAuctionState(state);
      }

      // Load similar ads in parallel (non-blocking)
      getSimilarAds(id, data.categoryId).then(setSimilarAds).catch(() => {});

      setIsLoading(false);
    }).catch(() => {
      setNotFound(true);
      setIsLoading(false);
    });
  }, [id]);

  /* ── Load seller verification data (parallel) ───────────── */
  useEffect(() => {
    if (!ad?.seller?.id) return;
    const sellerId = ad.seller.id;

    // Load all seller metadata in parallel
    Promise.allSettled([
      import("@/lib/verification/verification-service").then(({ getUserVerificationProfile }) =>
        getUserVerificationProfile(sellerId).then((profile) => {
          setSellerVerificationLevel(profile.level);
          setSellerIsIdVerified(profile.isIdVerified);
        })
      ),
      import("@/lib/reviews/reviews-service").then(({ getSellerRatingSummary }) =>
        getSellerRatingSummary(sellerId).then((summary) => {
          setSellerIsTrusted(summary.isTrustedSeller);
        })
      ),
      import("@/lib/loyalty/loyalty-service").then(({ getUserLoyaltyProfile }) => {
        const loyaltyProfile = getUserLoyaltyProfile(sellerId);
        setSellerLoyaltyLevel(loyaltyProfile.currentLevel);
      }),
      import("@/lib/social/seller-rank-service").then(({ calculateSellerScore }) =>
        calculateSellerScore(sellerId).then((breakdown) => {
          setSellerRank(breakdown.rank);
        })
      ),
    ]).catch(() => {});
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

  const handleShare = () => {
    if (!ad) return;
    trackAnalytics("ad_view", { adId: ad.id, action: "share_open" });
    setShowShareModal(true);
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

  /* ── Not found state ──────────────────────────────────── */
  if (notFound && !isLoading) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
          <div className="flex items-center px-4 h-14 gap-2">
            <button onClick={() => router.back()} className="p-1 text-gray-text" aria-label="رجوع">
              <ChevronRight size={24} />
            </button>
            <Link href="/" className="p-1.5 text-brand-green rounded-full" aria-label="الرئيسية">
              <Home size={18} />
            </Link>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-dark mb-2">الإعلان مش موجود</h2>
          <p className="text-sm text-gray-text mb-6">
            الإعلان ده ممكن يكون اتحذف أو مش متاح حالياً
          </p>
          <Link
            href="/"
            className="bg-brand-green text-white font-bold py-3 px-8 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            تصفح إعلانات تانية
          </Link>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

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

  /* ── Resolve title/description using Arabic labels ──── */
  const resolvedTitle = (() => {
    const config = getCategoryById(ad.categoryId);
    if (!config) return ad.title;
    const fields = ad.categoryFields as Record<string, unknown>;
    // Regenerate the title from the template using proper subcategory-aware fields
    const generated = generateAutoTitle(config, fields, ad.subcategoryId || undefined);
    // Use regenerated title if it's non-empty and different from a raw-values title
    return generated || ad.title;
  })();

  const resolvedDescription = (() => {
    const config = getCategoryById(ad.categoryId);
    if (!config) return ad.description;
    const fields = ad.categoryFields as Record<string, unknown>;
    const generated = generateAutoDescription(config, fields, ad.subcategoryId || undefined);
    // Use regenerated description if available, fall back to stored
    return generated || ad.description;
  })();

  /* ── Sale type label ───────────────────────────────── */
  const saleLabel =
    ad.saleType === "cash"
      ? `💰 للبيع${ad.isNegotiable ? " — الكلام فيه" : ""}`
      : ad.saleType === "auction"
        ? "🔥 مزاد"
        : "🔄 للتبديل";

  /* ── Member since ──────────────────────────────────── */
  const memberYear = new Date(ad.seller.memberSince).getFullYear();

  return (
    <main className="min-h-screen bg-white pb-40">
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
            <ReportButton targetType="ad" targetId={id} />
            <button
              onClick={handleShare}
              className="p-2 text-gray-text hover:text-dark rounded-full hover:bg-gray-light transition-colors"
              aria-label="مشاركة"
            >
              <Share2 size={20} />
            </button>
            <AddToCollectionButton adId={id} variant="icon" />
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-full transition-colors ${
                isFavorited
                  ? "text-error bg-error/10"
                  : "text-gray-text hover:text-error hover:bg-gray-light"
              }`}
              aria-label={
                isFavorited ? "شيل من المفضلة" : "حفظ في المفضلة"
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

      {/* Video Player */}
      {ad.videoUrl && (
        <div className="px-4 pt-4">
          <div className="rounded-xl overflow-hidden bg-black">
            <video
              src={ad.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[300px] object-contain"
            >
              المتصفح لا يدعم تشغيل الفيديو
            </video>
          </div>
          <p className="text-xs text-gray-text mt-1.5 flex items-center gap-1">
            🎬 فيديو المنتج
          </p>
        </div>
      )}

      {/* Voice Note Player */}
      {ad.voiceNoteUrl && (
        <div className="px-4 pt-3">
          <div className="bg-gray-light rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-dark mb-1">رسالة صوتية من البائع</p>
              <audio
                src={ad.voiceNoteUrl}
                controls
                preload="metadata"
                className="w-full h-8"
                style={{ minWidth: 0 }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {/* Price & sale type */}
        <div>
          {ad.saleType === "cash" && ad.price != null && (
            <p className="text-2xl font-bold text-brand-green mb-1">
              {formatPrice(ad.price)}
            </p>
          )}
          {ad.saleType === "exchange" && (
            <p className="text-xl font-bold text-purple-700 mb-1">
              🔄 تبدّل معايا؟
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

        {/* Reactions Bar */}
        <ReactionsBar adId={ad.id} />

        {/* Title */}
        <h1 className="text-lg font-bold text-dark leading-relaxed">
          {resolvedTitle}
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
          <div className="bg-gradient-to-l from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
              🔄 عايز يبدّل بـ:
            </h3>
            <p className="text-base font-bold text-purple-700">
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
          subcategoryId={ad.subcategoryId}
          categoryFields={ad.categoryFields}
        />

        {/* AI Price Meter — full mode */}
        {ad.saleType === "cash" && ad.price != null && ad.price > 0 && (
          <PriceMeter
            categoryId={ad.categoryId}
            categoryFields={ad.categoryFields as Record<string, unknown>}
            title={ad.title}
            price={ad.price}
            governorate={ad.governorate || undefined}
          />
        )}

        {/* Description */}
        <div>
          <h3 className="text-sm font-bold text-dark mb-2">الوصف</h3>
          <p className="text-sm text-gray-text leading-relaxed whitespace-pre-line">
            {resolvedDescription}
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
                  <Link href={`/user/${ad.seller.id}`} className="font-bold text-dark text-sm hover:text-brand-green transition-colors">
                    {ad.seller.displayName}
                  </Link>
                  <SellerRankBadge rank={sellerRank} size="sm" />
                  <VerificationBadge level={sellerVerificationLevel} />
                  <LoyaltyBadge level={sellerLoyaltyLevel} size="sm" />
                  <UserBadges userId={ad.seller.id} variant="inline" maxInline={2} />
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

            {/* Review & Report buttons for non-sellers */}
            {user && user.id !== ad.seller.id && (
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="text-xs font-semibold text-brand-green hover:text-brand-green-dark transition-colors"
                >
                  قيّم هذا البائع
                </button>
                <ReportButton targetType="user" targetId={ad.seller.id} variant="text" />
              </div>
            )}
          </div>
        </div>

        {/* Mark as Sold (visible to seller on active ads) */}
        {user?.id === ad.seller.id && ad.status !== "sold" && ad.status !== "exchanged" && (
          <MarkAsSoldButton
            adId={ad.id}
            adTitle={ad.title}
            price={ad.price}
            userId={user.id}
            saleType={ad.saleType}
            onMarkedSold={() => window.location.reload()}
            variant="card"
          />
        )}

        {/* Smart Price Drop (visible to seller on cash ads) */}
        {user?.id === ad.seller.id && ad.saleType === "cash" && ad.price != null && ad.status === "active" && (
          <SmartPriceDrop
            adId={ad.id}
            currentPrice={ad.price}
            viewsCount={ad.viewsCount}
            favoritesCount={ad.favoritesCount}
            daysListed={Math.max(1, Math.floor((Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24)))}
            autoDropEnabled={autoDropEnabled}
            onToggleAutoDrop={setAutoDropEnabled}
            onApplyDrop={(newPrice) => {
              setAd((prev) => prev ? { ...prev, price: newPrice } : prev);
            }}
          />
        )}

        {/* Price Offers (visible to seller and logged-in buyers) */}
        {currentUserId && (
          <OffersListSection
            adId={ad.id}
            adTitle={ad.title}
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

        {/* Comments Section */}
        <CommentsSection adId={ad.id} adOwnerId={ad.seller.id} />

        {/* Similar ads section */}
        {similarAds.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-dark mb-3">
              🎯 إعلانات شبه دي — يمكن تعجبك
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

      {/* Bottom contact bar — only for buyers, not the seller */}
      {currentUserId !== ad.seller.id && (
        <ContactBar
          sellerPhone={ad.seller.phone}
          adTitle={ad.title}
          adId={ad.id}
          onChat={handleChat}
        />
      )}

      {/* Share Buttons Modal */}
      {showShareModal && (
        <ShareButtons
          title={resolvedTitle}
          priceText={ad.price ? formatPrice(ad.price) : undefined}
          variant="modal"
          onClose={() => setShowShareModal(false)}
        />
      )}

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
