"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import CommissionPrompt from "@/components/commission/CommissionPrompt";

interface MarkAsSoldButtonProps {
  adId: string;
  adTitle: string;
  price: number | null;
  userId: string;
  saleType: string;
  onMarkedSold?: () => void;
  variant?: "button" | "card";
}

export default function MarkAsSoldButton({
  adId,
  adTitle,
  price,
  userId,
  saleType,
  onMarkedSold,
  variant = "button",
}: MarkAsSoldButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [finalPrice, setFinalPrice] = useState(price ? String(price) : "");

  const soldLabel = saleType === "exchange" ? "تم التبديل" : "تم البيع";
  const newStatus = saleType === "exchange" ? "exchanged" : "sold";

  const handleMarkAsSold = async () => {
    setIsMarking(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(url, key);

      await supabase
        .from("ads")
        .update({ status: newStatus } as never)
        .eq("id", adId);

      setShowConfirm(false);

      // Show commission prompt if there's a transaction amount
      const transactionAmount = Number(finalPrice);
      if (transactionAmount > 0 && saleType !== "exchange") {
        setShowCommission(true);
      } else {
        onMarkedSold?.();
      }
    } catch {
      setIsMarking(false);
    }
  };

  const handleCommissionComplete = () => {
    setShowCommission(false);
    onMarkedSold?.();
  };

  if (variant === "card") {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full bg-brand-green-light border-2 border-brand-green border-dashed rounded-xl p-4 flex items-center gap-3 hover:bg-green-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-white" />
          </div>
          <div className="flex-1 text-start">
            <p className="text-sm font-bold text-brand-green-dark">
              الصفقة تمت؟ بلّغنا!
            </p>
            <p className="text-xs text-gray-text mt-0.5">
              علّم الإعلان كـ &quot;{soldLabel}&quot; وساعد المشترين التانيين
            </p>
          </div>
        </button>

        {/* Confirm dialog */}
        <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title={soldLabel}>
          <ConfirmContent
            saleType={saleType}
            soldLabel={soldLabel}
            price={price}
            finalPrice={finalPrice}
            setFinalPrice={setFinalPrice}
            isMarking={isMarking}
            onConfirm={handleMarkAsSold}
            onCancel={() => setShowConfirm(false)}
          />
        </Modal>

        {/* Commission prompt */}
        <Modal
          isOpen={showCommission}
          onClose={handleCommissionComplete}
          showCloseButton={false}
        >
          <CommissionPrompt
            adId={adId}
            adTitle={adTitle}
            transactionAmount={Number(finalPrice) || 0}
            userId={userId}
            onComplete={handleCommissionComplete}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green text-white text-xs font-semibold rounded-lg hover:bg-brand-green-dark transition-colors"
      >
        <CheckCircle size={14} />
        <span>{soldLabel}</span>
      </button>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title={soldLabel}>
        <ConfirmContent
          saleType={saleType}
          soldLabel={soldLabel}
          price={price}
          finalPrice={finalPrice}
          setFinalPrice={setFinalPrice}
          isMarking={isMarking}
          onConfirm={handleMarkAsSold}
          onCancel={() => setShowConfirm(false)}
        />
      </Modal>

      <Modal
        isOpen={showCommission}
        onClose={handleCommissionComplete}
        showCloseButton={false}
      >
        <CommissionPrompt
          adId={adId}
          adTitle={adTitle}
          transactionAmount={Number(finalPrice) || 0}
          userId={userId}
          onComplete={handleCommissionComplete}
        />
      </Modal>
    </>
  );
}

function ConfirmContent({
  saleType,
  soldLabel,
  price,
  finalPrice,
  setFinalPrice,
  isMarking,
  onConfirm,
  onCancel,
}: {
  saleType: string;
  soldLabel: string;
  price: number | null;
  finalPrice: string;
  setFinalPrice: (v: string) => void;
  isMarking: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-text">
        {saleType === "exchange"
          ? "هل تم التبديل فعلاً؟ الإعلان هيتعلم كـ \"تم التبديل\"."
          : "هل تمت الصفقة فعلاً؟ الإعلان هيتعلم كـ \"تم البيع\" ومش هيظهر تاني في نتائج البحث."}
      </p>

      {saleType !== "exchange" && (
        <div>
          <label className="text-sm font-semibold text-dark mb-1.5 block">
            سعر البيع الفعلي
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              placeholder={price ? String(price) : "السعر"}
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none text-lg text-center"
              dir="ltr"
            />
            <span className="text-sm font-semibold text-gray-text">جنيه</span>
          </div>
          <p className="text-xs text-gray-text mt-1">
            ده بيساعدنا نقدم أسعار أدق للمستخدمين التانيين
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={isMarking}
          className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-50"
        >
          {isMarking ? "جاري التحديث..." : `أيوا، ${soldLabel}`}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-light text-dark font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          لا، لسه
        </button>
      </div>
    </div>
  );
}
