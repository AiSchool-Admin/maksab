"use client";

import { Check, X } from "lucide-react";
import { PLAN_FEATURES, PLANS } from "@/lib/stores/subscription-plans";
import type { SubscriptionPlan } from "@/types";

interface PricingTableProps {
  currentPlan: SubscriptionPlan;
}

/**
 * Side-by-side comparison table of all plan features.
 * Scrollable horizontally on mobile.
 */
export default function PricingTable({ currentPlan }: PricingTableProps) {
  const plans: SubscriptionPlan[] = ["free", "gold", "platinum"];

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[480px] text-xs">
        <thead>
          <tr className="border-b border-gray-light">
            <th className="text-right py-3 pr-3 text-gray-text font-normal w-1/3">
              المميزات
            </th>
            {plans.map((planId) => {
              const plan = PLANS[planId];
              const isCurrent = planId === currentPlan;
              return (
                <th
                  key={planId}
                  className={`text-center py-3 px-2 font-bold ${
                    isCurrent ? "text-brand-green" : plan.color
                  }`}
                >
                  <span className="block text-lg mb-0.5">{plan.icon}</span>
                  {plan.name}
                  {isCurrent && (
                    <span className="block text-[10px] text-brand-green font-normal mt-0.5">
                      (الحالية)
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {PLAN_FEATURES.map((feature) => (
            <tr
              key={feature.label}
              className="border-b border-gray-light/50 hover:bg-gray-50 transition-colors"
            >
              <td className="py-2.5 pr-3 text-dark">{feature.label}</td>
              {plans.map((planId) => {
                const value = feature[planId];
                return (
                  <td key={planId} className="text-center py-2.5 px-2">
                    {typeof value === "boolean" ? (
                      value ? (
                        <Check
                          size={16}
                          className="text-brand-green mx-auto"
                        />
                      ) : (
                        <X
                          size={16}
                          className="text-gray-text/30 mx-auto"
                        />
                      )
                    ) : (
                      <span className="font-semibold text-dark">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
