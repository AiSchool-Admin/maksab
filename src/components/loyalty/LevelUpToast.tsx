/**
 * Level-up celebration toast notification.
 * Shows when user reaches a new loyalty level.
 */

"use client";

import { LOYALTY_LEVELS, type LoyaltyLevel } from "@/lib/loyalty/types";

interface LevelUpToastProps {
  level: LoyaltyLevel;
}

export default function LevelUpToast({ level }: LevelUpToastProps) {
  const config = LOYALTY_LEVELS[level];

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-lg border border-gray-100 max-w-[300px]">
      <span className="text-3xl animate-bounce">{config.emoji}</span>
      <div>
        <p className="text-sm font-bold text-dark">
          مبروك! وصلت لمستوى {config.nameAr}!
        </p>
        <p className="text-[11px] text-gray-text mt-0.5">
          {config.benefits[0]}
        </p>
      </div>
    </div>
  );
}
