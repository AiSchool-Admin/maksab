"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftRight, MapPin, MessageCircle } from "lucide-react";
import { findExchangeMatches } from "@/lib/recommendations/recommendations-service";
import type { ExchangeMatch } from "@/lib/recommendations/types";

interface ExchangeMatchSectionProps {
  adTitle: string;
  exchangeDescription: string;
  categoryId: string;
  currentAdId: string;
}

export default function ExchangeMatchSection({
  adTitle,
  exchangeDescription,
  categoryId,
  currentAdId,
}: ExchangeMatchSectionProps) {
  const [matches, setMatches] = useState<ExchangeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    findExchangeMatches(adTitle, exchangeDescription, categoryId, currentAdId)
      .then(setMatches)
      .finally(() => setIsLoading(false));
  }, [adTitle, exchangeDescription, categoryId, currentAdId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
          <ArrowLeftRight size={16} className="text-blue-600" />
          إعلانات ممكن تتبدل معاها
        </h3>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-light rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
        <ArrowLeftRight size={16} className="text-blue-600" />
        🔄 إعلانات ممكن تتبدل معاها
      </h3>

      {matches.map((match) => (
        <Link
          key={match.adId}
          href={`/ad/${match.adId}`}
          className="block bg-gray-light rounded-xl p-3 hover:bg-gray-100 transition-colors"
        >
          {/* Match badge */}
          {match.matchType === "perfect" && (
            <span className="inline-block text-[10px] font-bold text-white bg-brand-green rounded-full px-2 py-0.5 mb-2">
              🎯 تطابق مثالي!
            </span>
          )}

          <p className="text-sm font-bold text-dark mb-1 line-clamp-1">
            {match.title}
          </p>

          {/* Sale type indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-text mb-1.5">
            <span>
              {match.saleType === "exchange"
                ? "🔄 تبديل"
                : match.saleType === "auction"
                  ? "🔨 مزاد"
                  : "💵 نقدي"}
            </span>
            {match.price != null && (
              <span className="font-semibold text-brand-green">
                {match.price.toLocaleString("en-US")} جنيه
              </span>
            )}
          </div>

          {/* Exchange description for exchange ads */}
          {match.saleType === "exchange" && match.exchangeDescription && (
            <p className="text-xs text-blue-600 mb-1.5">
              عايز: {match.exchangeDescription}
            </p>
          )}

          {/* Match reason */}
          <p className="text-[11px] text-gray-text italic mb-1.5">
            {match.matchReason}
          </p>

          {/* Location + action */}
          <div className="flex items-center justify-between">
            {match.governorate && (
              <span className="flex items-center gap-1 text-[11px] text-gray-text">
                <MapPin size={10} />
                {match.governorate}
                {match.city ? ` — ${match.city}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-brand-green font-semibold">
              <MessageCircle size={12} />
              تواصل
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
