"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Clock } from "lucide-react";
import { formatPrice, formatTimeAgo, formatCountdown } from "@/lib/utils/format";

interface AdCardProps {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  image: string | null;
  governorate: string | null;
  city: string | null;
  createdAt: string;
  isNegotiable?: boolean;
  // Auction props
  auctionHighestBid?: number;
  auctionEndsAt?: string;
  auctionBidsCount?: number;
  // Exchange props
  exchangeDescription?: string;
  // Interaction
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const saleTypeBadge = {
  cash: { label: "نقدي", icon: "💵", color: "bg-brand-green-light text-brand-green-dark" },
  auction: { label: "مزاد", icon: "🔨", color: "bg-brand-gold-light text-brand-gold" },
  exchange: { label: "تبديل", icon: "🔄", color: "bg-blue-50 text-blue-700" },
};

function AuctionTimer({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    return new Date(endsAt).getTime() - Date.now();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const isUrgent = remaining > 0 && remaining < 6 * 3600000; // < 6 hours

  if (remaining <= 0) {
    return (
      <span className="text-[11px] text-error font-semibold">انتهى المزاد</span>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-[11px] font-semibold ${isUrgent ? "text-error" : "text-gray-text"}`}>
      <Clock size={12} />
      <span>متبقي: {formatCountdown(remaining)}</span>
      {isUrgent && <span className="btn-icon-sm">🔥</span>}
    </div>
  );
}

function AdCard({
  id,
  title,
  price,
  saleType,
  image,
  governorate,
  city,
  createdAt,
  isNegotiable,
  auctionHighestBid,
  auctionEndsAt,
  auctionBidsCount,
  exchangeDescription,
  isFavorited = false,
  onToggleFavorite,
}: AdCardProps) {
  const badge = saleTypeBadge[saleType];

  return (
    <Link href={`/ad/${id}`} className="block">
      <article className="bg-white rounded-xl border border-gray-light overflow-hidden hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-light">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
              loading="lazy"
              placeholder="empty"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-text">
              📷
            </div>
          )}

          {/* Sale type badge */}
          <span
            className={`absolute top-2 start-2 text-[11px] font-semibold px-2 py-1 rounded-lg backdrop-blur-sm ${badge.color}`}
          >
            {badge.icon} {badge.label}
          </span>

          {/* Favorite button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.(id);
            }}
            className={`absolute top-2 end-2 p-1.5 rounded-full backdrop-blur-sm transition-colors btn-icon-sm ${
              isFavorited
                ? "bg-error/10 text-error"
                : "bg-white/80 text-gray-text hover:text-error"
            }`}
            aria-label={isFavorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Title */}
          <h3 className="text-sm font-semibold text-dark line-clamp-2 mb-1.5 leading-relaxed">
            {title}
          </h3>

          {/* Price section — different per sale type */}
          {saleType === "cash" && price != null && (
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <p className="text-brand-green font-bold text-sm">
                {formatPrice(price)}
              </p>
              {isNegotiable && (
                <span className="text-[10px] text-gray-text font-medium">
                  قابل للتفاوض
                </span>
              )}
            </div>
          )}

          {saleType === "auction" && (
            <div className="mb-1.5 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-brand-gold font-bold text-sm">
                  {auctionHighestBid
                    ? `أعلى مزايدة: ${formatPrice(auctionHighestBid)}`
                    : price != null
                      ? `يبدأ من ${formatPrice(price)}`
                      : ""}
                </p>
                {auctionBidsCount != null && auctionBidsCount > 0 && (
                  <span className="text-[10px] text-gray-text btn-icon-sm">
                    {auctionBidsCount} مزايدة
                  </span>
                )}
              </div>
              {auctionEndsAt && <AuctionTimer endsAt={auctionEndsAt} />}
            </div>
          )}

          {saleType === "exchange" && (
            <div className="mb-1.5">
              {exchangeDescription && (
                <p className="text-sm text-gray-text line-clamp-1">
                  🔄 عايز: {exchangeDescription}
                </p>
              )}
            </div>
          )}

          {/* Location + time */}
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-light">
            {governorate && (
              <span className="flex items-center gap-0.5 text-[11px] text-gray-text">
                <MapPin size={11} />
                {governorate}
                {city ? ` — ${city}` : ""}
              </span>
            )}
            <span className="text-[11px] text-gray-text">
              {formatTimeAgo(createdAt)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default memo(AdCard);
