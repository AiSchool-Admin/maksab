"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Trash2, Search, ChevronDown, Sparkles } from "lucide-react";
import { getWishes, deleteWish, toggleWishActive, markWishViewed } from "@/lib/search/wish-store";
import type { SearchWish } from "@/lib/search/ai-search-types";

interface WishListProps {
  onSearchWish: (wish: SearchWish) => void;
  refreshTrigger?: number;
}

export default function WishList({ onSearchWish, refreshTrigger }: WishListProps) {
  const [wishes, setWishes] = useState<SearchWish[]>(() => getWishes());
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      setWishes(getWishes());
    }
  }, [refreshTrigger]);

  if (wishes.length === 0) return null;

  const activeWishes = wishes.filter((w) => w.isActive);
  const totalNew = activeWishes.reduce((sum, w) => sum + w.newMatchCount, 0);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Sparkles size={16} className="text-blue-600" />
          </div>
          <div className="text-start">
            <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
              دوّر لي
              {totalNew > 0 && (
                <span className="bg-error text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {totalNew} جديد
                </span>
              )}
            </h3>
            <p className="text-[10px] text-gray-text">
              {activeWishes.length} بحث محفوظ — بندور ليك في الخلفية
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-text transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Wish list */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {wishes.map((wish) => (
            <WishCard
              key={wish.id}
              wish={wish}
              onSearch={() => {
                markWishViewed(wish.id);
                onSearchWish(wish);
                setWishes(getWishes());
              }}
              onToggle={() => {
                toggleWishActive(wish.id);
                setWishes(getWishes());
              }}
              onDelete={() => {
                deleteWish(wish.id);
                setWishes(getWishes());
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual Wish Card ── */

function WishCard({
  wish,
  onSearch,
  onToggle,
  onDelete,
}: {
  wish: SearchWish;
  onSearch: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isActive = wish.isActive;

  return (
    <div
      className={`bg-white rounded-lg border ${
        isActive ? "border-blue-200" : "border-gray-200 opacity-60"
      } p-2.5 transition-opacity`}
    >
      <div className="flex items-start gap-2">
        {/* Search button */}
        <button
          type="button"
          onClick={onSearch}
          className="flex-1 text-start min-w-0"
        >
          <p className="text-xs font-bold text-dark line-clamp-1 mb-0.5">
            {wish.displayText || wish.query}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {wish.filters.category && (
              <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-text">
                {wish.filters.category}
              </span>
            )}
            {wish.filters.governorate && (
              <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-text">
                📍 {wish.filters.governorate}
              </span>
            )}
            {wish.filters.priceMax && (
              <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-text">
                تحت {wish.filters.priceMax.toLocaleString()} ج
              </span>
            )}
            {wish.newMatchCount > 0 && (
              <span className="text-[9px] bg-brand-green text-white px-1.5 py-0.5 rounded-full font-bold">
                {wish.newMatchCount} جديد
              </span>
            )}
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onSearch}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
            aria-label="بحث"
          >
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isActive
                ? "hover:bg-orange-50 text-brand-gold"
                : "hover:bg-gray-100 text-gray-text"
            }`}
            aria-label={isActive ? "إيقاف" : "تفعيل"}
          >
            {isActive ? <Bell size={14} /> : <BellOff size={14} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-text hover:text-error transition-colors"
            aria-label="حذف"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
