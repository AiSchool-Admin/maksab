"use client";

import { useState } from "react";
import { Shield, Zap, TrendingUp, Check, ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  calculatePrePaymentCommission,
  getPrePaymentSavings,
} from "@/lib/commission/commission-service";
import {
  getAvailablePaymentMethods,
  processPayment,
} from "@/lib/payment/payment-service";
import type { PaymentMethod } from "@/lib/payment/types";

interface PrePaymentOfferProps {
  adId: string;
  adPrice: number;
  userId: string;
  onPaid: () => void;
  onSkip: () => void;
}

type OfferStep = "offer" | "payment" | "success";

export default function PrePaymentOffer({
  adId,
  adPrice,
  userId,
  onPaid,
  onSkip,
}: PrePaymentOfferProps) {
  const [step, setStep] = useState<OfferStep>("offer");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prePayAmount = calculatePrePaymentCommission(adPrice);
  const { postTransaction, savings, savingsPercent } = getPrePaymentSavings(adPrice);
  const paymentMethods = getAvailablePaymentMethods();

  const handleSelectMethod = async (method: PaymentMethod) => {
    setIsSubmitting(true);

    const methodInfo = paymentMethods.find((m) => m.id === method);

    if (method === "instapay" && methodInfo?.paymentLink) {
      window.open(methodInfo.paymentLink, "_blank");
    }

    const result = await processPayment({
      amount: prePayAmount,
      method,
      adId,
      payerId: userId,
      description: `عمولة مكسب مسبقة — 0.5%`,
    });

    setIsSubmitting(false);

    if (result.success) {
      // Mark ad as boosted
      import("@/lib/commission/commission-service").then(({ boostAd }) => {
        boostAd(adId);
      });
      setStep("success");
    }
  };

  // ── Success ──
  if (step === "success") {
    return (
      <div className="bg-gradient-to-b from-brand-green-light to-white rounded-2xl p-6 text-center space-y-4 border-2 border-brand-green/30">
        <div className="w-16 h-16 bg-brand-green rounded-full flex items-center justify-center mx-auto">
          <Check size={32} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-dark">تم! إعلانك بقى موثوق</h3>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-text">
          <span className="flex items-center gap-1">
            <Shield size={14} className="text-brand-green" />
            شارة موثوق
          </span>
          <span className="flex items-center gap-1">
            <Zap size={14} className="text-brand-gold" />
            أولوية ظهور
          </span>
        </div>
        <Button fullWidth onClick={onPaid}>
          تمام
        </Button>
      </div>
    );
  }

  // ── Payment methods ──
  if (step === "payment") {
    return (
      <div className="bg-white rounded-2xl p-5 space-y-4 border border-gray-200">
        <h3 className="text-lg font-bold text-dark text-center">
          اختار طريقة الدفع
        </h3>
        <p className="text-sm text-gray-text text-center">
          المبلغ: <span className="font-bold text-brand-green">{prePayAmount} جنيه</span>
        </p>
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelectMethod(method.id)}
              disabled={isSubmitting}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-light hover:bg-brand-green-light active:scale-[0.98] transition-all text-start disabled:opacity-50"
            >
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-dark">{method.name}</p>
                <p className="text-[11px] text-gray-text">{method.description}</p>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => setStep("offer")}
          className="w-full text-sm text-gray-text text-center py-2"
        >
          رجوع
        </button>
      </div>
    );
  }

  // ── Main offer ──
  return (
    <div className="bg-gradient-to-b from-brand-gold-light to-white rounded-2xl border-2 border-brand-gold/40 overflow-hidden">
      {/* Header badge */}
      <div className="bg-gradient-to-l from-brand-gold to-amber-500 px-4 py-2.5 flex items-center gap-2">
        <Shield size={18} className="text-white" />
        <span className="text-sm font-bold text-white">عرض خاص — وفّر {savingsPercent}%</span>
      </div>

      <div className="p-5 space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-dark">
            ادفع 0.5% بس مقدماً
          </h3>
          <p className="text-sm text-gray-text">
            بدل ما تدفع {postTransaction} جنيه بعد الصفقة، ادفع{" "}
            <span className="font-bold text-brand-green">{prePayAmount} جنيه</span> دلوقتي
            ووفّر {savings} جنيه
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-white rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-brand-green" />
            </div>
            <div>
              <p className="text-sm font-bold text-dark">شارة &quot;موثوق&quot;</p>
              <p className="text-xs text-gray-text">
                إعلانك هيظهر بشارة موثوق — المشتريين بيثقوا فيه أكتر
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-brand-gold" />
            </div>
            <div>
              <p className="text-sm font-bold text-dark">أولوية في الظهور</p>
              <p className="text-xs text-gray-text">
                إعلانك هيظهر قبل الإعلانات التانية في البحث والصفحة الرئيسية
              </p>
            </div>
          </div>

          {isExpanded && (
            <div className="flex items-start gap-3 bg-white rounded-xl p-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-dark">مبيعات أسرع</p>
                <p className="text-xs text-gray-text">
                  الإعلانات الموثوقة بتتباع أسرع بنسبة 3 أضعاف
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 mx-auto text-xs text-gray-text"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? "أقل" : "اعرف أكتر"}
        </button>

        {/* Price comparison */}
        <div className="bg-white rounded-xl p-3 space-y-2 border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-text">عمولة بعد الصفقة (1%)</span>
            <span className="text-gray-text line-through">{postTransaction} جنيه</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-dark">عمولة مسبقة (0.5%)</span>
            <span className="font-bold text-brand-green">{prePayAmount} جنيه</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
            <span className="text-brand-gold font-bold">وفّرت</span>
            <span className="text-brand-gold font-bold">{savings} جنيه ({savingsPercent}%)</span>
          </div>
        </div>

        {/* Actions */}
        <Button
          fullWidth
          size="lg"
          icon={<Shield size={18} />}
          onClick={() => setStep("payment")}
        >
          ادفع {prePayAmount} جنيه — إعلان موثوق
        </Button>

        <button
          onClick={onSkip}
          className="w-full text-sm text-gray-text text-center py-2 hover:text-dark transition-colors"
        >
          لا شكراً — هدفع بعد الصفقة
        </button>
      </div>
    </div>
  );
}
