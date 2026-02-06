"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader2, SearchX } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";
import FilterChips, {
  type ActiveFilters,
} from "@/components/search/FilterChips";
import CategoryFilters from "@/components/search/CategoryFilters";
import SortOptions from "@/components/search/SortOptions";
import AdCard from "@/components/ad/AdCard";
import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTrackSignal } from "@/lib/hooks/useTrackSignal";
import { saveRecentSearch } from "@/lib/search/recent-searches";
import { parseSearchQuery } from "@/lib/search/smart-parser";
import {
  searchAds,
  getSimilarSearchAds,
  type SearchFilters,
} from "@/lib/search/mock-search";
import { getEnhancedSimilarAds } from "@/lib/recommendations/recommendations-service";
import {
  getCategoryById,
  getCategoryBySlug,
} from "@/lib/categories/categories-config";
import type { MockAd } from "@/lib/mock-data";

/** Resolve a category param (could be id or slug) to an id */
function resolveCategoryId(param: string): string {
  if (getCategoryById(param)) return param;
  const bySlug = getCategoryBySlug(param);
  return bySlug ? bySlug.id : param;
}

/* ── Inner component that uses useSearchParams ──────────────────────── */

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requireAuth } = useAuth();
  const { track } = useTrackSignal();

  /* ── Derive initial state from URL params ──────────────────────────── */
  const initialQuery = searchParams.get("q") || "";
  const rawCategory = searchParams.get("category") || undefined;
  const initialCategory = rawCategory ? resolveCategoryId(rawCategory) : undefined;

  /* ── State ──────────────────────────────────────────────────────────── */
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<ActiveFilters>({
    category: initialCategory,
  });
  const [categoryFilters, setCategoryFilters] = useState<
    Record<string, string>
  >({});
  const [sortBy, setSortBy] = useState("newest");
  const [results, setResults] = useState<MockAd[]>([]);
  const [similarAds, setSimilarAds] = useState<MockAd[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  /* ── Build SearchFilters from state ────────────────────────────────── */
  const buildFilters = useCallback((): SearchFilters => {
    return {
      query: query || undefined,
      category: filters.category,
      saleType: filters.saleType,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      governorate: filters.governorate,
      condition: filters.condition,
      sortBy: sortBy as SearchFilters["sortBy"],
      categoryFilters,
    };
  }, [query, filters, sortBy, categoryFilters]);

  /* ── Execute search ────────────────────────────────────────────────── */
  const executeSearch = useCallback(
    async (resetPage = true) => {
      const searchFilters = buildFilters();
      setIsLoading(true);
      setHasSearched(true);

      if (resetPage) {
        setPage(0);
        setResults([]);
        setSimilarAds([]);
      }

      // Track search signal
      if (searchFilters.query) {
        track("search", {
          categoryId: searchFilters.category ?? null,
          signalData: {
            query: searchFilters.query,
            filters: searchFilters.categoryFilters,
            priceMin: searchFilters.priceMin,
            priceMax: searchFilters.priceMax,
          },
          governorate: searchFilters.governorate ?? null,
        });
      }

      const result = await searchAds(searchFilters, 0);
      setResults(result.ads);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(1);
      setIsLoading(false);

      // Fetch enhanced similar ads using recommendations engine
      const mainIds = new Set(result.ads.map((a) => a.id));
      const enhanced = getEnhancedSimilarAds(
        searchFilters.query || "",
        mainIds,
        searchFilters.category,
      );
      // Also get regular similar ads and merge
      const regular = await getSimilarSearchAds(searchFilters);
      const seenIds = new Set(enhanced.map((a) => a.id));
      const merged = [
        ...enhanced,
        ...regular.filter((a) => !seenIds.has(a.id)),
      ].slice(0, 6);
      setSimilarAds(merged);
    },
    [buildFilters, track],
  );

  /* ── Load more (infinite scroll) ───────────────────────────────────── */
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return;
    fetchingRef.current = true;
    setIsLoadingMore(true);

    const result = await searchAds(buildFilters(), page);
    setResults((prev) => [...prev, ...result.ads]);
    setHasMore(result.hasMore);
    setPage((p) => p + 1);
    setIsLoadingMore(false);
    fetchingRef.current = false;
  }, [buildFilters, hasMore, page]);

  /* ── IntersectionObserver for sentinel ─────────────────────────────── */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  /* ── Handle search from SearchBar ──────────────────────────────────── */
  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      saveRecentSearch(q);

      // Smart query parsing: extract filters from text
      const parsed = parseSearchQuery(q);
      const newFilters: ActiveFilters = { ...filters };
      if (parsed.category && !filters.category) {
        newFilters.category = parsed.category;
      }
      if (parsed.governorate && !filters.governorate) {
        newFilters.governorate = parsed.governorate;
      }
      setFilters(newFilters);

      // Update URL
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (newFilters.category) params.set("category", newFilters.category);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [filters, router],
  );

  /* ── Handle filter changes ─────────────────────────────────────────── */
  const handleFilterChange = useCallback(
    (newFilters: ActiveFilters) => {
      setFilters(newFilters);
      // Clear category-specific filters when category changes
      if (newFilters.category !== filters.category) {
        setCategoryFilters({});
      }
    },
    [filters.category],
  );

  const handleCategoryFilterChange = useCallback(
    (fieldId: string, value: string | undefined) => {
      setCategoryFilters((prev) => {
        const next = { ...prev };
        if (value) {
          next[fieldId] = value;
        } else {
          delete next[fieldId];
        }
        return next;
      });
    },
    [],
  );

  /* ── Auto-execute search when filters/sort change ──────────────────── */
  useEffect(() => {
    executeSearch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, categoryFilters]);

  /* ── Initial search on mount (if query or category from URL) ───────── */
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Favorite toggle ───────────────────────────────────────────────── */
  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const authedUser = await requireAuth();
      if (!authedUser) return;
      const ad = [...results, ...similarAds].find((a) => a.id === id);
      if (ad) {
        track("favorite", {
          adId: id,
          signalData: { price: ad.price, title: ad.title },
          governorate: ad.governorate,
        });
      }
      console.log("toggle favorite", id);
    },
    [requireAuth, results, similarAds, track],
  );

  /* ── Category name for header ──────────────────────────────────────── */
  const categoryConfig = filters.category
    ? getCategoryById(filters.category) || getCategoryBySlug(filters.category)
    : null;

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-light">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 -me-1 text-gray-text hover:text-dark transition-colors flex-shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight size={24} />
          </button>
          <div className="flex-1">
            <SearchBar
              initialQuery={query}
              onSearch={handleSearch}
              autoFocus={!initialQuery && !initialCategory}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-4 pb-3 space-y-2">
          <FilterChips filters={filters} onChange={handleFilterChange} />

          {/* Category-specific filters */}
          {filters.category && (
            <CategoryFilters
              categoryId={filters.category}
              activeFilters={categoryFilters}
              onChange={handleCategoryFilterChange}
            />
          )}
        </div>
      </header>

      {/* Results area */}
      <div className="px-4 py-4 space-y-4">
        {/* Results header: count + sort */}
        {hasSearched && !isLoading && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-text">
              {total > 0 ? (
                <>
                  {query && (
                    <span className="font-bold text-dark">
                      &quot;{query}&quot;{" "}
                    </span>
                  )}
                  {categoryConfig && !query && (
                    <span className="font-bold text-dark">
                      {categoryConfig.icon} {categoryConfig.name}{" "}
                    </span>
                  )}
                  — {total} نتيجة
                </>
              ) : null}
            </p>
            {total > 1 && <SortOptions value={sortBy} onChange={setSortBy} />}
          </div>
        )}

        {/* Loading state */}
        {isLoading && <AdGridSkeleton count={6} />}

        {/* Results grid */}
        {!isLoading && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {results.map((ad) => (
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
                <Loader2
                  size={24}
                  className="animate-spin text-brand-green"
                />
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-1" />}
          </>
        )}

        {/* Empty state */}
        {!isLoading && hasSearched && results.length === 0 && (
          <div className="py-12 text-center">
            <SearchX size={48} className="text-gray-text mx-auto mb-4" />
            <h3 className="text-lg font-bold text-dark mb-2">مفيش نتائج</h3>
            <p className="text-sm text-gray-text mb-4">
              {query
                ? `مفيش إعلانات تطابق "${query}"، جرّب كلمات تانية`
                : "جرّب تغيير الفلاتر أو البحث بكلمات مختلفة"}
            </p>
          </div>
        )}

        {/* Similar ads section — "شبيه اللي بتدور عليه" */}
        {!isLoading && hasSearched && similarAds.length > 0 && (
          <div className="pt-4 border-t border-gray-light">
            <h3 className="text-sm font-bold text-dark mb-3">
              🎯 شبيه اللي بتدور عليه
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {similarAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  {...ad}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}

/* ── Page wrapper with Suspense for useSearchParams ─────────────────── */

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white pb-20">
          <div className="px-4 py-4">
            <AdGridSkeleton count={6} />
          </div>
        </main>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
