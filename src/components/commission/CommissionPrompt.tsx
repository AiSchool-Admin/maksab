"use client";

import { useState } from "react";
import { Check, Heart, X, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  calculateSuggestedCommission,
  submitCommission,
  declineCommission,
} from "@/lib/commission/commission-service";

interface CommissionPromptProps {
  adId: string;
  adTitle: string;
  transactionAmount: number;
  userId: string;
  onComplete: () => void;
}

type PromptStep = "prompt" | "custom" | "payment" | "thanks" | "dismissed";

export default function CommissionPrompt({
  adId,
  adTitle,
  transactionAmount,
  userId,
  onComplete,
}: CommissionPromptProps) {
  const suggested = calculateSuggestedCommission(transactionAmount);
  const [step, setStep] = useState<PromptStep>("prompt");
  const [customAmount, setCustomAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePay = async (amount: number) => {
    setIsSubmitting(true);
    await submitCommission({
      adId,
      payerId: userId,
      amount,
      paymentMethod: "vodafone_cash",
    });
    setIsSubmitting(false);
    setStep("thanks");
  };

  const handleLater = async () => {
    await declineCommission({ adId, payerId: userId, status: "later" });
    onComplete();
  };

  const handleDecline = async () => {
    await declineCommission({ adId, payerId: userId, status: "declined" });
    setStep("dismissed");
  };

  // ── Thanks screen ──
  if (step === "thanks") {
    return (
      <div className="bg-white rounded-2xl p-6 text-center space-y-4 max-w-sm mx-auto">
        <div className="w-16 h-16 bg-brand-green-light rounded-full flex items-center justify-center mx-auto">
          <Heart size={32} className="text-brand-green" />
        </div>
        <h2 className="text-xl font-bold text-dark">شكراً يا كبير! 💚</h2>
        <p className="text-sm text-gray-text">
          دعمك بيساعدنا نكبر ونخدمك أحسن. أنت دلوقتي &quot;داعم مكسب&quot; 💚
        </p>
        <Button fullWidth onClick={onComplete}>
          تمام
        </Button>
      </div>
    );
  }

  // ── Dismissed ──
  if (step === "dismissed") {
    return (
      <div className="bg-white rounded-2xl p-6 text-center space-y-4 max-w-sm mx-auto">
        <p className="text-4xl">👋</p>
        <h2 className="text-lg font-bold text-dark">مفيش مشكلة!</h2>
        <p className="text-sm text-gray-text">
          مكسب مجاني بالكامل ومفيش أي قيود. نتمنى الصفقة تكون عجبتك!
        </p>
        <Button fullWidth variant="outline" onClick={onComplete}>
          تمام
        </Button>
      </div>
    );
  }

  // ── Custom amount input ──
  if (step === "custom") {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <h2 className="text-lg font-bold text-dark text-center">
          💚 ادفع مبلغ تاني
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="المبلغ"
            className="flex-1 h-12 px-4 rounded-xl border border-gray-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none text-lg text-center"
            min="1"
          />
          <span className="text-sm font-semibold text-gray-text">جنيه</span>
        </div>
        <div className="flex gap-2">
          <Button
            fullWidth
            onClick={() => handlePay(Number(customAmount))}
            isLoading={isSubmitting}
            disabled={!customAmount || Number(customAmount) <= 0}
          >
            ادفع
          </Button>
          <Button
            variant="outline"
            className="flex-shrink-0"
            onClick={() => setStep("prompt")}
          >
            رجوع
          </Button>
        </div>
      </div>
    );
  }

  // ── Payment method screen ──
  if (step === "payment") {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <h2 className="text-lg font-bold text-dark text-center">
          طريقة الدفع
        </h2>
        <p className="text-sm text-gray-text text-center">
          حوّل {suggested} جنيه على أي طريقة من دول:
        </p>

        <div className="space-y-3">
          <div className="bg-gray-light rounded-xl p-4">
            <p className="text-sm font-bold text-dark mb-1">
              فودافون كاش
            </p>
            <p className="text-sm text-gray-text" dir="ltr">
              01XX-XXX-XXXX
            </p>
          </div>
          <div className="bg-gray-light rounded-xl p-4">
            <p className="text-sm font-bold text-dark mb-1">إنستاباي</p>
            <p className="text-sm text-gray-text">maksab@instapay</p>
          </div>
        </div>

        <Button fullWidth onClick={() => handlePay(suggested)} isLoading={isSubmitting}>
          تم التحويل
        </Button>
        <button
          onClick={() => setStep("prompt")}
          className="w-full text-sm text-gray-text text-center py-2"
        >
          رجوع
        </button>
      </div>
    );
  }

  // ── Main prompt ──
  return (
    <div className="bg-white rounded-2xl p-6 space-y-5 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-4xl">🎉</p>
        <h2 className="text-xl font-bold text-dark">مبروك! تمت الصفقة</h2>
        <p className="text-sm text-gray-text">{adTitle}</p>
        <p className="text-lg font-bold text-brand-green">
          {transactionAmount.toLocaleString("en-US")} جنيه
        </p>
      </div>

      {/* Commission message */}
      <div className="bg-brand-green-light rounded-xl p-4 text-center">
        <p className="text-sm text-dark leading-relaxed">
          مكسب تطبيق مجاني بالكامل. لو الصفقة عجبتك، ساهم بعمولة بسيطة
          تساعدنا نكبر ونخدمك أحسن 🙏
        </p>
        <p className="text-sm font-bold text-brand-green mt-2">
          العمولة المقترحة: {suggested} جنيه
        </p>
        <p className="text-[11px] text-gray-text mt-1">
          (1% من قيمة الصفقة)
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          fullWidth
          size="lg"
          icon={<Check size={18} />}
          onClick={() => setStep("payment")}
        >
          ادفع {suggested} جنيه
        </Button>

        <Button
          fullWidth
          variant="outline"
          icon={<Heart size={16} />}
          onClick={() => setStep("custom")}
        >
          ادفع مبلغ تاني
        </Button>

        <button
          onClick={handleLater}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm text-gray-text hover:text-dark transition-colors"
        >
          <Clock size={14} />
          لاحقاً
        </button>

        <button
          onClick={handleDecline}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-gray-text/70 hover:text-gray-text transition-colors"
        >
          <X size={12} />
          لا شكراً
        </button>
      </div>
    </div>
  );
}
