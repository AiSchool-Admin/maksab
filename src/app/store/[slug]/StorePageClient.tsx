"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StoreHeader from "@/components/store/StoreHeader";
import PinnedProducts from "@/components/store/PinnedProducts";
import PromotionBanner from "@/components/store/PromotionBanner";
import AdCard from "@/components/ad/AdCard";
import EmptyState from "@/components/ui/EmptyState";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { StoreHeaderSkeleton } from "@/components/store/StoreSkeleton";
import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import { useAuthStore } from "@/stores/auth-store";
import { getCategoryById } from "@/lib/categories/categories-config";
import { generateAutoTitle } from "@/lib/categories/generate";
import {
  getStoreBySlug,
  getStoreProducts,
  getStoreCategories,
  getStorePromotions,
  toggleFollow,
  recordStoreView,
} from "@/lib/stores/store-service";
import type { StoreWithStats, StoreCategory, StorePromotion } from "@/types";

/** Resolve product title using Arabic labels from category config */
function resolveProductTitle(product: Record<string, unknown>): string {
  const storedTitle = product.title as string;
  const categoryId = product.category_id as string | undefined;
  const subcategoryId = product.subcategory_id as string | undefined;
  const categoryFields = (product.category_fields as Record<string, unknown>) ?? {};
  if (!categoryId) return storedTitle;
  const config = getCategoryById(categoryId);
  if (!config) return storedTitle;
  return generateAutoTitle(config, categoryFields, subcategoryId || undefined) || storedTitle;
}

export default function StorePageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [store, setStore] = useState<StoreWithStats | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [pinnedProducts, setPinnedProducts] = useState<
    Record<string, unknown>[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  const isOwner = user?.id === store?.user_id;

  // Load store data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const storeData = await getStoreBySlug(slug, user?.id);
      if (cancelled) return;
      if (!storeData) {
        setIsLoading(false);
        return;
      }
      setStore(storeData);

      // Parallel fetches — wrapped individually so one failure doesn't block others
      try {
        const [cats, promos, prods] = await Promise.all([
          getStoreCategories(storeData.id).catch(() => []),
          getStorePromotions(storeData.id).catch(() => []),
          getStoreProducts(storeData.id).catch(() => ({ products: [], total: 0 })),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setPromotions(promos);
        setProducts(prods.products as unknown as Record<string, unknown>[]);

        // Filter pinned
        const pinned = (prods.products as unknown as Record<string, unknown>[]).filter(
          (p) => p.is_pinned,
        );
        setPinnedProducts(pinned);
      } catch {
        // Secondary data failed — store still displays
      }

      // Record view (fire-and-forget)
      recordStoreView(storeData.id).catch(() => {});
      if (!cancelled) setIsLoading(false);
    }
    load();

    return () => { cancelled = true; };
  }, [slug, user?.id]);

  // Filter products by category
  const handleCategoryFilter = useCallback(
    async (catId: string | null) => {
      if (!store) return;
      setSelectedCategory(catId);
      setProductsLoading(true);
      try {
        const result = await getStoreProducts(store.id, {
          categoryId: catId || undefined,
        });
        setProducts(result.products as unknown as Record<string, unknown>[]);
      } catch {
        // Keep existing products on error
      } finally {
        setProductsLoading(false);
      }
    },
    [store],
  );

  // Toggle follow
  const handleFollowToggle = useCallback(async () => {
    if (!user || !store) return;
    const isNowFollowing = await toggleFollow(store.id, user.id);
    setStore((prev) =>
      prev
        ? {
            ...prev,
            is_following: isNowFollowing,
            total_followers:
              prev.total_followers + (isNowFollowing ? 1 : -1),
          }
        : prev,
    );
  }, [user, store]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StoreHeaderSkeleton />
        <div className="p-4">
          <AdGridSkeleton count={4} cols={2} />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon="🏪"
          title="المتجر غير موجود"
          description="المتجر اللي بتدور عليه مش موجود أو تم إيقافه"
          actionLabel="ارجع للرئيسية"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Back button */}
      <div className="fixed top-0 start-0 z-50 p-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Store Header */}
      <StoreHeader
        store={store}
        isOwner={isOwner}
        onFollowToggle={handleFollowToggle}
      />

      {/* Promotions */}
      {promotions.length > 0 && (
        <section className="px-4 mt-4">
          <h3 className="text-sm font-bold text-dark mb-2">🏷️ العروض الحالية</h3>
          <div className="space-y-2">
            {promotions.slice(0, 3).map((promo) => (
              <PromotionBanner key={promo.id} promotion={promo} />
            ))}
          </div>
        </section>
      )}

      {/* Pinned Products */}
      {pinnedProducts.length > 0 && (
        <div className="px-4 mt-4">
          <PinnedProducts
            products={pinnedProducts.map((p) => ({
              id: p.id as string,
              title: resolveProductTitle(p),
              price: p.price as number | null,
              sale_type: p.sale_type as "cash" | "auction" | "exchange",
              images: (p.images as string[]) || [],
              governorate: p.governorate as string | null,
              city: p.city as string | null,
              created_at: p.created_at as string,
              is_negotiable: p.is_negotiable as boolean | undefined,
              exchange_description: p.exchange_description as
                | string
                | undefined,
            }))}
          />
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                !selectedCategory
                  ? "bg-brand-green text-white"
                  : "bg-white text-gray-text border border-gray-light"
              }`}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryFilter(cat.id)}
                className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-brand-green text-white"
                    : "bg-white text-gray-text border border-gray-light"
                }`}
              >
                {cat.name}
                {cat.products_count > 0 && (
                  <span className="ms-1 opacity-70">
                    ({cat.products_count})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-dark">
            المنتجات ({store.total_products})
          </h3>
        </div>

        {productsLoading ? (
          <AdGridSkeleton count={4} cols={2} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <AdCard
                key={product.id as string}
                id={product.id as string}
                title={resolveProductTitle(product)}
                price={product.price ? Number(product.price) : null}
                saleType={
                  product.sale_type as "cash" | "auction" | "exchange"
                }
                image={
                  ((product.images as string[]) || [])[0] || null
                }
                governorate={product.governorate as string | null}
                city={product.city as string | null}
                createdAt={product.created_at as string}
                isNegotiable={product.is_negotiable as boolean | undefined}
                exchangeDescription={
                  product.exchange_description as string | undefined
                }
                useDayPrice={Boolean((product.category_fields as Record<string, unknown>)?.use_day_price)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📦"
            title="مفيش منتجات لسه"
            description="المتجر ده لسه مضافش منتجات"
          />
        )}
      </div>

      {/* Reviews link */}
      <div className="px-4 mt-6">
        <Link
          href={`/store/${slug}/reviews`}
          className="flex items-center justify-between bg-white rounded-xl border border-gray-light p-4 hover:shadow-sm transition-shadow"
        >
          <div>
            <h3 className="text-sm font-bold text-dark">
              التقييمات ({store.total_reviews})
            </h3>
            <p className="text-xs text-gray-text">
              تقييم عام: {(store.avg_rating || 0).toFixed(1)} من 5
            </p>
          </div>
          <ArrowRight size={16} className="text-gray-text rotate-180" />
        </Link>
      </div>

      {/* Owner CTA */}
      {isOwner && (
        <div className="px-4 mt-4">
          <Link
            href="/store/dashboard"
            className="block bg-brand-green text-white text-center text-sm font-bold py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            لوحة تحكم المتجر
          </Link>
        </div>
      )}

      <BottomNavWithBadge />
    </div>
  );
}
