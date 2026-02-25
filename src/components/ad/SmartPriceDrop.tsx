"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingDown, Sparkles, Loader2, ToggleLeft, ToggleRight, Clock, Eye, Heart } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";

interface SmartPriceDropProps {
  adId: string;
  currentPrice: number;
  viewsCount: number;
  favoritesCount: number;
  daysListed: number;
  autoDropEnabled: boolean;
  onToggleAutoDrop: (enabled: boolean) => void;
  onApplyDrop: (newPrice: number) => void;
}

interface PriceDropSuggestion {
  shouldDrop: boolean;
  suggestedNewPrice: number;
  dropPercent: number;
  reasoning: string;
  estimatedDaysToSell: number;
}

export default function SmartPriceDrop({
  adId,
  currentPrice,
  viewsCount,
  favoritesCount,
  daysListed,
  autoDropEnabled,
  onToggleAutoDrop,
  onApplyDrop,
}: SmartPriceDropProps) {
  const [suggestion, setSuggestion] = useState<PriceDropSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const fetchSuggestion = useCallback(async () => {
    setIsLoading(true);
    try {
      const { getSessionToken } = await import("@/lib/supabase/auth");
      const res = await fetch("/api/ads/auto-price-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_id: adId, apply: false, session_token: getSessionToken() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestion(data.suggestion);
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    fetchSuggestion();
  }, [fetchSuggestion]);

  const handleApplyDrop = async () => {
    if (!suggestion?.shouldDrop) return;
    setIsApplying(true);
    try {
      const { getSessionToken } = await import("@/lib/supabase/auth");
      const res = await fetch("/api/ads/auto-price-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_id: adId, apply: true, session_token: getSessionToken() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.applied) {
          onApplyDrop(data.newPrice);
        }
      }
    } catch {
      // Silent
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-light p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green-light rounded-lg flex items-center justify-center">
            <TrendingDown size={16} className="text-brand-green" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark">سعر ذكي تلقائي</h3>
            <p className="text-[10px] text-gray-text">خفض السعر تلقائياً لبيع أسرع</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => onToggleAutoDrop(!autoDropEnabled)}
          className="flex items-center gap-1"
        >
          {autoDropEnabled ? (
            <ToggleRight size={28} className="text-brand-green" />
          ) : (
            <ToggleLeft size={28} className="text-gray-300" />
          )}
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-[11px] text-gray-text">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {daysListed} يوم
        </span>
        <span className="flex items-center gap-1">
          <Eye size={12} /> {viewsCount} مشاهدة
        </span>
        <span className="flex items-center gap-1">
          <Heart size={12} /> {favoritesCount} مفضلة
        </span>
      </div>

      {/* Suggestion */}
      {isLoading && (
        <div className="flex items-center justify-center py-3 gap-2">
          <Loader2 size={14} className="animate-spin text-brand-green" />
          <span className="text-xs text-gray-text">بنحلل أداء الإعلان...</span>
        </div>
      )}

      {!isLoading && suggestion && (
        <div className={`rounded-lg p-3 ${
          suggestion.shouldDrop
            ? "bg-brand-gold-light border border-brand-gold/20"
            : "bg-brand-green-light border border-brand-green/10"
        }`}>
          {suggestion.shouldDrop ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-brand-gold" />
                <span className="text-xs font-bold text-dark">
                  ننصحك تخفض السعر {suggestion.dropPercent}%
                </span>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="text-center">
                  <p className="text-[10px] text-gray-text">السعر الحالي</p>
                  <p className="text-sm font-bold text-dark line-through">
                    {formatPrice(currentPrice)}
                  </p>
                </div>
                <span className="text-gray-text">→</span>
                <div className="text-center">
                  <p className="text-[10px] text-gray-text">السعر المقترح</p>
                  <p className="text-sm font-bold text-brand-green">
                    {formatPrice(suggestion.suggestedNewPrice)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-gray-text leading-relaxed mb-3">
                {suggestion.reasoning}
              </p>

              <p className="text-[10px] text-brand-green font-semibold mb-2">
                متوقع يتباع خلال ~{suggestion.estimatedDaysToSell} يوم
              </p>

              <button
                type="button"
                onClick={handleApplyDrop}
                disabled={isApplying}
                className="w-full py-2 bg-brand-gold text-white text-xs font-bold rounded-lg hover:bg-brand-gold/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isApplying ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <TrendingDown size={14} />
                    خفض السعر دلوقتي
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg">👍</span>
              <div>
                <p className="text-xs font-bold text-brand-green-dark">
                  السعر مناسب!
                </p>
                <p className="text-[11px] text-gray-text">
                  {suggestion.reasoning}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto-drop explanation */}
      {autoDropEnabled && (
        <p className="text-[10px] text-gray-text leading-relaxed bg-gray-light rounded-lg p-2">
          لما التخفيض التلقائي مفعل، مكسب هيخفض السعر تدريجياً لو الإعلان مبيتباعش، وهيبلّغ كل اللي عاملين الإعلان مفضلة.
        </p>
      )}
    </div>
  );
}
