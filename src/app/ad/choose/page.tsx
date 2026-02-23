"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Tag, ShoppingCart, ArrowLeft, Plus, Search } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import dynamic from "next/dynamic";

const CreateBuyRequest = dynamic(
  () => import("@/components/buy/CreateBuyRequest"),
  { ssr: false },
);

export default function ChooseActionPage() {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [showBuyRequest, setShowBuyRequest] = useState(false);

  const handleSell = async () => {
    const authed = await requireAuth();
    if (authed) router.push("/ad/create");
  };

  const handleBuy = async () => {
    const authed = await requireAuth();
    if (authed) setShowBuyRequest(true);
  };

  return (
    <main className="min-h-screen bg-white">
      <Header title="أضف إعلان" />

      <div className="px-4 pt-8 pb-6">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-green-light flex items-center justify-center mx-auto mb-3">
            <Plus size={32} className="text-brand-green" />
          </div>
          <h1 className="text-2xl font-bold text-dark mb-1">عايز تعمل إيه؟</h1>
          <p className="text-sm text-gray-text">اختار اللي يناسبك وابدأ في ثواني</p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Sell option */}
          <button
            onClick={handleSell}
            className="w-full text-start bg-gradient-to-l from-green-50 to-emerald-50 border-2 border-brand-green/30 rounded-2xl p-5 hover:border-brand-green/60 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-green flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-green/20 group-hover:shadow-brand-green/40 transition-shadow">
                <Tag size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-dark mb-1">
                  🏷️ عايز أبيع أو أبدّل
                </h2>
                <p className="text-sm text-gray-text leading-relaxed">
                  اعرض حاجتك للبيع أو المزاد أو التبديل.
                  أوصف المنتج وحدد السعر وهنوصلك للمشترين المهتمين
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-bold text-brand-green bg-white px-2 py-1 rounded-full border border-brand-green/20">💵 بيع نقدي</span>
                  <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-1 rounded-full border border-orange-200">🔨 مزاد</span>
                  <span className="text-[10px] font-bold text-purple-600 bg-white px-2 py-1 rounded-full border border-purple-200">🔄 تبديل</span>
                </div>
              </div>
            </div>
          </button>

          {/* Buy option */}
          <button
            onClick={handleBuy}
            className="w-full text-start bg-gradient-to-l from-amber-50 to-yellow-50 border-2 border-brand-gold/30 rounded-2xl p-5 hover:border-brand-gold/60 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-gold flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-gold/20 group-hover:shadow-brand-gold/40 transition-shadow">
                <ShoppingCart size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-dark mb-1">
                  🛒 عايز أشتري حاجة
                </h2>
                <p className="text-sm text-gray-text leading-relaxed">
                  قولنا بتدور على إيه وهنلاقيلك عروض مناسبة من البائعين.
                  البائعين هيتواصلوا معاك بعروضهم مباشرة
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-bold text-brand-gold bg-white px-2 py-1 rounded-full border border-brand-gold/20">🔍 توافق ذكي</span>
                  <span className="text-[10px] font-bold text-brand-gold bg-white px-2 py-1 rounded-full border border-brand-gold/20">📩 عروض فورية</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Browse buy requests CTA for sellers */}
        <div className="mt-6 text-center">
          <Link
            href="/buy-requests"
            className="inline-flex items-center gap-2 text-sm text-gray-text hover:text-brand-green transition-colors"
          >
            <Search size={14} />
            <span>بائع؟ تصفح طلبات الشراء وقدّم عرضك</span>
          </Link>
        </div>
      </div>

      {/* Buy Request Modal */}
      {showBuyRequest && (
        <CreateBuyRequest
          onClose={() => setShowBuyRequest(false)}
          onCreated={() => {
            setShowBuyRequest(false);
            router.push("/my-requests");
          }}
        />
      )}

      <BottomNavWithBadge />
    </main>
  );
}
