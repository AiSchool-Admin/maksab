"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  submitOffer,
  getAdOffersSummary,
  type AdOffersSummary,
} from "@/lib/offers/offers-service";
import { formatPrice } from "@/lib/utils/format";
import toast from "react-hot-toast";

interface PriceOfferButtonProps {
  adId: string;
  sellerId: string;
  adTitle: string;
  currentPrice: number | null;
}

export default function PriceOfferButton({
  adId,
  sellerId,
  adTitle,
  currentPrice,
}: PriceOfferButtonProps) {
  const { requireAuth, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<AdOffersSummary | null>(null);

  useEffect(() => {
    getAdOffersSummary(adId).then(setSummary);
  }, [adId]);

  const handleOpenOffer = async () => {
    const authedUser = await requireAuth();
    if (!authedUser) return;
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const offerAmount = Number(amount);
    if (!offerAmount || offerAmount <= 0) {
      toast.error("أدخل مبلغ صحيح");
      return;
    }

    setIsSubmitting(true);
    const result = await submitOffer({
      adId,
      buyerId: user.id,
      sellerId,
      amount: offerAmount,
      message: message.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("تم إرسال عرض السعر بنجاح");
      setShowModal(false);
      setAmount("");
      setMessage("");
      // Refresh summary
      const updated = await getAdOffersSummary(adId);
      setSummary(updated);

      // Notify seller
      fetch("/api/notifications/on-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_offer",
          ad_id: adId,
          ad_title: adTitle,
          recipient_id: sellerId,
          sender_name: user.display_name || "مشتري",
          amount: offerAmount,
        }),
      }).catch(() => {});
    } else {
      toast.error(result.error || "حصل مشكلة، جرب تاني");
    }
  };

  const isOwnAd = user?.id === sellerId;

  return (
    <>
      {/* Offers summary badge on ad */}
      {summary && summary.totalOffers > 0 && (
        <div className="flex items-center gap-2 bg-brand-gold-light rounded-lg px-3 py-2 mb-2">
          <TrendingUp size={14} className="text-brand-gold" />
          <span className="text-xs font-semibold text-brand-gold">
            {summary.totalOffers} عرض سعر
          </span>
          {summary.highestOffer && (
            <span className="text-xs text-gray-text">
              — أعلى عرض: {formatPrice(summary.highestOffer)}
            </span>
          )}
        </div>
      )}

      {/* Offer button */}
      {!isOwnAd && (
        <button
          onClick={handleOpenOffer}
          className="flex items-center justify-center gap-3 w-full bg-brand-gold text-white rounded-xl px-4 py-4 hover:bg-brand-gold/90 active:scale-[0.98] transition-all shadow-md"
        >
          <DollarSign size={22} />
          <span className="text-lg font-bold">قدّم عرض سعر</span>
          {currentPrice && (
            <span className="text-xs text-white/70 me-auto">
              السعر المطلوب: {formatPrice(currentPrice)}
            </span>
          )}
        </button>
      )}

      {/* Offer Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="عرض سعر"
      >
        <div className="space-y-4">
          <div className="bg-gray-light rounded-xl p-3">
            <p className="text-[11px] text-gray-text mb-1">عرض سعر على:</p>
            <p className="text-sm font-bold text-dark">{adTitle}</p>
            {currentPrice && (
              <p className="text-sm text-brand-green font-semibold mt-1">
                السعر المطلوب: {formatPrice(currentPrice)}
              </p>
            )}
          </div>

          {/* Quick offer amounts */}
          {currentPrice && (
            <div>
              <p className="text-xs text-gray-text mb-2">عروض سريعة:</p>
              <div className="flex gap-2">
                {[0.9, 0.85, 0.8].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setAmount(String(Math.round(currentPrice * pct)))}
                    className="flex-1 border border-gray-light rounded-xl py-2 text-center hover:bg-gray-light transition-colors"
                  >
                    <p className="text-xs font-bold text-dark">
                      {formatPrice(Math.round(currentPrice * pct))}
                    </p>
                    <p className="text-[10px] text-gray-text">
                      {Math.round(pct * 100)}%
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom amount */}
          <div>
            <label className="text-sm font-semibold text-dark block mb-2">
              عرضك (جنيه)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="أدخل المبلغ"
              className="w-full border border-gray-light rounded-xl p-3 text-lg font-bold text-dark placeholder:text-gray-text/50 focus:outline-none focus:border-brand-green transition-colors"
              dir="ltr"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold text-dark block mb-2">
              رسالة للبائع (اختياري)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="مثال: مستعد للمقابلة النهارده..."
              className="w-full border border-gray-light rounded-xl p-3 text-sm text-dark placeholder:text-gray-text/50 resize-none focus:outline-none focus:border-brand-green transition-colors"
              rows={2}
              maxLength={200}
            />
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!amount || Number(amount) <= 0}
          >
            إرسال العرض
          </Button>
        </div>
      </Modal>
    </>
  );
}
