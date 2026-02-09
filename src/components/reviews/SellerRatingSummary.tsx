"use client";

import { useState, useEffect } from "react";
import { Award, ChevronLeft } from "lucide-react";
import StarRating from "./StarRating";
import ReviewCard from "./ReviewCard";
import { getSellerRatingSummary, getSellerReviews } from "@/lib/reviews/reviews-service";
import type { Review, SellerRatingsSummary } from "@/lib/reviews/reviews-service";

interface SellerRatingSummaryProps {
  sellerId: string;
  compact?: boolean;
}

export default function SellerRatingSummaryComponent({
  sellerId,
  compact = false,
}: SellerRatingSummaryProps) {
  const [summary, setSummary] = useState<SellerRatingsSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSellerRatingSummary(sellerId),
      getSellerReviews(sellerId, 3),
    ]).then(([sum, revs]) => {
      setSummary(sum);
      setReviews(revs);
      setIsLoading(false);
    });
  }, [sellerId]);

  const handleShowAll = async () => {
    const allReviews = await getSellerReviews(sellerId, 50);
    setReviews(allReviews);
    setShowAll(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-24 bg-gray-light rounded animate-pulse" />
        <div className="h-16 bg-gray-light rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    if (compact) return null;
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-text">لا يوجد تقييمات بعد</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StarRating rating={summary.averageRating} size={14} />
        <span className="text-sm font-bold text-dark">
          {summary.averageRating}
        </span>
        <span className="text-xs text-gray-text">
          ({summary.totalReviews} تقييم)
        </span>
        {summary.isTrustedSeller && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full">
            <Award size={10} />
            بائع موثوق
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-dark">التقييمات والمراجعات</h3>

      {/* Summary card */}
      <div className="bg-gray-light rounded-xl p-4">
        <div className="flex items-center gap-4">
          {/* Big number */}
          <div className="text-center">
            <p className="text-3xl font-bold text-dark">{summary.averageRating}</p>
            <StarRating rating={summary.averageRating} size={12} />
            <p className="text-[11px] text-gray-text mt-1">
              {summary.totalReviews} تقييم
            </p>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star] || 0;
              const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-text w-3">{star}</span>
                  <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-gold rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-text w-5 text-start">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trusted seller badge */}
        {summary.isTrustedSeller && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/50">
            <Award size={16} className="text-brand-green" />
            <span className="text-sm font-bold text-brand-green">بائع موثوق</span>
            <span className="text-[11px] text-gray-text">
              ({summary.positiveReviews}+ تقييم إيجابي)
            </span>
          </div>
        )}
      </div>

      {/* Recent reviews */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}

          {!showAll && summary.totalReviews > 3 && (
            <button
              onClick={handleShowAll}
              className="flex items-center gap-1 text-sm font-semibold text-brand-green hover:text-brand-green-dark transition-colors mx-auto"
            >
              عرض كل التقييمات ({summary.totalReviews})
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
