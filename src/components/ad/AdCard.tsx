"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Clock, TrendingDown } from "lucide-react";
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
  // Live auction
  isLiveAuction?: boolean;
  // Exchange props
  exchangeDescription?: string;
  // Interaction
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  // Price drop indicator (percentage, e.g. 15 means 15% drop)
  priceDropPercent?: number;
}

const saleTypeBadge = {
  cash: { label: "للبيع", icon: "💰", color: "bg-brand-green-light text-brand-green-dark" },
  auction: { label: "مزاد", icon: "🔥", color: "bg-gradient-to-l from-amber-100 to-orange-100 text-orange-700 border border-orange-200" },
  live_auction: { label: "مزاد لايف", icon: "📡", color: "bg-red-50 text-red-600 border border-red-200 animate-pulse" },
  exchange: { label: "للتبديل", icon: "🔄", color: "bg-gradient-to-l from-purple-50 to-indigo-50 text-purple-700 border border-purple-200" },
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
      <span className="text-[11px] text-error font-bold">خلاص المزاد خلص!</span>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-[11px] font-bold ${isUrgent ? "text-error" : "text-orange-600"}`}>
      <Clock size={12} />
      <span>فاضل: {formatCountdown(remaining)}</span>
      {isUrgent && <span className="btn-icon-sm">🔥 الحق!</span>}
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
  isLiveAuction = false,
  exchangeDescription,
  isFavorited = false,
  onToggleFavorite,
  priceDropPercent,
}: AdCardProps) {
  const badgeKey = isLiveAuction && saleType === "auction" ? "live_auction" : saleType;
  const badge = saleTypeBadge[badgeKey];

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
            className={`absolute top-2 start-2 text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1 shadow-sm ${badge.color}`}
          >
            {isLiveAuction && saleType === "auction" && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            {badge.icon} {badge.label}
          </span>

          {/* Price drop badge */}
          {priceDropPercent != null && priceDropPercent > 0 && (
            <span className="absolute bottom-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-error/90 text-white backdrop-blur-sm flex items-center gap-0.5 shadow-sm">
              <TrendingDown size={10} />
              نزل {priceDropPercent}%
            </span>
          )}

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
            aria-label={isFavorited ? "شيل من المفضلة" : "حفظ في المفضلة"}
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
                  الكلام فيه
                </span>
              )}
            </div>
          )}

          {saleType === "auction" && (
            <div className="mb-1.5 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-orange-600 font-bold text-sm">
                  {auctionHighestBid
                    ? `🔥 وصل لـ ${formatPrice(auctionHighestBid)}`
                    : price != null
                      ? `يبدأ من ${formatPrice(price)}`
                      : ""}
                </p>
                {auctionBidsCount != null && auctionBidsCount > 0 && (
                  <span className="text-[10px] text-orange-500 font-bold bg-orange-50 px-1.5 py-0.5 rounded-full btn-icon-sm">
                    {auctionBidsCount} مزايدة
                  </span>
                )}
              </div>
              {auctionEndsAt && <AuctionTimer endsAt={auctionEndsAt} />}
            </div>
          )}

          {saleType === "exchange" && (
            <div className="mb-1.5">
              {exchangeDescription ? (
                <p className="text-sm text-purple-700 font-medium line-clamp-1">
                  🔄 عايز يبدّل بـ: {exchangeDescription}
                </p>
              ) : (
                <p className="text-sm text-purple-600 font-medium">
                  🔄 تبدّل معايا؟
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
