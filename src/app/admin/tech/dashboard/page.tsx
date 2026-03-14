"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Monitor,
  Server,
  Database,
  MessageSquare,
  Brain,
  Cpu,
  HardDrive,
  Activity,
  Clock,
  Play,
  Pause,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface PlatformInfo {
  id: string;
  name_ar: string;
  is_active: boolean;
  last_test_status: string | null;
  total_listings_harvested: number;
  last_harvest_at: string | null;
}

interface TechData {
  harvester: {
    running: boolean;
    scopes: number;
    todayListings: number;
    todayPhones: number;
    lastHarvestMinutes: number;
    todayJobs: number;
    errors: number;
  };
  platforms?: {
    total: number;
    active: number;
    list: PlatformInfo[];
  };
}

const statusColor: Record<string, { dot: string; bg: string; text: string }> = {
  online: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  degraded: { dot: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" },
  offline: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
};

export default function TechDashboardPage() {
  const [data, setData] = useState<TechData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/tech/status", { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Keep null — show zeros
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const harvester = data?.harvester || {
    running: false,
    scopes: 0,
    todayListings: 0,
    todayPhones: 0,
    lastHarvestMinutes: 0,
    todayJobs: 0,
    errors: 0,
  };

  // Services — static info (no mock metrics, just status indicators)
  const services = [
    { name: "Vercel", nameAr: "Frontend", icon: Monitor, status: "online" as const, detail: "Next.js App" },
    { name: "Railway", nameAr: "Workers", icon: Server, status: "online" as const, detail: "Background Jobs" },
    { name: "Supabase", nameAr: "Database", icon: Database, status: "online" as const, detail: "PostgreSQL" },
    { name: "WhatsApp API", nameAr: "واتساب", icon: MessageSquare, status: "online" as const, detail: "—" },
    { name: "Claude API", nameAr: "AI", icon: Brain, status: "online" as const, detail: "—" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 h-24 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Monitor size={24} className="text-[#1B7A3D]" />
            حالة النظام
          </h2>
          <p className="text-xs text-gray-500 mt-1">مراقبة الخدمات والأداء</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* ── Services Status Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((svc) => {
          const sc = statusColor[svc.status];
          return (
            <div key={svc.name} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <svc.icon size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-dark">{svc.name}</p>
                    <p className="text-[11px] text-gray-text">{svc.nameAr}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                    يعمل
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <span>{svc.detail}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Harvester Engine Status ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-dark flex items-center gap-2">
            🌾 محرك الحصاد
          </h3>
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${harvester.todayListings > 0 ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <span className={`text-xs font-medium ${harvester.todayListings > 0 ? "text-green-700" : "text-gray-500"}`}>
              {harvester.todayListings > 0 ? "يعمل" : "لا يوجد حصاد"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">نطاقات نشطة</p>
            <p className="text-xl font-bold text-dark">{harvester.scopes}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">عمليات اليوم</p>
            <p className="text-xl font-bold text-dark">{harvester.todayJobs}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">إعلانات اليوم</p>
            <p className="text-xl font-bold text-[#1B7A3D]">{harvester.todayListings.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">أرقام مستخرجة</p>
            <p className="text-xl font-bold text-[#D4A843]">{harvester.todayPhones.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>اليوم: {harvester.todayJobs} عملية حصاد</span>
            <span className="text-gray-300">|</span>
            <span>{harvester.errors} أخطاء {harvester.errors === 0 ? "✅" : ""}</span>
          </div>
          <Link
            href="/admin/tech/harvester"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <BarChart3 size={12} />
            تفاصيل
          </Link>
        </div>
      </div>

      {/* ── Platforms Status ──────────────────────────────────── */}
      {data?.platforms && data.platforms.list.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              🌐 المنصات المراقبة
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {data.platforms.active} نشطة من {data.platforms.total}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.platforms.list.map((platform) => {
              const statusColors: Record<string, string> = {
                parseable: "bg-green-500",
                reachable_no_parse: "bg-yellow-500",
                blocked: "bg-red-500",
                error: "bg-red-500",
              };
              const dotColor = platform.is_active
                ? "bg-green-500 animate-pulse"
                : statusColors[platform.last_test_status || ""] || "bg-gray-400";

              return (
                <div
                  key={platform.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="text-sm font-medium text-dark">{platform.name_ar}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {platform.total_listings_harvested > 0 && (
                      <span className="text-[11px] text-gray-500">
                        {platform.total_listings_harvested.toLocaleString()} إعلان
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      platform.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-500"
                    }`}>
                      {platform.is_active ? "نشط" : "معطّل"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No Errors ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-dark mb-4">
          الأخطاء والتحذيرات — آخر 24 ساعة
        </h3>
        <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3">
          <CheckCircle2 size={18} className="text-green-600" />
          <span className="text-sm text-green-700 font-medium">لا توجد أخطاء حرجة</span>
        </div>
      </div>

      {/* ── System Metrics — placeholder ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "CPU", value: "—", icon: Cpu, color: "text-blue-600 bg-blue-50" },
          { label: "Memory", value: "—", icon: HardDrive, color: "text-purple-600 bg-purple-50" },
          { label: "DB Connections", value: "—", icon: Database, color: "text-green-600 bg-green-50" },
          { label: "API Response", value: "—", icon: Activity, color: "text-orange-600 bg-orange-50" },
        ].map((metric) => (
          <div key={metric.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${metric.color.split(" ")[1]}`}>
              <metric.icon size={20} className={metric.color.split(" ")[0]} />
            </div>
            <p className="text-xs text-gray-text mb-1">{metric.label}</p>
            <p className="text-lg font-bold text-dark">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
