"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Info, X } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";

interface PriceStats {
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  totalListings: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  priceHistory: Array<{ date: string; avgPrice: number; count: number }>;
}

interface PriceQuality {
  verdict: string;
  verdictAr: string;
  emoji: string;
  percentDiff: number;
  explanation: string;
}

interface PriceBadgeProps {
  price: number;
  categoryId: string;
  subcategoryId?: string;
  brand?: string;
  model?: string;
  condition?: string;
  governorate?: string;
  variant?: "badge" | "card" | "inline";
}

export default function PriceBadge({
  price,
  categoryId,
  subcategoryId,
  brand,
  model,
  condition,
  governorate,
  variant = "badge",
}: PriceBadgeProps) {
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [quality, setQuality] = useState<PriceQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!categoryId || !price) { setLoading(false); return; }

    const fetchPriceData = async () => {
      try {
        const res = await fetch("/api/price/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId,
            subcategoryId,
            brand,
            model,
            condition,
            governorate,
            price,
          }),
        });
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (data.priceQuality) setQuality(data.priceQuality);
      } catch {
        // Silently fail
      }
      setLoading(false);
    };

    fetchPriceData();
  }, [price, categoryId, subcategoryId, brand, model, condition, governorate]);

  if (loading || !quality) return null;

  // Badge variant (small, inline)
  if (variant === "badge") {
    const bgColors: Record<string, string> = {
      great_deal: "bg-green-100 text-green-700 border-green-200",
      good_price: "bg-blue-50 text-blue-700 border-blue-200",
      fair_price: "bg-gray-100 text-gray-600 border-gray-200",
      above_average: "bg-orange-50 text-orange-600 border-orange-200",
      expensive: "bg-red-50 text-red-600 border-red-200",
    };

    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${bgColors[quality.verdict] || bgColors.fair_price} transition-all hover:opacity-80`}
      >
        <span>{quality.emoji}</span>
        <span>{quality.verdictAr}</span>
      </button>
    );
  }

  // Inline variant (minimal)
  if (variant === "inline") {
    return (
      <span className="text-[10px] font-medium text-gray-text">
        {quality.emoji} {quality.verdictAr}
        {stats && ` · متوسط ${formatPrice(stats.avgPrice)}`}
      </span>
    );
  }

  // Card variant (detailed)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-brand-green" />
          <h3 className="text-sm font-bold text-dark">ذكاء الأسعار</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 rounded-lg hover:bg-gray-100"
        >
          {showDetails ? <X size={16} className="text-gray-400" /> : <Info size={16} className="text-gray-400" />}
        </button>
      </div>

      {/* Price verdict */}
      <div className="flex items-center gap-3">
        <div className="text-2xl">{quality.emoji}</div>
        <div>
          <p className="text-sm font-bold text-dark">{quality.verdictAr}</p>
          <p className="text-xs text-gray-text">{quality.explanation}</p>
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-text">الأقل</p>
            <p className="text-xs font-bold text-dark">{formatPrice(stats.minPrice)}</p>
          </div>
          <div className="bg-brand-green-light rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-text">المتوسط</p>
            <p className="text-xs font-bold text-brand-green">{formatPrice(stats.avgPrice)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-text">الأعلى</p>
            <p className="text-xs font-bold text-dark">{formatPrice(stats.maxPrice)}</p>
          </div>
        </div>
      )}

      {/* Price position bar */}
      {stats && stats.avgPrice > 0 && (
        <div className="relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-red-400 via-yellow-400 to-green-400 rounded-full"
              style={{ width: "100%" }}
            />
          </div>
          {/* Price indicator */}
          <div
            className="absolute top-0 -mt-0.5 w-3 h-3 bg-dark rounded-full border-2 border-white shadow"
            style={{
              right: `${Math.min(95, Math.max(5, ((price - stats.minPrice) / (stats.maxPrice - stats.minPrice)) * 100))}%`,
              transform: "translateX(50%)",
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-text">رخيص</span>
            <span className="text-[9px] text-gray-text">غالي</span>
          </div>
        </div>
      )}

      {/* Trend */}
      {stats && stats.trend !== "stable" && (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
          stats.trend === "down" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {stats.trend === "down" ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          <span>
            الأسعار {stats.trend === "down" ? "بتنزل" : "بتزيد"} بنسبة {stats.trendPercent}% آخر 3 شهور
          </span>
        </div>
      )}

      {/* Detailed view */}
      {showDetails && stats && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-dark">تفاصيل السوق</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-text">عدد الإعلانات المشابهة</span>
              <span className="font-bold text-dark">{stats.totalListings}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-text">متوسط السعر</span>
              <span className="font-bold text-brand-green">{formatPrice(stats.avgPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-text">الوسيط</span>
              <span className="font-bold text-dark">{formatPrice(stats.medianPrice)}</span>
            </div>
          </div>

          {/* Simple price chart */}
          {stats.priceHistory.length > 2 && (
            <div className="mt-3">
              <p className="text-[10px] text-gray-text mb-2">تاريخ الأسعار (آخر 3 شهور)</p>
              <div className="flex items-end gap-1 h-16">
                {stats.priceHistory.map((point, i) => {
                  const maxH = Math.max(...stats.priceHistory.map((p) => p.avgPrice));
                  const minH = Math.min(...stats.priceHistory.map((p) => p.avgPrice));
                  const range = maxH - minH || 1;
                  const height = ((point.avgPrice - minH) / range) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-brand-green/20 rounded-t-sm hover:bg-brand-green/40 transition-colors relative group"
                      style={{ height: `${Math.max(10, height)}%` }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-dark text-white text-[8px] px-1 py-0.5 rounded whitespace-nowrap">
                        {(point.avgPrice / 1000).toFixed(0)}k
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
