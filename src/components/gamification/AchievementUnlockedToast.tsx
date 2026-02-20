"use client";

import { ACHIEVEMENTS } from "@/lib/gamification";

interface AchievementUnlockedToastProps {
  achievementId: string;
}

export default function AchievementUnlockedToast({ achievementId }: AchievementUnlockedToastProps) {
  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!achievement) return null;

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-lg border border-brand-green/20 max-w-[320px]">
      <span className="text-3xl animate-bounce">{achievement.emoji}</span>
      <div>
        <p className="text-xs text-brand-green font-bold mb-0.5">إنجاز جديد!</p>
        <p className="text-sm font-bold text-dark">{achievement.name_ar}</p>
        <p className="text-[10px] text-gray-text">{achievement.description_ar}</p>
      </div>
      <span className="text-xs font-bold text-brand-green flex-shrink-0">
        +{achievement.points_reward}
      </span>
    </div>
  );
}
