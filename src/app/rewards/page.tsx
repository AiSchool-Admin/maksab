/**
 * /rewards — Loyalty & Rewards page
 *
 * Shows:
 * - Current level + progress
 * - Points history
 * - Referral invite card
 * - How to earn points guide
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserLoyaltyProfile } from "@/lib/loyalty/loyalty-service";
import { POINT_ACTIONS } from "@/lib/loyalty/types";
import type { UserLoyaltyProfile } from "@/lib/loyalty/types";
import PointsDisplay from "@/components/loyalty/PointsDisplay";
import ReferralCard from "@/components/loyalty/ReferralCard";
import PointsHistory from "@/components/loyalty/PointsHistory";
import ReferralDashboard from "@/components/ReferralDashboard";
import AchievementCard from "@/components/gamification/AchievementCard";
import StreakCounter from "@/components/gamification/StreakCounter";
import Leaderboard from "@/components/gamification/Leaderboard";
import { getGamificationProfile, updateStreak, type GamificationProfile } from "@/lib/gamification";

export default function RewardsPage() {
  const router = useRouter();
  const { user, isLoading, requireAuth } = useAuth();
  const [profile, setProfile] = useState<UserLoyaltyProfile | null>(null);
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [tab, setTab] = useState<"overview" | "referrals" | "achievements" | "leaderboard" | "history" | "earn">("overview");

  useEffect(() => {
    if (user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous getUserLoyaltyProfile call
      setProfile(getUserLoyaltyProfile(user.id));
      // Load gamification data + update streak
      updateStreak(user.id).then(() => {
        getGamificationProfile(user.id).then(setGamification);
      });
    }
  }, [user?.id]);

  // Not logged in
  if (!isLoading && !user) {
    return (
      <main className="bg-white">
        <Header title="المكافآت" showNotifications={false} />
        <div className="px-4 py-12 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <h2 className="text-2xl font-bold text-dark mb-2">
            برنامج مكافآت مكسب
          </h2>
          <p className="text-sm text-gray-text mb-6">
            سجّل دخولك عشان تبدأ تجمع نقاط وتوصل لمستويات أعلى
          </p>
          <button
            onClick={async () => {
              await requireAuth();
            }}
            className="px-6 py-3 bg-brand-green text-white font-bold rounded-xl text-sm"
          >
            سجّل دخولك
          </button>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  // Loading
  if (isLoading || !profile) {
    return (
      <main className="bg-white">
        <Header title="المكافآت" showNotifications={false} />
        <div className="px-4 py-8 space-y-4">
          <div className="h-32 bg-gray-light rounded-2xl animate-pulse" />
          <div className="h-16 bg-gray-light rounded-xl animate-pulse" />
          <div className="h-24 bg-gray-light rounded-xl animate-pulse" />
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen pb-20">
      {/* Header with back */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-1 text-gray-text hover:text-dark"
          >
            <ChevronRight size={24} />
          </button>
          <h1 className="text-xl font-bold text-dark flex-1">المكافآت والنقاط</h1>
          <span className="text-xs font-bold text-brand-green bg-brand-green-light px-2.5 py-1 rounded-full">
            {profile.totalPoints.toLocaleString("en-US")} نقطة
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-light overflow-x-auto no-scrollbar">
        {([
          { id: "overview", label: "نظرة عامة" },
          { id: "achievements", label: "الإنجازات" },
          { id: "leaderboard", label: "المتصدرين" },
          { id: "referrals", label: "الدعوات" },
          { id: "history", label: "السجل" },
          { id: "earn", label: "اكسب نقاط" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-3 py-3 text-xs font-bold transition-colors ${
              tab === t.id
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-gray-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* ── Overview Tab ──────────────────────── */}
        {tab === "overview" && (
          <>
            <PointsDisplay profile={profile} />
            <ReferralCard
              referralCode={profile.referralCode}
              referralCount={profile.referralCount}
            />
          </>
        )}

        {/* ── Achievements Tab ─────────────────── */}
        {tab === "achievements" && gamification && (
          <div className="space-y-4">
            <StreakCounter streak={gamification.streak} />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-dark">الإنجازات</h3>
                <span className="text-[10px] text-gray-text">
                  {gamification.unlockedIds.length}/{gamification.achievements.length} مفتوح
                </span>
              </div>
              <div className="space-y-2">
                {gamification.achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={gamification.unlockedIds.includes(achievement.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Leaderboard Tab ────────────────────── */}
        {tab === "leaderboard" && gamification && (
          <Leaderboard
            entries={gamification.leaderboard}
            currentUserId={user?.id}
            userRank={gamification.userRank}
          />
        )}

        {/* ── Referrals Tab ────────────────────── */}
        {tab === "referrals" && <ReferralDashboard />}

        {/* ── History Tab ───────────────────────── */}
        {tab === "history" && (
          <PointsHistory transactions={profile.recentTransactions} />
        )}

        {/* ── How to Earn Tab ───────────────────── */}
        {tab === "earn" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-dark">ازاي تكسب نقاط؟</h3>
            <div className="space-y-2">
              {Object.values(POINT_ACTIONS).map((action) => (
                <div
                  key={action.action}
                  className="flex items-center gap-3 bg-gray-light rounded-xl p-3"
                >
                  <span className="text-xl flex-shrink-0">{action.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-dark">{action.nameAr}</p>
                    {action.maxPerDay && (
                      <p className="text-[10px] text-gray-text">
                        حد أقصى {action.maxPerDay} مرة / يوم
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-brand-green flex-shrink-0">
                    +{action.points}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-brand-gold-light rounded-xl p-4 mt-4">
              <h4 className="text-xs font-bold text-dark mb-2">نصائح سريعة</h4>
              <div className="space-y-1.5 text-xs text-gray-text">
                <p>• انشر إعلانات بانتظام — كل إعلان = 50 نقطة</p>
                <p>• قيّم البائعين بعد كل عملية — 30 نقطة لكل تقييم</p>
                <p>• ادعي أصحابك — 200 نقطة لكل صديق يسجّل!</p>
                <p>• ادخل التطبيق يومياً — 5 نقاط مجانية</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
