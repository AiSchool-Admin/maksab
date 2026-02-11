"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Check, X, MessageCircle, Phone } from "lucide-react";
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
  adTitle?: string;
  sellerId: string;
  currentUserId: string;
}

export default function OffersListSection({
  adId,
  adTitle,
  sellerId,
  currentUserId,
}: OffersListSectionProps) {
  const [offers, setOffers] = useState<PriceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [counterModal, setCounterModal] = useState<PriceOffer | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [chattingOfferId, setChattingOfferId] = useState<string | null>(null);
  const router = useRouter();

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

      // Find the offer to get buyer info
      const offer = offers.find((o) => o.id === offerId);
      if (offer) {
        fetch("/api/notifications/on-offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: action,
            ad_id: adId,
            ad_title: adTitle || "إعلان",
            recipient_id: offer.buyerId,
            sender_name: "البائع",
            amount: offer.amount,
          }),
        }).catch(() => {});
      }
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

      // Notify buyer about counter offer
      fetch("/api/notifications/on-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "countered",
          ad_id: adId,
          ad_title: adTitle || "إعلان",
          recipient_id: counterModal.buyerId,
          sender_name: "البائع",
          amount: counterModal.amount,
          counter_amount: Number(counterAmount),
        }),
      }).catch(() => {});

      setCounterModal(null);
      setCounterAmount("");
      setCounterMessage("");
      const updated = await getAdOffers(adId);
      setOffers(updated);
    } else {
      toast.error(result.error || "حصل مشكلة");
    }
  };

  const handleChatWithUser = async (offer: PriceOffer) => {
    setChattingOfferId(offer.id);
    try {
      const { findOrCreateConversation } = await import("@/lib/chat/chat-service");
      const conv = await findOrCreateConversation(adId);
      if (conv) {
        router.push(`/chat/${conv.id}`);
      } else {
        router.push("/chat");
      }
    } catch {
      toast.error("حصل مشكلة في فتح المحادثة");
    }
    setChattingOfferId(null);
  };

  const getWhatsAppUrl = (phone: string, offer: PriceOffer) => {
    const adUrl = typeof window !== "undefined" ? `${window.location.origin}/ad/${adId}` : "";
    const message = isSeller
      ? `مرحباً ${offer.buyerName}، بخصوص عرضك ${formatPrice(offer.amount)} على إعلاني في مكسب: ${adTitle || "إعلان"}\n${adUrl}`
      : `مرحباً، بخصوص عرضي ${formatPrice(offer.amount)} على إعلانك في مكسب: ${adTitle || offer.adTitle || "إعلان"}\n${adUrl}`;
    return `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`;
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

            {/* Contact buttons — seller contacts buyer, or buyer contacts seller */}
            <div className="flex gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleChatWithUser(offer)}
                disabled={chattingOfferId === offer.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-green text-white rounded-lg text-xs font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50"
              >
                <MessageCircle size={14} />
                {chattingOfferId === offer.id ? "جاري الفتح..." : "شات"}
              </button>

              {/* WhatsApp — show if the other party's phone is available */}
              {((isSeller && offer.buyerPhone) || (!isSeller && offer.sellerPhone)) && (
                <a
                  href={getWhatsAppUrl(
                    isSeller ? offer.buyerPhone! : offer.sellerPhone!,
                    offer,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#25D366] text-white rounded-lg text-xs font-semibold hover:bg-[#20BD5A] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  واتساب
                </a>
              )}

              {/* Call — show if the other party's phone is available */}
              {((isSeller && offer.buyerPhone) || (!isSeller && offer.sellerPhone)) && (
                <a
                  href={`tel:+2${isSeller ? offer.buyerPhone : offer.sellerPhone}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 text-dark rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  <Phone size={14} />
                </a>
              )}
            </div>
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
