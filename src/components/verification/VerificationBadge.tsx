"use client";

import { ShieldCheck, Shield, Crown } from "lucide-react";
import type { VerificationLevel } from "@/lib/verification/verification-service";
import {
  getVerificationLevelLabel,
  getVerificationLevelColor,
} from "@/lib/verification/verification-service";

interface VerificationBadgeProps {
  level: VerificationLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function VerificationBadge({
  level,
  size = "sm",
  showLabel = true,
}: VerificationBadgeProps) {
  if (level === "basic") return null;

  const iconSize = size === "sm" ? 12 : 16;
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  const Icon = level === "premium" ? Crown : ShieldCheck;

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full ${textSize} ${padding} ${getVerificationLevelColor(level)}`}
    >
      <Icon size={iconSize} />
      {showLabel && getVerificationLevelLabel(level)}
    </span>
  );
}

/**
 * Trusted seller badge (shown when seller has 5+ positive reviews)
 */
export function TrustedSellerBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? 12 : 16;
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full bg-brand-green-light text-brand-green ${textSize} ${padding}`}
    >
      <Shield size={iconSize} />
      بائع موثوق
    </span>
  );
}

/**
 * ID Verified badge
 */
export function IdVerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? 12 : 16;
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full bg-blue-50 text-blue-700 ${textSize} ${padding}`}
    >
      <ShieldCheck size={iconSize} />
      هوية موثقة
    </span>
  );
}
