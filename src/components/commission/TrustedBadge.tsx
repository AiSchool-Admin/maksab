"use client";

import { Shield } from "lucide-react";

interface TrustedBadgeProps {
  size?: "sm" | "md" | "lg";
  variant?: "inline" | "card" | "overlay";
}

/**
 * "موثوق" badge displayed on ads that paid pre-payment commission.
 * Signals trust and quality to buyers.
 */
export default function TrustedBadge({
  size = "sm",
  variant = "inline",
}: TrustedBadgeProps) {
  if (variant === "overlay") {
    return (
      <div className="absolute top-2 start-2 z-10 flex items-center gap-1 bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
        <Shield size={10} />
        <span>موثوق</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="flex items-center gap-1.5 bg-brand-green-light border border-brand-green/20 text-brand-green text-xs font-bold px-3 py-1.5 rounded-lg">
        <Shield size={14} />
        <span>إعلان موثوق — بائع دفع عمولة مسبقة</span>
      </div>
    );
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-1 gap-1",
    lg: "text-sm px-2.5 py-1.5 gap-1",
  };

  const iconSizes = { sm: 10, md: 12, lg: 14 };

  return (
    <span
      className={`inline-flex items-center bg-brand-green/10 text-brand-green font-bold rounded-full ${sizeClasses[size]}`}
    >
      <Shield size={iconSizes[size]} />
      <span>موثوق</span>
    </span>
  );
}
