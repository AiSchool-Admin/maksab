"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, Clock, TrendingUp, ArrowLeft, Sparkles } from "lucide-react";
import {
  getRecentSearches,
  removeRecentSearch,
  clearRecentSearches,
} from "@/lib/search/recent-searches";
import { getAutoSuggestions } from "@/lib/search/smart-parser";
import { popularSearches } from "@/lib/search/search-data";

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches on focus
  useEffect(() => {
    if (isFocused) {
      setRecentSearches(getRecentSearches());
    }
  }, [isFocused]);

  // Auto-suggestions as user types (debounced)
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setSuggestions(getAutoSuggestions(query));
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions, recentSearches, query]);

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

  // Build flat list of all navigable items for keyboard nav
  const navItems = useMemo(() => {
    const items: { text: string; type: "suggestion" | "recent" | "popular" }[] = [];

    if (query && suggestions.length > 0) {
      suggestions.forEach((s) => items.push({ text: s, type: "suggestion" }));
    } else if (!query) {
      if (recentSearches.length > 0) {
        recentSearches.forEach((s) => items.push({ text: s, type: "recent" }));
      } else {
        popularSearches.forEach((s) => items.push({ text: s, type: "popular" }));
      }
    }

    return items;
  }, [query, suggestions, recentSearches]);

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
    isFocused && (suggestions.length > 0 || recentSearches.length > 0 || !query);

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
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `search-item-${activeIndex}` : undefined
            }
          />
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

      {/* Dropdown: suggestions / recent / popular */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full inset-x-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-light z-50 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {/* Auto-suggestions (when typing) */}
          {suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 pb-1">
                <span className="text-[10px] font-bold text-gray-text flex items-center gap-1">
                  <Sparkles size={10} /> اقتراحات
                </span>
              </div>
              {suggestions.map((s) => {
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

          {/* Popular searches (when no recent and no query) */}
          {!query && recentSearches.length === 0 && (
            <div className="py-2">
              <div className="px-4 pb-1">
                <span className="text-xs font-bold text-gray-text">
                  بحث رائج
                </span>
              </div>
              {popularSearches.map((term) => {
                const idx = navIndex++;
                return (
                  <button
                    key={term}
                    id={`search-item-${idx}`}
                    data-nav-item
                    type="button"
                    onClick={() => handleSuggestionClick(term)}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark transition-colors text-start ${
                      activeIndex === idx
                        ? "bg-brand-green-light"
                        : "hover:bg-gray-light"
                    }`}
                  >
                    <TrendingUp
                      size={14}
                      className="text-brand-green flex-shrink-0"
                    />
                    <span>{term}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Keyboard hint */}
          {navItems.length > 0 && (
            <div className="px-4 py-1.5 border-t border-gray-light hidden md:flex items-center gap-3 text-[10px] text-gray-text">
              <span>↑↓ للتنقل</span>
              <span>⏎ للاختيار</span>
              <span>Esc للإغلاق</span>
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
