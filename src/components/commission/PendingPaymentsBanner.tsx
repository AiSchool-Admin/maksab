"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronLeft, DollarSign } from "lucide-react";
import { getPendingPaymentsCount } from "@/lib/payment/payment-history";

interface PendingPaymentsBannerProps {
  userId: string;
}

/**
 * Shows a banner on the profile page when user has pending commission payments.
 * Acts as a gentle reminder (8.4) to complete or upload proof of payment.
 */
export default function PendingPaymentsBanner({ userId }: PendingPaymentsBannerProps) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (userId) {
      getPendingPaymentsCount(userId).then(setCount);
    }
  }, [userId]);

  if (count === 0) return null;

  return (
    <button
      onClick={() => router.push("/profile/payments")}
      className="w-full bg-gradient-to-l from-brand-gold-light to-amber-50 border border-brand-gold/30 rounded-xl p-4 flex items-center gap-3 text-start hover:border-brand-gold/50 transition-colors active:scale-[0.99]"
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <DollarSign size={20} className="text-brand-gold" />
        </div>
        <div className="absolute -top-1 -end-1 w-5 h-5 bg-error rounded-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">{count}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-dark">
          {count === 1 ? "عندك دفعة معلقة" : `عندك ${count} دفعات معلقة`}
        </p>
        <p className="text-xs text-gray-text mt-0.5">
          اضغط عشان ترفع إثبات الدفع أو تتحقق من الحالة
        </p>
      </div>
      <ChevronLeft size={16} className="text-brand-gold flex-shrink-0" />
    </button>
  );
}
