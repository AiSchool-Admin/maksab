/**
 * Seller Rank Card — full card displaying rank details, score breakdown,
 * progress to next rank, current perks, and tips to level up.
 *
 * All text in Egyptian Arabic, RTL, Tailwind CSS, mobile-first.
 */

"use client";

import { useEffect, useState } from "react";
import {
  type SellerRank,
  type SellerScoreBreakdown,
  SELLER_RANKS,
  calculateSellerScore,
} from "@/lib/social/seller-rank-service";
import SellerRankBadge from "./SellerRankBadge";

interface SellerRankCardProps {
  userId: string;
  isOwnProfile?: boolean;
}

// ── Level-up tips for own profile ────────────────────────

const LEVEL_UP_TIPS: Record<
  string,
  { label: string; tip: string }
> = {
  adsPosted: {
    label: "انشر إعلانات أكتر",
    tip: "كل إعلان بيديك 10 نقاط (أقصى حد 500 نقطة)",
  },
  adsSold: {
    label: "بيع منتجاتك",
    tip: "كل صفقة ناجحة بتديك 30 نقطة",
  },
  positiveReviews: {
    label: "اجمع تقييمات إيجابية",
    tip: "كل تقييم 4 نجوم أو أكتر بيديك 25 نقطة",
  },
  avgRating: {
    label: "حافظ على تقييم عالي",
    tip: "لو متوسط تقييمك 4.0+ بتاخد 100 نقطة بونص، و 4.5+ بتاخد 150",
  },
  responseRate: {
    label: "رد على الرسائل بسرعة",
    tip: "نسبة الرد العالية بتديك حتى 50 نقطة",
  },
  commissionsCount: {
    label: "ادعم مكسب بعمولة",
    tip: "كل عمولة بتدفعها بتديك 50 نقطة",
  },
};

// ── Score row label mapping ──────────────────────────────

const BREAKDOWN_LABELS: Record<
  keyof SellerScoreBreakdown["breakdown"],
  { label: string; icon: string }
> = {
  adsPosted: { label: "إعلانات منشورة", icon: "\u{1F4DD}" },
  adsSold: { label: "صفقات ناجحة", icon: "\u{1F4B0}" },
  positiveReviews: { label: "تقييمات إيجابية", icon: "\u{2B50}" },
  avgRating: { label: "بونص التقييم", icon: "\u{1F31F}" },
  responseRate: { label: "نسبة الرد", icon: "\u{1F4AC}" },
  accountAge: { label: "عمر الحساب", icon: "\u{1F4C5}" },
  commissionsCount: { label: "دعم مكسب", icon: "\u{1F49A}" },
};

