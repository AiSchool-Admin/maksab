"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Eye,
  MessageCircle,
  ShoppingBag,
  TrendingUp,
  Heart,
  ExternalLink,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getSellerAnalytics,
  type SellerAnalyticsData,
  type ViewsTrendPoint,
} from "@/lib/analytics/seller-analytics";
import { formatTimeAgo } from "@/lib/utils/format";

export default function SellerAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<SellerAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getSellerAnalytics(user.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!isLoading && !user) {
    router.push("/");
    return null;
  }

  return (
    <main className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-1 text-gray-text hover:text-dark"
          >
            <ChevronRight size={24} />
          </button>
          <h1 className="text-lg font-bold text-dark flex-1">إحصائيات إعلاناتي</h1>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5">
        {loading || !data ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard
                icon={<Eye size={20} />}
                label="إجمالي المشاهدات"
                value={data.kpis.totalViews}
                color="text-blue-600"
                bgColor="bg-blue-50"
              />
              <KPICard
                icon={<MessageCircle size={20} />}
                label="الرسائل"
                value={data.kpis.totalMessages}
                color="text-purple-600"
                bgColor="bg-purple-50"
              />
              <KPICard
                icon={<ShoppingBag size={20} />}
                label="إعلاناتي"
                value={data.kpis.totalAds}
                subtitle={`${data.kpis.activeAds} نشط`}
                color="text-brand-green"
                bgColor="bg-brand-green-light"
              />
              <KPICard
                icon={<TrendingUp size={20} />}
                label="المبيعات"
                value={data.kpis.totalSales}
                color="text-amber-600"
                bgColor="bg-amber-50"
              />
            </div>

            {/* Views Chart */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-dark mb-3">المشاهدات — آخر 30 يوم</h3>
              <SimpleBarChart data={data.viewsTrend} />
            </div>

            {/* Top Ads Table */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-dark mb-3">أعلى الإعلانات أداءً</h3>
              {data.topAds.length === 0 ? (
                <p className="text-xs text-gray-text text-center py-4">
                  مفيش إعلانات لسه
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topAds.map((ad) => (
                    <Link
                      key={ad.id}
                      href={`/ad/${ad.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                        {ad.image ? (
                          <img
                            src={ad.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            📷
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-dark truncate group-hover:text-brand-green transition-colors">
                          {ad.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-text">
                          <span className="flex items-center gap-0.5">
                            <Eye size={10} /> {ad.views}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Heart size={10} /> {ad.favorites}
                          </span>
                          <span>{formatTimeAgo(ad.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          ad.status === "active"
                            ? "bg-green-50 text-green-600"
                            : ad.status === "sold"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-gray-100 text-gray-text"
                        }`}>
                          {ad.status === "active" ? "نشط" : ad.status === "sold" ? "مباع" : "منتهي"}
                        </span>
                      </div>
                      <ExternalLink size={14} className="text-gray-300 group-hover:text-brand-green transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-brand-green-light rounded-2xl p-4">
              <h4 className="text-xs font-bold text-dark mb-2">نصائح لزيادة المشاهدات</h4>
              <div className="space-y-1.5 text-xs text-gray-text">
                <p>• أضف صور واضحة وجذابة — الإعلانات بصور تحصل 3x مشاهدات</p>
                <p>• حدّث إعلانك كل كام يوم عشان يرجع يظهر في الأول</p>
                <p>• استخدم كلمات مفتاحية في العنوان زي الماركة والموديل</p>
                <p>• شارك إعلاناتك على واتساب وفيسبوك</p>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  subtitle,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-dark">{value.toLocaleString("en-US")}</p>
      <p className="text-[10px] text-gray-text mt-0.5">{label}</p>
      {subtitle && (
        <p className={`text-[10px] font-bold ${color} mt-0.5`}>{subtitle}</p>
      )}
    </div>
  );
}

function SimpleBarChart({ data }: { data: ViewsTrendPoint[] }) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="flex items-end gap-[2px] h-32">
      {data.map((point, i) => {
        const height = Math.max(2, (point.views / maxViews) * 100);
        const isToday = i === data.length - 1;

        return (
          <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t transition-all ${
                isToday ? "bg-brand-green" : "bg-brand-green/30"
              }`}
              style={{ height: `${height}%` }}
              title={`${point.date}: ${point.views} مشاهدة`}
            />
            {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
              <span className="text-[8px] text-gray-text whitespace-nowrap">
                {point.date.slice(5)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse mb-2" />
            <div className="h-8 w-20 bg-gray-100 rounded animate-pulse mb-1" />
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-32 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
