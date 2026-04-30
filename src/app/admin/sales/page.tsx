"use client";

/**
 * /admin/sales — Department landing page
 *
 * For sales managers (Sales Manager / Sales Agent). Shows the
 * conversion-side metrics (contacted / interested / registered) plus
 * the queue of conversations Ahmed escalated to a human.
 */

import Link from "next/link";
import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  Mail,
  Inbox,
  UserCog,
  ClipboardCheck,
  RefreshCw,
  Rocket,
} from "lucide-react";

interface SalesKpis {
  contacted_today: number;
  registered_today: number;
  escalations_pending: number;
  daily_cap_remaining: number;
  daily_cap: number;
}

export default function SalesPage() {
  const [kpis, setKpis] = useState<SalesKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      try {
        const headers = getAdminHeaders();
        // Quota
        const [quotaRes, escRes] = await Promise.all([
          fetch("/api/admin/crm/whales/batch-send", { headers }),
          fetch("/api/admin/crm/escalations", { headers }),
        ]);
        const quota = quotaRes.ok ? await quotaRes.json() : null;
        const esc = escRes.ok ? await escRes.json() : null;
        if (!aborted) {
          setKpis({
            contacted_today: quota?.sent_today || 0,
            registered_today: 0, // placeholder — needs separate query
            escalations_pending: esc?.total || 0,
            daily_cap_remaining: quota?.remaining_today || 0,
            daily_cap: quota?.cap || 50,
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
      href: "/admin/sales/outreach?tab=ahmed",
      icon: Mail,
      title: "🏠 أحمد — عقارات",
      desc: "محرك مبيعات العقارات في الإسكندرية",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      href: "/admin/sales/outreach?tab=waleed",
      icon: Mail,
      title: "🚗 وليد — سيارات",
      desc: "محرك مبيعات السيارات",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      href: "/admin/crm/escalations",
      icon: Inbox,
      title: "📥 محتاج رد إنسان",
      desc: "محادثات Ahmed/Waleed المُحوّلة للبشر",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      href: "/admin/sales/crm",
      icon: UserCog,
      title: "Seller 360",
      desc: "صفحة شاملة لكل سمسار",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      href: "/admin/sales/templates",
      icon: ClipboardCheck,
      title: "📝 قوالب الرسائل",
      desc: "إدارة قوالب الـ outreach",
      color: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💼 المبيعات</h1>
          <p className="text-sm text-gray-500 mt-1">
            تحويل البائعين عبر Ahmed AI + escalations
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
          label="تواصلات اليوم"
          value={kpis?.contacted_today ?? "—"}
          icon="📨"
          loading={loading}
        />
        <KpiCard
          label="متبقي اليوم"
          value={
            kpis ? `${kpis.daily_cap_remaining}/${kpis.daily_cap}` : "—"
          }
          icon="🎯"
          loading={loading}
        />
        <KpiCard
          label="محتاج رد إنسان"
          value={kpis?.escalations_pending ?? "—"}
          icon="🚨"
          loading={loading}
          highlight={kpis ? kpis.escalations_pending > 0 : false}
        />
        <KpiCard
          label="مسجّل اليوم"
          value={kpis?.registered_today ?? "—"}
          icon="✅"
          loading={loading}
        />
      </div>

      {/* Quick action: start daily harvest */}
      <Link
        href="/admin/crm/whales?category=properties"
        className="block bg-gradient-to-l from-[#D4A843] to-[#B8860B] text-white rounded-xl p-5 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg">
              <Rocket className="w-5 h-5" />
              ابدأ حصاد اليوم
            </div>
            <div className="text-xs opacity-90 mt-1">
              Ahmed يبعت WhatsApp لأكبر N سمسار في الإسكندرية
            </div>
          </div>
          <div className="text-3xl opacity-50">←</div>
        </div>
      </Link>

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
          ? "bg-amber-50 border-amber-300"
          : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span>{icon}</span>
      </div>
      <div
        className={`text-2xl font-bold ${
          highlight ? "text-amber-700" : "text-gray-900"
        }`}
      >
        {loading ? "..." : value}
      </div>
    </div>
  );
}
