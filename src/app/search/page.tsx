"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronRight, Loader2, SearchX, Brain } from "lucide-react";

const ShoppingAssistantFab = dynamic(
  () => import("@/components/chat/ShoppingAssistantFab"),
  { ssr: false },
);
import AISearchBar from "@/components/search/AISearchBar";
import FilterChips, {
  type ActiveFilters,
} from "@/components/search/FilterChips";
import SortOptions from "@/components/search/SortOptions";
import AdCard from "@/components/ad/AdCard";
import WishList from "@/components/search/WishList";
import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTrackSignal } from "@/lib/hooks/useTrackSignal";
import { saveRecentSearch } from "@/lib/search/recent-searches";
import { aiParseQuery, generateEmptySuggestions } from "@/lib/search/ai-query-engine";
import { createWish } from "@/lib/search/wish-store";
import {
  searchAds,
  getSimilarSearchAds,
  type SearchFilters,
} from "@/lib/search/search-data";
import {
  advancedSearch,
  searchByImage,
  type ImageSearchResult,
} from "@/lib/search/search-service";
import { getEnhancedSimilarAds } from "@/lib/recommendations/recommendations-service";
import {
  getCategoryById,
  getCategoryBySlug,
} from "@/lib/categories/categories-config";
import type { AdSummary } from "@/lib/ad-data";
import type { AIParsedQuery, EmptySuggestion, SearchWish } from "@/lib/search/ai-search-types";

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
  const [sortBy, setSortBy] = useState("relevance");
  const [results, setResults] = useState<AdSummary[]>([]);
  const [similarAds, setSimilarAds] = useState<AdSummary[]>([]);
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
  const [emptySuggestions, setEmptySuggestions] = useState<EmptySuggestion[]>([]);
  const [wishRefreshTrigger, setWishRefreshTrigger] = useState(0);
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [searchMethod, setSearchMethod] = useState<string>("none");
  const [imageSearchResults, setImageSearchResults] = useState<AdSummary[]>([]);
  const [isImageSearching, setIsImageSearching] = useState(false);

  /* ── Build SearchFilters from state ────────────────────────────────── */
  const buildFilters = useCallback((): SearchFilters & { originalQuery?: string } => {
    // Use AI-parsed cleanQuery when available — this removes keywords that
    // were already consumed by entity extraction (category, brand, etc.).
    // e.g. "شنطة" → category=fashion, cleanQuery="" → no redundant text filter
    const effectiveQuery =
      parsedQuery && parsedQuery.confidence >= 0.4
        ? parsedQuery.cleanQuery || undefined
        : query || undefined;

    return {
      query: effectiveQuery,
      // Always pass original query so the API can use it for ILIKE fallback
      // when AI-extracted filters return 0 results
      originalQuery: query || undefined,
      category: filters.category,
      subcategory: filters.subcategory,
      saleType: filters.saleType,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      governorate: filters.governorate,
      city: filters.city,
      condition: filters.condition,
      sortBy: sortBy as SearchFilters["sortBy"],
      categoryFilters,
    };
  }, [query, parsedQuery, filters, sortBy, categoryFilters]);

  /* ── Execute search (uses advanced full-text + fuzzy API) ──────────── */
  const executeSearch = useCallback(
    async (resetPage = true) => {
      const searchFilters = buildFilters();
      setIsLoading(true);
      setHasSearched(true);
      setImageSearchResults([]);

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

      // Use advanced search API (full-text + fuzzy + relevance scoring)
      const result = await advancedSearch(
        {
          query: searchFilters.query,
          originalQuery: searchFilters.originalQuery,
          category: searchFilters.category,
          subcategory: searchFilters.subcategory,
          saleType: searchFilters.saleType,
          priceMin: searchFilters.priceMin,
          priceMax: searchFilters.priceMax,
          governorate: searchFilters.governorate,
          city: searchFilters.city,
          condition: searchFilters.condition,
          sortBy: (searchFilters.sortBy || "relevance") as "relevance" | "newest" | "price_asc" | "price_desc",
          categoryFilters: searchFilters.categoryFilters,
        },
        0,
      );

      setResults(result.ads);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setSearchMethod(result.searchMethod);
      setPage(1);
      setIsLoading(false);

      // Generate empty state suggestions if no results
      if (result.ads.length === 0 && parsedQuery) {
        setEmptySuggestions(generateEmptySuggestions(parsedQuery));
      } else {
        setEmptySuggestions([]);
      }

      // Fetch similar ads (enhanced from recommendation engine + regular)
      const mainIds = new Set(result.ads.map((a) => a.id));
      const [enhanced, regular] = await Promise.all([
        getEnhancedSimilarAds(
          searchFilters.query || query || "",
          mainIds,
          searchFilters.category,
        ),
        getSimilarSearchAds(searchFilters),
      ]);
      const seenIds = new Set([...mainIds, ...enhanced.map((a) => a.id)]);
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

    const sf = buildFilters();
    const result = await advancedSearch(
      {
        query: sf.query,
        originalQuery: sf.originalQuery,
        category: sf.category,
        subcategory: sf.subcategory,
        saleType: sf.saleType,
        priceMin: sf.priceMin,
        priceMax: sf.priceMax,
        governorate: sf.governorate,
        city: sf.city,
        condition: sf.condition,
        sortBy: (sf.sortBy || "relevance") as "relevance" | "newest" | "price_asc" | "price_desc",
        categoryFilters: sf.categoryFilters,
      },
      page,
    );
    setResults((prev) => [...prev, ...result.ads]);
    setHasMore(result.hasMore);
    setPage((p) => p + 1);
    setIsLoadingMore(false);
    fetchingRef.current = false;
  }, [buildFilters, hasMore, page]);

  /* ── Image search handler ────────────────────────────────────────── */
  const handleImageSearch = useCallback(
    async (tags: string[], category?: string) => {
      setIsImageSearching(true);
      setHasSearched(true);
      setResults([]);
      setSimilarAds([]);

      const { results: imgResults, detectedCategory } = await searchByImage(tags, category);

      // Convert to AdSummary format
      const ads: AdSummary[] = imgResults.map((r: ImageSearchResult) => ({
        id: r.id,
        title: r.title,
        price: r.price,
        saleType: r.saleType as AdSummary["saleType"],
        image: r.image,
        governorate: r.governorate,
        city: r.city,
        createdAt: r.createdAt,
        isNegotiable: false,
      }));

      setImageSearchResults(ads);
      setTotal(ads.length);
      setSearchMethod("image");
      setIsImageSearching(false);

      // Update category filter if detected
      if (detectedCategory) {
        setFilters((prev) => ({ ...prev, category: detectedCategory }));
      }
    },
    [],
  );

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

      // Start with FRESH filters from AI parsing — don't accumulate old ones
      const newFilters: ActiveFilters = {};
      if (parsed.primaryCategory) newFilters.category = parsed.primaryCategory;
      if (parsed.subcategory) newFilters.subcategory = parsed.subcategory;
      if (parsed.governorate) newFilters.governorate = parsed.governorate;
      if (parsed.city) newFilters.city = parsed.city;
      if (parsed.saleType) newFilters.saleType = parsed.saleType;
      if (parsed.priceMin != null) newFilters.priceMin = parsed.priceMin;
      if (parsed.priceMax != null) newFilters.priceMax = parsed.priceMax;
      // Map condition hint to condition filter
      if (parsed.conditionHint === "new") newFilters.condition = "new";
      else if (parsed.conditionHint !== "any") newFilters.condition = "used";

      setFilters(newFilters);

      // Map AI-extracted fields (brand, karat, storage, etc.) to category filters
      const newCategoryFilters: Record<string, string> = {};
      if (parsed.extractedFields && parsed.primaryCategory) {
        const catConfig = getCategoryById(parsed.primaryCategory);
        if (catConfig) {
          // Only map to select fields that exist in the category config
          const selectFieldIds = new Set(
            catConfig.fields
              .filter((f) => f.type === "select" && f.options && f.options.length > 0)
              .map((f) => f.id),
          );
          for (const [key, value] of Object.entries(parsed.extractedFields)) {
            if (value && selectFieldIds.has(key)) {
              newCategoryFilters[key] = value;
            }
          }
        }
      }
      setCategoryFilters(newCategoryFilters);

      // Force search re-execution even if filters didn't change
      setSearchTrigger((n) => n + 1);

      // Update URL
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (newFilters.category) params.set("category", newFilters.category);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [router],
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
      setSearchTrigger((n) => n + 1);
    },
    [],
  );

  /* ── Handle filter changes ─────────────────────────────────────────── */
  const handleFilterChange = useCallback(
    (newFilters: ActiveFilters) => {
      // When category changes, clear subcategory and category-specific filters
      if (newFilters.category !== filters.category) {
        newFilters.subcategory = undefined;
        setCategoryFilters({});
      }
      // When governorate changes, clear city if it doesn't belong to new governorate
      if (newFilters.governorate !== filters.governorate) {
        newFilters.city = undefined;
      }
      setFilters(newFilters);
      // When filters are cleared manually, reset parsedQuery so the raw query
      // is used for text search instead of the (now irrelevant) cleanQuery
      if (!newFilters.category && !newFilters.governorate && !newFilters.saleType) {
        setParsedQuery(null);
      }
    },
    [filters.category, filters.governorate],
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

  /* ── Search trigger counter — increments to force re-execution ────── */
  const [searchTrigger, setSearchTrigger] = useState(0);

  /* ── Auto-execute search when filters/sort/query change ────────────── */
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip the very first render — the initial search is handled by the
    // mount effect below (which also sets filters via handleAISearch)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Only execute immediately if there's no initialQuery
      // (otherwise handleAISearch below will trigger this effect)
      if (!initialQuery) {
        executeSearch(true);
      }
      return;
    }
    executeSearch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, categoryFilters, searchTrigger]);

  /* ── Initial search on mount (if query from URL) ────────────────────── */
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
              onImageSearch={handleImageSearch}
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

        {/* Unified filter bar — all filters in one scrollable row */}
        <div className="px-4 pb-3">
          <FilterChips
            filters={filters}
            onChange={handleFilterChange}
            categoryFilters={categoryFilters}
            onCategoryFilterChange={handleCategoryFilterChange}
          />
        </div>
      </header>

      {/* Results area */}
      <div className="px-4 py-4 space-y-4">

        {/* "دوّر لي" Wish List */}
        <WishList onSearchWish={handleSearchWish} refreshTrigger={wishRefreshTrigger} />

        {/* Results header: count + sort + search method */}
        {hasSearched && !isLoading && !isImageSearching && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
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
              {searchMethod && searchMethod !== "none" && searchMethod !== "fallback" && total > 0 && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${
                  searchMethod === "fulltext"
                    ? "bg-green-100 text-green-700"
                    : searchMethod === "fuzzy"
                    ? "bg-blue-100 text-blue-700"
                    : searchMethod === "image"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {searchMethod === "fulltext" ? "بحث نصي كامل" :
                   searchMethod === "fuzzy" ? "بحث ذكي (تشابه)" :
                   searchMethod === "image" ? "بحث بصري" :
                   searchMethod === "partial" ? "تطابق جزئي" : ""}
                </span>
              )}
            </div>
            {total > 1 && <SortOptions value={sortBy} onChange={setSortBy} />}
          </div>
        )}

        {/* Loading states */}
        {(isLoading || isImageSearching) && <AdGridSkeleton count={6} cols={2} />}

        {/* Image search results */}
        {!isImageSearching && imageSearchResults.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-dark">نتائج البحث البصري</span>
              <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                {imageSearchResults.length} نتيجة
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {imageSearchResults.map((ad) => (
                <AdCard
                  key={ad.id}
                  {...ad}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </>
        )}

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
        {!isLoading && hasSearched && results.length === 0 && imageSearchResults.length === 0 && (
          <>
            {/* Full empty state only when no similar ads either */}
            {similarAds.length === 0 ? (
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
            ) : null}
          </>
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

      <ShoppingAssistantFab />
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
            <AdGridSkeleton count={6} cols={2} />
          </div>
        </main>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
