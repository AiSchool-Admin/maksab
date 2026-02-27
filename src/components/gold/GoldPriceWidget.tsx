"use client";

import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Info, Clock } from "lucide-react";
import { getGoldPrices, type GoldPrice, KARAT_LABELS } from "@/lib/gold/gold-price-service";
import { formatTimeAgo } from "@/lib/utils/format";

interface GoldPriceWidgetProps {
  /** If provided, highlights this karat row */
  highlightKarat?: string;
  /** Compact mode for embedding in forms */
  compact?: boolean;
}

/**
 * Displays current gold & silver prices per gram in EGP.
 * Used on:
 * - Gold category ad detail pages
 * - Ad creation form (gold category)
 * - Search results for gold category
 */
export default function GoldPriceWidget({
  highlightKarat,
  compact = false,
}: GoldPriceWidgetProps) {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPrices = async () => {
    try {
      const data = await getGoldPrices();
      setPrices(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPrices();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPrices();
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-b from-amber-50 to-white rounded-xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-amber-100 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-amber-50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const goldPrices = prices.filter((p) => !p.karat.startsWith("silver"));
  const silverPrices = prices.filter((p) => p.karat.startsWith("silver"));
  const fetchedAt = prices[0]?.fetchedAt;

  if (compact) {
    // Compact version: just show highlighted karat or all in one line
    const highlighted = highlightKarat
      ? prices.find((p) => p.karat === highlightKarat)
      : null;

    return (
      <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200/50">
        <span className="text-amber-600 text-sm">💰</span>
        {highlighted ? (
          <span className="text-xs text-dark">
            سعر جرام {highlighted.label} النهارده:{" "}
            <span className="font-bold text-amber-700">
              {highlighted.pricePerGram.toLocaleString("en-US")} جنيه
            </span>
          </span>
        ) : (
          <span className="text-xs text-dark">
            سعر جرام عيار 21:{" "}
            <span className="font-bold text-amber-700">
              {(prices.find((p) => p.karat === "21")?.pricePerGram ?? 0).toLocaleString("en-US")} جنيه
            </span>
          </span>
        )}
        <button
          onClick={handleRefresh}
          className="me-auto"
          title="تحديث الأسعار"
        >
          <RefreshCw
            size={12}
            className={`text-amber-500 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl border border-amber-200/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-amber-500 to-amber-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <div>
            <h3 className="text-sm font-bold text-white">أسعار الذهب والفضة اليوم</h3>
            <p className="text-[10px] text-amber-100">أسعار لحظية — سعر الجرام بالجنيه المصري</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <RefreshCw
            size={14}
            className={`text-white ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Gold prices */}
      <div className="p-4 space-y-1.5">
        {goldPrices.map((p) => {
          const isHighlighted = highlightKarat === p.karat;
          return (
            <div
              key={p.karat}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                isHighlighted
                  ? "bg-amber-100 border-2 border-amber-300"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {p.karat === "24" ? "🥇" : p.karat === "21" ? "🏅" : "🥉"}
                </span>
                <span className={`text-sm font-bold ${isHighlighted ? "text-amber-800" : "text-dark"}`}>
                  {p.label}
                </span>
              </div>
              <span className={`text-sm font-bold ${isHighlighted ? "text-amber-700" : "text-dark"}`}>
                {p.pricePerGram.toLocaleString("en-US")} جنيه/جرام
              </span>
            </div>
          );
        })}

        {/* Silver section */}
        {silverPrices.length > 0 && (
          <>
            <div className="pt-2 pb-1">
              <span className="text-xs font-bold text-gray-text">الفضة</span>
            </div>
            {silverPrices.map((p) => {
              const isHighlighted = highlightKarat === p.karat;
              return (
                <div
                  key={p.karat}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                    isHighlighted
                      ? "bg-gray-200 border-2 border-gray-400"
                      : "bg-white border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🪙</span>
                    <span className="text-sm font-bold text-dark">{p.label}</span>
                  </div>
                  <span className="text-sm font-bold text-dark">
                    {p.pricePerGram.toLocaleString("en-US")} جنيه/جرام
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer with timestamp */}
      {fetchedAt && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-gray-text">
          <Clock size={10} />
          <span>آخر تحديث: {formatTimeAgo(fetchedAt)}</span>
          <span className="mx-1">·</span>
          <Info size={10} />
          <span>الأسعار استرشادية وقابلة للتغيير</span>
        </div>
      )}
    </div>
  );
}
