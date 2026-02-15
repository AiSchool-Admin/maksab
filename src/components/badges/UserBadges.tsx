"use client";

import { useState, useEffect } from "react";
import { getUserBadges } from "@/lib/badges/badge-service";
import { BADGES, type BadgeId } from "@/lib/badges/types";

interface UserBadgesProps {
  userId: string;
  /** Show all badges or only compact inline badges */
  variant?: "inline" | "full";
  /** Max badges to display in inline mode */
  maxInline?: number;
}

/**
 * Displays a user's earned marketing badges
 * - inline: small pills next to username
 * - full: expanded cards with descriptions
 */
export default function UserBadges({
  userId,
  variant = "inline",
  maxInline = 3,
}: UserBadgesProps) {
  const [badges, setBadges] = useState<BadgeId[]>([]);

  useEffect(() => {
    if (!userId) return;
    const profile = getUserBadges(userId);
    setBadges(profile.badges.map((b) => b.badgeId));
  }, [userId]);

  if (badges.length === 0) return null;

  if (variant === "inline") {
    const displayed = badges.slice(0, maxInline);
    return (
      <span className="inline-flex items-center gap-1 flex-shrink-0">
        {displayed.map((badgeId) => {
          const config = BADGES[badgeId];
          if (!config) return null;
          return (
            <span
              key={badgeId}
              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
              title={config.description}
            >
              <span>{config.emoji}</span>
              <span className="hidden sm:inline">{config.nameAr}</span>
            </span>
          );
        })}
      </span>
    );
  }

  // Full variant — card display
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-dark">الشارات</h3>
      <div className="grid grid-cols-1 gap-2">
        {badges.map((badgeId) => {
          const config = BADGES[badgeId];
          if (!config) return null;
          return (
            <div
              key={badgeId}
              className={`flex items-center gap-3 p-3 rounded-xl border ${config.borderColor} ${config.bgColor}`}
            >
              <span className="text-2xl">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${config.color}`}>{config.nameAr}</p>
                <p className="text-xs text-gray-text">{config.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
