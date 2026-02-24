"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Trash2,
  CheckCircle,
  Sparkles,
  Send,
  ChevronLeft,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { formatTimeAgo, formatPrice } from "@/lib/utils/format";
import {
  fetchMyBuyRequests,
  deleteBuyRequest,
  markFulfilled,
  getPurchaseTypeLabel,
  getStatusLabel,
  type BuyRequest,
} from "@/lib/buy-requests/buy-request-service";
import {
  getOffersForRequest,
  type BuyRequestOffer,
} from "@/lib/buy-requests/buy-request-offers-service";
import toast from "react-hot-toast";

export default function MyRequestsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<BuyRequest[]>([]);
  const [offersMap, setOffersMap] = useState<Record<string, BuyRequestOffer[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    const reqs = await fetchMyBuyRequests();
    setRequests(reqs);

    // Load offers for each request
    const oMap: Record<string, BuyRequestOffer[]> = {};
    await Promise.all(
      reqs.slice(0, 10).map(async (req) => {
        const offers = await getOffersForRequest(req.id);
        if (offers.length > 0) oMap[req.id] = offers;
      }),
    );
    setOffersMap(oMap);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteBuyRequest(id);
    if (ok) {
      toast.success("تم حذف الطلب");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("حصل مشكلة");
    }
  };

  const handleFulfill = async (id: string) => {
    const ok = await markFulfilled(id);
    if (ok) {
      toast.success("مبروك! تم تسجيل إن الطلب اتنفذ");
      loadData();
    } else {
      toast.error("حصل مشكلة");
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Header title="طلبات الشراء" />
        <div className="px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-light rounded-xl animate-pulse" />
          ))}
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/my-requests");
    }
  }, [authLoading, user, router]);

  if (!user) {
    return null;
  }

  const totalPendingOffers = Object.values(offersMap).flat().filter((o) => o.status === "pending").length;

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="طلبات الشراء" />

      {/* Summary banner */}
      {totalPendingOffers > 0 && (
        <div className="mx-4 mt-3 bg-gradient-to-l from-brand-green-light to-green-50 border border-brand-green/20 rounded-xl p-3">
          <p className="text-sm font-bold text-brand-green flex items-center gap-1.5">
            <Send size={16} />
            عندك {totalPendingOffers} عرض جديد من بائعين!
          </p>
          <p className="text-xs text-gray-text mt-0.5">اضغط على الطلب لمشاهدة العروض</p>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-light rounded-xl animate-pulse" />
          ))
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-dark mb-2">مفيش طلبات شراء</p>
            <p className="text-sm text-gray-text mb-4">
              عايز حاجة معينة؟ أضف طلب وهنلاقيلك بائعين
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-green"
            >
              ← رجوع للرئيسية
            </Link>
          </div>
        ) : (
          requests.map((req) => {
            const category = categoriesConfig.find((c) => c.id === req.categoryId);
            const purchaseLabel = getPurchaseTypeLabel(req.purchaseType);
            const statusLabel = getStatusLabel(req.status);
            const reqOffers = offersMap[req.id] || [];
            const pendingOffers = reqOffers.filter((o) => o.status === "pending");

            return (
              <div key={req.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                {/* Main card — links to detail */}
                <Link href={`/buy-requests/${req.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{category?.icon || "📦"}</span>
                      <span className="text-xs font-bold text-gray-text">{category?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusLabel.color}`}>
                        {statusLabel.label}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-dark mb-1">{req.title}</h3>
                  {req.description && (
                    <p className="text-xs text-gray-text line-clamp-2 mb-2">{req.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-gray-text">
                    <span>{purchaseLabel.emoji} {purchaseLabel.label}</span>
                    {req.budgetMax && (
                      <span className="font-bold text-brand-green">حتى {formatPrice(req.budgetMax)}</span>
                    )}
                    <span>{formatTimeAgo(req.createdAt)}</span>
                  </div>
                </Link>

                {/* Offers preview */}
                {pendingOffers.length > 0 && (
                  <Link
                    href={`/buy-requests/${req.id}`}
                    className="flex items-center justify-between px-4 py-2.5 bg-green-50 border-t border-green-100 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-brand-green" />
                      <p className="text-xs font-bold text-brand-green">
                        {pendingOffers.length} عرض جديد من بائعين
                      </p>
                    </div>
                    <ChevronLeft size={16} className="text-brand-green" />
                  </Link>
                )}

                {/* Actions */}
                {req.status === "active" && (
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => handleFulfill(req.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-brand-green hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle size={14} />
                      لقيت اللي عايزه
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-error hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
