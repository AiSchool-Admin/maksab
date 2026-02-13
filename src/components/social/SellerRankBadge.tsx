/**
 * Seller Rank Badge — compact badge showing the seller's rank level.
 *
 * Sizes:
 *   sm  — Icon only (for ad cards)
 *   md  — Icon + name (for seller profile sections)
 *   lg  — Icon + name + colored background pill (for profile page)
 *
 * All text in Egyptian Arabic, RTL-friendly.
 */

"use client";

import {
  type SellerRank,
  SELLER_RANKS,
} from "@/lib/social/seller-rank-service";

interface SellerRankBadgeProps {
  rank: SellerRank;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function SellerRankBadge({
  rank,
  size = "sm",
  showLabel = true,
}: SellerRankBadgeProps) {
  const config = SELLER_RANKS.find((r) => r.rank === rank) ?? SELLER_RANKS[0];

  // sm: just icon
  if (size === "sm") {
    return (
      <span
        className="inline-flex items-center justify-center"
        title={config.name}
        aria-label={`رتبة البائع: ${config.name}`}
      >
        <span className="text-sm leading-none">{config.icon}</span>
      </span>
    );
  }

  // md: icon + name inline
  if (size === "md") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-bold ${config.color}`}
        aria-label={`رتبة البائع: ${config.name}`}
      >
        <span className="text-sm leading-none">{config.icon}</span>
        {showLabel && <span>{config.name}</span>}
      </span>
    );
  }

  // lg: icon + name inside colored pill
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${config.bgColor} ${config.color}`}
      aria-label={`رتبة البائع: ${config.name}`}
    >
      <span className="text-base leading-none">{config.icon}</span>
      {showLabel && <span>{config.name}</span>}
    </span>
  );
}
