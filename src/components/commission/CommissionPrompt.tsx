"use client";

import { useState } from "react";
import { Check, Heart, X, Clock, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import InstaPayLogo from "@/components/ui/InstaPayLogo";
import {
  calculateSuggestedCommission,
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

type PromptStep =
  | "prompt"
  | "custom"
  | "instapay_guide"
  | "instapay_confirm"
  | "select_method"
  | "method_details"
  | "thanks"
  | "dismissed";

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
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [instapayRef, setInstapayRef] = useState("");
  const [commissionId, setCommissionId] = useState<string | null>(null);

  const paymentMethods = getAvailablePaymentMethods();
  const instapayMethod = paymentMethods.find((m) => m.id === "instapay");

  // ── Direct InstaPay payment flow ──
  const handleInstapayDirect = () => {
    setFinalAmount(suggested);
    setStep("instapay_guide");
  };

  const handleOpenInstaPay = () => {
    if (instapayMethod?.paymentLink) {
      window.open(instapayMethod.paymentLink, "_blank");
    }
    // Record the pending payment
    processPayment({
      amount: finalAmount,
      method: "instapay",
      adId,
      payerId: userId,
      description: `عمولة مكسب — ${adTitle}`,
    }).then((result) => {
      if (result.transactionId) {
        setCommissionId(result.transactionId);
      }
    });
    setStep("instapay_confirm");
  };

  // ── Confirm InstaPay payment with reference ──
  const handleConfirmInstapay = async () => {
    setIsSubmitting(true);
    try {
      const { getSessionToken } = await import("@/lib/supabase/auth");

      if (commissionId) {
        // Verify the payment with reference number
        await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commission_id: commissionId,
            instapay_reference: instapayRef || undefined,
            session_token: getSessionToken(),
            action: "user_confirmed",
          }),
        });
      } else {
        // Fallback: create and verify in one step
        const result = await processPayment({
          amount: finalAmount,
          method: "instapay",
          adId,
          payerId: userId,
          description: `عمولة مكسب — ${adTitle}`,
        });

        if (result.transactionId) {
          await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              commission_id: result.transactionId,
              instapay_reference: instapayRef || undefined,
              session_token: getSessionToken(),
              action: "user_confirmed",
            }),
          });
        }
      }

      setStep("thanks");
    } catch {
      setPaymentError("حصل مشكلة، لكن دفعك اتسجل وهنتأكد منه قريب");
      setStep("thanks");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === "instapay") {
      setStep("instapay_guide");
    } else if (method === "fawry" || method === "paymob_card") {
      handleOnlinePayment(method);
    } else {
      setStep("method_details");
    }
  };

  const handleOnlinePayment = async (method: PaymentMethod) => {
    setIsSubmitting(true);
    setPaymentError(null);
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
    } else {
      setPaymentError(result.error || "حصل مشكلة، جرب تاني");
      setStep("select_method");
    }
  };

  const handleConfirmManualPayment = async () => {
    setIsSubmitting(true);
    if (fawryRef) {
      setIsSubmitting(false);
      setStep("thanks");
      return;
    }
    const result = await processPayment({
      amount: finalAmount,
      method: selectedMethod || "vodafone_cash",
      adId,
      payerId: userId,
      description: `عمولة مكسب — ${adTitle}`,
    });
    setIsSubmitting(false);
    if (result.success) {
      setStep("thanks");
    }
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
        <h2 className="text-3xl font-bold text-dark">شكراً يا كبير! 💚</h2>
        <p className="text-sm text-gray-text">
          دعمك بيساعدنا نكبر ونخدمك أحسن. أنت دلوقتي &quot;داعم مكسب&quot; 💚
        </p>
        <p className="text-xs text-gray-text">
          هنتحقق من الدفع وهنبعتلك إشعار تأكيد قريب ✅
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
        <h2 className="text-2xl font-bold text-dark">مفيش مشكلة!</h2>
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
        <h2 className="text-2xl font-bold text-dark text-center">
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
              setStep("instapay_guide");
            }}
            disabled={!customAmount || Number(customAmount) <= 0}
          >
            ادفع بإنستاباي
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

  // ── InstaPay Step-by-Step Guide ──
  if (step === "instapay_guide") {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <div className="flex items-center justify-center gap-2">
          <InstaPayLogo size={36} />
          <h2 className="text-2xl font-bold text-dark">ادفع بإنستاباي</h2>
        </div>

        <div className="bg-gradient-to-l from-purple-50 to-blue-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-text text-center">
            المبلغ: <span className="text-xl font-bold text-dark">{finalAmount} جنيه</span>
          </p>

          {/* Step by step instructions */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <p className="text-sm text-dark">اضغط على الزرار اللي تحت — هيفتحلك إنستاباي</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <p className="text-sm text-dark">حوّل <span className="font-bold">{finalAmount} جنيه</span></p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <p className="text-sm text-dark">ارجع هنا وأكّد التحويل</p>
            </div>
          </div>
        </div>

        <Button
          fullWidth
          size="lg"
          icon={<ExternalLink size={18} />}
          onClick={handleOpenInstaPay}
          className="!bg-purple-600 hover:!bg-purple-700"
        >
          افتح إنستاباي ودفع {finalAmount} جنيه
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-text">أو طريقة تانية</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={() => setStep("select_method")}
          className="w-full text-sm text-gray-text text-center py-2 hover:text-dark transition-colors"
        >
          اختار طريقة دفع تانية
        </button>

        <button
          onClick={() => setStep("prompt")}
          className="w-full text-xs text-gray-text/70 text-center py-1"
        >
          رجوع
        </button>
      </div>
    );
  }

  // ── InstaPay Confirmation — User confirms transfer + optional reference ──
  if (step === "instapay_confirm") {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <div className="flex items-center justify-center gap-2">
          <InstaPayLogo size={36} />
          <h2 className="text-2xl font-bold text-dark">تأكيد التحويل</h2>
        </div>

        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 text-center space-y-2">
          <p className="text-sm text-gray-text">
            حوّلت <span className="font-bold text-dark">{finalAmount} جنيه</span> بإنستاباي؟
          </p>
          <p className="text-xs text-gray-text">
            لو حوّلت، أكّد هنا عشان نسجّل دعمك 💚
          </p>
        </div>

        {/* Optional reference number */}
        <div>
          <label className="text-sm font-semibold text-dark mb-1.5 block">
            رقم مرجع إنستاباي <span className="text-xs text-gray-text font-normal">(اختياري)</span>
          </label>
          <input
            type="text"
            value={instapayRef}
            onChange={(e) => setInstapayRef(e.target.value)}
            placeholder="مثلاً: IPN123456789"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none text-base text-center"
            dir="ltr"
          />
          <p className="text-[11px] text-gray-text mt-1">
            الرقم ده بيساعدنا نتحقق من التحويل أسرع
          </p>
        </div>

        {paymentError && (
          <p className="text-sm text-error text-center bg-red-50 rounded-xl py-2 px-3">
            {paymentError}
          </p>
        )}

        <Button
          fullWidth
          size="lg"
          icon={<Check size={18} />}
          onClick={handleConfirmInstapay}
          isLoading={isSubmitting}
        >
          أيوا، تم التحويل ✅
        </Button>

        <button
          onClick={() => {
            // Re-open InstaPay for them if they didn't finish
            if (instapayMethod?.paymentLink) {
              window.open(instapayMethod.paymentLink, "_blank");
            }
          }}
          className="w-full text-sm text-purple-600 font-semibold text-center py-2 hover:text-purple-700 transition-colors"
        >
          افتح إنستاباي تاني
        </button>

        <button
          onClick={handleLater}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-gray-text/70 hover:text-gray-text transition-colors"
        >
          <Clock size={12} />
          هحوّل بعدين
        </button>
      </div>
    );
  }

  // ── Select payment method (for non-InstaPay) ──
  if (step === "select_method") {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <h2 className="text-2xl font-bold text-dark text-center">
          اختار طريقة الدفع
        </h2>
        <p className="text-sm text-gray-text text-center">
          المبلغ: <span className="font-bold text-brand-green">{finalAmount} جنيه</span>
        </p>

        {paymentError && (
          <p className="text-sm text-error text-center bg-red-50 rounded-xl py-2 px-3">
            {paymentError}
          </p>
        )}

        <div className="space-y-2">
          {/* InstaPay always first and highlighted */}
          {instapayMethod && (
            <button
              onClick={() => {
                setPaymentError(null);
                handleSelectMethod("instapay");
              }}
              disabled={isSubmitting}
              className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-[0.98] transition-all text-start bg-gradient-to-l from-purple-50 to-blue-50 border-2 border-purple-300 hover:border-purple-400 relative"
            >
              <InstaPayLogo size={32} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-dark">إنستاباي</p>
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold">مُوصى</span>
                </div>
                <p className="text-[11px] text-gray-text">ادفع فوراً بإنستاباي — أسرع وأسهل طريقة</p>
              </div>
              <ExternalLink size={16} className="text-purple-500 flex-shrink-0" />
            </button>
          )}

          {/* Other payment methods */}
          {paymentMethods
            .filter((m) => m.id !== "instapay")
            .map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setPaymentError(null);
                  handleSelectMethod(method.id);
                }}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-[0.98] transition-all text-start bg-gray-light hover:bg-brand-green-light"
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

  // ── Payment method details (manual: Vodafone Cash, or Fawry ref) ──
  if (step === "method_details") {
    const methodInfo = paymentMethods.find((m) => m.id === selectedMethod);

    return (
      <div className="bg-white rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold text-dark text-center">
            {methodInfo?.icon} {methodInfo?.name}
          </h2>
        </div>

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

  // ── Main prompt — InstaPay-first design ──
  const rawPercentage = Math.round(transactionAmount * 0.01);
  const wasCapped = rawPercentage > 200;
  const wasFloored = rawPercentage < 10;

  return (
    <div className="bg-white rounded-2xl p-6 space-y-5 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-4xl">🎉</p>
        <h2 className="text-3xl font-bold text-dark">مبروك! تمت الصفقة</h2>
        <p className="text-sm text-gray-text">{adTitle}</p>
        <p className="text-lg font-bold text-brand-green">
          {transactionAmount.toLocaleString("en-US")} جنيه
        </p>
      </div>

      {/* Commission explanation */}
      <div className="bg-brand-green-light rounded-xl p-4 space-y-3">
        <p className="text-sm text-dark leading-relaxed text-center">
          مكسب بياخد عمولة بسيطة <span className="font-bold text-brand-green">1%</span> من
          قيمة كل صفقة عشان نقدر نكبر ونخدمك أحسن 💚
        </p>
        <p className="text-[11px] text-gray-text text-center">
          💡 المرة الجاية ادفع <span className="font-bold text-brand-gold">0.5% بس مقدماً</span> وخد
          شارة &quot;موثوق&quot; + أولوية ظهور
        </p>

        {/* Commission breakdown */}
        <div className="bg-white rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-text">قيمة الصفقة</span>
            <span className="font-bold text-dark">{transactionAmount.toLocaleString("en-US")} جنيه</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-text">العمولة (1%)</span>
            <span className="font-bold text-brand-green">{suggested} جنيه</span>
          </div>
          {wasCapped && (
            <p className="text-[11px] text-gray-text text-center">
              الحد الأقصى للعمولة 200 جنيه بس
            </p>
          )}
          {wasFloored && (
            <p className="text-[11px] text-gray-text text-center">
              الحد الأدنى للعمولة 10 جنيه
            </p>
          )}
        </div>

        <p className="text-[11px] text-gray-text text-center leading-relaxed">
          العمولة من 10 لـ 200 جنيه بس — مهما كانت قيمة الصفقة
        </p>
      </div>

      {/* Primary CTA — InstaPay direct */}
      <div className="space-y-2">
        <Button
          fullWidth
          size="lg"
          onClick={handleInstapayDirect}
          className="!bg-purple-600 hover:!bg-purple-700 !text-white"
        >
          <span className="flex items-center gap-2 justify-center">
            <InstaPayLogo size={22} />
            ادفع {suggested} جنيه بإنستاباي
          </span>
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
          onClick={() => {
            setFinalAmount(suggested);
            setStep("select_method");
          }}
          className="w-full text-sm text-gray-text text-center py-2 hover:text-dark transition-colors"
        >
          طرق دفع تانية
        </button>

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
