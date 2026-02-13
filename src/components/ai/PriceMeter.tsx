"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";

// ── Types ────────────────────────────────────────────

interface PriceMeterProps {
  categoryId: string;
  categoryFields: Record<string, unknown>;
  title: string;
  price: number;
  governorate?: string;
  compact?: boolean;
}

interface PriceEstimate {
  estimated_price: number;
  price_range: { min: number; max: number };
  quick_sale_price: number;
  confidence: number;
  reasoning: string;
  market_trend: "up" | "down" | "stable";
  estimated_sell_days: number;
}

type PriceVerdict = "great" | "fair" | "overpriced";

// ── Cache ────────────────────────────────────────────

const estimateCache = new Map<string, PriceEstimate>();

function buildCacheKey(title: string, categoryId: string): string {
  return `${categoryId}::${title}`;
}

// ── Helpers ──────────────────────────────────────────

function getVerdict(price: number, estimate: PriceEstimate): PriceVerdict {
  const ratio = price / estimate.estimated_price;
  if (ratio <= 0.85) return "great";
  if (ratio <= 1.15) return "fair";
  return "overpriced";
}

function getVerdictLabel(verdict: PriceVerdict): string {
  switch (verdict) {
    case "great":
      return "سعر ممتاز";
    case "fair":
      return "سعر عادل";
    case "overpriced":
      return "سعر عالي";
  }
}

function getVerdictBadgeSymbol(verdict: PriceVerdict): string {
  switch (verdict) {
    case "great":
      return "\u2713";
    case "fair":
      return "\u25CF";
    case "overpriced":
      return "\u2191";
  }
}

function getVerdictColors(verdict: PriceVerdict) {
  switch (verdict) {
    case "great":
      return {
        bg: "bg-brand-green-light",
        text: "text-brand-green",
        border: "border-brand-green/20",
      };
    case "fair":
      return {
        bg: "bg-brand-gold-light",
        text: "text-brand-gold",
        border: "border-brand-gold/20",
      };
    case "overpriced":
      return {
        bg: "bg-red-50",
        text: "text-error",
        border: "border-error/20",
      };
  }
}

function getTrendLabel(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up":
      return "الأسعار بتزيد";
    case "down":
      return "الأسعار بتنزل";
    case "stable":
      return "الأسعار مستقرة";
  }
}

function getTrendIcon(trend: "up" | "down" | "stable") {
  switch (trend) {
    case "up":
      return TrendingUp;
    case "down":
      return TrendingDown;
    case "stable":
      return Minus;
  }
}

function getTrendColors(trend: "up" | "down" | "stable") {
  switch (trend) {
    case "up":
      return { bg: "bg-red-50", text: "text-error" };
    case "down":
      return { bg: "bg-brand-green-light", text: "text-brand-green" };
    case "stable":
      return { bg: "bg-gray-light", text: "text-gray-text" };
  }
}

/**
 * Calculate the marker position on the gradient bar.
 * The bar spans from price_range.min to price_range.max.
 * Lower price = more to the right (RTL: green is right, red is left).
 * Returns a percentage (0-100) where 0 = leftmost (red/overpriced) and 100 = rightmost (green/great deal).
 */
function getMarkerPosition(
  price: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (rangeMax === rangeMin) return 50;
  // Clamp price within an extended range for display purposes
  const extendedMin = rangeMin * 0.7;
  const extendedMax = rangeMax * 1.3;
  const clamped = Math.min(Math.max(price, extendedMin), extendedMax);
  // Invert: lower price = higher percentage (right side in RTL = green)
  const ratio = (clamped - extendedMin) / (extendedMax - extendedMin);
  // ratio 0 = cheapest (green), ratio 1 = most expensive (red)
  // We want CSS left% where 0% = green (right in RTL), 100% = red (left in RTL)
  // In RTL, CSS "right" maps to the visual right. We use "right" percentage.
  // So: low price → high right% (closer to green), high price → low right% (closer to red)
  return Math.min(95, Math.max(5, (1 - ratio) * 100));
}

// ── Component ───────────────────────────────────────

export default function PriceMeter({
  categoryId,
  categoryFields,
  title,
  price,
  governorate,
  compact = false,
}: PriceMeterProps) {
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // IntersectionObserver: only fetch when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fetchEstimate = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const cacheKey = buildCacheKey(title, categoryId);
    const cached = estimateCache.get(cacheKey);
    if (cached) {
      setEstimate(cached);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          category_fields: categoryFields,
          title,
          governorate,
        }),
      });

      if (!res.ok) {
        throw new Error("API error");
      }

      const data = await res.json();

      if (!data.success || !data.estimate) {
        throw new Error("Invalid response");
      }

      const est = data.estimate as PriceEstimate;
      estimateCache.set(cacheKey, est);
      setEstimate(est);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryId, categoryFields, title, governorate]);

  // Fetch when visible
  useEffect(() => {
    if (isVisible && !fetchedRef.current) {
      fetchEstimate();
    }
  }, [isVisible, fetchEstimate]);

  // ── Render nothing on error ──
  if (error) return <div ref={containerRef} />;

  // ── Compact mode ──
  if (compact) {
    return (
      <div ref={containerRef}>
        {loading && (
          <div className="h-5 w-16 skeleton rounded-md" />
        )}
        {!loading && estimate && (
          <CompactBadge price={price} estimate={estimate} />
        )}
      </div>
    );
  }

  // ── Full mode ──
  return (
    <div ref={containerRef}>
      {loading && <FullSkeleton />}
      {!loading && estimate && (
        <FullMeter price={price} estimate={estimate} />
      )}
    </div>
  );
}

