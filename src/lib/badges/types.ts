/**
 * Badge System Types — شارات مكسب
 *
 * Three marketing badges:
 * - رائد مكسب (Pioneer) — early adopters (first 1000 users)
 * - داعم مكسب (Supporter) — users who paid voluntary commission
 * - سفير مكسب (Ambassador) — users with 5+ referrals
 */

export type BadgeId = "pioneer" | "supporter" | "ambassador";

export interface BadgeConfig {
  id: BadgeId;
  nameAr: string;
  emoji: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  criteria: string;
}

export const BADGES: Record<BadgeId, BadgeConfig> = {
  pioneer: {
    id: "pioneer",
    nameAr: "رائد مكسب",
    emoji: "🏆",
    icon: "🏆",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "من أوائل المستخدمين على مكسب",
    criteria: "سجّل ضمن أول 1,000 مستخدم",
  },
  supporter: {
    id: "supporter",
    nameAr: "داعم مكسب",
    emoji: "💚",
    icon: "💚",
    color: "text-brand-green",
    bgColor: "bg-brand-green-light",
    borderColor: "border-green-200",
    description: "ساهم في دعم مكسب بعمولة اختيارية",
    criteria: "دفع عمولة اختيارية مرة واحدة على الأقل",
  },
  ambassador: {
    id: "ambassador",
    nameAr: "سفير مكسب",
    emoji: "⭐",
    icon: "⭐",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "ساعد في نشر مكسب بين أصحابه",
    criteria: "دعا 5 أصدقاء أو أكتر وسجّلوا على مكسب",
  },
};

export interface UserBadge {
  badgeId: BadgeId;
  earnedAt: string;
}

export interface UserBadgesProfile {
  userId: string;
  badges: UserBadge[];
}
