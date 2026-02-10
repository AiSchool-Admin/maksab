"use client";

import { Check, X } from "lucide-react";
import type { SubscriptionPlan } from "@/types";
import { PLANS, type PlanConfig } from "@/lib/stores/subscription-plans";
import Button from "@/components/ui/Button";

interface PlanCardProps {
  plan: PlanConfig;
  currentPlan: SubscriptionPlan;
  billingCycle: "monthly" | "yearly";
  onSelect: (plan: SubscriptionPlan) => void;
  isLoading?: boolean;
}

export default function PlanCard({
  plan,
  currentPlan,
  billingCycle,
  onSelect,
  isLoading,
}: PlanCardProps) {
  const isCurrent = plan.id === currentPlan;
  const isPopular = plan.id === "gold";
  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.price;
  const monthlyEquivalent =
    billingCycle === "yearly" && plan.yearlyPrice > 0
      ? Math.round(plan.yearlyPrice / 12)
      : null;

  // Determine button state
  const planOrder: Record<SubscriptionPlan, number> = {
    free: 0,
    gold: 1,
    platinum: 2,
  };
  const isUpgrade = planOrder[plan.id] > planOrder[currentPlan];
  const isDowngrade = planOrder[plan.id] < planOrder[currentPlan];

  const features = [
    { label: `حتى ${plan.maxProducts === 999 ? "غير محدود" : plan.maxProducts} منتج`, included: true },
    { label: `${plan.maxCategories === 999 ? "غير محدود" : plan.maxCategories} أقسام`, included: true },
    { label: `${plan.maxPinnedProducts} منتج مثبت`, included: true },
    { label: `إحصائيات ${plan.analyticsRetentionDays} يوم`, included: true },
    { label: "عروض وخصومات", included: plan.canUsePromotions },
    { label: "تخصيص الثيم", included: plan.canCustomizeTheme },
    { label: "ظهور مميز في البحث", included: plan.hasFeaturedInSearch },
    { label: "شارة موثّق", included: plan.hasVerifiedBadge },
    { label: "دعم فني أولوية", included: plan.hasPrioritySupport },
  ];

  return (
    <div
      className={`relative bg-white rounded-2xl border-2 p-5 transition-shadow ${
        isCurrent
          ? "border-brand-green shadow-lg shadow-brand-green/10"
          : isPopular
            ? "border-brand-gold shadow-md"
            : "border-gray-light"
      }`}
    >
      {/* Popular badge */}
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 start-1/2 -translate-x-1/2 bg-brand-gold text-white text-[10px] font-bold px-3 py-1 rounded-full">
          الأكثر شعبية
        </div>
      )}

      {/* Current badge */}
      {isCurrent && (
        <div className="absolute -top-3 start-1/2 -translate-x-1/2 bg-brand-green text-white text-[10px] font-bold px-3 py-1 rounded-full">
          باقتك الحالية
        </div>
      )}

      {/* Plan header */}
      <div className="text-center mb-4">
        <span className="text-3xl mb-2 block">{plan.icon}</span>
        <h3 className={`text-lg font-bold ${plan.color}`}>{plan.name}</h3>
        <p className="text-xs text-gray-text mt-1">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-5">
        {price === 0 ? (
          <p className="text-2xl font-bold text-dark">مجاني</p>
        ) : (
          <>
            <p className="text-3xl font-bold text-dark">
              {price.toLocaleString("ar-EG")}
              <span className="text-sm font-normal text-gray-text mr-1">
                جنيه/{billingCycle === "yearly" ? "سنة" : "شهر"}
              </span>
            </p>
            {monthlyEquivalent && (
              <p className="text-xs text-brand-green mt-1">
                يعني {monthlyEquivalent.toLocaleString("ar-EG")} جنيه/شهر
                — وفّر {Math.round(((plan.price * 12 - plan.yearlyPrice) / (plan.price * 12)) * 100)}%
              </p>
            )}
          </>
        )}
      </div>

      {/* Features list */}
      <ul className="space-y-2.5 mb-5">
        {features.map((f) => (
          <li
            key={f.label}
            className={`flex items-center gap-2 text-xs ${
              f.included ? "text-dark" : "text-gray-text/50 line-through"
            }`}
          >
            {f.included ? (
              <Check size={14} className="text-brand-green flex-shrink-0" />
            ) : (
              <X size={14} className="text-gray-text/40 flex-shrink-0" />
            )}
            {f.label}
          </li>
        ))}
      </ul>

      {/* Action button */}
      {isCurrent ? (
        <Button variant="outline" fullWidth disabled>
          باقتك الحالية
        </Button>
      ) : isUpgrade ? (
        <Button
          variant={isPopular ? "secondary" : "primary"}
          fullWidth
          onClick={() => onSelect(plan.id)}
          isLoading={isLoading}
        >
          ترقية لـ {plan.name}
        </Button>
      ) : isDowngrade ? (
        <Button variant="ghost" fullWidth disabled size="sm">
          باقة أقل
        </Button>
      ) : null}
    </div>
  );
}