// ── Compact Badge ───────────────────────────────────

function CompactBadge({
  price,
  estimate,
}: {
  price: number;
  estimate: PriceEstimate;
}) {
  const verdict = getVerdict(price, estimate);
  const label = getVerdictLabel(verdict);
  const symbol = getVerdictBadgeSymbol(verdict);
  const colors = getVerdictColors(verdict);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span>{symbol}</span>
      <span>{label}</span>
    </span>
  );
}

// ── Full Meter ──────────────────────────────────────

function FullMeter({
  price,
  estimate,
}: {
  price: number;
  estimate: PriceEstimate;
}) {
  const verdict = getVerdict(price, estimate);
  const verdictLabel = getVerdictLabel(verdict);
  const verdictColors = getVerdictColors(verdict);
  const trendLabel = getTrendLabel(estimate.market_trend);
  const TrendIcon = getTrendIcon(estimate.market_trend);
  const trendColors = getTrendColors(estimate.market_trend);

  const markerPosition = getMarkerPosition(
    price,
    estimate.price_range.min,
    estimate.price_range.max,
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      {/* Header with verdict */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-dark">مؤشر السعر</h3>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${verdictColors.bg} ${verdictColors.text}`}
        >
          {verdictLabel}
        </span>
      </div>

      {/* Gradient bar with marker */}
      <div className="space-y-2">
        <div className="relative pt-1 pb-1">
          {/* Gradient bar: green (right in RTL) → yellow → red (left in RTL) */}
          <div className="h-3 rounded-full overflow-hidden bg-gradient-to-l from-brand-green via-warning to-error" />

          {/* Price marker */}
          <div
            className="absolute top-0 w-4 h-5 flex flex-col items-center"
            style={{
              right: `${markerPosition}%`,
              transform: "translateX(50%)",
            }}
          >
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-dark" />
            <div className="w-1 h-2.5 bg-dark rounded-b-sm" />
          </div>
        </div>

        {/* Bar labels */}
        <div className="flex justify-between text-[10px] text-gray-text">
          <span>غالي</span>
          <span>رخيص</span>
        </div>
      </div>

      {/* Price range info */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-brand-green-light rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-gray-text mb-0.5">سعر بيع سريع</p>
          <p className="text-xs font-bold text-brand-green">
            {formatPrice(estimate.quick_sale_price)}
          </p>
        </div>
        <div className="bg-brand-gold-light rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-gray-text mb-0.5">السعر المتوقع</p>
          <p className="text-xs font-bold text-brand-gold">
            {formatPrice(estimate.estimated_price)}
          </p>
        </div>
        <div className="bg-gray-light rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-gray-text mb-0.5">أعلى سعر</p>
          <p className="text-xs font-bold text-dark">
            {formatPrice(estimate.price_range.max)}
          </p>
        </div>
      </div>

      {/* Market range */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-gray-text">نطاق السوق:</span>
        <span className="font-bold text-dark">
          {formatPrice(estimate.price_range.min)} — {formatPrice(estimate.price_range.max)}
        </span>
      </div>

      {/* Market trend */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${trendColors.bg} ${trendColors.text}`}
      >
        <TrendIcon size={14} />
        <span>{trendLabel}</span>
      </div>

      {/* AI reasoning */}
      {estimate.reasoning && (
        <p className="text-xs text-gray-text leading-relaxed px-1">
          {estimate.reasoning}
        </p>
      )}

      {/* Estimated sell time */}
      {estimate.estimated_sell_days > 0 && (
        <div className="flex items-center justify-between text-xs px-1 pt-1 border-t border-gray-100">
          <span className="text-gray-text">مدة البيع المتوقعة:</span>
          <span className="font-bold text-dark">
            {estimate.estimated_sell_days === 1
              ? "يوم واحد"
              : estimate.estimated_sell_days === 2
                ? "يومين"
                : estimate.estimated_sell_days <= 10
                  ? `${estimate.estimated_sell_days} أيام`
                  : `${estimate.estimated_sell_days} يوم`}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Skeletons ───────────────────────────────────────

function FullSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-6 w-16 bg-gray-200 rounded-lg" />
      </div>

      {/* Bar */}
      <div className="h-3 bg-gray-200 rounded-full" />

      {/* Three cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="h-14 bg-gray-100 rounded-xl" />
        <div className="h-14 bg-gray-100 rounded-xl" />
        <div className="h-14 bg-gray-100 rounded-xl" />
      </div>

      {/* Text lines */}
      <div className="h-3 w-3/4 bg-gray-200 rounded" />
      <div className="h-8 bg-gray-100 rounded-xl" />
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
