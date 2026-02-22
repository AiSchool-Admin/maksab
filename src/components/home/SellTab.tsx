"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Eye,
  MessageCircle,
  TrendingUp,
  ChevronLeft,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchMyAds, getStatusLabel, type MyAd } from "@/lib/my-ads/my-ads-service";
import { formatTimeAgo } from "@/lib/utils/format";

export default function SellTab() {
  const { user, requireAuth } = useAuth();
  const [myAds, setMyAds] = useState<MyAd[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchMyAds()
        .then(setMyAds)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const activeAds = myAds.filter((a) => a.status === "active");
  const totalViews = myAds.reduce((s, a) => s + a.viewsCount, 0);
  const totalFavs = myAds.reduce((s, a) => s + a.favoritesCount, 0);

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Big CTA: Add Ad */}
      <Link
        href="/ad/create"
        className="block"
      >
        <div className="bg-gradient-to-l from-brand-green to-emerald-600 rounded-2xl p-5 text-white text-center active:scale-[0.98] transition-transform shadow-lg shadow-brand-green/20">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <p className="text-lg font-bold">أضف إعلانك الآن</p>
          <p className="text-sm opacity-90 mt-1">بيع أي حاجة في 3 خطوات بس</p>
        </div>
      </Link>

      {/* Not logged in */}
      {!user && (
        <div className="bg-brand-gold-light rounded-2xl p-4 text-center">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm font-bold text-dark mb-1">سجّل دخولك وابدأ البيع</p>
          <p className="text-xs text-gray-text mb-3">انشر إعلاناتك ووصّل لآلاف المشترين</p>
          <button
            onClick={async () => { await requireAuth(); }}
            className="px-5 py-2.5 bg-brand-green text-white font-bold rounded-xl text-sm"
          >
            سجّل دخولك
          </button>
        </div>
      )}

      {/* Logged in: Quick stats */}
      {user && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <Eye size={18} className="text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-dark">{totalViews}</p>
              <p className="text-[10px] text-gray-text">مشاهدة</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <TrendingUp size={18} className="text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-dark">{activeAds.length}</p>
              <p className="text-[10px] text-gray-text">إعلان نشط</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <MessageCircle size={18} className="text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-dark">{totalFavs}</p>
              <p className="text-[10px] text-gray-text">مفضلة</p>
            </div>
          </div>

          {/* Analytics link */}
          <Link
            href="/my-ads/analytics"
            className="flex items-center justify-between bg-gray-light rounded-xl p-3 hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-green" />
              <span className="text-sm font-bold text-dark">إحصائيات إعلاناتي</span>
            </div>
            <ChevronLeft size={16} className="text-gray-text" />
          </Link>

          {/* My Active Ads */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeAds.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-dark">إعلاناتي النشطة</h3>
                <Link href="/my-ads" className="text-xs font-bold text-brand-green">
                  عرض الكل ←
                </Link>
              </div>
              <div className="space-y-2">
                {activeAds.slice(0, 5).map((ad) => {
                  const statusInfo = getStatusLabel(ad.status);
                  return (
                    <Link
                      key={ad.id}
                      href={`/ad/${ad.id}`}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2.5 hover:shadow-sm transition-shadow"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                        {ad.image ? (
                          <img src={ad.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">📷</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-dark truncate">{ad.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-text">
                          <span className="flex items-center gap-0.5">
                            <Eye size={10} /> {ad.viewsCount}
                          </span>
                          <span>{formatTimeAgo(ad.createdAt)}</span>
                        </div>
                      </div>
                      {ad.price && (
                        <span className="text-xs font-bold text-brand-green flex-shrink-0">
                          {ad.price.toLocaleString("en-US")} ج
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm text-gray-text">مفيش إعلانات نشطة لسه</p>
              <p className="text-xs text-gray-text mt-0.5">أضف أول إعلان ليك!</p>
            </div>
          )}

          {/* Selling Tips */}
          <div className="bg-brand-gold-light rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-dark mb-1.5">نصائح لبيع أسرع</h4>
            <div className="space-y-1 text-xs text-gray-text">
              <p>• صوّر المنتج من أكتر من زاوية</p>
              <p>• حط سعر منافس — شوف أسعار السوق الأول</p>
              <p>• اكتب تفاصيل واضحة في الوصف</p>
              <p>• رد على الرسائل بسرعة</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
