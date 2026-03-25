"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Plus, MapPin, TrendingUp } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import AdCard from "@/components/ad/AdCard";
import Button from "@/components/ui/Button";

import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import PullToRefresh from "@/components/ui/PullToRefresh";

const HorizontalSection = dynamic(
  () => import("@/components/home/HorizontalSection"),
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
const BuyRequestCard = dynamic(
  () => import("@/components/buy/BuyRequestCard"),
  { ssr: false },
);
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTrackSignal } from "@/lib/hooks/useTrackSignal";
import { getRecommendations } from "@/lib/recommendations/recommendations-service";
import { fetchFeedAds, fetchNewListings, isVeryFreshAd } from "@/lib/ad-data";
import type { AdSummary } from "@/lib/ad-data";
import { toggleFavorite, getFavoriteIds } from "@/lib/favorites/favorites-service";
import {
  fetchMyBuyRequests,
  fetchActiveBuyRequests,
  type BuyRequest,
} from "@/lib/buy-requests/buy-request-service";
import {
  getTrendingSearches,
  type TrendingSearch,
} from "@/lib/search/search-service";

const categories = [
  { name: "سيارات", slug: "cars" },
  { name: "عقارات", slug: "real-estate" },
];

/** Active category/governorate filters for Alexandria MVP */
const ACTIVE_CATS = ['cars', 'vehicles', 'properties', 'real-estate', 'real_estate', 'سيارات', 'عقارات'];
const ACTIVE_GOV = ['alexandria', 'الإسكندرية'];

