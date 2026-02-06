"use client";

import { useState } from "react";
import { Check, Heart, X, Clock, Copy, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  calculateSuggestedCommission,
  submitCommission,
  declineCommission,
} from "@/lib/commission/commission-service";
import {
  getAvailablePaymentMethods,
  processPayment,
} from "@/lib/payment/payment-service";
import type { PaymentMethod } from "@/lib/payment/types";

interface CommissionPromptProps {
  adId: string;
  adTitle: string;
  transactionAmount: number;
  userId: string;
  onComplete: () => void;
}

type PromptStep = "prompt" | "custom" | "select_method" | "method_details" | "thanks" | "dismissed";

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
  const [finalAmount, setFinalAmount] = useState(suggested);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fawryRef, setFawryRef] = useState<string | null>(null);

  const paymentMethods = getAvailablePaymentMethods();

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);

    // Fawry and card redirect are processed immediately
    if (method === "fawry" || method === "paymob_card") {
      handleOnlinePayment(method);
    } else {
      setStep("method_details");
    }
  };

  const handleOnlinePayment = async (method: PaymentMethod) => {
    setIsSubmitting(true);
    const result = await processPayment({
      amount: finalAmount,
      method,
      adId,
      payerId: userId,
      description: `عمولة مكسب — ${adTitle}`,
    });
    setIsSubmitting(false);

    if (result.success) {
      if (result.redirectUrl) {
        window.open(result.redirectUrl, "_blank");
        setStep("thanks");
      } else if (result.referenceNumber) {
        setFawryRef(result.referenceNumber);
        setStep("method_details");
      } else {
        setStep("thanks");
      }
    }
  };

  const handleConfirmManualPayment = async () => {
    setIsSubmitting(true);
    await submitCommission({
      adId,
      payerId: userId,
      amount: finalAmount,
      paymentMethod: selectedMethod || "vodafone_cash",
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            onClick={() => {
              setFinalAmount(Number(customAmount));
              setStep("select_method");
            }}
            disabled={!customAmount || Number(customAmount) <= 0}
          >
            التالي
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

  // ── Select payment method ──
  if (step === "select_method") {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <h2 className="text-lg font-bold text-dark text-center">
          اختار طريقة الدفع
        </h2>
        <p className="text-sm text-gray-text text-center">
          المبلغ: <span className="font-bold text-brand-green">{finalAmount} جنيه</span>
        </p>

        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelectMethod(method.id)}
              disabled={isSubmitting}
              className="w-full flex items-center gap-3 p-4 bg-gray-light rounded-xl hover:bg-brand-green-light active:scale-[0.98] transition-all text-start"
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
          onClick={() => setStep("prompt")}
          className="w-full text-sm text-gray-text text-center py-2"
        >
          رجوع
        </button>
      </div>
    );
  }

  // ── Payment method details (manual: Vodafone/InstaPay, or Fawry ref) ──
  if (step === "method_details") {
    const methodInfo = paymentMethods.find((m) => m.id === selectedMethod);

    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <h2 className="text-lg font-bold text-dark text-center">
          {methodInfo?.icon} {methodInfo?.name}
        </h2>

        {fawryRef ? (
          <div className="bg-brand-gold-light rounded-xl p-4 text-center">
            <p className="text-sm text-gray-text mb-2">كود الفوري:</p>
            <p className="text-2xl font-bold text-dark tracking-wider" dir="ltr">
              {fawryRef}
            </p>
            <button
              onClick={() => copyToClipboard(fawryRef)}
              className="flex items-center gap-1 mx-auto mt-2 text-xs text-brand-green font-semibold"
            >
              <Copy size={12} />
              {copied ? "تم النسخ!" : "نسخ الكود"}
            </button>
            <p className="text-[11px] text-gray-text mt-3">
              ادفع {finalAmount} جنيه بالكود ده في أي منفذ فوري
            </p>
          </div>
        ) : (
          <div className="bg-gray-light rounded-xl p-4">
            <p className="text-sm text-gray-text mb-2 text-center">
              حوّل <span className="font-bold text-dark">{finalAmount} جنيه</span> على:
            </p>
            {methodInfo?.details && (
              <div className="flex items-center justify-between bg-white rounded-lg p-3 mt-2">
                <p className="text-base font-bold text-dark" dir="ltr">
                  {methodInfo.details}
                </p>
                <button
                  onClick={() => copyToClipboard(methodInfo.details!)}
                  className="flex items-center gap-1 text-xs text-brand-green font-semibold btn-icon-sm"
                >
                  <Copy size={12} />
                  {copied ? "تم!" : "نسخ"}
                </button>
              </div>
            )}
          </div>
        )}

        <Button
          fullWidth
          onClick={handleConfirmManualPayment}
          isLoading={isSubmitting}
          icon={<Check size={18} />}
        >
          {fawryRef ? "تم الدفع" : "تم التحويل"}
        </Button>
        <button
          onClick={() => {
            setFawryRef(null);
            setStep("select_method");
          }}
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
          onClick={() => {
            setFinalAmount(suggested);
            setStep("select_method");
          }}
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
