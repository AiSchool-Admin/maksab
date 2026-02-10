/**
 * Subscription Plans Configuration
 * Single source of truth for plan features and pricing.
 */

import type { SubscriptionPlan } from "@/types";

export interface PlanFeature {
  label: string;
  free: boolean | string;
  gold: boolean | string;
  platinum: boolean | string;
}

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  icon: string;
  price: number; // Monthly price in EGP (0 = free)
  yearlyPrice: number; // Yearly price in EGP (0 = free)
  color: string; // Tailwind color class
  bgColor: string;
  borderColor: string;
  description: string;
  maxProducts: number;
  maxPinnedProducts: number;
  maxCategories: number;
  analyticsRetentionDays: number;
  canUsePromotions: boolean;
  canCustomizeTheme: boolean;
  hasPrioritySupport: boolean;
  hasVerifiedBadge: boolean;
  hasFeaturedInSearch: boolean;
}

export const PLANS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: "free",
    name: "مجاني",
    icon: "🏪",
    price: 0,
    yearlyPrice: 0,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    description: "ابدأ متجرك مجاناً مع الأساسيات",
    maxProducts: 10,
    maxPinnedProducts: 1,
    maxCategories: 3,
    analyticsRetentionDays: 7,
    canUsePromotions: false,
    canCustomizeTheme: false,
    hasPrioritySupport: false,
    hasVerifiedBadge: false,
    hasFeaturedInSearch: false,
  },
  gold: {
    id: "gold",
    name: "ذهبي",
    icon: "💛",
    price: 99,
    yearlyPrice: 999,
    color: "text-brand-gold",
    bgColor: "bg-brand-gold-light",
    borderColor: "border-brand-gold/30",
    description: "وسّع متجرك مع مميزات إضافية",
    maxProducts: 50,
    maxPinnedProducts: 5,
    maxCategories: 10,
    analyticsRetentionDays: 30,
    canUsePromotions: true,
    canCustomizeTheme: true,
    hasPrioritySupport: false,
    hasVerifiedBadge: false,
    hasFeaturedInSearch: true,
  },
  platinum: {
    id: "platinum",
    name: "بلاتيني",
    icon: "💎",
    price: 199,
    yearlyPrice: 1999,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "كل المميزات بلا حدود",
    maxProducts: 999,
    maxPinnedProducts: 20,
    maxCategories: 999,
    analyticsRetentionDays: 90,
    canUsePromotions: true,
    canCustomizeTheme: true,
    hasPrioritySupport: true,
    hasVerifiedBadge: true,
    hasFeaturedInSearch: true,
  },
};

/** Features comparison table data */
export const PLAN_FEATURES: PlanFeature[] = [
  {
    label: "عدد المنتجات",
    free: "10",
    gold: "50",
    platinum: "غير محدود",
  },
  {
    label: "أقسام المتجر",
    free: "3",
    gold: "10",
    platinum: "غير محدود",
  },
  {
    label: "منتجات مثبتة",
    free: "1",
    gold: "5",
    platinum: "20",
  },
  {
    label: "الإحصائيات",
    free: "7 أيام",
    gold: "30 يوم",
    platinum: "90 يوم",
  },
  {
    label: "العروض والخصومات",
    free: false,
    gold: true,
    platinum: true,
  },
  {
    label: "تخصيص الثيم",
    free: false,
    gold: true,
    platinum: true,
  },
  {
    label: "ظهور مميز في البحث",
    free: false,
    gold: true,
    platinum: true,
  },
  {
    label: "شارة موثّق",
    free: false,
    gold: false,
    platinum: true,
  },
  {
    label: "دعم فني أولوية",
    free: false,
    gold: false,
    platinum: true,
  },
];

/** Get plan config by id */
export function getPlanConfig(plan: SubscriptionPlan): PlanConfig {
  return PLANS[plan];
}

/** Check if target plan is an upgrade from current */
export function isUpgrade(
  current: SubscriptionPlan,
  target: SubscriptionPlan,
): boolean {
  const order: Record<SubscriptionPlan, number> = {
    free: 0,
    gold: 1,
    platinum: 2,
  };
  return order[target] > order[current];
}

/** Payment methods available */
export const PAYMENT_METHODS = [
  { id: "vodafone_cash", label: "فودافون كاش", icon: "📱", number: "01012345678" },
  { id: "instapay", label: "إنستاباي", icon: "🏦", number: "maksab@instapay" },
  { id: "bank_transfer", label: "تحويل بنكي", icon: "🏛️", number: "1234567890 — البنك الأهلي" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];
