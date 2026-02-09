/**
 * Loyalty level badge — shows user's current level with icon.
 * Used on profile page, ad cards, and seller info sections.
 */

"use client";

import { LOYALTY_LEVELS, type LoyaltyLevel } from "@/lib/loyalty/types";

interface LoyaltyBadgeProps {
  level: LoyaltyLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function LoyaltyBadge({
  level,
  size = "sm",
  showLabel = true,
}: LoyaltyBadgeProps) {
  const config = LOYALTY_LEVELS[level];

  if (level === "member") return null; // Don't show badge for basic members

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-0.5 gap-1",
    lg: "text-sm px-3 py-1 gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      <span>{config.emoji}</span>
      {showLabel && <span>{config.nameAr}</span>}
    </span>
  );
}
