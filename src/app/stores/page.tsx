"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, Plus, Store, ChevronRight, Home } from "lucide-react";
import StoreCard from "@/components/store/StoreCard";
import EmptyState from "@/components/ui/EmptyState";
import { StoresGridSkeleton } from "@/components/store/StoreSkeleton";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { getStores } from "@/lib/stores/store-service";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { governorates } from "@/lib/data/governorates";
import { useAuth } from "@/components/auth/AuthProvider";
import type { StoreWithStats } from "@/types";

export default function StoresDirectoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedGov, setSelectedGov] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const hasFilters = !!(search || selectedCategory || selectedGov);

  const loadStores = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (reset) setPage(1);
    setIsLoading(true);

    const result = await getStores({
      search: search || undefined,
      category: selectedCategory || undefined,
      governorate: selectedGov || undefined,
      page: currentPage,
      limit: 20,
    });

    if (reset) {
      setStores(result.stores);
    } else {
      setStores((prev) => [...prev, ...result.stores]);
    }
    setTotal(result.total);
    setIsLoading(false);
  }, [search, selectedCategory, selectedGov, page]);

  useEffect(() => {
    loadStores(true);
  }, [selectedCategory, selectedGov]);

  const handleSearch = () => {
    loadStores(true);
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (page > 1) loadStores(false);
  }, [page]);

  const isStoreOwner = user?.seller_type === "store";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1 -me-1 text-gray-text hover:text-dark transition-colors"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <Link href="/" className="p-1.5 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors" aria-label="الرئيسية">
              <Home size={18} />
            </Link>
            <h1 className="text-2xl font-bold text-dark">🏪 المتاجر</h1>
          </div>
          {isStoreOwner ? (
            <Link
              href="/store/dashboard"
              className="text-xs font-bold text-brand-green bg-brand-green-light px-3 py-1.5 rounded-full"
            >
              متجري
            </Link>
          ) : (
            <Link
              href="/store/create"
              className="text-xs font-bold text-white bg-brand-green px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <Plus size={14} />
              افتح محلك
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-text"
            />
            <input
              type="text"
              placeholder="ابحث عن متجر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full bg-gray-50 border border-gray-light rounded-xl ps-9 pe-3 py-2.5 text-sm text-dark placeholder-gray-text focus:outline-none focus:border-brand-green"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showFilters
                ? "bg-brand-green text-white border-brand-green"
                : "bg-white text-gray-text border-gray-light"
            }`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-sm text-dark"
            >
              <option value="">كل الأقسام</option>
              {categoriesConfig.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <select
              value={selectedGov}
              onChange={(e) => setSelectedGov(e.target.value)}
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-sm text-dark"
            >
              <option value="">كل المحافظات</option>
              {governorates.map((gov) => (
                <option key={gov} value={gov}>
                  {gov}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Category chips */}
      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categoriesConfig.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.id ? "" : cat.id,
                )
              }
              className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                selectedCategory === cat.id
                  ? "bg-brand-green text-white"
                  : "bg-white text-gray-text border border-gray-light"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 mt-3">
        {!isLoading && (
          <p className="text-xs text-gray-text mb-3">
            {total} متجر
          </p>
        )}

        {isLoading && stores.length === 0 ? (
          <StoresGridSkeleton count={6} />
        ) : stores.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  followersCount={store.total_followers}
                  productsCount={store.total_products}
                  avgRating={store.avg_rating}
                  totalReviews={store.total_reviews}
                />
              ))}
            </div>
            {stores.length < total && (
              <button
                onClick={loadMore}
                className="w-full text-sm text-brand-green font-semibold py-4 mt-3 hover:bg-brand-green-light rounded-xl transition-colors"
              >
                {isLoading ? "جاري التحميل..." : "عرض المزيد"}
              </button>
            )}
          </>
        ) : hasFilters ? (
          /* No search results */
          <EmptyState
            icon="🔍"
            title="مفيش نتائج"
            description="مفيش متاجر تطابق البحث. جرب تغير الفلاتر"
          />
        ) : (
          /* No stores at all — show CTA to create a store */
          <div className="py-12 text-center px-4">
            <div className="w-24 h-24 bg-brand-green-light rounded-full flex items-center justify-center mx-auto mb-5">
              <Store size={40} className="text-brand-green" />
            </div>
            <h3 className="text-xl font-bold text-dark mb-2">
              كن أول تاجر على مكسب!
            </h3>
            <p className="text-sm text-gray-text mb-2 max-w-xs mx-auto">
              افتح محلك مجاناً واعرض منتجاتك لآلاف المشترين
            </p>
            <div className="flex flex-col gap-2 mt-6 max-w-xs mx-auto">
              <div className="flex items-center gap-3 text-start bg-white rounded-xl p-3 border border-gray-light">
                <span className="text-lg">1️⃣</span>
                <div>
                  <p className="text-sm font-bold text-dark">سجّل دخولك</p>
                  <p className="text-[11px] text-gray-text">برقم موبايلك في ثانية</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-start bg-white rounded-xl p-3 border border-gray-light">
                <span className="text-lg">2️⃣</span>
                <div>
                  <p className="text-sm font-bold text-dark">افتح محلك</p>
                  <p className="text-[11px] text-gray-text">اختار اسم وقسم وخصّص الشكل</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-start bg-white rounded-xl p-3 border border-gray-light">
                <span className="text-lg">3️⃣</span>
                <div>
                  <p className="text-sm font-bold text-dark">اعرض منتجاتك</p>
                  <p className="text-[11px] text-gray-text">أضف إعلانات وابدأ بيع</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/store/create")}
              className="mt-6 bg-brand-green text-white text-sm font-bold px-8 py-3 rounded-xl hover:bg-brand-green-dark transition-colors inline-flex items-center gap-2"
            >
              <Store size={18} />
              افتح محلك دلوقتي — مجاناً
            </button>
          </div>
        )}
      </div>

      {/* FAB — Create Store (for individual users) */}
      {!isStoreOwner && (
        <Link
          href="/store/create"
          className="fixed bottom-20 end-4 z-40 w-14 h-14 bg-brand-green text-white rounded-full shadow-lg shadow-brand-green/30 flex items-center justify-center hover:bg-brand-green-dark active:scale-95 transition-all"
          aria-label="افتح محلك"
        >
          <Store size={24} />
        </Link>
      )}

      <BottomNavWithBadge />
    </div>
  );
}
