"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Zap, Award, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";

interface PriceSuggestionCardProps {
  categoryId: string;
  subcategoryId?: string;
  brand?: string;
  model?: string;
  condition?: string;
  governorate?: string;
  onPriceSelect?: (price: number) => void;
}

interface Suggestion {
  suggestedPrice: number;
  quickSalePrice: number;
  premiumPrice: number;
  priceRange: { min: number; max: number };
  competitorCount: number;
}

/**
 * Smart price suggestion card for ad creation wizard (Step 3).
 * Shows seller what similar items are priced at and suggests optimal price.
 */
export default function PriceSuggestionCard({
  categoryId,
  subcategoryId,
  brand,
  model,
  condition,
  governorate,
  onPriceSelect,
}: PriceSuggestionCardProps) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categoryId) return;

    const fetchSuggestion = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/price/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, subcategoryId, brand, model, condition, governorate }),
        });
        const data = await res.json();
        if (data.suggestion && data.suggestion.suggestedPrice > 0) {
          setSuggestion(data.suggestion);
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    };

    // Small debounce
    const timer = setTimeout(fetchSuggestion, 500);
    return () => clearTimeout(timer);
  }, [categoryId, subcategoryId, brand, model, condition, governorate]);

  if (loading) {
    return (
      <div className="bg-brand-gold-light rounded-2xl p-3 flex items-center gap-2">
        <Loader2 size={16} className="text-brand-gold animate-spin" />
        <span className="text-xs text-brand-gold font-medium">بنحسب السعر المناسب...</span>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="bg-gradient-to-b from-brand-gold-light to-white rounded-2xl border border-brand-gold/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-brand-gold" />
        <h4 className="text-sm font-bold text-dark">اقتراح السعر الذكي</h4>
        <span className="text-[10px] text-gray-text bg-white rounded-full px-2 py-0.5">
          من {suggestion.competitorCount} إعلان مشابه
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Quick sale */}
        <button
          type="button"
          onClick={() => onPriceSelect?.(suggestion.quickSalePrice)}
          className="bg-white rounded-xl p-2.5 text-center hover:bg-green-50 transition-colors border border-transparent hover:border-brand-green"
        >
          <Zap size={14} className="text-brand-green mx-auto mb-1" />
          <p className="text-[10px] text-gray-text">بيع سريع</p>
          <p className="text-xs font-bold text-brand-green">{formatPrice(suggestion.quickSalePrice)}</p>
        </button>

        {/* Recommended */}
        <button
          type="button"
          onClick={() => onPriceSelect?.(suggestion.suggestedPrice)}
          className="bg-brand-green rounded-xl p-2.5 text-center hover:bg-brand-green-dark transition-colors ring-2 ring-brand-green/20"
        >
          <Award size={14} className="text-white mx-auto mb-1" />
          <p className="text-[10px] text-white/80">المقترح</p>
          <p className="text-xs font-bold text-white">{formatPrice(suggestion.suggestedPrice)}</p>
        </button>

        {/* Premium */}
        <button
          type="button"
          onClick={() => onPriceSelect?.(suggestion.premiumPrice)}
          className="bg-white rounded-xl p-2.5 text-center hover:bg-brand-gold-light transition-colors border border-transparent hover:border-brand-gold"
        >
          <Award size={14} className="text-brand-gold mx-auto mb-1" />
          <p className="text-[10px] text-gray-text">بريميوم</p>
          <p className="text-xs font-bold text-brand-gold">{formatPrice(suggestion.premiumPrice)}</p>
        </button>
      </div>

      {/* Price range bar */}
      <div className="px-1">
        <div className="flex justify-between text-[9px] text-gray-text mb-1">
          <span>{formatPrice(suggestion.priceRange.min)}</span>
          <span>{formatPrice(suggestion.priceRange.max)}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-brand-gold via-brand-green to-green-300 rounded-full"
            style={{
              width: `${Math.min(100, ((suggestion.suggestedPrice - suggestion.priceRange.min) / (suggestion.priceRange.max - suggestion.priceRange.min)) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
