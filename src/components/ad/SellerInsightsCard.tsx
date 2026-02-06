"use client";

import { useState, useEffect } from "react";
import { Users, Search, MapPin, Lightbulb } from "lucide-react";
import { getSellerInsights } from "@/lib/recommendations/recommendations-service";
import type { SellerInsights } from "@/lib/recommendations/types";

interface SellerInsightsCardProps {
  categoryId: string;
  title: string;
  governorate: string;
  hasImages: boolean;
}

export default function SellerInsightsCard({
  categoryId,
  title,
  governorate,
  hasImages,
}: SellerInsightsCardProps) {
  const [insights, setInsights] = useState<SellerInsights | null>(null);

  useEffect(() => {
    getSellerInsights({ categoryId, title, governorate, hasImages }).then(
      setInsights,
    );
  }, [categoryId, title, governorate, hasImages]);

  if (!insights) return null;

  return (
    <div className="bg-brand-green-light rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
        📊 إعلانك ممكن يوصل لـ:
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-dark">
          <Users size={16} className="text-brand-green flex-shrink-0" />
          <span>
            <strong>{insights.categorySearchers}</strong> شخص بيدوروا في نفس
            القسم
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-dark">
          <Search size={16} className="text-brand-green flex-shrink-0" />
          <span>
            <strong>{insights.specificSearchers}</strong> شخص بيدوروا على حاجة
            شبه كده تحديداً
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-dark">
          <MapPin size={16} className="text-brand-green flex-shrink-0" />
          <span>
            <strong>{insights.locationInterested}</strong> شخص في {governorate}{" "}
            مهتمين
          </span>
        </div>
      </div>

      {insights.tips.length > 0 && (
        <div className="border-t border-brand-green/20 pt-3 space-y-1.5">
          {insights.tips.map((tip, i) => (
            <p
              key={i}
              className="flex items-start gap-1.5 text-xs text-gray-text"
            >
              <Lightbulb
                size={12}
                className="text-brand-gold flex-shrink-0 mt-0.5"
              />
              {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
