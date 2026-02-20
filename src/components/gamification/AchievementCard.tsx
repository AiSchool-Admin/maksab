"use client";

import type { Achievement } from "@/lib/gamification";

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
}

export default function AchievementCard({ achievement, unlocked }: AchievementCardProps) {
  return (
    <div
      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
        unlocked
          ? "bg-brand-green-light border-brand-green/20"
          : "bg-gray-50 border-gray-200 opacity-60"
      }`}
    >
      <span className={`text-2xl flex-shrink-0 ${unlocked ? "" : "grayscale"}`}>
        {achievement.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${unlocked ? "text-dark" : "text-gray-text"}`}>
          {achievement.name_ar}
        </p>
        <p className="text-[10px] text-gray-text truncate">
          {achievement.description_ar}
        </p>
      </div>
      <div className="flex-shrink-0 text-left">
        {unlocked ? (
          <span className="text-[10px] font-bold text-brand-green">
            +{achievement.points_reward}
          </span>
        ) : (
          <span className="text-[10px] text-gray-text">
            {achievement.points_reward} نقطة
          </span>
        )}
      </div>
      {unlocked && (
        <div className="absolute -top-1 -left-1 w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
          <span className="text-white text-[10px]">✓</span>
        </div>
      )}
    </div>
  );
}
