"use client";

import { Eye, Heart, Clock } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";

interface SocialProofProps {
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
}

/**
 * Social proof indicators: views, favorites, and time since posting.
 * Uses real data with friendly Egyptian Arabic formatting.
 */
export default function SocialProof({
  viewsCount,
  favoritesCount,
  createdAt,
}: SocialProofProps) {
  // Only show if there's meaningful data
  if (viewsCount < 2 && favoritesCount < 1) return null;

  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/50 rounded-xl px-3 py-2.5">
      {viewsCount >= 2 && (
        <div className="flex items-center gap-1.5 text-amber-700">
          <Eye size={14} />
          <span className="text-xs font-semibold">
            {formatNumber(viewsCount)} شخص شاف الإعلان ده
          </span>
        </div>
      )}
      {favoritesCount >= 1 && (
        <div className="flex items-center gap-1 text-red-500">
          <Heart size={12} fill="currentColor" />
          <span className="text-xs font-semibold">{favoritesCount}</span>
        </div>
      )}
    </div>
  );
}
