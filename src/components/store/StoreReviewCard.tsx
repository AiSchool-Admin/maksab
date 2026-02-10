"use client";

import { Star } from "lucide-react";
import type { StoreReview } from "@/types";
import { formatTimeAgo } from "@/lib/utils/format";

interface StoreReviewCardProps {
  review: StoreReview;
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= rating
              ? "text-brand-gold fill-brand-gold"
              : "text-gray-200"
          }
        />
      ))}
    </div>
  );
}

export default function StoreReviewCard({ review }: StoreReviewCardProps) {
  const ratingCategories = [
    { label: "الجودة", value: review.quality_rating },
    { label: "الدقة", value: review.accuracy_rating },
    { label: "الاستجابة", value: review.response_rating },
    { label: "الالتزام", value: review.commitment_rating },
  ].filter((r) => r.value != null);

  return (
    <article className="bg-white rounded-xl border border-gray-light p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-green-light flex items-center justify-center text-sm">
            {review.reviewer?.avatar_url ? (
              <img
                src={review.reviewer.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              "👤"
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-dark">
              {review.reviewer?.display_name || "مستخدم"}
            </p>
            <p className="text-[10px] text-gray-text">
              {formatTimeAgo(review.created_at)}
            </p>
          </div>
        </div>
        <StarRating rating={review.overall_rating} />
      </div>

      {/* Sub-ratings */}
      {ratingCategories.length > 0 && (
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          {ratingCategories.map((cat) => (
            <span
              key={cat.label}
              className="text-[10px] text-gray-text flex items-center gap-0.5"
            >
              {cat.label}:
              <Star
                size={10}
                className="text-brand-gold fill-brand-gold"
              />
              {cat.value}
            </span>
          ))}
        </div>
      )}

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-dark leading-relaxed mb-2">
          {review.comment}
        </p>
      )}

      {/* Seller reply */}
      {review.seller_reply && (
        <div className="bg-brand-green-light/50 rounded-lg p-3 mt-2 border-r-2 border-brand-green">
          <p className="text-[10px] text-brand-green font-semibold mb-1">
            رد البائع:
          </p>
          <p className="text-sm text-dark leading-relaxed">
            {review.seller_reply}
          </p>
        </div>
      )}
    </article>
  );
}
