"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import StoreCard from "@/components/store/StoreCard";
import EmptyState from "@/components/ui/EmptyState";
import { StoresGridSkeleton } from "@/components/store/StoreSkeleton";
import { getStores } from "@/lib/stores/store-service";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { governorates } from "@/lib/data/governorates";
import type { StoreWithStats } from "@/types";

export default function StoresDirectoryPage() {
  const [stores, setStores] = useState<StoreWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedGov, setSelectedGov] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-dark mb-3">🏪 المتاجر</h1>

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
        ) : (
          <EmptyState
            icon="🏪"
            title="مفيش متاجر"
            description="مفيش متاجر تطابق البحث. جرب تغير الفلاتر"
          />
        )}
      </div>
    </div>
  );
}
