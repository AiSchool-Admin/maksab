"use client";

import { Trophy, Medal, Award } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/gamification";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  userRank?: number | null;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy size={18} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={18} className="text-slate-400" />;
  if (rank === 3) return <Award size={18} className="text-amber-600" />;
  return <span className="text-xs font-bold text-gray-text w-[18px] text-center">{rank}</span>;
}

function getLevelBadge(level: string) {
  const map: Record<string, { emoji: string; color: string }> = {
    bronze: { emoji: "🥉", color: "text-amber-600" },
    silver: { emoji: "🥈", color: "text-slate-500" },
    gold: { emoji: "🥇", color: "text-yellow-500" },
    ambassador: { emoji: "💎", color: "text-blue-500" },
    member: { emoji: "🟢", color: "text-gray-text" },
  };
  return map[level] || map.member;
}

export default function Leaderboard({ entries, currentUserId, userRank }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-3xl mb-2">🏆</p>
        <p className="text-sm text-gray-text">لسه مفيش بيانات في المتصدرين</p>
        <p className="text-xs text-gray-text mt-1">ابدأ اكسب نقاط عشان تظهر هنا!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div className="flex items-end justify-center gap-2 pb-3">
          {/* 2nd place */}
          <PodiumCard entry={entries[1]} rank={2} />
          {/* 1st place */}
          <PodiumCard entry={entries[0]} rank={1} isFirst />
          {/* 3rd place */}
          <PodiumCard entry={entries[2]} rank={3} />
        </div>
      )}

      {/* User's rank */}
      {currentUserId && userRank && userRank > 3 && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-3 flex items-center gap-3">
          <span className="text-sm font-bold text-brand-green">#{userRank}</span>
          <p className="text-xs font-bold text-dark flex-1">ترتيبك في المتصدرين</p>
          <span className="text-xs text-gray-text">واصل عشان تطلع!</span>
        </div>
      )}

      {/* Full list */}
      <div className="space-y-1">
        {entries.slice(3).map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
              entry.user_id === currentUserId
                ? "bg-brand-green-light border border-brand-green/20"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="w-6 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-gray-text">👤</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-dark truncate">
                {entry.display_name || "مستخدم مكسب"}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-gray-text">
                <span>{entry.ads_count} إعلان</span>
                <span>·</span>
                <span>{entry.sales_count} بيعة</span>
              </div>
            </div>
            <div className="text-left flex-shrink-0">
              <p className="text-xs font-bold text-brand-green">
                {entry.total_points.toLocaleString("en-US")}
              </p>
              <p className="text-[10px] text-gray-text">نقطة</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  isFirst = false,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isFirst?: boolean;
}) {
  const badge = getLevelBadge(entry.level);
  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };

  return (
    <div className={`flex flex-col items-center ${isFirst ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}>
      <div className="relative mb-1">
        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center ${
          isFirst ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-gray-100"
        }`}>
          {entry.avatar_url ? (
            <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">👤</span>
          )}
        </div>
        <span className="absolute -bottom-1 -left-1 text-sm">{badge.emoji}</span>
      </div>
      <p className="text-[10px] font-bold text-dark truncate max-w-[80px] text-center">
        {entry.display_name || "مستخدم"}
      </p>
      <p className="text-[10px] font-bold text-brand-green">
        {entry.total_points.toLocaleString("en-US")}
      </p>
      <div className={`${heights[rank as 1 | 2 | 3]} w-20 rounded-t-lg mt-1 flex items-start justify-center pt-1 ${
        isFirst
          ? "bg-gradient-to-b from-yellow-300 to-yellow-400"
          : rank === 2
            ? "bg-gradient-to-b from-slate-300 to-slate-400"
            : "bg-gradient-to-b from-amber-300 to-amber-400"
      }`}>
        {getRankIcon(rank)}
      </div>
    </div>
  );
}
