"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getUserOffers,
  withdrawOffer,
  getOfferStatusLabel,
  getOfferStatusColor,
  type PriceOffer,
} from "@/lib/offers/offers-service";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function MyOffersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [offers, setOffers] = useState<PriceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getUserOffers(user.id).then((data) => {
      setOffers(data);
      setIsLoading(false);
    });
  }, [user?.id]);

  const [chattingOfferId, setChattingOfferId] = useState<string | null>(null);

  const handleChatWithSeller = async (offer: PriceOffer) => {
    setChattingOfferId(offer.id);
    try {
      const { findOrCreateConversation } = await import("@/lib/chat/chat-service");
      const conv = await findOrCreateConversation(offer.adId);
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
    const adUrl = typeof window !== "undefined" ? `${window.location.origin}/ad/${offer.adId}` : "";
    const message = `مرحباً، بخصوص عرضي ${formatPrice(offer.amount)} على إعلانك في مكسب: ${offer.adTitle || "إعلان"}\n${adUrl}`;
    return `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleWithdraw = async (offerId: string) => {
    if (!user?.id) return;
    const result = await withdrawOffer(offerId, user.id);
    if (result.success) {
      toast.success("تم سحب العرض");
      const updated = await getUserOffers(user.id);
      setOffers(updated);
    } else {
      toast.error(result.error || "حصل مشكلة");
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Header title="عروض الأسعار" />
        <div className="px-4 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-light rounded-xl animate-pulse" />
          ))}
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  if (!user) {
    router.push("/login?redirect=/my-offers");
    return null;
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="عروض الأسعار" />

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-light rounded-xl animate-pulse" />
          ))
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={48} className="text-gray-text mx-auto mb-4" />
            <p className="text-lg font-bold text-dark mb-2">مفيش عروض أسعار</p>
            <p className="text-sm text-gray-text">
              لما تلاقي إعلان يعجبك، ابعت عرض سعر للبائع
            </p>
          </div>
        ) : (
          offers.map((offer) => (
            <Link
              key={offer.id}
              href={`/ad/${offer.adId}`}
              className="block border border-gray-light rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-dark truncate">
                    {offer.adTitle}
                  </p>
                  <p className="text-[11px] text-gray-text">
                    {formatTimeAgo(offer.createdAt)}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getOfferStatusColor(offer.status)}`}
                >
                  {getOfferStatusLabel(offer.status)}
                </span>
              </div>

              <div className="bg-gray-light rounded-lg px-3 py-2 mb-2">
                <p className="text-lg font-bold text-brand-green">
                  عرضك: {formatPrice(offer.amount)}
                </p>
              </div>

              {offer.status === "countered" && offer.counterAmount && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 mb-2 border border-blue-200">
                  <p className="text-sm font-bold text-blue-700">
                    عرض مضاد: {formatPrice(offer.counterAmount)}
                  </p>
                  {offer.counterMessage && (
                    <p className="text-xs text-blue-600">{offer.counterMessage}</p>
                  )}
                </div>
              )}

              {/* Contact seller buttons */}
              <div
                className="flex gap-2 pt-2 border-t border-gray-100"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <button
                  type="button"
                  onClick={() => handleChatWithSeller(offer)}
                  disabled={chattingOfferId === offer.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-green text-white rounded-lg text-xs font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                >
                  <MessageCircle size={14} />
                  {chattingOfferId === offer.id ? "جاري الفتح..." : "شات مع البائع"}
                </button>

                {offer.sellerPhone && (
                  <a
                    href={getWhatsAppUrl(offer.sellerPhone, offer)}
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

                {offer.sellerPhone && (
                  <a
                    href={`tel:+2${offer.sellerPhone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 text-dark rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>

              {offer.status === "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWithdraw(offer.id);
                  }}
                  className="text-error"
                >
                  سحب العرض
                </Button>
              )}
            </Link>
          ))
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
