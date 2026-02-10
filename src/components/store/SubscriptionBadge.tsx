"use client";

import type { SubscriptionPlan } from "@/types";
import { PLANS } from "@/lib/stores/subscription-plans";

interface SubscriptionBadgeProps {
  plan: SubscriptionPlan;
  size?: "sm" | "md";
}

/**
 * Displays the store's subscription plan as a small badge.
 * Only shows for gold & platinum (free has no badge).
 */
export default function SubscriptionBadge({
  plan,
  size = "sm",
}: SubscriptionBadgeProps) {
  if (plan === "free") return null;

  const config = PLANS[plan];
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${padding} rounded-full border font-semibold ${textSize} ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      {config.icon} {config.name}
    </span>
  );
}
