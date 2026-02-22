"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import {
  getMatchesForRequest,
  type BuyRequestMatch,
} from "@/lib/buy-requests/buy-request-service";
import { formatTimeAgo } from "@/lib/utils/format";

interface MatchResultsProps {
  requestId: string;
  requestTitle: string;
}

function matchTypeLabel(type: string): { label: string; color: string } {
  switch (type) {
    case "exact":
      return { label: "تطابق تام", color: "bg-green-50 text-green-700" };
    case "exchange":
      return { label: "توافق بدل", color: "bg-purple-50 text-purple-700" };
    case "price":
      return { label: "في الميزانية", color: "bg-blue-50 text-blue-700" };
    case "category":
      return { label: "نفس القسم", color: "bg-gray-100 text-gray-600" };
    default:
      return { label: "متوافق", color: "bg-gray-100 text-gray-600" };
  }
}

export default function MatchResults({ requestId, requestTitle }: MatchResultsProps) {
  const [matches, setMatches] = useState<BuyRequestMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMatchesForRequest(requestId)
      .then(setMatches)
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-3xl mb-2">🔍</p>
        <p className="text-sm text-gray-text">لسه مفيش عروض متوافقة</p>
        <p className="text-xs text-gray-text mt-1">هنبعتلك إشعار أول ما نلاقي حاجة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-brand-green" />
        <p className="text-sm font-bold text-dark">
          {matches.length} عرض متوافق مع &quot;{requestTitle}&quot;
        </p>
      </div>

      {matches.map((match) => {
        if (!match.ad) return null;
        const typeInfo = matchTypeLabel(match.matchType);

        return (
          <Link
            key={match.id}
            href={`/ad/${match.adId}`}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:shadow-sm transition-shadow group"
          >
            {/* Image */}
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
              {match.ad.image ? (
                <img src={match.ad.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📷</div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                <span className="text-[9px] text-gray-text">
                  {Math.round(match.matchScore)}% توافق
                </span>
              </div>
              <p className="text-xs font-bold text-dark truncate group-hover:text-brand-green transition-colors">
                {match.ad.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-text">
                {match.ad.price && (
                  <span className="font-bold text-brand-green">
                    {match.ad.price.toLocaleString("en-US")} جنيه
                  </span>
                )}
                {match.ad.governorate && <span>📍 {match.ad.governorate}</span>}
                <span>{formatTimeAgo(match.ad.createdAt)}</span>
              </div>
            </div>

            <ArrowLeft size={16} className="text-gray-300 group-hover:text-brand-green transition-colors flex-shrink-0 rotate-180" />
          </Link>
        );
      })}
    </div>
  );
}
