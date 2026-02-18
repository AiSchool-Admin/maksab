"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import InstaPayLogo from "@/components/ui/InstaPayLogo";
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

  // Load personalized recommendations (use empty fallback for unauthenticated users)
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

  // Group feed ads by category for browse sections
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

        {/* Welcome message with user name */}
        {user && user.display_name && (
          <div className="px-4 pt-2 pb-0.5">
            <p className="text-base font-bold text-dark">
              أهلاً يا {user.display_name} 👋
            </p>
            <p className="text-sm text-gray-text mt-0.5">
              عايز تبيع إيه النهاردة؟
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

        {/* Search bar — black border */}
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

        {/* Quick search chips — no price scanner or map */}
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-hide">
          {["سيارات", "موبايلات", "عقارات", "ذهب وفضة", "أثاث", "خردة", "أجهزة", "موضة"].map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="flex-shrink-0 px-3.5 py-1.5 bg-gray-light text-dark text-xs font-bold rounded-full hover:bg-brand-green-light hover:text-brand-green transition-colors"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>

      <PullToRefresh onRefresh={handlePullRefresh}>
      {/* ─── Categories Grid ─────────────────────────────────────── */}
      <section className="px-4 pb-1.5 pt-1">
        <h2 className="text-xl font-bold text-dark mb-2">الأقسام</h2>
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-1.5 group"
            >
              <CategoryIcon slug={cat.slug} size="md" />
              <span className="text-xs font-bold text-dark leading-tight text-center group-hover:text-brand-green transition-colors line-clamp-1 max-w-[76px]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Commission / InstaPay — compact inline ────────────── */}
      <div className="px-4 pb-1">
        <a
          href="https://ipn.eg/S/maksab/instapay/QR"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
        >
          <InstaPayLogo size={30} />
          <p className="text-xs text-gray-text">
            <span className="font-bold text-emerald-600">عمولة 1% بس.. وبمزاجك</span>
            {" · "}لو الصفقة عجبتك ادعمنا عبر إنستاباي
          </p>
        </a>
      </div>

      {/* ─── Upgrade to Store Banner (individual users only) ──── */}
      {user && (!user.seller_type || user.seller_type === "individual") && (
        <UpgradeToStoreBanner variant="home" />
      )}

      {/* ─── Browse Stores ─────────────────────────────────────── */}
      <section className="px-4 pb-1.5">
        <Link
          href="/stores"
          className="flex items-center justify-between bg-gradient-to-l from-brand-green-light to-white border border-brand-green/20 rounded-xl p-3 hover:shadow-sm transition-shadow"
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

      {/* ─── Recommended Ads (horizontal scroll) ────────────── */}
      <HorizontalSection
        title="ليك عروض تحفة"
        subtitle={hasSignals ? "على حسب بحثاتك ومفضلاتك" : "إعلانات جديدة ممكن تعجبك"}
        icon="🔥"
        ads={personalizedAds}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ─── Matching Auctions (horizontal scroll) ──────────── */}
      <HorizontalSection
        title="شوف المزادات دي"
        subtitle={hasSignals ? "على حسب اهتماماتك" : "زايد واكسب!"}
        icon="🔥"
        ads={matchingAuctions}
        href="/auctions"
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ─── New Ads Feed (3-col grid) ───────────────────────── */}
      <section className="px-3 pb-1.5">
        <h2 className="text-xl font-bold text-dark mb-1.5">جديد على مكسب</h2>

        {isLoading ? (
          <AdGridSkeleton count={6} />
        ) : feedError ? (
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
        ) : feedAds.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {feedAds.slice(0, 6).map((ad) => (
              <AdCard
                key={ad.id}
                {...ad}
                isFavorited={favoriteIds.has(ad.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-6 text-center">
            <p className="text-5xl mb-3">🏪</p>
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

      {/* ─── Category Browse Sections ─────────────────────────── */}
      {categories.map((cat) => {
        const catAds = adsByCategory[cat.slug] || adsByCategory[cat.slug.replace("-", "_")] || [];
        if (catAds.length === 0) return null;
        return (
          <section key={cat.slug} className="px-3 pb-1.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-dark">{cat.name}</h2>
              </div>
              <Link
                href={`/search?category=${cat.slug}`}
                className="text-xs font-bold text-brand-green hover:underline"
              >
                عرض الكل ←
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {catAds.slice(0, 3).map((ad) => (
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

      {/* ─── Merchant: Add Regular Ad (green CTA) ────────────── */}
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
