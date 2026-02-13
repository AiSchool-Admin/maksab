/**
 * Ambassador tier badge — compact pill showing the user's ambassador level.
 * Only renders if the tier is not 'none'.
 * Used on profile pages, ad cards, and seller info sections.
 */

"use client";

import {
  type AmbassadorTier,
  getAmbassadorTierConfig,
} from "@/lib/social/ambassador-service";

interface AmbassadorBadgeProps {
  tier: AmbassadorTier;
  size?: "sm" | "md";
}

export default function AmbassadorBadge({
  tier,
  size = "sm",
}: AmbassadorBadgeProps) {
  if (tier === "none") return null;

  const config = getAmbassadorTierConfig(tier);

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2.5 py-1 gap-1",
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      <span>{config.name}</span>
    </span>
  );
}
