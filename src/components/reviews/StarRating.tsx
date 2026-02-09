"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 18,
  interactive = false,
  onChange,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: maxStars }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.round(rating);

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            className={`transition-colors ${
              interactive
                ? "cursor-pointer hover:scale-110 active:scale-95"
                : "cursor-default"
            }`}
            aria-label={`${starValue} نجمة`}
          >
            <Star
              size={size}
              className={
                isFilled
                  ? "text-brand-gold fill-brand-gold"
                  : "text-gray-300"
              }
              fill={isFilled ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}
