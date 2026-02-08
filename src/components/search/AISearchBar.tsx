"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, TrendingUp, Sparkles, Brain, ArrowLeft, Bell } from "lucide-react";
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from "@/lib/search/recent-searches";
import { getAutoSuggestions } from "@/lib/search/smart-parser";
import { aiParseQuery } from "@/lib/search/ai-query-engine";
import { popularSearches } from "@/lib/search/mock-search";
import { getWishes } from "@/lib/search/wish-store";
import type { AIParsedQuery } from "@/lib/search/ai-search-types";

interface AISearchBarProps {
  initialQuery?: string;
  onSearch: (query: string, parsed: AIParsedQuery) => void;
  onSaveWish?: (query: string, parsed: AIParsedQuery) => void;
  autoFocus?: boolean;
}

export default function AISearchBar({
  initialQuery = "",
  onSearch,
  onSaveWish,
  autoFocus = false,
}: AISearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiPreview, setAiPreview] = useState<AIParsedQuery | null>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [wishCount, setWishCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load wishes count
  useEffect(() => {
    const wishes = getWishes();
    setWishCount(wishes.filter((w) => w.isActive).length);
  }, []);

  // Load recent searches on focus
  useEffect(() => {
    if (isFocused) {
      setRecentSearches(getRecentSearches());
    }
  }, [isFocused]);

  // AI parsing preview (debounced 300ms)
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setAiPreview(null);
      setShowAiPreview(false);
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      // Auto-suggestions
      setSuggestions(getAutoSuggestions(query));

      // AI parse preview
      const parsed = aiParseQuery(query);
      if (parsed.confidence > 0.4) {
        setAiPreview(parsed);
        setShowAiPreview(true);
      } else {
        setShowAiPreview(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        setIsFocused(false);
        inputRef.current?.blur();
        const parsed = aiParseQuery(query.trim());
        onSearch(query.trim(), parsed);
      }
    },
    [query, onSearch],
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      setQuery(text);
      setIsFocused(false);
      const parsed = aiParseQuery(text);
      onSearch(text, parsed);
    },
    [onSearch],
  );

  const handleClear = () => {
    setQuery("");
    setAiPreview(null);
    setShowAiPreview(false);
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
    isFocused && (suggestions.length > 0 || recentSearches.length > 0 || showAiPreview || !query);

  // Example queries for inspiration
  const exampleQueries = [
    "هدية لمراتي تحت 5000",
    "عربية هيونداي تحت 300 ألف",
    "شقة 3 غرف مدينة نصر",
    "آيفون مستعمل زيرو رخيص",
    "غسالة توشيبا جديدة",
    "ذهب عيار 21 سلسلة",
  ];

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 bg-gray-light rounded-xl px-3 py-2.5 ring-2 ring-transparent focus-within:ring-brand-green/30 transition-all">
          {showAiPreview && aiPreview ? (
            <Brain size={18} className="text-brand-green flex-shrink-0 animate-pulse" />
          ) : (
            <Search size={18} className="text-gray-text flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="اكتب اللي في بالك... مكسب هيفهمك 🧠"
            className="flex-1 bg-transparent text-sm text-dark placeholder:text-gray-text outline-none min-w-0"
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

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full inset-x-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[420px] overflow-y-auto">

          {/* ── AI Understanding Preview ── */}
          {showAiPreview && aiPreview && aiPreview.interpretation && (
            <div className="border-b border-gray-100 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={14} className="text-brand-green" />
                <span className="text-[10px] font-bold text-brand-green">مكسب فاهمك</span>
              </div>
              <button
                type="button"
                onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                className="w-full text-start bg-brand-green-light rounded-lg p-2.5 hover:bg-green-100 transition-colors"
              >
                <p className="text-xs font-bold text-dark mb-0.5">
                  {aiPreview.interpretation}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {aiPreview.intent !== "browse" && (
                    <span className="text-[9px] bg-white px-1.5 py-0.5 rounded-full text-brand-green font-medium">
                      {aiPreview.intent === "gift" ? "🎁 هدية" :
                       aiPreview.intent === "urgent" ? "⚡ ضروري" :
                       aiPreview.intent === "bargain" ? "💚 عرض" :
                       aiPreview.intent === "exchange" ? "🔄 تبديل" :
                       aiPreview.intent === "compare" ? "⚖️ مقارنة" :
                       "🛒 شراء"}
                    </span>
                  )}
                  {aiPreview.primaryCategory && (
                    <span className="text-[9px] bg-white px-1.5 py-0.5 rounded-full text-gray-text">
                      {getCategoryIcon(aiPreview.primaryCategory)} {getCategoryName(aiPreview.primaryCategory)}
                    </span>
                  )}
                  {aiPreview.conditionHint !== "any" && (
                    <span className="text-[9px] bg-white px-1.5 py-0.5 rounded-full text-gray-text">
                      {aiPreview.conditionHint === "new" ? "✨ جديد" :
                       aiPreview.conditionHint === "like_new" ? "💫 زيرو" : "♻️ مستعمل"}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* ── Auto-suggestions ── */}
          {suggestions.length > 0 && (
            <div className="py-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark hover:bg-gray-light transition-colors text-start"
                >
                  <Search size={14} className="text-gray-text flex-shrink-0" />
                  <span>{s}</span>
                  <ArrowLeft size={14} className="text-gray-text me-auto rotate-180" />
                </button>
              ))}
            </div>
          )}

          {/* ── "دوّر لي" Save Wish CTA (when query has content) ── */}
          {query.trim().length > 2 && onSaveWish && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => {
                  const parsed = aiParseQuery(query.trim());
                  onSaveWish(query.trim(), parsed);
                  setIsFocused(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-start"
              >
                <Bell size={14} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-700">
                    دوّر لي — نبلغك لما يتوفر
                  </p>
                  <p className="text-[10px] text-blue-500">
                    هنفضل ندور ونبعتلك لما حاجة تطابق &quot;{query.trim().slice(0, 30)}&quot;
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ── Recent searches ── */}
          {!query && recentSearches.length > 0 && (
            <div className="py-2 border-t border-gray-100">
              <div className="flex items-center justify-between px-4 pb-1">
                <span className="text-xs font-bold text-gray-text">بحث سابق</span>
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
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-light transition-colors"
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

          {/* ── Popular + Example queries ── */}
          {!query && recentSearches.length === 0 && (
            <>
              <div className="py-2">
                <div className="px-4 pb-1">
                  <span className="text-xs font-bold text-gray-text">بحث رائج</span>
                </div>
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSuggestionClick(term)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark hover:bg-gray-light transition-colors text-start"
                  >
                    <TrendingUp size={14} className="text-brand-green flex-shrink-0" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>

              {/* AI Example queries */}
              <div className="py-2 border-t border-gray-100">
                <div className="px-4 pb-1 flex items-center gap-1">
                  <Brain size={12} className="text-brand-green" />
                  <span className="text-xs font-bold text-gray-text">جرّب بحث ذكي</span>
                </div>
                <div className="px-4 flex flex-wrap gap-1.5 pb-2">
                  {exampleQueries.map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => {
                        setQuery(eq);
                        inputRef.current?.focus();
                      }}
                      className="text-[10px] bg-brand-green-light text-brand-green-dark px-2.5 py-1.5 rounded-full hover:bg-green-200 transition-colors"
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function getCategoryIcon(id: string): string {
  const icons: Record<string, string> = {
    cars: "🚗", real_estate: "🏠", phones: "📱", fashion: "👗",
    scrap: "♻️", gold: "💰", luxury: "💎", appliances: "🏠",
    furniture: "🪑", hobbies: "🎮", tools: "🔧", services: "🛠️",
  };
  return icons[id] || "📦";
}

function getCategoryName(id: string): string {
  const names: Record<string, string> = {
    cars: "سيارات", real_estate: "عقارات", phones: "موبايلات", fashion: "موضة",
    scrap: "خردة", gold: "ذهب", luxury: "فاخرة", appliances: "أجهزة",
    furniture: "أثاث", hobbies: "هوايات", tools: "عدد", services: "خدمات",
  };
  return names[id] || id;
}
