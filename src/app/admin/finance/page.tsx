"use client";

/**
 * /admin/finance — Finance department landing page
 *
 * For CFO. Shows revenue / subscription / package metrics and links to
 * the operational tools.
 */

import Link from "next/link";
import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  DollarSign,
  CreditCard,
  PieChart,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface FinanceKpis {
  revenue_mtd: number;
  active_subscriptions: number;
  pending_payments: number;
  arpu: number | null;
}

export default function FinancePage() {
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      try {
        // Placeholder — once a /api/admin/finance/stats exists we hook it.
        if (!aborted) {
          setKpis({
            revenue_mtd: 0,
            active_subscriptions: 0,
            pending_payments: 0,
            arpu: null,
          });
        }
      } catch {
        // ignore
      }
      if (!aborted) setLoading(false);
    }
    load();
    return () => {
      aborted = true;
    };
  }, []);

  const tools = [
    {
      href: "/admin/finance/revenue",
      icon: DollarSign,
      title: "$ الإيرادات",
      desc: "تتبع كل المعاملات الواردة",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      href: "/admin/finance/subscriptions",
      icon: CreditCard,
      title: "📦 الباقات",
      desc: "Silver / Gold / Diamond — العملاء النشطين",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      href: "/admin/finance/dashboard",
      icon: PieChart,
      title: "📊 لوحة المالية الكاملة",
      desc: "تفاصيل أعمق — تقارير، رسوم بيانية",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 المالية</h1>
          <p className="text-sm text-gray-500 mt-1">
            الإيرادات والباقات والاشتراكات
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="إيرادات الشهر"
          value={
            kpis ? `${kpis.revenue_mtd.toLocaleString()} ج` : "—"
          }
          icon="💵"
          loading={loading}
        />
        <KpiCard
          label="اشتراكات نشطة"
          value={kpis?.active_subscriptions ?? "—"}
          icon="📦"
          loading={loading}
        />
        <KpiCard
          label="مدفوعات معلقة"
          value={kpis?.pending_payments ?? "—"}
          icon="⏳"
          loading={loading}
        />
        <KpiCard
          label="ARPU"
          value={kpis?.arpu ? `${kpis.arpu} ج` : "—"}
          icon="📈"
          loading={loading}
        />
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3">الأدوات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 hover:shadow-md transition-all ${t.color}`}
            >
              <t.icon className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-bold mb-0.5">{t.title}</div>
                <div className="text-xs opacity-80">{t.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Empty state hint */}
      {kpis && kpis.revenue_mtd === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <div className="font-bold mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            لا توجد إيرادات بعد
          </div>
          <p className="text-xs text-blue-700">
            لم يتم تفعيل أي باقة مدفوعة. الباقات هتـ activate لما السماسرة
            يبدأوا يدفعوا (Vodafone Cash / InstaPay) أو لما Paymob يتركّب.
          </p>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 border bg-white border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {loading ? "..." : value}
      </div>
    </div>
  );
}
