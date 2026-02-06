"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import AdCard from "@/components/ad/AdCard";
import HorizontalSection from "@/components/home/HorizontalSection";
import Button from "@/components/ui/Button";
import { AdGridSkeleton, AdCardSkeleton } from "@/components/ui/SkeletonLoader";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { recommendedAds, auctionAds, fetchFeedAds } from "@/lib/mock-data";
import type { MockAd } from "@/lib/mock-data";

const categories = [
  { icon: "🚗", name: "سيارات", slug: "cars" },
  { icon: "🏠", name: "عقارات", slug: "real-estate" },
  { icon: "📱", name: "موبايلات", slug: "phones" },
  { icon: "👗", name: "موضة", slug: "fashion" },
  { icon: "♻️", name: "خردة", slug: "scrap" },
  { icon: "💰", name: "ذهب", slug: "gold" },
  { icon: "💎", name: "فاخرة", slug: "luxury" },
  { icon: "🏠", name: "أجهزة", slug: "appliances" },
  { icon: "🪑", name: "أثاث", slug: "furniture" },
  { icon: "🎮", name: "هوايات", slug: "hobbies" },
  { icon: "🔧", name: "عدد", slug: "tools" },
  { icon: "🛠️", name: "خدمات", slug: "services" },
];

export default function HomePage() {
  const {
    items: feedAds,
    isLoading,
    isLoadingMore,
    hasMore,
    sentinelRef,
  } = useInfiniteScroll<MockAd>({ fetchFn: fetchFeedAds });

  const handleToggleFavorite = useCallback((id: string) => {
    // Will integrate with Supabase favorites later
    console.log("toggle favorite", id);
  }, []);

  return (
    <main className="bg-white">
      <Header title="مكسب" showNotifications />

      {/* ─── 1. Search Bar ─────────────────────────────────────── */}
      <Link href="/search" className="block px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-gray-light rounded-xl px-4 py-3">
          <Search size={18} className="text-gray-text flex-shrink-0" />
          <span className="text-gray-text text-sm">ابحث في مكسب...</span>
        </div>
      </Link>

      {/* Quick search chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
        {["سيارات", "موبايلات", "عقارات", "ذهب", "أثاث"].map((term) => (
          <Link
            key={term}
            href={`/search?q=${encodeURIComponent(term)}`}
            className="flex-shrink-0 px-3 py-1.5 bg-brand-green-light text-brand-green-dark text-xs font-semibold rounded-full hover:bg-brand-green/10 transition-colors"
          >
            {term}
          </Link>
        ))}
      </div>

      {/* ─── 2. Categories Grid ────────────────────────────────── */}
      <section className="px-4 pb-5">
        <h2 className="text-sm font-bold text-dark mb-3">الأقسام</h2>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gray-light hover:bg-brand-green-light active:scale-95 transition-all"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[11px] font-medium text-dark leading-tight text-center">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 3. Recommended Ads (horizontal scroll) ────────────── */}
      <HorizontalSection
        title="عروض مقترحة ليك"
        subtitle="بناءً على اهتماماتك"
        icon="🔥"
        ads={recommendedAds}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ─── 4. Matching Auctions (horizontal scroll) ──────────── */}
      <HorizontalSection
        title="مزادات تناسبك"
        icon="🔨"
        ads={auctionAds}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ─── 5. New Ads Feed (infinite scroll grid) ────────────── */}
      <section className="px-4 pb-6">
        <h2 className="text-sm font-bold text-dark mb-3">إعلانات جديدة</h2>

        {isLoading ? (
          <AdGridSkeleton count={4} />
        ) : feedAds.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {feedAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  {...ad}
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
                وصلت للآخر — مفيش إعلانات تانية دلوقتي
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
            <p className="text-sm text-gray-text mb-4">
              لسه مفيش إعلانات. كن أول واحد يضيف إعلان!
            </p>
            <Link href="/ad/create">
              <Button icon={<Plus size={18} />} size="lg">
                أضف إعلان
              </Button>
            </Link>
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
