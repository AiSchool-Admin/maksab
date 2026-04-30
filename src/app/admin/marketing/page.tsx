"use client";

/**
 * /admin/marketing — Department landing page
 *
 * Single entry point for marketing managers (CMO / content_editor).
 * Shows the metrics they care about + jump links to the day-to-day tools.
 */

import Link from "next/link";
import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  Wheat,
  Target,
  UserSearch,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface MarketingKpis {
  total_listings: number;
  total_sellers: number;
  alex_sellers: number;
  whales_count: number;
  recent_listings_24h: number;
}

export default function MarketingPage() {
  const [kpis, setKpis] = useState<MarketingKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      try {
        const headers = getAdminHeaders();
        // Pull whales summary (cheap — gives us most of what we need)
        const res = await fetch(
          "/api/admin/crm/whales?category=properties",
          { headers }
        );
        if (res.ok && !aborted) {
          const json = await res.json();
          setKpis({
            total_listings: json?.summary?.total_listings || 0,
            total_sellers: json?.summary?.total_sellers || 0,
            alex_sellers: json?.summary?.total_merchants || 0,
            whales_count: json?.summary?.top_20pct_merchant_count || 0,
            recent_listings_24h: 0, // populated below if separate endpoint exists
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
      href: "/admin/crm/harvester",
      icon: Wheat,
      title: "محرك الحصاد",
      desc: "حصاد البيانات من Dubizzle / AqarMap / SemsarMasr",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      href: "/admin/crm/whales?category=properties",
      icon: Target,
      title: "🐋 الحيتان (Pareto)",
      desc: "أعلى 20% من السماسرة — للتواصل الشخصي",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      href: "/admin/crm/sellers?category=properties",
      icon: UserSearch,
      title: "بائعو العقارات",
      desc: "كل سماسرة العقارات في الإسكندرية",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      href: "/admin/crm/sellers?category=vehicles",
      icon: UserSearch,
      title: "بائعو السيارات",
      desc: "كل سماسرة السيارات",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      href: "/admin/marketplace",
      icon: ShoppingBag,
      title: "بناء السوق",
      desc: "المراحل والأدوات لبناء واجهة السوق",
      color: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📈 التسويق
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            جذب البائعين الجدد عبر الحصاد والـ Pareto
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="إعلانات محصودة"
          value={kpis?.total_listings ?? "—"}
          icon="📦"
          loading={loading}
        />
        <KpiCard
          label="حسابات سماسرة"
          value={kpis?.total_sellers ?? "—"}
          icon="📞"
          loading={loading}
        />
        <KpiCard
          label="شركات الإسكندرية"
          value={kpis?.alex_sellers ?? "—"}
          icon="🏢"
          loading={loading}
        />
        <KpiCard
          label="الحيتان (Top 20%)"
          value={kpis?.whales_count ?? "—"}
          icon="🐋"
          loading={loading}
          highlight
        />
      </div>

      {/* Tools */}
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

      {/* Onboarding hint when DB is empty */}
      {kpis && kpis.total_listings === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <div className="font-bold mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            ابدأ هنا
          </div>
          <p className="text-xs text-blue-700">
            قاعدة البيانات فاضية. اضغط "محرك الحصاد" واسحب الـ Bookmarklet من
            هناك، ثم شغّله على Dubizzle / AqarMap / SemsarMasr لجمع أول دفعة.
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
  highlight,
}: {
  label: string;
  value: string | number;
  icon: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlight
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span>{icon}</span>
      </div>
      <div
        className={`text-2xl font-bold ${
          highlight ? "text-emerald-700" : "text-gray-900"
        }`}
      >
        {loading ? "..." : value}
      </div>
    </div>
  );
}
