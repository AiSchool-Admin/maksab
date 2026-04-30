"use client";

/**
 * /admin/cs — Customer Service department landing page
 *
 * For CS managers/agents (Sara). Shows the conversation queue, response
 * SLA, and links to the day-to-day tools.
 */

import Link from "next/link";
import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  Headphones,
  Flag,
  ClipboardCheck,
  BarChart3,
  Settings,
  RefreshCw,
} from "lucide-react";

interface CsKpis {
  open_conversations: number;
  pending_escalations: number;
  response_avg_minutes: number | null;
  resolved_today: number;
}

export default function CsPage() {
  const [kpis, setKpis] = useState<CsKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      try {
        // Placeholder — once a /api/admin/cs/stats exists we hook it here.
        if (!aborted) {
          setKpis({
            open_conversations: 0,
            pending_escalations: 0,
            response_avg_minutes: null,
            resolved_today: 0,
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
      href: "/admin/cs/conversations",
      icon: Headphones,
      title: "💬 المحادثات",
      desc: "كل محادثات سارة مع العملاء",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      href: "/admin/cs/escalations",
      icon: Flag,
      title: "🚨 تصعيدات الدعم",
      desc: "المحادثات اللي محتاجة قرار من المدير",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      href: "/admin/cs/templates",
      icon: ClipboardCheck,
      title: "📝 قوالب الرد",
      desc: "ردود جاهزة للأسئلة المتكررة",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      href: "/admin/cs/reports",
      icon: BarChart3,
      title: "📊 التقارير",
      desc: "إحصائيات الأداء + معدلات الرد",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      href: "/admin/cs/settings",
      icon: Settings,
      title: "⚙️ إعدادات سارة",
      desc: "تخصيص الـ AI + ساعات العمل",
      color: "bg-gray-50 text-gray-700 border-gray-200",
    },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💚 خدمة العملاء</h1>
          <p className="text-sm text-gray-500 mt-1">
            دعم العملاء المسجلين عبر سارة + الفريق
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
          label="محادثات مفتوحة"
          value={kpis?.open_conversations ?? "—"}
          icon="💬"
          loading={loading}
        />
        <KpiCard
          label="تصعيدات معلقة"
          value={kpis?.pending_escalations ?? "—"}
          icon="🚨"
          loading={loading}
          highlight={kpis ? kpis.pending_escalations > 0 : false}
        />
        <KpiCard
          label="متوسط الرد (دقايق)"
          value={kpis?.response_avg_minutes ?? "—"}
          icon="⏱️"
          loading={loading}
        />
        <KpiCard
          label="حُلّت اليوم"
          value={kpis?.resolved_today ?? "—"}
          icon="✅"
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
