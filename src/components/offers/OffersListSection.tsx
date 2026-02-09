"use client";

import { useState, useEffect } from "react";
import { User, Check, X, MessageCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  getAdOffers,
  respondToOffer,
  getOfferStatusLabel,
  getOfferStatusColor,
  type PriceOffer,
} from "@/lib/offers/offers-service";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";
import toast from "react-hot-toast";

interface OffersListSectionProps {
  adId: string;
  sellerId: string;
  currentUserId: string;
}

export default function OffersListSection({
  adId,
  sellerId,
  currentUserId,
}: OffersListSectionProps) {
  const [offers, setOffers] = useState<PriceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [counterModal, setCounterModal] = useState<PriceOffer | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  const isSeller = currentUserId === sellerId;

  useEffect(() => {
    getAdOffers(adId).then((data) => {
      setOffers(data);
      setIsLoading(false);
    });
  }, [adId]);

  const handleRespond = async (offerId: string, action: "accepted" | "rejected") => {
    setIsResponding(true);
    const result = await respondToOffer({
      offerId,
      sellerId: currentUserId,
      action,
    });
    setIsResponding(false);

    if (result.success) {
      toast.success(action === "accepted" ? "تم قبول العرض" : "تم رفض العرض");
      const updated = await getAdOffers(adId);
      setOffers(updated);
    } else {
      toast.error(result.error || "حصل مشكلة");
    }
  };

  const handleCounter = async () => {
    if (!counterModal || !counterAmount) return;

    setIsResponding(true);
    const result = await respondToOffer({
      offerId: counterModal.id,
      sellerId: currentUserId,
      action: "countered",
      counterAmount: Number(counterAmount),
      counterMessage: counterMessage.trim() || undefined,
    });
    setIsResponding(false);

    if (result.success) {
      toast.success("تم إرسال العرض المضاد");
      setCounterModal(null);
      setCounterAmount("");
      setCounterMessage("");
      const updated = await getAdOffers(adId);
      setOffers(updated);
    } else {
      toast.error(result.error || "حصل مشكلة");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-gray-light rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (offers.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-dark">
          عروض الأسعار ({offers.length})
        </h3>

        {offers.map((offer) => (
          <div
            key={offer.id}
            className="border border-gray-light rounded-xl p-3 space-y-2"
          >
            {/* Offer header */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-green-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                {offer.buyerAvatar ? (
                  <img
                    src={offer.buyerAvatar}
                    alt={offer.buyerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={14} className="text-brand-green" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-dark">{offer.buyerName}</p>
                <p className="text-[11px] text-gray-text">
                  {formatTimeAgo(offer.createdAt)}
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getOfferStatusColor(offer.status)}`}
              >
                {getOfferStatusLabel(offer.status)}
              </span>
            </div>

            {/* Offer amount */}
            <div className="bg-gray-light rounded-lg px-3 py-2">
              <p className="text-lg font-bold text-brand-green">
                {formatPrice(offer.amount)}
              </p>
              {offer.message && (
                <p className="text-xs text-gray-text mt-1 flex items-start gap-1">
                  <MessageCircle size={12} className="mt-0.5 flex-shrink-0" />
                  {offer.message}
                </p>
              )}
            </div>

            {/* Counter offer display */}
            {offer.status === "countered" && offer.counterAmount && (
              <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                <p className="text-[11px] text-blue-600 mb-1">عرض مضاد من البائع:</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatPrice(offer.counterAmount)}
                </p>
                {offer.counterMessage && (
                  <p className="text-xs text-blue-600 mt-1">{offer.counterMessage}</p>
                )}
              </div>
            )}

            {/* Seller actions */}
            {isSeller && offer.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleRespond(offer.id, "accepted")}
                  isLoading={isResponding}
                  icon={<Check size={14} />}
                  className="flex-1"
                >
                  قبول
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCounterModal(offer);
                    setCounterAmount("");
                  }}
                  className="flex-1"
                >
                  عرض مضاد
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleRespond(offer.id, "rejected")}
                  isLoading={isResponding}
                  icon={<X size={14} />}
                  className="flex-1"
                >
                  رفض
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Counter offer modal */}
      <Modal
        isOpen={!!counterModal}
        onClose={() => setCounterModal(null)}
        title="عرض مضاد"
      >
        {counterModal && (
          <div className="space-y-4">
            <div className="bg-gray-light rounded-xl p-3">
              <p className="text-[11px] text-gray-text">عرض المشتري:</p>
              <p className="text-lg font-bold text-brand-green">
                {formatPrice(counterModal.amount)}
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-dark block mb-2">
                سعرك المقترح (جنيه)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="أدخل المبلغ"
                className="w-full border border-gray-light rounded-xl p-3 text-lg font-bold text-dark placeholder:text-gray-text/50 focus:outline-none focus:border-brand-green transition-colors"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-dark block mb-2">
                رسالة (اختياري)
              </label>
              <textarea
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                placeholder="مثال: أقل سعر ممكن..."
                className="w-full border border-gray-light rounded-xl p-3 text-sm text-dark placeholder:text-gray-text/50 resize-none focus:outline-none focus:border-brand-green transition-colors"
                rows={2}
              />
            </div>

            <Button
              fullWidth
              onClick={handleCounter}
              isLoading={isResponding}
              disabled={!counterAmount}
            >
              إرسال العرض المضاد
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
