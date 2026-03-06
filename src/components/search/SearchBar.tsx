"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, Clock, TrendingUp, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import {
  getRecentSearches,
  removeRecentSearch,
  clearRecentSearches,
} from "@/lib/search/recent-searches";
import { getAutoSuggestions } from "@/lib/search/smart-parser";
import {
  getAutocomplete,
  getTrendingSearches,
  type AutocompleteSuggestion,
  type TrendingSearch,
} from "@/lib/search/search-service";

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
}

export default function SearchBar({
  initialQuery = "",
  onSearch,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [serverSuggestions, setServerSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [trendingLoaded, setTrendingLoaded] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches + trending on focus
  useEffect(() => {
    if (!isFocused) return;

    setRecentSearches(getRecentSearches());

    if (!trendingLoaded) {
      let cancelled = false;
      getTrendingSearches(10).then((trending) => {
        if (!cancelled) {
          setTrendingSearches(trending);
          setTrendingLoaded(true);
        }
      });
      return () => { cancelled = true; };
    }
  }, [isFocused, trendingLoaded]);

  // Auto-suggestions as user types (debounced) — local + server
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setServerSuggestions([]);
      return;
    }

    // Immediate local suggestions
    setSuggestions(getAutoSuggestions(query));

    // Debounced server autocomplete
    let cancelled = false;
    setIsLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      const results = await getAutocomplete(query.trim());
      if (!cancelled) {
        setServerSuggestions(results);
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsLoadingSuggestions(false);
    };
  }, [query]);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions, serverSuggestions, recentSearches, query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Merge local + server suggestions, deduplicated
  const mergedSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];

    // Server suggestions first (higher quality)
    for (const s of serverSuggestions) {
      const lower = s.text.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        merged.push(s.text);
      }
    }
    // Then local suggestions
    for (const s of suggestions) {
      const lower = s.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        merged.push(s);
      }
    }
    return merged.slice(0, 8);
  }, [suggestions, serverSuggestions]);

  // Build flat list of all navigable items for keyboard nav
  const navItems = useMemo(() => {
    const items: { text: string; type: "suggestion" | "recent" | "trending" }[] = [];

    if (query && mergedSuggestions.length > 0) {
      mergedSuggestions.forEach((s) => items.push({ text: s, type: "suggestion" }));
    } else if (!query) {
      if (recentSearches.length > 0) {
        recentSearches.forEach((s) => items.push({ text: s, type: "recent" }));
      }
      if (trendingSearches.length > 0) {
        trendingSearches.slice(0, 8).forEach((s) => items.push({ text: s.query, type: "trending" }));
      }
    }

    return items;
  }, [query, mergedSuggestions, recentSearches, trendingSearches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < navItems.length) {
      handleSuggestionClick(navItems[activeIndex].text);
    } else if (query.trim()) {
      setIsFocused(false);
      inputRef.current?.blur();
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    setIsFocused(false);
    setActiveIndex(-1);
    onSearch(text);
  };

  const handleClear = () => {
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (term: string) => {
    removeRecentSearch(term);
    setRecentSearches((prev) => prev.filter((s) => s !== term));
  };

  const handleClearAll = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isFocused || navItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < navItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : navItems.length - 1
          );
          break;
        case "Escape":
          e.preventDefault();
          setIsFocused(false);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
        case "Tab":
          setIsFocused(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isFocused, navItems.length],
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll("[data-nav-item]");
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const showDropdown =
    isFocused && (mergedSuggestions.length > 0 || recentSearches.length > 0 || trendingSearches.length > 0 || !query);

  // Track which item is at which index for highlighting
  let navIndex = 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 bg-gray-light rounded-xl px-4 py-3">
          <Search size={18} className="text-gray-text flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="ابحث في مكسب..."
            className="flex-1 bg-transparent text-sm text-dark placeholder:text-gray-text outline-none"
            autoFocus={autoFocus}
            autoComplete="off"
            role="combobox"
            aria-controls="search-listbox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `search-item-${activeIndex}` : undefined
            }
          />
          {isLoadingSuggestions && query.length >= 2 && (
            <Loader2 size={14} className="animate-spin text-brand-green flex-shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-gray-text hover:text-dark transition-colors"
              aria-label="مسح"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown: suggestions / recent / trending */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full inset-x-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-light z-50 max-h-80 overflow-y-auto"
          id="search-listbox"
          role="listbox"
        >
          {/* Auto-suggestions (when typing) */}
          {mergedSuggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 pb-1">
                <span className="text-[10px] font-bold text-gray-text flex items-center gap-1">
                  <Sparkles size={10} /> اقتراحات
                </span>
              </div>
              {mergedSuggestions.map((s) => {
                const idx = navIndex++;
                return (
                  <button
                    key={s}
                    id={`search-item-${idx}`}
                    data-nav-item
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark transition-colors text-start ${
                      activeIndex === idx
                        ? "bg-brand-green-light"
                        : "hover:bg-gray-light"
                    }`}
                  >
                    <Search size={14} className="text-gray-text flex-shrink-0" />
                    <span className="flex-1">{highlightMatch(s, query)}</span>
                    <ArrowLeft
                      size={14}
                      className="text-gray-text me-auto rotate-180"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent searches (when input is empty or focused) */}
          {!query && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 pb-1">
                <span className="text-xs font-bold text-gray-text">
                  بحث سابق
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-error hover:underline"
                >
                  مسح الكل
                </button>
              </div>
              {recentSearches.map((term) => {
                const idx = navIndex++;
                return (
                  <div
                    key={term}
                    id={`search-item-${idx}`}
                    data-nav-item
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      activeIndex === idx
                        ? "bg-brand-green-light"
                        : "hover:bg-gray-light"
                    }`}
                  >
                    <Clock size={14} className="text-gray-text flex-shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(term)}
                      className="flex-1 text-sm text-dark text-start"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecent(term)}
                      className="p-0.5 text-gray-text hover:text-error transition-colors"
                      aria-label="حذف"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trending searches (live from API) */}
          {!query && trendingSearches.length > 0 && (
            <div className="py-2">
              <div className="px-4 pb-1 flex items-center gap-1">
                <TrendingUp size={12} className="text-brand-green" />
                <span className="text-xs font-bold text-gray-text">
                  الأكثر بحثاً
                </span>
                <span className="text-[8px] text-gray-text bg-gray-100 px-1.5 py-0.5 rounded-full ms-1">
                  مباشر
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 px-3">
                {trendingSearches.slice(0, 8).map((item, i) => {
                  const idx = navIndex++;
                  return (
                    <button
                      key={item.query}
                      id={`search-item-${idx}`}
                      data-nav-item
                      type="button"
                      onClick={() => handleSuggestionClick(item.query)}
                      role="option"
                      aria-selected={activeIndex === idx}
                      className={`flex items-center gap-2 px-2.5 py-2 text-start rounded-lg transition-colors ${
                        activeIndex === idx
                          ? "bg-brand-green-light"
                          : "hover:bg-gray-light"
                      }`}
                    >
                      <span className={`text-[10px] font-bold w-4 text-center flex-shrink-0 ${
                        i < 3 ? "text-brand-green" : "text-gray-text"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-xs text-dark line-clamp-1 flex-1">
                        {item.query}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keyboard hint */}
          {navItems.length > 0 && (
            <div className="px-4 py-1.5 border-t border-gray-light hidden md:flex items-center gap-3 text-[10px] text-gray-text">
              <span>↑↓ للتنقل</span>
              <span>⏎ للاختيار</span>
              <span>(Esc) للإغلاق</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Highlight matching part of suggestion text.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-brand-green">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}
