"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, AlertTriangle, Lightbulb, TrendingUp, Info, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface ProductInsight {
  title: string;
  icon: string;
  content: string;
  type: "tip" | "warning" | "info" | "market";
}

interface ProductInsightsCardProps {
  categoryId: string;
  categoryFields: Record<string, unknown>;
  title: string;
  price: number | null;
  saleType: string;
  description?: string;
  governorate?: string;
}

const typeStyles: Record<string, { bg: string; border: string; IconComponent: typeof Info }> = {
  tip: { bg: "bg-brand-green-light/50", border: "border-brand-green/10", IconComponent: Lightbulb },
  warning: { bg: "bg-orange-50", border: "border-orange-200/50", IconComponent: AlertTriangle },
  info: { bg: "bg-blue-50", border: "border-blue-200/50", IconComponent: Info },
  market: { bg: "bg-brand-gold-light/50", border: "border-brand-gold/10", IconComponent: TrendingUp },
};

// Cache insights per ad title (session-level)
const insightsCache = new Map<string, ProductInsight[]>();

export default function ProductInsightsCard({
  categoryId,
  categoryFields,
  title,
  price,
  saleType,
  description,
  governorate,
}: ProductInsightsCardProps) {
  const [insights, setInsights] = useState<ProductInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const cacheKey = `${categoryId}:${title}`;

  const fetchInsights = useCallback(async () => {
    if (hasFetched) return;
    setHasFetched(true);

    // Check cache
    const cached = insightsCache.get(cacheKey);
    if (cached) {
      setInsights(cached);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/chat/product-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          category_fields: categoryFields,
          title,
          price,
          sale_type: saleType,
          description,
          governorate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.insights?.length) {
          setInsights(data.insights);
          insightsCache.set(cacheKey, data.insights);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, categoryId, categoryFields, title, price, saleType, description, governorate, hasFetched]);

  // Lazy load — only fetch when expanded
  useEffect(() => {
    if (isExpanded && !hasFetched) {
      fetchInsights();
    }
  }, [isExpanded, hasFetched, fetchInsights]);

  return (
    <div className="bg-gray-light/50 rounded-xl border border-gray-200/50 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-brand-green" />
          <span className="text-xs font-bold text-dark">بطاقة ذكاء المنتج</span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-gray-text" />
        ) : (
          <ChevronDown size={14} className="text-gray-text" />
        )}
      </button>

      {/* Insights list */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 size={14} className="animate-spin text-brand-green" />
              <span className="text-xs text-gray-text">بنجمع معلومات عن المنتج...</span>
            </div>
          )}

          {!isLoading && insights.length === 0 && (
            <p className="text-xs text-gray-text text-center py-3">
              مفيش معلومات متاحة حالياً
            </p>
          )}

          {!isLoading &&
            insights.map((insight, i) => {
              const style = typeStyles[insight.type] || typeStyles.info;
              const Icon = style.IconComponent;

              return (
                <div
                  key={i}
                  className={`${style.bg} border ${style.border} rounded-lg p-2.5`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0 mt-0.5">{insight.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon size={11} className="text-gray-text flex-shrink-0" />
                        <span className="text-[11px] font-bold text-dark">
                          {insight.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-text leading-relaxed">
                        {insight.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
