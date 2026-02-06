"use client";

import { Heart } from "lucide-react";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";

interface AdCardProps {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  image: string | null;
  governorate: string | null;
  city: string | null;
  createdAt: string;
  auctionHighestBid?: number;
  auctionEndsAt?: string;
  exchangeDescription?: string;
}

const saleTypeBadge = {
  cash: { label: "نقدي", icon: "💵" },
  auction: { label: "مزاد", icon: "🔨" },
  exchange: { label: "تبديل", icon: "🔄" },
};

export default function AdCard({
  title,
  price,
  saleType,
  image,
  governorate,
  city,
  createdAt,
  auctionHighestBid,
  exchangeDescription,
}: AdCardProps) {
  const badge = saleTypeBadge[saleType];

  return (
    <div className="bg-white rounded-xl border border-gray-light overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-light">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            📷
          </div>
        )}
        <span className="absolute top-2 start-2 bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-lg">
          {badge.icon} {badge.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-dark line-clamp-2 mb-1">
          {title}
        </h3>

        {saleType === "cash" && price && (
          <p className="text-brand-green font-bold text-sm">{formatPrice(price)}</p>
        )}

        {saleType === "auction" && auctionHighestBid && (
          <p className="text-brand-gold font-bold text-sm">
            🔨 أعلى مزايدة: {formatPrice(auctionHighestBid)}
          </p>
        )}

        {saleType === "exchange" && exchangeDescription && (
          <p className="text-sm text-gray-text">🔄 عايز: {exchangeDescription}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-text">
            📍 {governorate}{city ? ` — ${city}` : ""}
          </span>
          <button className="p-1 text-gray-text hover:text-error transition-colors" aria-label="إضافة للمفضلة">
            <Heart size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-text mt-1">{formatTimeAgo(createdAt)}</p>
      </div>
    </div>
  );
}
