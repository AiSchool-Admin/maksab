"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, DollarSign } from "lucide-react";
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
