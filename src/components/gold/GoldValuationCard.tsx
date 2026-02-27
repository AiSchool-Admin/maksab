"use client";

import { useState, useEffect } from "react";
import { Info, TrendingUp, TrendingDown, Scale } from "lucide-react";
import {
  calculateGoldValuation,
  formatGoldPrice,
  type GoldValuation,
} from "@/lib/gold/gold-price-service";
import { formatTimeAgo } from "@/lib/utils/format";

interface GoldValuationCardProps {
  /** Karat type: "24", "21", "18", etc. */
  karat: string;
  /** Weight in grams */
  weightGrams: number;
  /** The listed ad price */
  listedPrice: number;
}

/**
 * Shows gold/silver ad valuation breakdown:
 * - Current gram price for the karat
 * - Raw metal value (weight * price/gram)
 * - Craftsmanship fee (listed price - metal value)
 *
 * Displayed on gold/silver ad detail pages to help buyers
 * understand the price breakdown.
 */
export default function GoldValuationCard({
  karat,
  weightGrams,
  listedPrice,
}: GoldValuationCardProps) {
  const [valuation, setValuation] = useState<GoldValuation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!karat || !weightGrams || !listedPrice) {
      setIsLoading(false);
      return;
    }

    calculateGoldValuation(karat, weightGrams, listedPrice)
      .then(setValuation)
      .finally(() => setIsLoading(false));
  }, [karat, weightGrams, listedPrice]);

  if (isLoading) {
    return (
      <div className="bg-amber-50 rounded-xl p-4 animate-pulse space-y-3">
        <div className="h-4 w-40 bg-amber-100 rounded" />
        <div className="h-16 bg-amber-100 rounded" />
      </div>
    );
  }

  if (!valuation) return null;

  const isGold = !karat.startsWith("silver");

  return (
    <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl border border-amber-200/50 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500/10 px-4 py-3 flex items-center gap-2 border-b border-amber-200/30">
        <Scale size={16} className="text-amber-700" />
        <h3 className="text-sm font-bold text-amber-800">
          تقييم سعر {isGold ? "الذهب" : "الفضة"}
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Current gram price */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-text">سعر جرام {valuation.karatLabel} الآن</span>
          <span className="font-bold text-amber-700">
            {valuation.pricePerGram.toLocaleString("en-US")} جنيه
          </span>
        </div>

        {/* Weight */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-text">الوزن</span>
          <span className="font-bold text-dark">{weightGrams} جرام</span>
        </div>

        <div className="h-px bg-amber-200/50" />

        {/* Raw metal value */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-text">
            قيمة {isGold ? "الذهب" : "الفضة"} الخام
          </span>
          <span className="font-bold text-dark">
            {formatGoldPrice(valuation.metalValue)}
          </span>
        </div>

        {/* Listed price */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-text">السعر المعروض</span>
          <span className="font-bold text-brand-green">
            {formatGoldPrice(valuation.listedPrice)}
          </span>
        </div>

        <div className="h-px bg-amber-200/50" />

        {/* Craftsmanship fee */}
        <div
          className={`flex items-center justify-between p-3 rounded-xl ${
            valuation.isBelowMetalValue
              ? "bg-green-50 border border-green-200"
              : "bg-amber-50 border border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {valuation.isBelowMetalValue ? (
              <TrendingDown size={16} className="text-green-600" />
            ) : (
              <TrendingUp size={16} className="text-amber-600" />
            )}
            <div>
              <p className="text-sm font-bold text-dark">
                {valuation.isBelowMetalValue
                  ? "السعر أقل من قيمة المعدن! 🔥"
                  : "المصنعية"}
              </p>
              {!valuation.isBelowMetalValue && (
                <p className="text-[10px] text-gray-text">
                  الفرق بين السعر المعروض وقيمة {isGold ? "الذهب" : "الفضة"} الخام
                </p>
              )}
            </div>
          </div>
          <div className="text-end">
            <p
              className={`text-sm font-bold ${
                valuation.isBelowMetalValue ? "text-green-600" : "text-amber-700"
              }`}
            >
              {valuation.isBelowMetalValue
                ? `وفّر ${formatGoldPrice(valuation.metalValue - valuation.listedPrice)}`
                : formatGoldPrice(valuation.craftsmanshipFee)}
            </p>
            {!valuation.isBelowMetalValue && valuation.craftsmanshipPercent > 0 && (
              <p className="text-[10px] text-gray-text">
                ({valuation.craftsmanshipPercent}% من السعر)
              </p>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 text-[10px] text-gray-text">
          <Info size={10} className="flex-shrink-0 mt-0.5" />
          <p>
            السعر المعروض يشمل المصنعية. أسعار {isGold ? "الذهب" : "الفضة"} لحظية
            وقابلة للتغيير. آخر تحديث: {formatTimeAgo(valuation.fetchedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