export default function SellerRankCard({
  userId,
  isOwnProfile = false,
}: SellerRankCardProps) {
  const [breakdown, setBreakdown] = useState<SellerScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await calculateSellerScore(userId);
        if (!cancelled) setBreakdown(data);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Loading skeleton ───────────────────────────────────
  if (loading || !breakdown) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-3 w-36 rounded bg-gray-200" />
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  const currentConfig =
    SELLER_RANKS.find((r) => r.rank === breakdown.rank) ?? SELLER_RANKS[0];
  const nextConfig = breakdown.nextRank
    ? SELLER_RANKS.find((r) => r.rank === breakdown.nextRank)
    : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* ── Header with rank badge ── */}
      <div
        className={`px-5 pt-5 pb-4 ${currentConfig.bgColor}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-sm text-3xl">
            {currentConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <SellerRankBadge rank={breakdown.rank} size="lg" />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {breakdown.totalScore.toLocaleString("en-US")} نقطة
            </p>
          </div>
        </div>
      </div>

      {/* ── Progress to next rank ── */}
      {nextConfig && (
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{currentConfig.name}</span>
            <span>{nextConfig.name} {nextConfig.icon}</span>
          </div>
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 right-0 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${breakdown.progressPercent}%`,
                background:
                  breakdown.rank === "beginner"
                    ? "#3B82F6"
                    : breakdown.rank === "good"
                      ? "#D4A843"
                      : breakdown.rank === "pro"
                        ? "#9333EA"
                        : "#6B21A8",
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            محتاج{" "}
            <span className="font-bold text-dark">
              {breakdown.pointsToNext.toLocaleString("en-US")}
            </span>{" "}
            نقطة كمان لـ{" "}
            <span className="font-bold">
              {nextConfig.icon} {nextConfig.name}
            </span>
          </p>
        </div>
      )}

      {/* No next rank — at the top */}
      {!nextConfig && (
        <div className="px-5 py-3 border-b border-gray-100 text-center">
          <p className="text-sm font-bold text-purple-600">
            {currentConfig.icon} وصلت لأعلى رتبة! مبروك!
          </p>
        </div>
      )}

      {/* ── Score breakdown ── */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-dark mb-3">تفاصيل النقاط</h3>
        <div className="space-y-2">
          {(
            Object.keys(breakdown.breakdown) as Array<
              keyof SellerScoreBreakdown["breakdown"]
            >
          ).map((key) => {
            const item = breakdown.breakdown[key];
            const meta = BREAKDOWN_LABELS[key];
            const score = item.score;

            // Build detail text
            let detail = "";
            if (key === "adsPosted") {
              detail = `${(item as { count: number }).count} إعلان`;
            } else if (key === "adsSold") {
              detail = `${(item as { count: number }).count} صفقة`;
            } else if (key === "positiveReviews") {
              detail = `${(item as { count: number }).count} تقييم`;
            } else if (key === "avgRating") {
              const val = (item as { value: number }).value;
              detail = val > 0 ? `${val} من 5` : "لا يوجد";
            } else if (key === "responseRate") {
              detail = `${(item as { value: number }).value}%`;
            } else if (key === "accountAge") {
              const days = (item as { days: number }).days;
              if (days === 0) detail = "جديد";
              else if (days === 1) detail = "يوم واحد";
              else if (days === 2) detail = "يومين";
              else if (days <= 10) detail = `${days} أيام`;
              else detail = `${days} يوم`;
            } else if (key === "commissionsCount") {
              detail = `${(item as { count: number }).count} مرة`;
            }

            return (
              <div
                key={key}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-base">{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span className="text-xs text-gray-400">({detail})</span>
                </div>
                <span
                  className={`font-bold tabular-nums ${
                    score > 0 ? "text-brand-green" : "text-gray-300"
                  }`}
                >
                  +{score}
                </span>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 mt-2">
            <span className="font-bold text-dark">الإجمالي</span>
            <span className="font-bold text-brand-green text-base">
              {breakdown.totalScore.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Current perks ── */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-dark mb-3">
          مميزات رتبتك الحالية
        </h3>
        <ul className="space-y-2">
          {currentConfig.perks.map((perk, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-green mt-0.5 shrink-0">
                {"\u2713"}
              </span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {/* Show next rank perks preview */}
        {nextConfig && (
          <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
            <p className="text-xs text-gray-400 mb-2">
              مميزات الرتبة الجاية ({nextConfig.icon} {nextConfig.name}):
            </p>
            <ul className="space-y-1.5">
              {nextConfig.perks.map((perk, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-gray-400"
                >
                  <span className="mt-0.5 shrink-0">{"\u{1F512}"}</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Tips to level up (own profile only) ── */}
      {isOwnProfile && nextConfig && (
        <div className="px-5 py-4">
          <h3 className="text-sm font-bold text-dark mb-3">
            {"\u{1F4A1}"} إزاي ترفع رتبتك؟
          </h3>
          <div className="space-y-3">
            {Object.entries(LEVEL_UP_TIPS).map(([key, tipData]) => {
              const bKey = key as keyof SellerScoreBreakdown["breakdown"];
              const item = breakdown.breakdown[bKey];
              // Only show tips where there's room to improve
              const isMaxed =
                key === "adsPosted" && item.score >= 500;

              if (isMaxed) return null;

              return (
                <div
                  key={key}
                  className="flex items-start gap-2 bg-gray-50 rounded-xl p-3"
                >
                  <span className="text-base mt-0.5">
                    {BREAKDOWN_LABELS[bKey]?.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-dark">
                      {tipData.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tipData.tip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
