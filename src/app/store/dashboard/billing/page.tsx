"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Crown, History, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import { getStoreByUserId, getSubscriptionHistory } from "@/lib/stores/store-service";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import Button from "@/components/ui/Button";
import PlanCard from "@/components/store/PlanCard";
import PricingTable from "@/components/store/PricingTable";
import UpgradeModal from "@/components/store/UpgradeModal";
import SubscriptionBadge from "@/components/store/SubscriptionBadge";
import { PLANS } from "@/lib/stores/subscription-plans";
import type { PaymentMethodId } from "@/lib/stores/subscription-plans";
import type { Store, StoreSubscription, SubscriptionPlan } from "@/types";
import toast from "react-hot-toast";

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("free");
  const [history, setHistory] = useState<StoreSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [upgradeTarget, setUpgradeTarget] = useState<SubscriptionPlan | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    // Get store
    const s = await getStoreByUserId(user.id);

    if (!s) {
      setIsLoading(false);
      return;
    }

    setStore(s);

    // Fetch subscription & history in parallel
    const [subRes, hist] = await Promise.all([
      fetch(`/api/stores/subscription?store_id=${s.id}`),
      getSubscriptionHistory(s.id),
    ]);

    if (subRes.ok) {
      const subData = await subRes.json();
      setSubscription(subData.subscription);
      setCurrentPlan(subData.currentPlan);
    }

    setHistory(hist);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadData();
  }, [user, router, loadData]);

  const handleUpgrade = async (paymentMethod: PaymentMethodId, paymentRef: string) => {
    if (!store || !user || !upgradeTarget) return;
    setIsUpgrading(true);

    try {
      const res = await fetch("/api/stores/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          user_id: user.id,
          plan: upgradeTarget,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          payment_ref: paymentRef,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "تم الترقية بنجاح!");
        setUpgradeTarget(null);
        loadData();
      } else {
        toast.error(data.error || "حصل مشكلة، جرب تاني");
      }
    } catch {
      toast.error("حصل مشكلة في الاتصال");
    }

    setIsUpgrading(false);
  };

  const handleCancel = async () => {
    if (!store || !user) return;
    setIsCancelling(true);

    try {
      const res = await fetch("/api/stores/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          user_id: user.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "تم إلغاء الاشتراك");
        loadData();
      } else {
        toast.error(data.error || "حصل مشكلة");
      }
    } catch {
      toast.error("حصل مشكلة في الاتصال");
    }

    setIsCancelling(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    router.push("/store/create");
    return null;
  }

  const planConfig = PLANS[currentPlan];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button
          onClick={() => router.push("/store/dashboard")}
          className="p-1"
        >
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-dark">الاشتراك والباقات</h1>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Current plan card */}
        <section className={`rounded-2xl border-2 p-4 ${planConfig.bgColor} ${planConfig.borderColor}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
              {planConfig.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-dark">
                  باقة {planConfig.name}
                </h2>
                <SubscriptionBadge plan={currentPlan} size="md" />
              </div>
              <p className="text-xs text-gray-text">{planConfig.description}</p>
            </div>
          </div>

          {/* Subscription details */}
          {subscription && subscription.plan !== "free" && (
            <div className="bg-white/60 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-text">السعر</span>
                <span className="font-semibold text-dark">
                  {subscription.price?.toLocaleString("ar-EG") || "0"} جنيه
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-text">بداية الاشتراك</span>
                <span className="font-semibold text-dark">
                  {new Date(subscription.start_at).toLocaleDateString("ar-EG")}
                </span>
              </div>
              {subscription.end_at && (
                <div className="flex justify-between">
                  <span className="text-gray-text">ينتهي في</span>
                  <span className="font-semibold text-dark">
                    {new Date(subscription.end_at).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              )}
              {subscription.payment_method && (
                <div className="flex justify-between">
                  <span className="text-gray-text">طريقة الدفع</span>
                  <span className="font-semibold text-dark">
                    {subscription.payment_method}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cancel button for paid plans */}
          {currentPlan !== "free" && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="mt-3 text-xs text-error hover:underline disabled:opacity-50"
            >
              {isCancelling ? "جاري الإلغاء..." : "إلغاء الاشتراك"}
            </button>
          )}
        </section>

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-2 bg-white rounded-xl border border-gray-light p-1.5">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              billingCycle === "monthly"
                ? "bg-brand-green text-white"
                : "text-gray-text hover:bg-gray-50"
            }`}
          >
            شهري
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              billingCycle === "yearly"
                ? "bg-brand-green text-white"
                : "text-gray-text hover:bg-gray-50"
            }`}
          >
            سنوي
            <span className="text-[10px] mr-1 font-normal">
              (وفّر أكتر)
            </span>
          </button>
        </div>

        {/* Plans */}
        <section>
          <h3 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <Crown size={16} className="text-brand-gold" />
            اختار الباقة المناسبة
          </h3>
          <div className="space-y-4">
            {(["free", "gold", "platinum"] as SubscriptionPlan[]).map(
              (planId) => (
                <PlanCard
                  key={planId}
                  plan={PLANS[planId]}
                  currentPlan={currentPlan}
                  billingCycle={billingCycle}
                  onSelect={(p) => setUpgradeTarget(p)}
                />
              ),
            )}
          </div>
        </section>

        {/* Comparison table */}
        <section className="bg-white rounded-2xl border border-gray-light p-4">
          <h3 className="text-sm font-bold text-dark mb-3">
            مقارنة المميزات
          </h3>
          <PricingTable currentPlan={currentPlan} />
        </section>

        {/* Subscription history */}
        <section className="bg-white rounded-2xl border border-gray-light p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              <History size={16} className="text-gray-text" />
              سجل الاشتراكات
            </h3>
            <span className="text-xs text-gray-text">
              {showHistory ? "إخفاء" : "عرض"}
            </span>
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-gray-text text-center py-4">
                  مفيش سجل اشتراكات
                </p>
              ) : (
                history.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-dark">
                        {PLANS[sub.plan]?.icon} {PLANS[sub.plan]?.name}
                      </span>
                      <p className="text-[10px] text-gray-text mt-0.5">
                        {new Date(sub.start_at).toLocaleDateString("ar-EG")}
                        {sub.end_at &&
                          ` — ${new Date(sub.end_at).toLocaleDateString("ar-EG")}`}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sub.status === "active"
                          ? "bg-green-50 text-green-700"
                          : sub.status === "cancelled"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {sub.status === "active"
                        ? "نشط"
                        : sub.status === "cancelled"
                          ? "ملغي"
                          : "منتهي"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Help note */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            لو عندك أي مشكلة في الاشتراك أو الدفع، تواصل معانا وهنساعدك.
            الترقية بتتفعل بعد التحقق من الدفع.
          </p>
        </div>
      </div>

      {/* Upgrade Modal */}
      {upgradeTarget && (
        <UpgradeModal
          targetPlan={upgradeTarget}
          billingCycle={billingCycle}
          onConfirm={handleUpgrade}
          onClose={() => setUpgradeTarget(null)}
          isLoading={isUpgrading}
        />
      )}
    </div>
  );
}
