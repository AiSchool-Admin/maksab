"use client";

import { useState, useRef } from "react";
import { Shield, Zap, TrendingUp, Check, ChevronDown, ChevronUp, ExternalLink, Clock, Camera, Upload, X } from "lucide-react";
import Button from "@/components/ui/Button";
import InstaPayLogo from "@/components/ui/InstaPayLogo";
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

type OfferStep = "offer" | "instapay_confirm" | "screenshot_upload" | "payment" | "success";

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
  const [instapayRef, setInstapayRef] = useState("");
  const [commissionId, setCommissionId] = useState<string | null>(null);
  const [uniqueAmount, setUniqueAmount] = useState<number | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prePayAmount = calculatePrePaymentCommission(adPrice);
  const { postTransaction, savings, savingsPercent } = getPrePaymentSavings(adPrice);
  const paymentMethods = getAvailablePaymentMethods();
  const instapayMethod = paymentMethods.find((m) => m.id === "instapay");

  const displayAmount = uniqueAmount || prePayAmount;

  // ── Handle screenshot selection ──
  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPaymentError("نوع الصورة مش مدعوم. استخدم JPG أو PNG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPaymentError("الصورة كبيرة. الحد الأقصى 2 ميجا");
      return;
    }
    setPaymentError(null);
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Upload screenshot and confirm ──
  const handleSubmitWithScreenshot = async () => {
    if (!screenshotFile || !commissionId) return;
    setIsUploading(true);
    setPaymentError(null);
    try {
      const { getSessionToken } = await import("@/lib/supabase/auth");
      const formData = new FormData();
      formData.append("file", screenshotFile);
      formData.append("commission_id", commissionId);
      formData.append("session_token", getSessionToken() || "");
      const uploadRes = await fetch("/api/payment/screenshot", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || "فشل رفع الصورة");
      }
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
      // NOTE: No boostAd here — boost happens after admin verification
      setStep("success");
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "حصل مشكلة، جرب تاني");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Direct InstaPay flow ──
  const handleInstapayDirect = async () => {
    if (instapayMethod?.paymentLink) {
      window.open(instapayMethod.paymentLink, "_blank");
    }

    // Record the pending payment and get unique amount
    const result = await processPayment({
      amount: prePayAmount,
      method: "instapay",
      adId,
      payerId: userId,
      description: "عمولة مكسب مسبقة — 0.5%",
    });
    if (result.transactionId) {
      setCommissionId(result.transactionId);
    }
    if (result.uniqueAmount) {
      setUniqueAmount(result.uniqueAmount);
    }

    setStep("instapay_confirm");
  };

  // ── Confirm InstaPay transfer → go to screenshot upload ──
  const handleConfirmInstapay = () => {
    setStep("screenshot_upload");
  };

  const handleSelectMethod = async (method: PaymentMethod) => {
    if (method === "instapay") {
      handleInstapayDirect();
      return;
    }

    setIsSubmitting(true);

    const result = await processPayment({
      amount: prePayAmount,
      method,
      adId,
      payerId: userId,
      description: "عمولة مكسب مسبقة — 0.5%",
    });

    setIsSubmitting(false);

    if (result.success) {
      if (result.transactionId) setCommissionId(result.transactionId);
      if (result.uniqueAmount) setUniqueAmount(result.uniqueAmount);
      // Manual methods → screenshot, Paymob → success
      if (method === "vodafone_cash") {
        setStep("screenshot_upload");
      } else {
        setStep("success");
      }
    }
  };

  // ── Success (pending verification) ──
  if (step === "success") {
    return (
      <div className="bg-gradient-to-b from-brand-gold-light to-white rounded-2xl p-6 text-center space-y-4 border-2 border-brand-gold/30">
        <div className="w-16 h-16 bg-brand-gold rounded-full flex items-center justify-center mx-auto">
          <Shield size={32} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-dark">تم تسجيل الدفع 📋</h3>
        <p className="text-sm text-gray-text">
          هنتحقق من التحويل خلال 24 ساعة وهنبعتلك إشعار تأكيد.
        </p>
        <div className="bg-brand-green-light rounded-xl p-3 space-y-1">
          <p className="text-xs text-dark font-semibold">بعد التأكيد هتحصل على:</p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-text">
            <span className="flex items-center gap-1">
              <Shield size={14} className="text-brand-green" />
              شارة موثوق
            </span>
            <span className="flex items-center gap-1">
              <Zap size={14} className="text-brand-gold" />
              أولوية ظهور
            </span>
          </div>
        </div>
        <Button fullWidth onClick={onPaid}>
          تمام
        </Button>
      </div>
    );
  }

  // ── Screenshot upload step ──
  if (step === "screenshot_upload") {
    return (
      <div className="bg-white rounded-2xl p-5 space-y-4 border-2 border-purple-200">
        <h3 className="text-lg font-bold text-dark text-center">📸 ارفع إثبات الدفع</h3>
        <p className="text-sm text-gray-text text-center">
          ارفع سكرين شوت من التحويل عشان نقدر نتحقق من الدفع
        </p>
        {uniqueAmount && (
          <div className="bg-gray-light rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text">المبلغ المطلوب:</p>
            <p className="text-lg font-bold text-dark" dir="ltr">{uniqueAmount.toFixed(2)} جنيه</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleScreenshotSelect} />
        {screenshotPreview ? (
          <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden border-2 border-brand-green">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotPreview} alt="إثبات الدفع" className="w-full max-h-48 object-contain bg-gray-50" />
              <button onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }} className="absolute top-2 start-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center">
                <X size={14} className="text-gray-text" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-brand-green hover:bg-brand-green-light/30 transition-all active:scale-[0.98]">
            <Upload size={24} className="text-brand-green" />
            <p className="text-sm font-semibold text-dark">اضغط لرفع السكرين شوت</p>
            <p className="text-xs text-gray-text">JPG أو PNG — حد أقصى 2 ميجا</p>
          </button>
        )}
        {paymentError && <p className="text-sm text-error text-center bg-red-50 rounded-xl py-2 px-3">{paymentError}</p>}
        <Button fullWidth size="lg" icon={<Shield size={18} />} onClick={handleSubmitWithScreenshot} disabled={!screenshotFile} isLoading={isUploading}>
          إرسال إثبات الدفع
        </Button>
        <button onClick={() => setStep("instapay_confirm")} className="w-full text-xs text-gray-text/70 text-center py-1">رجوع</button>
      </div>
    );
  }

  // ── InstaPay Confirmation — shows unique amount ──
  if (step === "instapay_confirm") {
    return (
      <div className="bg-white rounded-2xl p-5 space-y-4 border-2 border-purple-200">
        <div className="flex items-center justify-center gap-2">
          <InstaPayLogo size={32} />
          <h3 className="text-lg font-bold text-dark">تأكيد التحويل</h3>
        </div>

        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 text-center space-y-2">
          {uniqueAmount ? (
            <>
              <p className="text-sm text-gray-text">حوّل بالظبط:</p>
              <p className="text-2xl font-bold text-dark" dir="ltr">{uniqueAmount.toFixed(2)} جنيه</p>
              <p className="text-[11px] text-gray-text">المبلغ ده فريد عشان نقدر نتحقق من التحويل</p>
            </>
          ) : (
            <p className="text-sm text-gray-text">
              حوّلت <span className="font-bold text-dark">{prePayAmount} جنيه</span> بإنستاباي؟
            </p>
          )}
        </div>

        {/* Screenshot reminder */}
        <div className="bg-brand-gold-light rounded-xl p-3 flex items-start gap-2">
          <Camera size={16} className="text-brand-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-dark">
            <span className="font-bold">مهم:</span> بعد التحويل، صوّر سكرين شوت من شاشة التأكيد
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
            className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none text-sm text-center"
            dir="ltr"
          />
        </div>

        <Button
          fullWidth
          size="lg"
          icon={<Camera size={18} />}
          onClick={handleConfirmInstapay}
        >
          تم التحويل — ارفع السكرين شوت
        </Button>

        <button
          onClick={() => {
            if (instapayMethod?.paymentLink) {
              window.open(instapayMethod.paymentLink, "_blank");
            }
          }}
          className="w-full text-sm text-purple-600 font-semibold text-center py-2 hover:text-purple-700 transition-colors"
        >
          افتح إنستاباي تاني
        </button>

        <button
          onClick={onSkip}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-gray-text/70 hover:text-gray-text transition-colors"
        >
          <Clock size={12} />
          هحوّل بعدين
        </button>
      </div>
    );
  }

  // ── Other payment methods ──
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
          {/* InstaPay always first and highlighted */}
          {instapayMethod && (
            <button
              onClick={() => handleSelectMethod("instapay")}
              disabled={isSubmitting}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-l from-purple-50 to-blue-50 border-2 border-purple-200 hover:border-purple-400 active:scale-[0.98] transition-all text-start disabled:opacity-50"
            >
              <InstaPayLogo size={28} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-dark">إنستاباي</p>
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold">مُوصى</span>
                </div>
                <p className="text-[11px] text-gray-text">ادفع فوراً — أسرع وأسهل طريقة</p>
              </div>
              <ExternalLink size={16} className="text-purple-500 flex-shrink-0" />
            </button>
          )}

          {paymentMethods
            .filter((m) => m.id !== "instapay")
            .map((method) => (
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

  // ── Main offer — InstaPay-first ──
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

        {/* Primary CTA — InstaPay */}
        <Button
          fullWidth
          size="lg"
          onClick={handleInstapayDirect}
          className="!bg-purple-600 hover:!bg-purple-700 !text-white"
        >
          <span className="flex items-center gap-2 justify-center">
            <InstaPayLogo size={22} />
            ادفع {prePayAmount} جنيه بإنستاباي
          </span>
        </Button>

        {/* Secondary — other methods */}
        <button
          onClick={() => setStep("payment")}
          className="w-full text-sm text-gray-text text-center py-2 hover:text-dark transition-colors"
        >
          طرق دفع تانية
        </button>

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
