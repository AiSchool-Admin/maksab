"use client";

import { Flame } from "lucide-react";
import type { UserStreak } from "@/lib/gamification";

interface StreakCounterProps {
  streak: UserStreak;
  compact?: boolean;
}

export default function StreakCounter({ streak, compact = false }: StreakCounterProps) {
  const isActive = streak.current_streak > 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        isActive ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-text"
      }`}>
        <Flame size={14} className={isActive ? "text-orange-500" : ""} />
        <span>{streak.current_streak}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-l from-orange-50 to-amber-50 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isActive ? "bg-orange-100" : "bg-gray-100"
        }`}>
          <Flame size={24} className={isActive ? "text-orange-500" : "text-gray-400"} />
        </div>
        <div>
          <p className="text-xs text-gray-text">سلسلة الدخول اليومي</p>
          <p className="text-2xl font-bold text-dark">
            {streak.current_streak}
            <span className="text-sm font-medium text-gray-text me-1"> يوم</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-lg font-bold text-orange-600">{streak.current_streak}</p>
          <p className="text-[10px] text-gray-text">الحالي</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-lg font-bold text-amber-600">{streak.longest_streak}</p>
          <p className="text-[10px] text-gray-text">أطول سلسلة</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-lg font-bold text-brand-green">
            {streak.current_streak >= 7 ? "✓" : `${7 - streak.current_streak}`}
          </p>
          <p className="text-[10px] text-gray-text">
            {streak.current_streak >= 7 ? "أسبوعي" : "للأسبوعي"}
          </p>
        </div>
      </div>

      {/* Weekly dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < (streak.current_streak % 7 || (streak.current_streak >= 7 ? 7 : 0))
                ? "bg-orange-400 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            {["س", "ح", "ن", "ث", "ر", "خ", "ج"][i]}
          </div>
        ))}
      </div>
    </div>
  );
}
