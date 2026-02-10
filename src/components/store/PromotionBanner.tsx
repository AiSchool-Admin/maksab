"use client";

import Link from "next/link";
import { Tag, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import type { StorePromotion } from "@/types";

const promoConfig: Record<
  StorePromotion["promo_type"],
  { label: string; icon: string; bgColor: string }
> = {
  discount: { label: "خصم", icon: "🏷️", bgColor: "bg-red-50 border-red-200" },
  bundle: {
    label: "عرض مجمع",
    icon: "📦",
    bgColor: "bg-blue-50 border-blue-200",
  },
  free_shipping: {
    label: "شحن مجاني",
    icon: "🚚",
    bgColor: "bg-green-50 border-green-200",
  },
  timed: {
    label: "عرض محدود",
    icon: "⏰",
    bgColor: "bg-yellow-50 border-yellow-200",
  },
};

interface PromotionBannerProps {
  promotion: StorePromotion;
}

export default function PromotionBanner({ promotion }: PromotionBannerProps) {
  const config = promoConfig[promotion.promo_type];

  return (
    <Link href={`/ad/${promotion.ad_id}`}>
      <div
        className={`rounded-xl border p-3 ${config.bgColor} hover:shadow-sm transition-shadow`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <div>
              <p className="text-sm font-bold text-dark">{config.label}</p>
              {promotion.discount_percent && (
                <p className="text-xs text-error font-semibold">
                  خصم {promotion.discount_percent}%
                </p>
              )}
            </div>
          </div>

          <div className="text-left">
            {promotion.sale_price != null && (
              <p className="text-sm font-bold text-brand-green">
                {formatPrice(promotion.sale_price)}
              </p>
            )}
            {promotion.original_price != null && (
              <p className="text-[10px] text-gray-text line-through">
                {formatPrice(promotion.original_price)}
              </p>
            )}
          </div>
        </div>

        {promotion.end_at && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-text">
            <Clock size={10} />
            <span>
              ينتهي:{" "}
              {new Date(promotion.end_at).toLocaleDateString("ar-EG", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
