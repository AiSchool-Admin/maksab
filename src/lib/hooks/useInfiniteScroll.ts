"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions<T> {
  /** Function that fetches data for a given page */
  fetchFn: (page: number) => Promise<{ ads: T[]; hasMore: boolean }>;
  /** Initial page number (default 0) */
  initialPage?: number;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: boolean;
  retry: () => void;
  refresh: () => Promise<void>;
  sentinelRef: (node: HTMLDivElement | null) => void;
}

export function useInfiniteScroll<T>({
  fetchFn,
  initialPage = 0,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fetchingRef = useRef(false);

  // Fetch initial page
  const fetchInitial = useCallback(() => {
    setIsLoading(true);
    setError(false);

    fetchFn(initialPage)
      .then(({ ads, hasMore: more }) => {
        setItems(ads);
        setHasMore(more);
        setIsLoading(false);
        setPage(initialPage + 1);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  }, [fetchFn, initialPage]);

  useEffect(() => {
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load more when sentinel is visible
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return;
    fetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const { ads, hasMore: more } = await fetchFn(page);
      setItems((prev) => [...prev, ...ads]);
      setHasMore(more);
      setPage((p) => p + 1);
    } catch {
      // Silently fail on load-more — user can scroll again to retry
    } finally {
      setIsLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [fetchFn, hasMore, page]);

  // Sentinel ref callback for IntersectionObserver
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !hasMore) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMore();
          }
        },
        { rootMargin: "200px" },
      );

      observerRef.current.observe(node);
    },
    [hasMore, loadMore],
  );

  // Refresh: silently reload first page (no loading indicator)
  const refresh = useCallback(async () => {
    try {
      const { ads, hasMore: more } = await fetchFn(initialPage);
      setItems(ads);
      setHasMore(more);
      setPage(initialPage + 1);
    } catch {
      // Silent fail on refresh
    }
  }, [fetchFn, initialPage]);

  return { items, isLoading, isLoadingMore, hasMore, error, retry: fetchInitial, refresh, sentinelRef };
}
