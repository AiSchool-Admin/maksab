"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import {
  getRecentSearches,
  removeRecentSearch,
  clearRecentSearches,
} from "@/lib/search/recent-searches";
import { getAutoSuggestions } from "@/lib/search/smart-parser";
import { popularSearches } from "@/lib/search/mock-search";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsFocused(false);
      inputRef.current?.blur();
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    setIsFocused(false);
    onSearch(text);
  };

  const handleClear = () => {
    setQuery("");
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

  const showDropdown =
    isFocused && (suggestions.length > 0 || recentSearches.length > 0 || !query);

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
            placeholder="ابحث في مكسب..."
            className="flex-1 bg-transparent text-sm text-dark placeholder:text-gray-text outline-none"
            autoFocus={autoFocus}
            autoComplete="off"
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
        <div className="absolute top-full inset-x-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-light z-50 max-h-80 overflow-y-auto">
          {/* Auto-suggestions (when typing) */}
          {suggestions.length > 0 && (
            <div className="py-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark hover:bg-gray-light transition-colors text-start"
                >
                  <Search size={14} className="text-gray-text flex-shrink-0" />
                  <span>{s}</span>
                  <ArrowLeft
                    size={14}
                    className="text-gray-text me-auto rotate-180"
                  />
                </button>
              ))}
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
              {recentSearches.map((term) => (
                <div
                  key={term}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-light transition-colors"
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
              ))}
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
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSuggestionClick(term)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark hover:bg-gray-light transition-colors text-start"
                >
                  <TrendingUp
                    size={14}
                    className="text-brand-green flex-shrink-0"
                  />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
