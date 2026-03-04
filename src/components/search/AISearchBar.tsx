"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, X, Clock, TrendingUp, Sparkles, Brain,
  ArrowLeft, Bell, Camera, ImagePlus, Tag, Loader2,
} from "lucide-react";
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from "@/lib/search/recent-searches";
import { aiParseQuery } from "@/lib/search/ai-query-engine";
import {
  getAutocomplete,
  getTrendingSearches,
  type AutocompleteSuggestion,
  type TrendingSearch,
  IMAGE_TAG_CATEGORIES,
} from "@/lib/search/search-service";
import { getWishes } from "@/lib/search/wish-store";
import type { AIParsedQuery } from "@/lib/search/ai-search-types";

interface AISearchBarProps {
  initialQuery?: string;
  onSearch: (query: string, parsed: AIParsedQuery) => void;
  onSaveWish?: (query: string, parsed: AIParsedQuery) => void;
  onImageSearch?: (tags: string[], category?: string) => void;
  autoFocus?: boolean;
}

export default function AISearchBar({
  initialQuery = "",
  onSearch,
  onSaveWish,
  onImageSearch,
  autoFocus = false,
}: AISearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [serverSuggestions, setServerSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [aiPreview, setAiPreview] = useState<AIParsedQuery | null>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [trendingLoaded, setTrendingLoaded] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [selectedImageTags, setSelectedImageTags] = useState<string[]>([]);
  const [selectedImageCategory, setSelectedImageCategory] = useState<string | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load wishes count
  useEffect(() => {
    getWishes();
  }, []);

  // Load recent searches + trending on focus
  useEffect(() => {
    if (!isFocused) return;

    const recent = getRecentSearches();
    setRecentSearches(recent); // eslint-disable-line react-hooks/set-state-in-effect

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

  // Server-side autocomplete + AI parsing (debounced 250ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setAiPreview(null); // eslint-disable-line react-hooks/set-state-in-effect
      setShowAiPreview(false); // eslint-disable-line react-hooks/set-state-in-effect
      setServerSuggestions([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      // AI parse preview (client-side, instant)
      const parsed = aiParseQuery(query);
      if (!cancelled) {
        if (parsed.confidence > 0.4) {
          setAiPreview(parsed);
          setShowAiPreview(true);
        } else {
          setShowAiPreview(false);
        }
      }

      // Server-side autocomplete (async)
      const suggestions = await getAutocomplete(trimmed);
      if (!cancelled) {
        setServerSuggestions(suggestions);
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsLoadingSuggestions(false);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setShowImageSearch(false);
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
        setShowImageSearch(false);
        inputRef.current?.blur();
        const parsed = aiParseQuery(query.trim());
        onSearch(query.trim(), parsed);
      }
    },
    [query, onSearch],
  );

  const handleSuggestionClick = useCallback(
    (text: string, suggestionCategory?: string | null) => {
      setQuery(text);
      setIsFocused(false);
      setShowImageSearch(false);
      const parsed = aiParseQuery(text);
      // If the server suggestion has a category and the AI parser didn't detect one, use it
      if (suggestionCategory && !parsed.primaryCategory) {
        parsed.primaryCategory = suggestionCategory;
        parsed.categories = [...new Set([...parsed.categories, suggestionCategory])];
      }
      onSearch(text, parsed);
    },
    [onSearch],
  );

  const handleClear = () => {
    setQuery("");
    setAiPreview(null);
    setShowAiPreview(false);
    setServerSuggestions([]);
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

  const handleImageTagToggle = (tag: string) => {
    setSelectedImageTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageSearchSubmit = () => {
    if (selectedImageTags.length > 0 && onImageSearch) {
      onImageSearch(selectedImageTags, selectedImageCategory || undefined);
      setShowImageSearch(false);
      setIsFocused(false);
    }
  };

  const showDropdown =
    isFocused && !showImageSearch &&
    (serverSuggestions.length > 0 || recentSearches.length > 0 || showAiPreview || !query);

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
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border-2 border-gray-200 shadow-sm focus-within:border-brand-green focus-within:shadow-lg focus-within:shadow-brand-green/10 transition-all duration-300">
          {showAiPreview && aiPreview ? (
            <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
              <Brain size={16} className="text-brand-green animate-pulse" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
              <Search size={15} className="text-white" strokeWidth={2.5} />
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="ابحث... سيارات، موبايلات، عقارات"
            className="flex-1 bg-transparent text-sm text-dark placeholder:text-gray-400 outline-none min-w-0"
            autoFocus={autoFocus}
            autoComplete="off"
          />
          {isLoadingSuggestions && query.length >= 2 && (
            <Loader2 size={14} className="animate-spin text-brand-green flex-shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full bg-gray-100 text-gray-text hover:bg-gray-200 hover:text-dark transition-colors"
              aria-label="مسح"
            >
              <X size={14} />
            </button>
          )}
          {/* Image search button */}
          <button
            type="button"
            onClick={() => {
              setShowImageSearch(!showImageSearch);
              setIsFocused(false);
            }}
            className={`p-1.5 rounded-xl transition-all flex-shrink-0 ${
              showImageSearch
                ? "bg-brand-green text-white shadow-sm"
                : "text-gray-text hover:text-brand-green hover:bg-brand-green-light"
            }`}
            aria-label="بحث بالصورة"
          >
            <Camera size={16} />
          </button>
        </div>
      </form>

      {/* ── Image Search Panel ── */}
      {showImageSearch && (
        <div className="absolute top-full inset-x-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center">
                <ImagePlus size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-dark">بحث بالوصف البصري</h3>
                <p className="text-[10px] text-gray-text">اختار القسم وكلمات الوصف</p>
              </div>
            </div>

            {/* Category selector */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(IMAGE_TAG_CATEGORIES).map(([catId, cat]) => (
                <button
                  key={catId}
                  type="button"
                  onClick={() => {
                    setSelectedImageCategory(
                      selectedImageCategory === catId ? null : catId
                    );
                    setSelectedImageTags([]);
                  }}
                  className={`text-[10px] px-2.5 py-1.5 rounded-full border transition-colors ${
                    selectedImageCategory === catId
                      ? "bg-brand-green text-white border-brand-green"
                      : "bg-white text-gray-text border-gray-200 hover:border-brand-green"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tags for selected category */}
            {selectedImageCategory && IMAGE_TAG_CATEGORIES[selectedImageCategory] && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <Tag size={12} className="text-brand-green" />
                  <span className="text-[10px] font-bold text-gray-text">
                    اختار كلمات الوصف (اختار كل المناسب)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {IMAGE_TAG_CATEGORIES[selectedImageCategory].tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleImageTagToggle(tag)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        selectedImageTags.includes(tag)
                          ? "bg-brand-green text-white border-brand-green scale-105"
                          : "bg-white text-dark border-gray-200 hover:border-brand-green"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected tags summary */}
            {selectedImageTags.length > 0 && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-brand-green-light rounded-lg">
                <span className="text-[10px] text-brand-green-dark font-medium">
                  بتدور على: {selectedImageTags.join(" + ")}
                </span>
              </div>
            )}

            {/* Search button */}
            <button
              type="button"
              onClick={handleImageSearchSubmit}
              disabled={selectedImageTags.length === 0}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                selectedImageTags.length > 0
                  ? "bg-brand-green text-white shadow-md hover:bg-brand-green-dark"
                  : "bg-gray-200 text-gray-text cursor-not-allowed"
              }`}
            >
              {selectedImageTags.length > 0
                ? `🔍 دوّر (${selectedImageTags.length} وصف)`
                : "اختار كلمات وصف الأول"}
            </button>
          </div>
        </div>
      )}

      {/* ── Autocomplete Dropdown ── */}
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

          {/* ── Server Autocomplete Suggestions ── */}
          {serverSuggestions.length > 0 && (
            <div className="py-1 border-b border-gray-100">
              {serverSuggestions.map((s, i) => (
                <button
                  key={`sug-${i}`}
                  type="button"
                  onClick={() => handleSuggestionClick(s.text, s.category)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark hover:bg-gray-light transition-colors text-start"
                >
                  <Search size={14} className="text-brand-green flex-shrink-0" />
                  <span className="flex-1 line-clamp-1">{s.text}</span>
                  {s.category && (
                    <span className="text-[9px] text-gray-text bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {getCategoryName(s.category)}
                    </span>
                  )}
                  <ArrowLeft size={14} className="text-gray-text rotate-180 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* ── "دوّر لي" Save Wish CTA ── */}
          {query.trim().length > 2 && onSaveWish && (
            <div className="border-b border-gray-100 p-2">
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
            <div className="py-2 border-b border-gray-100">
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
              {recentSearches.slice(0, 5).map((term) => (
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

          {/* ── Trending Searches (Live from DB) ── */}
          {!query && trendingSearches.length > 0 && (
            <div className="py-2 border-b border-gray-100">
              <div className="px-4 pb-1 flex items-center gap-1">
                <TrendingUp size={12} className="text-brand-green" />
                <span className="text-xs font-bold text-gray-text">الأكثر بحثاً</span>
                <span className="text-[8px] text-gray-text bg-gray-100 px-1.5 py-0.5 rounded-full ms-1">
                  مباشر
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 px-3">
                {trendingSearches.slice(0, 8).map((item, i) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => handleSuggestionClick(item.query)}
                    className="flex items-center gap-2 px-2.5 py-2 text-start rounded-lg hover:bg-gray-light transition-colors"
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
                ))}
              </div>
            </div>
          )}

          {/* ── AI Example queries ── */}
          {!query && (
            <div className="py-2">
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
    scrap: "خردة", gold: "ذهب وفضة", luxury: "فاخرة", appliances: "أجهزة",
    furniture: "أثاث", hobbies: "هوايات", tools: "عدد", services: "خدمات",
  };
  return names[id] || id;
}
