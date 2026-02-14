"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Plus, Loader2, MapPin, Sparkles } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import AdCard from "@/components/ad/AdCard";
import Button from "@/components/ui/Button";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import PullToRefresh from "@/components/ui/PullToRefresh";

const HorizontalSection = dynamic(
  () => import("@/components/home/HorizontalSection"),
  { ssr: false },
);
const UpgradeToStoreBanner = dynamic(
  () => import("@/components/store/UpgradeToStoreBanner"),
  { ssr: false },
);
const ShoppingAssistantFab = dynamic(
  () => import("@/components/chat/ShoppingAssistantFab"),
  { ssr: false },
);
const RecentlyViewed = dynamic(
  () => import("@/components/home/RecentlyViewed"),
  { ssr: false },
);
const PushPromptBanner = dynamic(
  () => import("@/components/notifications/PushPromptBanner"),
  { ssr: false },
);
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTrackSignal } from "@/lib/hooks/useTrackSignal";
import { getRecommendations } from "@/lib/recommendations/recommendations-service";
import { fetchFeedAds } from "@/lib/ad-data";
import type { AdSummary } from "@/lib/ad-data";
import { toggleFavorite, getFavoriteIds } from "@/lib/favorites/favorites-service";

const categories = [
  { name: "سيارات", slug: "cars" },
  { name: "عقارات", slug: "real-estate" },
  { name: "موبايلات", slug: "phones" },
  { name: "موضة", slug: "fashion" },
  { name: "خردة", slug: "scrap" },
  { name: "ذهب وفضة", slug: "gold" },
  { name: "فاخرة", slug: "luxury" },
  { name: "أجهزة", slug: "appliances" },
  { name: "أثاث", slug: "furniture" },
  { name: "هوايات", slug: "hobbies" },
  { name: "عدد", slug: "tools" },
  { name: "خدمات", slug: "services" },
];

