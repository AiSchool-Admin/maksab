"use client";

import type { StoreBadge } from "@/types";

const badgeConfig: Record<
  StoreBadge["badge_type"],
  { label: string; icon: string; color: string }
> = {
  verified: {
    label: "موثّق",
    icon: "✅",
    color: "bg-green-50 text-green-700 border-green-200",
  },
  trusted: {
    label: "موثوق",
    icon: "🛡️",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  active: {
    label: "نشط",
    icon: "⚡",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  top_seller: {
    label: "أفضل بائع",
    icon: "🏆",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  gold: {
    label: "ذهبي",
    icon: "💛",
    color: "bg-brand-gold-light text-brand-gold border-brand-gold/30",
  },
  platinum: {
    label: "بلاتيني",
    icon: "💎",
    color: "bg-gray-50 text-gray-700 border-gray-300",
  },
};

interface StoreBadgesProps {
  badges: StoreBadge[];
  size?: "sm" | "md";
}

export default function StoreBadges({ badges, size = "sm" }: StoreBadgesProps) {
  if (!badges.length) return null;

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {badges.map((badge) => {
        const config = badgeConfig[badge.badge_type];
        return (
          <span
            key={badge.id}
            className={`inline-flex items-center gap-0.5 ${padding} rounded-full border font-semibold ${textSize} ${config.color}`}
          >
            {config.icon} {config.label}
          </span>
        );
      })}
    </div>
  );
}
