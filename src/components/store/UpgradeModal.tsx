"use client";

import { useState } from "react";
import { X, Copy, Check, Smartphone } from "lucide-react";
import type { SubscriptionPlan } from "@/types";
import { PLANS, PAYMENT_METHODS, type PaymentMethodId } from "@/lib/stores/subscription-plans";
import Button from "@/components/ui/Button";
import InstaPayLogo from "@/components/ui/InstaPayLogo";
import QRCodeDisplay from "@/components/ui/QRCodeDisplay";

interface UpgradeModalProps {
  targetPlan: SubscriptionPlan;
  billingCycle: "monthly" | "yearly";
  onConfirm: (paymentMethod: PaymentMethodId, paymentRef: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function UpgradeModal({
  targetPlan,
  billingCycle,
  onConfirm,
  onClose,
  isLoading,
}: UpgradeModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const plan = PLANS[targetPlan];
  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.price;

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canConfirm = selectedMethod && paymentRef.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-dark">
            ترقية لباقة {plan.name} {plan.icon}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Price summary */}
          <div className={`rounded-xl p-4 ${plan.bgColor} border ${plan.borderColor}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark font-semibold">
                باقة {plan.name}
              </span>
              <span className="text-lg font-bold text-dark">
                {price.toLocaleString("ar-EG")} جنيه
              </span>
            </div>
            <p className="text-xs text-gray-text mt-1">
              {billingCycle === "yearly" ? "سنوياً" : "شهرياً"}
              {billingCycle === "yearly" && (
                <span className="text-brand-green mr-1">
                  (وفّر {Math.round(((plan.price * 12 - plan.yearlyPrice) / (plan.price * 12)) * 100)}%)
                </span>
              )}
            </p>
          </div>

          {/* Payment method selection */}
          <div>
            <h3 className="text-sm font-bold text-dark mb-2">
              اختار طريقة الدفع
            </h3>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <div key={method.id}>
                  <button
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-colors ${
                      selectedMethod === method.id
                        ? method.id === "instapay"
                          ? "border-purple-400 bg-gradient-to-l from-purple-50 to-blue-50"
                          : "border-brand-green bg-brand-green-light"
                        : "border-gray-light hover:border-gray-300"
                    }`}
                  >
                    {method.id === "instapay" ? (
                      <InstaPayLogo size={28} />
                    ) : (
                      <span className="text-xl">{method.icon}</span>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-dark">
                        {method.label}
                      </p>
                      <p className="text-xs text-gray-text">{method.number}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <Check size={16} className="text-brand-green" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(method.number, method.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      title="نسخ"
                    >
                      {copiedId === method.id ? (
                        <Check size={14} className="text-brand-green" />
                      ) : (
                        <Copy size={14} className="text-gray-text" />
                      )}
                    </button>
                  </button>
                  {/* InstaPay QR code — scan with InstaPay app */}
                  {method.id === "instapay" && selectedMethod === "instapay" && "link" in method && (
                    <div className="mt-2 bg-gradient-to-bl from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col items-center gap-2">
                        <QRCodeDisplay value={method.link} size={160} />
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
                          <Smartphone size={14} />
                          <span>امسح الكود من تطبيق إنستاباي</span>
                        </div>
                      </div>
                      <div className="bg-white/70 rounded-lg p-2.5 text-start space-y-1">
                        <p className="text-[11px] text-gray-text">1. افتح تطبيق إنستاباي على موبايلك</p>
                        <p className="text-[11px] text-gray-text">2. اختار &quot;مسح QR&quot; من الشاشة الرئيسية</p>
                        <p className="text-[11px] text-gray-text">3. وجّه الكاميرا على الكود</p>
                        <p className="text-[11px] text-gray-text">4. اكتب المبلغ: <span className="font-bold text-dark">{price.toLocaleString("ar-EG")} جنيه</span> وأكّد</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment reference */}
          {selectedMethod && (
            <div>
              <label className="text-xs text-gray-text mb-1 block">
                رقم العملية / المرجع *
              </label>
              <input
                type="text"
                placeholder="ادخل رقم العملية بعد التحويل"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
                dir="ltr"
              />
              <p className="text-[10px] text-gray-text mt-1">
                حوّل المبلغ الأول ثم اكتب رقم العملية هنا للتأكيد
              </p>
            </div>
          )}

          {/* Confirm button */}
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              if (selectedMethod && paymentRef.trim()) {
                onConfirm(selectedMethod, paymentRef.trim());
              }
            }}
            disabled={!canConfirm}
            isLoading={isLoading}
          >
            تأكيد الترقية — {price.toLocaleString("ar-EG")} جنيه
          </Button>

          <p className="text-[10px] text-gray-text text-center leading-relaxed">
            بالضغط على تأكيد، أنت موافق على شروط الاستخدام.
            <br />
            هيتم تفعيل الباقة بعد التحقق من الدفع.
          </p>
        </div>
      </div>
    </div>
  );
}