export default function HomePage() {
  const {
    items: feedAds,
    isLoading,
    isLoadingMore,
    hasMore,
    sentinelRef,
    error: feedError,
    retry: retryFeed,
    refresh: refreshFeed,
  } = useInfiniteScroll<AdSummary>({ fetchFn: fetchFeedAds });

  const { requireAuth, user } = useAuth();
  const { track } = useTrackSignal();

  // Personalized recommendation state
  const [personalizedAds, setPersonalizedAds] = useState<AdSummary[]>([]);
  const [matchingAuctions, setMatchingAuctions] = useState<AdSummary[]>([]);
  const [hasSignals, setHasSignals] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites from localStorage
  useEffect(() => {
    setFavoriteIds(new Set(getFavoriteIds()));
  }, []);

  // Capture referral code from URL (?ref=CODE)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      import("@/lib/loyalty/loyalty-service").then(({ storeReferralCode }) => {
        storeReferralCode(ref);
      });
    }
  }, []);

  // Load personalized recommendations
  useEffect(() => {
    const userId = user?.id || "";
    getRecommendations(userId, user?.governorate ?? undefined).then((result) => {
      if (result.personalizedAds.length > 0) {
        setPersonalizedAds(result.personalizedAds);
      }
      if (result.matchingAuctions.length > 0) {
        setMatchingAuctions(result.matchingAuctions);
      }
      setHasSignals(result.hasSignals);
    });
  }, [user]);

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const authedUser = await requireAuth();
      if (!authedUser) return;

      const isNowFavorited = toggleFavorite(id);
      setFavoriteIds(new Set(getFavoriteIds()));

      // Track favorite signal
      if (isNowFavorited) {
        const ad = [...personalizedAds, ...matchingAuctions, ...feedAds].find(
          (a) => a.id === id,
        );
        if (ad) {
          track("favorite", {
            categoryId: null,
            adId: id,
            signalData: { price: ad.price, title: ad.title },
            governorate: ad.governorate,
          });
        }
      }
    },
    [requireAuth, personalizedAds, matchingAuctions, feedAds, track],
  );

  const handlePullRefresh = useCallback(async () => {
    const userId = user?.id || "";
    const [, recResult] = await Promise.all([
      refreshFeed(),
      getRecommendations(userId, user?.governorate ?? undefined),
    ]);
    if (recResult.personalizedAds.length > 0) setPersonalizedAds(recResult.personalizedAds);
    if (recResult.matchingAuctions.length > 0) setMatchingAuctions(recResult.matchingAuctions);
    setFavoriteIds(new Set(getFavoriteIds()));
  }, [refreshFeed, user]);

  return (
    <main className="bg-white">
      {/* ═══ Sticky Top Bar: Header + InstaPay + Search ═══════════ */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Header title="مكسب" showNotifications />

        {/* InstaPay — always visible at top */}
        <a
          href="https://ipn.eg/S/maksab/instapay/QR"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mx-3 mt-1 px-3 py-1.5 bg-gradient-to-l from-emerald-500 to-green-600 rounded-xl text-white active:scale-[0.98] transition-all"
        >
          <span className="text-base leading-none">💳</span>
          <p className="flex-1 text-[11px] font-bold">ادعم مكسب — حوّل عبر إنستاباي</p>
          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md flex-shrink-0" dir="ltr">
            maksab@instapay
          </span>
        </a>

        {/* Welcome message with user name */}
        {user && user.display_name && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-base font-bold text-dark">
              أهلاً يا {user.display_name} 👋
            </p>
            <p className="text-xs text-gray-text mt-0.5">
              عايز تبيع إيه النهاردة؟
            </p>
          </div>
        )}
        {user && !user.display_name && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-base font-bold text-dark">
              أهلاً بيك في مكسب 👋
            </p>
            <p className="text-xs text-gray-text mt-0.5">
              <Link href="/profile/edit" className="text-brand-green font-semibold hover:underline">
                أضف اسمك
              </Link>
              {" "}عشان نرحب بيك صح
            </p>
          </div>
        )}

        {/* Search bar — sticky */}
        <div className="px-3 pt-2 pb-1.5">
          <Link href="/search" className="block">
            <div className="flex items-center gap-3 bg-white rounded-full pe-4 ps-1.5 py-1.5 border-2 border-gray-300 shadow-sm hover:border-brand-green/50 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
                <Search size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="flex-1 text-sm text-gray-text">ابحث في مكسب... سيارات، موبايلات، عقارات</span>
            </div>
          </Link>
        </div>

        {/* Quick search chips */}
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-hide">
          <Link
            href="/price-scanner"
            className="flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 bg-brand-gold-light text-brand-gold text-xs font-semibold rounded-full hover:bg-brand-gold hover:text-white transition-colors"
          >
            <Sparkles size={12} />
            كام سعره؟
          </Link>
          <Link
            href="/map"
            className="flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 bg-brand-green-light text-brand-green text-xs font-semibold rounded-full hover:bg-brand-green hover:text-white transition-colors"
          >
            <MapPin size={12} />
            خريطة
          </Link>
          {["سيارات", "موبايلات", "عقارات", "ذهب وفضة", "أثاث", "خردة"].map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="flex-shrink-0 px-3.5 py-1.5 bg-gray-light text-dark text-xs font-semibold rounded-full hover:bg-brand-green-light hover:text-brand-green transition-colors"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>

      <PullToRefresh onRefresh={handlePullRefresh}>
      {/* ─── 2. Categories Grid ────────────────────────────────── */}
      <section className="px-4 pb-6">
        <h2 className="text-sm font-bold text-dark mb-4">الأقسام</h2>
        <div className="grid grid-cols-4 gap-y-5 gap-x-2">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 group"
            >
              <CategoryIcon slug={cat.slug} size="md" />
              <span className="text-[11px] font-bold text-dark leading-tight text-center group-hover:text-brand-green transition-colors line-clamp-1 max-w-[76px]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Upgrade to Store Banner (individual users only) ──── */}
      {user && (!user.seller_type || user.seller_type === "individual") && (
        <UpgradeToStoreBanner variant="home" />
      )}

      {/* ─── Browse Stores ─────────────────────────────────────── */}
      <section className="px-4 pb-5">
        <Link
          href="/stores"
          className="flex items-center justify-between bg-gradient-to-l from-brand-green-light to-white border border-brand-green/20 rounded-xl p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <p className="text-sm font-bold text-dark">تصفّح المتاجر</p>
              <p className="text-xs text-gray-text">
                اكتشف متاجر موثوقة وعروض حصرية
              </p>
            </div>
          </div>
          <span className="text-gray-text text-lg">←</span>
        </Link>
      </section>

      {/* ─── Push Notification Prompt ────────────────────────── */}
      <PushPromptBanner />

      {/* ─── Recently Viewed ─────────────────────────────────── */}
      <RecentlyViewed />

      {/* ─── 3. Recommended Ads (horizontal scroll) ────────────── */}
      <HorizontalSection
        title="ليك عروض تحفة"
        subtitle={hasSignals ? "على حسب بحثاتك ومفضلاتك" : "إعلانات جديدة ممكن تعجبك"}
        icon="🔥"
        ads={personalizedAds}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ─── 4. Matching Auctions (horizontal scroll) ──────────── */}
      <HorizontalSection
        title="شوف المزادات دي"
        subtitle={hasSignals ? "على حسب اهتماماتك" : "زايد واكسب!"}
        icon="🔥"
        ads={matchingAuctions}
        href="/auctions"
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ─── 5. New Ads Feed (infinite scroll grid) ────────────── */}
      <section className="px-4 pb-6">
        <h2 className="text-sm font-bold text-dark mb-3">جديد على مكسب</h2>

        {isLoading ? (
          <AdGridSkeleton count={4} />
        ) : feedError ? (
          <div className="py-8 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-sm text-gray-text mb-3">حصلت مشكلة في التحميل — معلش!</p>
            <button
              onClick={retryFeed}
              className="text-sm font-bold text-brand-green hover:text-brand-green-dark"
            >
              جرّب تاني
            </button>
          </div>
        ) : feedAds.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {feedAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  {...ad}
                  isFavorited={favoriteIds.has(ad.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="animate-spin text-brand-green" />
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-1" />}

            {/* End of feed */}
            {!hasMore && (
              <p className="text-center text-xs text-gray-text py-6">
                خلاص كده — مفيش إعلانات تانية دلوقتي 👋
              </p>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="py-8 text-center">
            <p className="text-6xl mb-4">🏪</p>
            <h3 className="text-lg font-bold text-dark mb-2">
              أهلاً بيك في مكسب!
            </h3>
            <p className="text-sm text-gray-text mb-1">
              بيع واشتري وبدّل بسهولة
            </p>
            <p className="text-sm text-gray-text mb-4">
              كن أول واحد يضيف إعلان هنا!
            </p>
            <Link href="/ad/create">
              <Button icon={<Plus size={18} />} size="lg">
                أضف إعلان
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* ─── Merchant: Add Regular Ad (green CTA) ────────────── */}
      {user?.seller_type === "store" && user?.store_id && (
        <section className="px-4 pb-6">
          <Link href="/ad/create" className="block">
            <div className="flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-dark active:scale-[0.98] text-white py-3.5 rounded-xl shadow-md shadow-brand-green/20 transition-all">
              <Plus size={20} strokeWidth={2.5} />
              <span className="text-sm font-bold">أضف إعلان</span>
            </div>
          </Link>
        </section>
      )}

      </PullToRefresh>

      <ShoppingAssistantFab />
      <BottomNavWithBadge />
    </main>
  );
}
