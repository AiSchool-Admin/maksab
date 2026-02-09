/**
 * Loyalty & Rewards Program Types
 *
 * Levels: عضو (Member) → فضي (Silver) → ذهبي (Gold) → ماسي (Diamond)
 * Points earned on: selling, buying, reviewing, referrals
 * Benefits: featured ads, search priority, exclusive badges
 */

export type LoyaltyLevel = "member" | "silver" | "gold" | "diamond";

export interface LoyaltyLevelConfig {
  id: LoyaltyLevel;
  nameAr: string;
  emoji: string;
  color: string;        // Tailwind color class
  bgColor: string;      // Tailwind bg class
  minPoints: number;
  benefits: string[];
  freeFeatureAdsPerMonth: number;
  searchBoost: number;  // multiplier for search ranking (1.0 = normal)
}

export const LOYALTY_LEVELS: Record<LoyaltyLevel, LoyaltyLevelConfig> = {
  member: {
    id: "member",
    nameAr: "عضو",
    emoji: "🟢",
    color: "text-gray-text",
    bgColor: "bg-gray-100",
    minPoints: 0,
    benefits: ["الميزات الأساسية"],
    freeFeatureAdsPerMonth: 0,
    searchBoost: 1.0,
  },
  silver: {
    id: "silver",
    nameAr: "فضي",
    emoji: "🥈",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
    minPoints: 500,
    benefits: [
      "إعلان مميز مجاني / شهر",
      "شارة فضية على البروفايل",
    ],
    freeFeatureAdsPerMonth: 1,
    searchBoost: 1.1,
  },
  gold: {
    id: "gold",
    nameAr: "ذهبي",
    emoji: "🥇",
    color: "text-brand-gold",
    bgColor: "bg-brand-gold-light",
    minPoints: 2000,
    benefits: [
      "3 إعلانات مميزة مجانية / شهر",
      "ظهور أول في نتائج البحث",
      "شارة ذهبية مميزة",
    ],
    freeFeatureAdsPerMonth: 3,
    searchBoost: 1.25,
  },
  diamond: {
    id: "diamond",
    nameAr: "ماسي",
    emoji: "💎",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    minPoints: 5000,
    benefits: [
      "5 إعلانات مميزة مجانية / شهر",
      "أولوية قصوى في البحث",
      "شارة ماسية حصرية",
      "دعم فني مباشر",
    ],
    freeFeatureAdsPerMonth: 5,
    searchBoost: 1.5,
  },
};

/** Actions that earn points */
export type PointAction =
  | "ad_created"
  | "ad_sold"
  | "purchase_completed"
  | "review_given"
  | "review_received"
  | "referral_signup"
  | "referral_first_ad"
  | "profile_completed"
  | "daily_login"
  | "commission_paid";

export interface PointActionConfig {
  action: PointAction;
  nameAr: string;
  points: number;
  emoji: string;
  maxPerDay?: number;   // Rate limit (optional)
}

export const POINT_ACTIONS: Record<PointAction, PointActionConfig> = {
  ad_created: {
    action: "ad_created",
    nameAr: "نشر إعلان",
    points: 50,
    emoji: "📝",
    maxPerDay: 5,
  },
  ad_sold: {
    action: "ad_sold",
    nameAr: "بيع منتج",
    points: 100,
    emoji: "💰",
  },
  purchase_completed: {
    action: "purchase_completed",
    nameAr: "شراء منتج",
    points: 75,
    emoji: "🛒",
  },
  review_given: {
    action: "review_given",
    nameAr: "كتابة تقييم",
    points: 30,
    emoji: "⭐",
    maxPerDay: 3,
  },
  review_received: {
    action: "review_received",
    nameAr: "استلام تقييم إيجابي",
    points: 20,
    emoji: "🌟",
  },
  referral_signup: {
    action: "referral_signup",
    nameAr: "صديق سجّل بدعوتك",
    points: 200,
    emoji: "🤝",
  },
  referral_first_ad: {
    action: "referral_first_ad",
    nameAr: "صديقك نشر أول إعلان",
    points: 100,
    emoji: "🎁",
  },
  profile_completed: {
    action: "profile_completed",
    nameAr: "اكمال البروفايل",
    points: 100,
    emoji: "✅",
  },
  daily_login: {
    action: "daily_login",
    nameAr: "تسجيل دخول يومي",
    points: 5,
    emoji: "📅",
    maxPerDay: 1,
  },
  commission_paid: {
    action: "commission_paid",
    nameAr: "دعم مكسب بعمولة",
    points: 150,
    emoji: "💚",
  },
};

export interface PointTransaction {
  id: string;
  userId: string;
  action: PointAction;
  points: number;
  description: string;
  referenceId?: string;   // ad_id, referral_code, etc.
  createdAt: string;
}

export interface UserLoyaltyProfile {
  userId: string;
  totalPoints: number;
  currentLevel: LoyaltyLevel;
  nextLevel: LoyaltyLevel | null;
  pointsToNextLevel: number;
  progressPercent: number;  // 0-100
  referralCode: string;
  referralCount: number;
  freeFeatureAdsRemaining: number;
  recentTransactions: PointTransaction[];
}
