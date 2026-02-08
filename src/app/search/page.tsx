"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader2, SearchX, Sparkles, Brain } from "lucide-react";
import AISearchBar from "@/components/search/AISearchBar";
import FilterChips, {
  type ActiveFilters,
} from "@/components/search/FilterChips";
import CategoryFilters from "@/components/search/CategoryFilters";
import SortOptions from "@/components/search/SortOptions";
import AdCard from "@/components/ad/AdCard";
import WishList from "@/components/search/WishList";
import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTrackSignal } from "@/lib/hooks/useTrackSignal";
import { saveRecentSearch } from "@/lib/search/recent-searches";
import { aiParseQuery, generateRefinements, generateEmptySuggestions } from "@/lib/search/ai-query-engine";
import { createWish } from "@/lib/search/wish-store";
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
import type { AIParsedQuery, SearchRefinement, EmptySuggestion, SearchWish } from "@/lib/search/ai-search-types";

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

  // AI state
  const [parsedQuery, setParsedQuery] = useState<AIParsedQuery | null>(null);
  const [refinements, setRefinements] = useState<SearchRefinement[]>([]);
  const [emptySuggestions, setEmptySuggestions] = useState<EmptySuggestion[]>([]);
  const [wishRefreshTrigger, setWishRefreshTrigger] = useState(0);
  const [showInterpretation, setShowInterpretation] = useState(false);

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

      // Generate empty state suggestions if no results
      if (result.ads.length === 0 && parsedQuery) {
        setEmptySuggestions(generateEmptySuggestions(parsedQuery));
      } else {
        setEmptySuggestions([]);
      }

      // Fetch similar ads
      const mainIds = new Set(result.ads.map((a) => a.id));
      const enhanced = getEnhancedSimilarAds(
        searchFilters.query || "",
        mainIds,
        searchFilters.category,
      );
      const regular = await getSimilarSearchAds(searchFilters);
      const seenIds = new Set(enhanced.map((a) => a.id));
      const merged = [
        ...enhanced,
        ...regular.filter((a) => !seenIds.has(a.id)),
      ].slice(0, 6);
      setSimilarAds(merged);
    },
    [buildFilters, track, parsedQuery],
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

  /* ── Handle AI Search from AISearchBar ─────────────────────────────── */
  const handleAISearch = useCallback(
    (q: string, parsed: AIParsedQuery) => {
      setQuery(q);
      setParsedQuery(parsed);
      setShowInterpretation(parsed.confidence > 0.5);
      saveRecentSearch(q);

      // Apply AI-extracted filters
      const newFilters: ActiveFilters = { ...filters };
      if (parsed.primaryCategory && !filters.category) {
        newFilters.category = parsed.primaryCategory;
      }
      if (parsed.governorate && !filters.governorate) {
        newFilters.governorate = parsed.governorate;
      }
      if (parsed.saleType) {
        newFilters.saleType = parsed.saleType;
      }
      if (parsed.priceMin != null || parsed.priceMax != null) {
        if (parsed.priceMin != null) newFilters.priceMin = parsed.priceMin;
        if (parsed.priceMax != null) newFilters.priceMax = parsed.priceMax;
      }

      setFilters(newFilters);

      // Generate refinements
      setRefinements(generateRefinements(parsed));

      // Update URL
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (newFilters.category) params.set("category", newFilters.category);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [filters, router],
  );

  /* ── Handle saving a wish ("دوّر لي") ─────────────────────────────── */
  const handleSaveWish = useCallback(
    (q: string, parsed: AIParsedQuery) => {
      createWish(q, parsed, {
        category: parsed.primaryCategory || filters.category,
        saleType: parsed.saleType || filters.saleType,
        priceMin: parsed.priceMin ?? filters.priceMin,
        priceMax: parsed.priceMax ?? filters.priceMax,
        governorate: parsed.governorate || filters.governorate,
      });
      setWishRefreshTrigger((n) => n + 1);
    },
    [filters],
  );

  /* ── Handle wish search ────────────────────────────────────────────── */
  const handleSearchWish = useCallback(
    (wish: SearchWish) => {
      const parsed = wish.parsedQuery;
      setQuery(wish.query);
      setParsedQuery(parsed);
      setShowInterpretation(true);

      const newFilters: ActiveFilters = {
        category: wish.filters.category,
        saleType: wish.filters.saleType,
        priceMin: wish.filters.priceMin,
        priceMax: wish.filters.priceMax,
        governorate: wish.filters.governorate,
      };
      setFilters(newFilters);
      setRefinements(generateRefinements(parsed));
    },
    [],
  );

  /* ── Handle filter changes ─────────────────────────────────────────── */
  const handleFilterChange = useCallback(
    (newFilters: ActiveFilters) => {
      setFilters(newFilters);
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

  /* ── Handle refinement click ───────────────────────────────────────── */
  const handleRefinementClick = useCallback(
    (ref: SearchRefinement) => {
      const newFilters = { ...filters };
      switch (ref.type) {
        case "category":
          newFilters.category = ref.value;
          break;
        case "location":
          newFilters.governorate = ref.value;
          break;
        case "price": {
          const [min, max] = ref.value.split("-").map(Number);
          newFilters.priceMin = min;
          newFilters.priceMax = max;
          break;
        }
        case "saleType":
          newFilters.saleType = ref.value as ActiveFilters["saleType"];
          break;
        case "condition":
          newFilters.condition = ref.value;
          break;
      }
      setFilters(newFilters);
    },
    [filters],
  );

  /* ── Auto-execute search when filters/sort change ──────────────────── */
  useEffect(() => {
    executeSearch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, categoryFilters]);

  /* ── Initial search on mount (if query or category from URL) ───────── */
  useEffect(() => {
    if (initialQuery) {
      const parsed = aiParseQuery(initialQuery);
      handleAISearch(initialQuery, parsed);
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
            <AISearchBar
              initialQuery={query}
              onSearch={handleAISearch}
              onSaveWish={handleSaveWish}
              autoFocus={!initialQuery && !initialCategory}
            />
          </div>
        </div>

        {/* AI Interpretation Bar */}
        {showInterpretation && parsedQuery && parsedQuery.interpretation && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5 bg-brand-green-light rounded-lg px-3 py-1.5">
              <Brain size={14} className="text-brand-green flex-shrink-0" />
              <p className="text-[11px] text-brand-green-dark font-medium flex-1 line-clamp-1">
                {parsedQuery.interpretation}
              </p>
              <button
                type="button"
                onClick={() => setShowInterpretation(false)}
                className="text-brand-green hover:text-brand-green-dark"
              >
                <span className="text-xs">✕</span>
              </button>
            </div>
          </div>
        )}

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

        {/* "دوّر لي" Wish List */}
        <WishList onSearchWish={handleSearchWish} refreshTrigger={wishRefreshTrigger} />

        {/* AI Refinement chips (when results shown) */}
        {!isLoading && hasSearched && refinements.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Sparkles size={12} className="text-brand-green" />
              <span className="text-[10px] font-bold text-gray-text">حدّد بحثك أكتر</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {refinements.map((ref, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleRefinementClick(ref)}
                  className="text-[10px] bg-white border border-gray-200 px-2.5 py-1.5 rounded-full hover:bg-brand-green-light hover:border-brand-green hover:text-brand-green transition-colors flex items-center gap-1"
                >
                  <span>{ref.icon}</span>
                  <span>{ref.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* ── Smart Empty State ── */}
        {!isLoading && hasSearched && results.length === 0 && (
          <div className="py-8 text-center">
            <SearchX size={48} className="text-gray-text mx-auto mb-4" />
            <h3 className="text-lg font-bold text-dark mb-2">مفيش نتائج</h3>
            <p className="text-sm text-gray-text mb-4">
              {query
                ? `مفيش إعلانات تطابق "${query}" دلوقتي`
                : "جرّب تغيير الفلاتر أو البحث بكلمات مختلفة"}
            </p>

            {/* AI Suggestions for empty state */}
            {emptySuggestions.length > 0 && (
              <div className="space-y-2 max-w-sm mx-auto text-start">
                <p className="text-xs font-bold text-gray-text text-center mb-3">
                  💡 جرّب واحدة من دول:
                </p>
                {emptySuggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (sug.query === "__SAVE_WISH__") {
                        if (parsedQuery) handleSaveWish(query, parsedQuery);
                      } else {
                        const parsed = aiParseQuery(sug.query);
                        handleAISearch(sug.query, parsed);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-start ${
                      sug.query === "__SAVE_WISH__"
                        ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-lg">{sug.icon}</span>
                    <span className={`text-sm ${
                      sug.query === "__SAVE_WISH__" ? "text-blue-700 font-bold" : "text-dark"
                    }`}>
                      {sug.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
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
