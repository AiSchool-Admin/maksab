"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import { DollarSign, CreditCard, ShoppingBag, TrendingUp } from "lucide-react";

interface RevenueData {
  kpis: {
    totalRevenue: number;
    subscriptionRevenue: number;
    leadRevenue: number;
    auctionRevenue: number;
    activeSubscriptions: number;
  };
  recentTransactions: Array<{
    id: string;
    transaction_type: string;
    amount_egp: number;
    payment_status: string;
    description: string;
    created_at: string;
  }>;
  plans: Array<{
    code: string;
    name_ar: string;
    price_egp: number;
    max_listings: number;
  }>;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  subscription: { label: "اشتراك", emoji: "💳", color: "text-blue-600 bg-blue-50" },
  lead_purchase: { label: "Lead", emoji: "🎯", color: "text-green-600 bg-green-50" },
  auction_commission: { label: "عمولة مزاد", emoji: "🔨", color: "text-yellow-600 bg-yellow-50" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  completed: { label: "مكتمل", color: "bg-green-100 text-green-700" },
  pending: { label: "معلق", color: "bg-yellow-100 text-yellow-700" },
  failed: { label: "فشل", color: "bg-red-100 text-red-700" },
  refunded: { label: "مسترد", color: "bg-gray-100 text-gray-700" },
};

function formatPrice(n: number): string {
  return n.toLocaleString("en-US") + " ج";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default function RevenueDashboardPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/finance/revenue", {
          headers: getAdminHeaders(),
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // silent
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>مفيش بيانات إيرادات لسه</p>
      </div>
    );
  }

  const { kpis, recentTransactions } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">الإيرادات</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          إيرادات الشهر الحالي — اشتراكات + Leads + عمولات
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-l from-[#1B7A3D]/10 to-[#D4A843]/10 rounded-2xl p-5 border border-[#1B7A3D]/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-[#1B7A3D]" />
            <span className="text-xs text-[#6B7280]">إجمالي الشهر</span>
          </div>
          <p className="text-2xl font-bold text-[#1B7A3D]">{formatPrice(kpis.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-blue-500" />
            <span className="text-xs text-[#6B7280]">اشتراكات</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatPrice(kpis.subscriptionRevenue)}</p>
          <p className="text-[10px] text-[#6B7280] mt-1">{kpis.activeSubscriptions} مشترك نشط</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={18} className="text-green-500" />
            <span className="text-xs text-[#6B7280]">Leads</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatPrice(kpis.leadRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-yellow-500" />
            <span className="text-xs text-[#6B7280]">عمولات مزاد</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatPrice(kpis.auctionRevenue)}</p>
        </div>
      </div>

      {/* Revenue Distribution */}
      {kpis.totalRevenue > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-[#1A1A2E] mb-3">توزيع الإيرادات</h3>
          <div className="flex rounded-full overflow-hidden h-4">
            {kpis.subscriptionRevenue > 0 && (
              <div
                className="bg-blue-500"
                style={{ width: `${(kpis.subscriptionRevenue / kpis.totalRevenue) * 100}%` }}
                title={`اشتراكات: ${formatPrice(kpis.subscriptionRevenue)}`}
              />
            )}
            {kpis.leadRevenue > 0 && (
              <div
                className="bg-green-500"
                style={{ width: `${(kpis.leadRevenue / kpis.totalRevenue) * 100}%` }}
                title={`Leads: ${formatPrice(kpis.leadRevenue)}`}
              />
            )}
            {kpis.auctionRevenue > 0 && (
              <div
                className="bg-yellow-500"
                style={{ width: `${(kpis.auctionRevenue / kpis.totalRevenue) * 100}%` }}
                title={`مزادات: ${formatPrice(kpis.auctionRevenue)}`}
              />
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block" /> اشتراكات</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Leads</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full inline-block" /> مزادات</span>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-[#1A1A2E]">أحدث المعاملات</h3>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-[#6B7280] text-sm">
            مفيش معاملات لسه — هتظهر هنا لما أول بائع يشترك
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentTransactions.map((t) => {
              const typeInfo = TYPE_LABELS[t.transaction_type] || TYPE_LABELS.subscription;
              const statusInfo = STATUS_LABELS[t.payment_status] || STATUS_LABELS.pending;
              return (
                <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg w-8 h-8 flex items-center justify-center rounded-lg ${typeInfo.color}`}>
                      {typeInfo.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A2E]">{typeInfo.label}</p>
                      <p className="text-[10px] text-[#6B7280]">{t.description || "-"}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#1A1A2E]">{formatPrice(t.amount_egp)}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">{timeAgo(t.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
