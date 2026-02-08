"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftRight, MapPin, MessageCircle, Zap, ArrowRight } from "lucide-react";
import { findSmartExchangeMatches, findChainExchanges, parseExchangeWanted } from "@/lib/exchange/exchange-engine";
import { MATCH_LEVEL_CONFIG } from "@/lib/exchange/types";
import type { ExchangeMatchResult, ChainExchange, ExchangeWantedItem } from "@/lib/exchange/types";
import { formatPrice } from "@/lib/utils/format";

interface ExchangeMatchSectionProps {
  adTitle: string;
  exchangeDescription: string;
  categoryId: string;
  currentAdId: string;
  categoryFields?: Record<string, unknown>;
}

export default function ExchangeMatchSection({
  adTitle,
  exchangeDescription,
  categoryId,
  currentAdId,
  categoryFields = {},
}: ExchangeMatchSectionProps) {
  const [matches, setMatches] = useState<ExchangeMatchResult[]>([]);
  const [chains, setChains] = useState<ChainExchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const exchangeWanted = parseExchangeWanted(categoryFields);

  useEffect(() => {
    setIsLoading(true);

    const fetchAll = async () => {
      if (exchangeWanted) {
        // Use smart structured matching
        const [matchResults, chainResults] = await Promise.all([
          findSmartExchangeMatches({
            currentAdId,
            adTitle,
            adCategoryId: categoryId,
            adCategoryFields: categoryFields,
            exchangeWanted,
            exchangeDescription,
          }),
          findChainExchanges({
            currentAdId,
            adCategoryId: categoryId,
            adCategoryFields: categoryFields,
            exchangeWanted,
          }),
        ]);
        setMatches(matchResults);
        setChains(chainResults);
      } else {
        // Fallback: text-based matching for old ads
        const { findExchangeMatches } = await import(
          "@/lib/recommendations/recommendations-service"
        );
        const oldMatches = await findExchangeMatches(
          adTitle,
          exchangeDescription,
          categoryId,
          currentAdId,
        );
        // Convert old format to new
        setMatches(
          oldMatches.map((m) => ({
            adId: m.adId,
            title: m.title,
            image: null,
            saleType: m.saleType,
            price: m.price,
            exchangeDescription: m.exchangeDescription,
            exchangeWanted: null,
            governorate: m.governorate,
            city: m.city,
            matchLevel: m.matchType === "perfect" ? "perfect" : "partial",
            matchScore: m.matchType === "perfect" ? 80 : 30,
            matchReasons: [m.matchReason],
            categoryIcon: "📦",
          })),
        );
      }
    };

    fetchAll().finally(() => setIsLoading(false));
  }, [adTitle, exchangeDescription, categoryId, currentAdId, categoryFields, exchangeWanted]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
          <ArrowLeftRight size={16} className="text-blue-600" />
          جاري البحث عن تبديلات مناسبة...
        </h3>
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-gray-light rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (matches.length === 0 && chains.length === 0) return null;

  // Group matches by level
  const perfectMatches = matches.filter((m) => m.matchLevel === "perfect" || m.matchLevel === "strong");
  const goodMatches = matches.filter((m) => m.matchLevel === "good");
  const partialMatches = matches.filter((m) => m.matchLevel === "partial");

  return (
    <div className="space-y-5">
      {/* ── Perfect/Strong matches ── */}
      {perfectMatches.length > 0 && (
        <MatchGroup
          title="تطابقات مثالية"
          icon="🎯"
          subtitle="دول عندهم اللي أنت عايزه وعايزين اللي عندك"
          matches={perfectMatches}
        />
      )}

      {/* ── Chain exchanges ── */}
      {chains.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-purple-600" />
            <div>
              <h3 className="text-sm font-bold text-dark">تبديل ثلاثي</h3>
              <p className="text-[10px] text-gray-text">
                تبديل دائري بين 3 أشخاص — كل واحد ياخد اللي عايزه!
              </p>
            </div>
          </div>

          {chains.map((chain, ci) => (
            <div
              key={ci}
              className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-center justify-center gap-1 text-[10px] text-purple-600 font-bold mb-2">
                <span>🔄</span> تبديل ثلاثي ممكن
              </div>
              {chain.links.map((link, li) => (
                <Link
                  key={link.adId}
                  href={`/ad/${link.adId}`}
                  className="flex items-center gap-2 bg-white rounded-lg p-2 hover:bg-gray-50 transition-colors"
                >
                  {/* Mini image */}
                  <div className="w-10 h-10 rounded-lg bg-gray-light flex-shrink-0 overflow-hidden">
                    {link.image ? (
                      <Image src={link.image} alt="" width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-lg">{link.categoryIcon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-dark truncate">{link.has}</p>
                    <p className="text-[10px] text-purple-600 truncate">عايز: {link.wants}</p>
                  </div>
                  {li < chain.links.length - 1 && (
                    <ArrowRight size={14} className="text-purple-400 flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Good matches ── */}
      {goodMatches.length > 0 && (
        <MatchGroup
          title="مطابقات جيدة"
          icon="👍"
          subtitle="إعلانات ممكن تناسبك للتبديل"
          matches={goodMatches}
        />
      )}

      {/* ── Partial matches ── */}
      {partialMatches.length > 0 && (
        <MatchGroup
          title="مطابقات جزئية"
          icon="🔍"
          subtitle="بيبيعوا اللي أنت عايزه"
          matches={partialMatches}
          collapsed
        />
      )}
    </div>
  );
}

/* ── Match group component ── */

function MatchGroup({
  title,
  icon,
  subtitle,
  matches,
  collapsed = false,
}: {
  title: string;
  icon: string;
  subtitle: string;
  matches: ExchangeMatchResult[];
  collapsed?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-1.5">
          <span>{icon}</span>
          <div className="text-start">
            <h3 className="text-sm font-bold text-dark">
              {title} ({matches.length})
            </h3>
            <p className="text-[10px] text-gray-text">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs text-gray-text">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded &&
        matches.map((match) => (
          <MatchCard key={match.adId} match={match} />
        ))}
    </div>
  );
}

/* ── Individual match card ── */

function MatchCard({ match }: { match: ExchangeMatchResult }) {
  const levelConfig = MATCH_LEVEL_CONFIG[match.matchLevel];

  return (
    <Link
      href={`/ad/${match.adId}`}
      className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
    >
      <div className="flex">
        {/* Image */}
        <div className="w-20 h-20 bg-gray-light flex-shrink-0">
          {match.image ? (
            <Image
              src={match.image}
              alt={match.title}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              {match.categoryIcon}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-2.5">
          {/* Match badge */}
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${levelConfig.bgColor} ${levelConfig.color}`}
            >
              {levelConfig.icon} {levelConfig.label}
            </span>
            <span className="text-[10px] text-gray-text font-medium">
              {match.matchScore}%
            </span>
          </div>

          {/* Title */}
          <p className="text-xs font-bold text-dark line-clamp-1 mb-0.5">
            {match.title}
          </p>

          {/* Price/type indicator */}
          <div className="flex items-center gap-2 text-[10px] text-gray-text mb-1">
            <span>
              {match.saleType === "exchange"
                ? "🔄 تبديل"
                : match.saleType === "auction"
                  ? "🔨 مزاد"
                  : "💵 نقدي"}
            </span>
            {match.price != null && (
              <span className="font-semibold text-brand-green">
                {formatPrice(match.price)}
              </span>
            )}
          </div>

          {/* What the other person wants (for exchange ads) */}
          {match.saleType === "exchange" && match.exchangeWanted && (
            <p className="text-[10px] text-blue-600 truncate">
              عايز: {match.exchangeWanted.title}
            </p>
          )}
          {match.saleType === "exchange" && !match.exchangeWanted && match.exchangeDescription && (
            <p className="text-[10px] text-blue-600 truncate">
              عايز: {match.exchangeDescription}
            </p>
          )}

          {/* Match reasons */}
          {match.matchReasons.length > 0 && (
            <p className="text-[10px] text-gray-text italic mt-0.5 line-clamp-1">
              {match.matchReasons[0]}
            </p>
          )}

          {/* Location */}
          <div className="flex items-center justify-between mt-1">
            {match.governorate && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-text">
                <MapPin size={9} />
                {match.governorate}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-[10px] text-brand-green font-semibold">
              <MessageCircle size={10} />
              تواصل
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