export default function HomePage() {
  const {
    items: feedAds,
    isLoading,
    isLoadingMore,
    error: feedError,
    retry: retryFeed,
    refresh: refreshFeed,
    sentinelRef,
  } = useInfiniteScroll<AdSummary>({ fetchFn: fetchFeedAds });

  // New listings state (fresh ads from last 72 hours, diversified)
  const [newListings, setNewListings] = useState<AdSummary[]>([]);
  const [newListingsCount, setNewListingsCount] = useState(0);
  const [newListingsLoading, setNewListingsLoading] = useState(true);

  const { requireAuth, user } = useAuth();
  const { track } = useTrackSignal();

  // Personalized recommendation state
  const [personalizedAds, setPersonalizedAds] = useState<AdSummary[]>([]);
  const [matchingAuctions, setMatchingAuctions] = useState<AdSummary[]>([]);
  const [hasSignals, setHasSignals] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Trending searches state
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);

  // Buy requests state
  const [myBuyRequests, setMyBuyRequests] = useState<BuyRequest[]>([]);
  const [recentBuyRequests, setRecentBuyRequests] = useState<BuyRequest[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    setFavoriteIds(new Set(getFavoriteIds()));
  }, []);

  // Load new listings (fresh ads from last 72 hours, diversified across categories)
  useEffect(() => {
    setNewListingsLoading(true);
    fetchNewListings(0).then(({ ads, totalNew }) => {
      setNewListings(ads);
      setNewListingsCount(totalNew);
      setNewListingsLoading(false);
    }).catch(() => setNewListingsLoading(false));
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
    const userId = user?.id ?? "";
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

  // Load trending searches
  useEffect(() => {
    getTrendingSearches(8).then(setTrendingSearches);
  }, []);

  // Load buy requests
  useEffect(() => {
    fetchActiveBuyRequests(10).then(setRecentBuyRequests);
    if (user) {
      fetchMyBuyRequests().then(setMyBuyRequests);
    }
  }, [user]);

  // Auto-request notification permission after 3 seconds
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    const timer = setTimeout(() => {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const authedUser = await requireAuth();
      if (!authedUser) return;

      const isNowFavorited = toggleFavorite(id);
      setFavoriteIds(new Set(getFavoriteIds()));

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
    const [, recResult, newResult] = await Promise.all([
      refreshFeed(),
      getRecommendations(userId, user?.governorate ?? undefined),
      fetchNewListings(0),
    ]);
    if (recResult.personalizedAds.length > 0) setPersonalizedAds(recResult.personalizedAds);
    if (recResult.matchingAuctions.length > 0) setMatchingAuctions(recResult.matchingAuctions);
    setNewListings(newResult.ads);
    setNewListingsCount(newResult.totalNew);
    setFavoriteIds(new Set(getFavoriteIds()));
    fetchActiveBuyRequests(10).then(setRecentBuyRequests);
    getTrendingSearches(8).then(setTrendingSearches);
    if (user) fetchMyBuyRequests().then(setMyBuyRequests);
  }, [refreshFeed, user]);

  const adsByCategory = feedAds.reduce<Record<string, AdSummary[]>>((acc, ad) => {
    const catSlug = ad.categoryId || "other";
    if (!acc[catSlug]) acc[catSlug] = [];
    acc[catSlug].push(ad);
    return acc;
  }, {});


  return (
    <main className="bg-white">
      {/* ═══ Sticky Top Bar ═══════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Header title="مكسب" showNotifications />

        {user && user.display_name && (
          <div className="px-4 pt-2 pb-0.5">
            <p className="text-base font-bold text-dark">
              أهلاً يا {user.display_name} 👋
            </p>
          </div>
        )}
        {user && !user.display_name && (
          <div className="px-4 pt-2 pb-0.5">
            <p className="text-base font-bold text-dark">
              أهلاً بيك في مكسب 👋
            </p>
            <p className="text-sm text-gray-text mt-0.5">
              <Link href="/profile/edit" className="text-brand-green font-semibold hover:underline">
                أضف اسمك
              </Link>
              {" "}عشان نرحب بيك صح
            </p>
          </div>
        )}

        {/* Search bar */}
        <div className="px-3 pt-2 pb-1.5">
          <Link href="/search" className="block">
            <div className="flex items-center gap-3 bg-white rounded-2xl pe-4 ps-2 py-2.5 border-2 border-gray-800 hover:border-brand-green transition-colors duration-200">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-green to-emerald-600 flex items-center justify-center flex-shrink-0">
                <Search size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="flex-1 text-sm text-gray-400">ابحث في مكسب...</span>
            </div>
          </Link>
        </div>

      </div>

      <PullToRefresh onRefresh={handlePullRefresh}>
          {/* Trending Searches — filtered to cars/properties */}
          {trendingSearches.filter(s => ACTIVE_CATS.some(c => s.query.includes(c) || /سيار|عقار|شق|فيل|أرض|عربي|car|proper/i.test(s.query))).length > 0 && (
            <section className="px-4 pt-2 pb-1">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={14} className="text-brand-green" />
                <h3 className="text-xs font-bold text-gray-text">الأكثر بحثاً</h3>
                <span className="text-[8px] text-gray-text bg-gray-100 px-1.5 py-0.5 rounded-full">مباشر</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trendingSearches.filter(s => ACTIVE_CATS.some(c => s.query.includes(c) || /سيار|عقار|شق|فيل|أرض|عربي|car|proper/i.test(s.query))).map((item, i) => (
                  <Link
                    key={item.query}
                    href={`/search?q=${encodeURIComponent(item.query)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-light rounded-full hover:bg-brand-green-light hover:text-brand-green transition-colors"
                  >
                    <span className={`text-[10px] font-bold ${i < 3 ? "text-brand-green" : "text-gray-text"}`}>
                      {i + 1}
                    </span>
                    <span className="text-xs text-dark font-medium">{item.query}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Alexandria Category Tabs */}
          <section className="px-4 pt-2 pb-1">
            <h2 className="text-lg font-bold text-dark mb-3">تصفح الإسكندرية</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/browse/vehicles/alexandria"
                className="flex items-center gap-3 p-4 bg-gradient-to-l from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl hover:shadow-md transition-all active:scale-[0.98]"
              >
                <span className="text-3xl">🚗</span>
                <div>
                  <span className="text-base font-bold text-dark block">سيارات</span>
                  <span className="text-[11px] text-gray-text">الإسكندرية</span>
                </div>
              </Link>
              <Link
                href="/browse/properties/alexandria"
                className="flex items-center gap-3 p-4 bg-gradient-to-l from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl hover:shadow-md transition-all active:scale-[0.98]"
              >
                <span className="text-3xl">🏠</span>
                <div>
                  <span className="text-base font-bold text-dark block">عقارات</span>
                  <span className="text-[11px] text-gray-text">الإسكندرية</span>
                </div>
              </Link>
            </div>
          </section>

          {/* Map link */}
          <div className="px-4 pb-2">
            <Link
              href="/map"
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green-light rounded-xl hover:bg-green-100 transition-colors"
            >
              <MapPin size={18} className="text-brand-green" />
              <span className="text-sm font-bold text-brand-green">عرض الإعلانات على الخريطة</span>
            </Link>
          </div>

          <RecentlyViewed />

          <HorizontalSection
            title="ليك عروض تحفة"
            subtitle={hasSignals ? "على حسب بحثاتك ومفضلاتك" : "إعلانات جديدة ممكن تعجبك"}
            icon="🔥"
            ads={personalizedAds.filter(ad => !ad.categoryId || ACTIVE_CATS.includes(ad.categoryId))}
            onToggleFavorite={handleToggleFavorite}
          />

          <HorizontalSection
            title="شوف المزادات دي"
            subtitle={hasSignals ? "على حسب اهتماماتك" : "زايد واكسب!"}
            icon="🔥"
            ads={matchingAuctions.filter(ad => !ad.categoryId || ACTIVE_CATS.includes(ad.categoryId))}
            href="/auctions"
            onToggleFavorite={handleToggleFavorite}
          />

          {/* ═══ New Listings — Fresh ads from last 72 hours, diversified ═══ */}
          {newListingsLoading ? (
            <section className="px-3 pb-1.5">
              <h2 className="text-xl font-bold text-dark mb-1.5">جديد على مكسب ✨</h2>
              <AdGridSkeleton count={6} />
            </section>
          ) : newListings.length > 0 && (
            <section className="px-3 pb-1.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-dark">جديد على مكسب ✨</h2>
                  {newListingsCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green">
                      {newListingsCount > 99 ? "+99" : newListingsCount} إعلان
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-text">آخر 3 أيام</span>
              </div>
              <p className="text-xs text-gray-text mb-2">
                إعلانات طازة — سيارات وعقارات الإسكندرية
              </p>
              <div className="grid grid-cols-3 gap-2">
                {newListings.map((ad, idx) => (
                  <AdCard
                    key={`new-${ad.id}`}
                    {...ad}
                    isFavorited={favoriteIds.has(ad.id)}
                    onToggleFavorite={handleToggleFavorite}
                    priority={idx < 3}
                    showFreshBadge={isVeryFreshAd(ad.createdAt)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ═══ Category Browse Sections ═══ */}
          {isLoading ? (
            <section className="px-3 pb-1.5">
              <AdGridSkeleton count={6} />
            </section>
          ) : feedError ? (
            <section className="px-3 pb-1.5">
              <div className="py-6 text-center">
                <p className="text-4xl mb-3">⚠️</p>
                <p className="text-sm text-gray-text mb-3">حصلت مشكلة في التحميل — معلش!</p>
                <button
                  onClick={retryFeed}
                  className="text-sm font-bold text-brand-green hover:text-brand-green-dark"
                >
                  جرّب تاني
                </button>
              </div>
            </section>
          ) : feedAds.length > 0 ? (
            <>
              {categories.map((cat) => {
                const catAds = adsByCategory[cat.slug] || adsByCategory[cat.slug.replace("-", "_")] || [];
                if (catAds.length === 0) return null;
                return (
                  <section key={cat.slug} className="px-3 pb-1.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <h2 className="text-xl font-bold text-dark">{cat.name}</h2>
                      <Link
                        href={`/search?category=${cat.slug}`}
                        className="text-xs font-bold text-brand-green hover:underline"
                      >
                        عرض الكل ←
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {catAds.slice(0, 6).map((ad) => (
                        <AdCard
                          key={ad.id}
                          {...ad}
                          isFavorited={favoriteIds.has(ad.id)}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
              {/* Infinite scroll sentinel — loads more ads to populate category sections */}
              <div ref={sentinelRef} className="h-4" />
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            <section className="px-3 pb-1.5">
              <div className="py-6 text-center">
                <p className="text-5xl mb-3">🏪</p>
                <h3 className="text-lg font-bold text-dark mb-2">أهلاً بيك في مكسب!</h3>
                <p className="text-sm text-gray-text mb-1">بيع واشتري وبدّل بسهولة</p>
                <p className="text-sm text-gray-text mb-4">كن أول واحد يضيف إعلان هنا!</p>
                <Link href="/ad/create">
                  <Button icon={<Plus size={18} />} size="lg">
                    أضف إعلان في ٣ خطوات
                  </Button>
                </Link>
              </div>
            </section>
          )}

          {/* ═══ Buy Requests Section — bottom of page ═══ */}
          {/* My Buy Requests — filtered to active categories */}
          {myBuyRequests.filter(r => !r.categoryId || ACTIVE_CATS.includes(r.categoryId)).length > 0 && (
            <section className="px-4 pb-1.5">
              <h3 className="text-sm font-bold text-dark mb-2">طلبات الشراء بتاعتك</h3>
              <div className="space-y-2">
                {myBuyRequests.filter(r => !r.categoryId || ACTIVE_CATS.includes(r.categoryId)).slice(0, 3).map((req) => (
                  <BuyRequestCard key={req.id} request={req} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Buy Requests from others — filtered to active categories */}
          {recentBuyRequests.filter((r) => r.userId !== user?.id && (!r.categoryId || ACTIVE_CATS.includes(r.categoryId))).length > 0 && (
            <section className="pb-2">
              <div className="mx-4 mb-3 bg-gradient-to-l from-amber-50 to-yellow-50 border border-brand-gold/20 rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-dark flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-brand-gold text-white">مطلوب 🛒</span>
                      ناس عايزة تشتري
                    </h2>
                    <p className="text-xs text-gray-text mt-1">عندك حاجة من دي؟ تواصل معاهم وقدّم عرضك!</p>
                  </div>
                  <Link href="/buy-requests" className="text-xs text-brand-gold font-bold hover:underline whitespace-nowrap">
                    عرض الكل ←
                  </Link>
                </div>
              </div>
              <div
                className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {recentBuyRequests
                  .filter((r) => r.userId !== user?.id && (!r.categoryId || ACTIVE_CATS.includes(r.categoryId)))
                  .slice(0, 10)
                  .map((req) => (
                    <div key={req.id} className="flex-shrink-0 w-[200px] snap-start">
                      <BuyRequestCard request={req} showChat compact />
                    </div>
                  ))}
              </div>
            </section>
          )}

          {user?.seller_type === "store" && user?.store_id && (
            <section className="px-4 pb-2">
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
