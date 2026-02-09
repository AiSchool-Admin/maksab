/**
 * Points display with level progress bar.
 * Used on the profile page and loyalty rewards page.
 */

"use client";

import { LOYALTY_LEVELS, type LoyaltyLevel } from "@/lib/loyalty/types";
import type { UserLoyaltyProfile } from "@/lib/loyalty/types";

interface PointsDisplayProps {
  profile: UserLoyaltyProfile;
  compact?: boolean;
}

export default function PointsDisplay({ profile, compact = false }: PointsDisplayProps) {
  const currentConfig = LOYALTY_LEVELS[profile.currentLevel];
  const nextConfig = profile.nextLevel ? LOYALTY_LEVELS[profile.nextLevel] : null;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${currentConfig.bgColor} rounded-xl px-3 py-2`}>
        <span className="text-lg">{currentConfig.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${currentConfig.color}`}>
            {currentConfig.nameAr} · {profile.totalPoints.toLocaleString("en-US")} نقطة
          </p>
          {nextConfig && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-green rounded-full transition-all duration-500"
                  style={{ width: `${profile.progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-text flex-shrink-0">
                {profile.pointsToNextLevel} للـ{nextConfig.nameAr}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current level card */}
      <div className={`${currentConfig.bgColor} rounded-2xl p-5 text-center`}>
        <span className="text-4xl block mb-2">{currentConfig.emoji}</span>
        <h3 className={`text-xl font-bold ${currentConfig.color} mb-1`}>
          {currentConfig.nameAr}
        </h3>
        <p className="text-2xl font-bold text-dark">
          {profile.totalPoints.toLocaleString("en-US")}
          <span className="text-sm font-medium text-gray-text me-1"> نقطة</span>
        </p>
      </div>

      {/* Progress to next level */}
      {nextConfig && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-bold ${currentConfig.color}`}>
              {currentConfig.emoji} {currentConfig.nameAr}
            </span>
            <span className={`font-bold ${nextConfig.color}`}>
              {nextConfig.emoji} {nextConfig.nameAr}
            </span>
          </div>
          <div className="h-3 bg-gray-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-brand-green to-brand-gold rounded-full transition-all duration-700"
              style={{ width: `${profile.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-text text-center">
            محتاج <span className="font-bold text-dark">{profile.pointsToNextLevel.toLocaleString("en-US")}</span> نقطة
            للمستوى {nextConfig.nameAr} {nextConfig.emoji}
          </p>
        </div>
      )}

      {/* Level benefits */}
      <div className="bg-gray-light rounded-xl p-4">
        <h4 className="text-xs font-bold text-dark mb-2">مميزات مستواك الحالي</h4>
        <div className="space-y-1.5">
          {currentConfig.benefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-text">
              <span className="text-brand-green">✓</span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>
        {profile.freeFeatureAdsRemaining > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-bold text-brand-green">
              عندك {profile.freeFeatureAdsRemaining} إعلان مميز مجاني متبقي هذا الشهر
            </p>
          </div>
        )}
      </div>

      {/* All levels overview */}
      <LevelsOverview currentLevel={profile.currentLevel} totalPoints={profile.totalPoints} />
    </div>
  );
}

function LevelsOverview({ currentLevel, totalPoints }: { currentLevel: LoyaltyLevel; totalPoints: number }) {
  const levels: LoyaltyLevel[] = ["member", "silver", "gold", "diamond"];

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-dark">جميع المستويات</h4>
      <div className="space-y-1.5">
        {levels.map((level) => {
          const config = LOYALTY_LEVELS[level];
          const isActive = level === currentLevel;
          const isUnlocked = totalPoints >= config.minPoints;

          return (
            <div
              key={level}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                isActive
                  ? `${config.bgColor} border-2 border-current ${config.color}`
                  : isUnlocked
                    ? "bg-gray-light"
                    : "bg-gray-50 opacity-60"
              }`}
            >
              <span className="text-lg">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${isActive ? config.color : "text-dark"}`}>
                  {config.nameAr}
                </p>
                <p className="text-[10px] text-gray-text">
                  {config.minPoints.toLocaleString("en-US")} نقطة
                </p>
              </div>
              {isActive && (
                <span className={`text-[10px] font-bold ${config.color}`}>أنت هنا</span>
              )}
              {isUnlocked && !isActive && (
                <span className="text-[10px] text-brand-green">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
