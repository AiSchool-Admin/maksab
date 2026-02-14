"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, ChevronLeft } from "lucide-react";
import { getRecentlyViewed, type RecentlyViewedItem } from "@/lib/hooks/useRecentlyViewed";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed().slice(0, 10));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="pb-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-sm font-bold text-dark flex items-center gap-1.5">
          <Clock size={14} className="text-gray-text" />
          شفتها قبل كده
        </h2>
        {items.length > 5 && (
          <span className="text-[11px] text-gray-text">{items.length} إعلان</span>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/ad/${item.id}`}
            className="flex-shrink-0 w-32 group"
          >
            <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-gray-light mb-1.5">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="128px"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                  📷
                </div>
              )}
              {/* Sale type badge */}
              <span
                className={`absolute top-1 start-1 text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                  item.saleType === "auction"
                    ? "bg-brand-gold text-white"
                    : item.saleType === "exchange"
                      ? "bg-blue-500 text-white"
                      : "bg-brand-green text-white"
                }`}
              >
                {item.saleType === "auction" ? "🔥" : item.saleType === "exchange" ? "🔄" : "💰"}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-dark line-clamp-1 leading-tight">
              {item.title}
            </p>
            {item.price != null && item.price > 0 && (
              <p className="text-[10px] font-bold text-brand-green mt-0.5">
                {formatPrice(item.price)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
