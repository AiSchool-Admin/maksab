"use client";

import { User } from "lucide-react";
import StarRating from "./StarRating";
import { formatTimeAgo } from "@/lib/utils/format";
import type { Review } from "@/lib/reviews/reviews-service";

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="border border-gray-light rounded-xl p-4 space-y-2">
      {/* Reviewer info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-green-light flex items-center justify-center flex-shrink-0 overflow-hidden">
          {review.reviewerAvatar ? (
            <img
              src={review.reviewerAvatar}
              alt={review.reviewerName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={16} className="text-brand-green" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-dark truncate">
            {review.reviewerName}
          </p>
          <p className="text-[11px] text-gray-text">
            {formatTimeAgo(review.createdAt)}
          </p>
        </div>
        <StarRating rating={review.rating} size={14} />
      </div>

      {/* Ad reference */}
      <p className="text-[11px] text-gray-text bg-gray-light rounded-lg px-2 py-1 inline-block">
        بخصوص: {review.adTitle}
      </p>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-dark leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
}
