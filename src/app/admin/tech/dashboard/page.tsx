"use client";

import { useState } from "react";
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
  ExternalLink,
} from "lucide-react";

/* ── Mock Data ────────────────────────────────────────────────── */

interface ServiceStatus {
  name: string;
  nameAr: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: "online" | "degraded" | "offline";
  uptime: string;
  detail: string;
}

const services: ServiceStatus[] = [
  {
    name: "Vercel",
    nameAr: "Frontend",
    icon: Monitor,
    status: "online",
    uptime: "99.9%",
    detail: "آخر deploy: منذ 2 ساعة",
  },
  {
    name: "Railway",
    nameAr: "Workers",
    icon: Server,
    status: "online",
    uptime: "99.8%",
    detail: "Cron: كل 15 دقيقة",
  },
  {
    name: "Supabase",
    nameAr: "Database",
    icon: Database,
    status: "online",
    uptime: "99.9%",
    detail: "50K rows | 2GB",
  },
  {
    name: "WhatsApp API",
    nameAr: "واتساب",
    icon: MessageSquare,
    status: "online",
    uptime: "",
    detail: "متصل ✅",
  },
  {
    name: "Claude API",
    nameAr: "AI",
    icon: Brain,
    status: "online",
    uptime: "",
    detail: "متصل ✅",
  },
];

const statusColor: Record<string, { dot: string; bg: string; text: string }> = {
  online: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  degraded: { dot: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" },
  offline: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
};

const statusLabel: Record<string, string> = {
  online: "يعمل",
  degraded: "بطيء",
  offline: "متوقف",
};

interface SystemMetric {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const systemMetrics: SystemMetric[] = [
  { label: "CPU", value: "12%", icon: Cpu, color: "text-blue-600 bg-blue-50" },
  { label: "Memory", value: "340MB / 1GB", icon: HardDrive, color: "text-purple-600 bg-purple-50" },
  { label: "DB Connections", value: "8 / 60", icon: Database, color: "text-green-600 bg-green-50" },
  { label: "API Response", value: "120ms", icon: Activity, color: "text-orange-600 bg-orange-50" },
];

interface ErrorItem {
  type: "warning" | "critical";
  message: string;
  time: string;
}

const recentErrors: ErrorItem[] = [
  {
    type: "warning",
    message: "Supabase Edge Function timeout — get_recommendations (>5s)",
    time: "منذ 3 ساعات",
  },
  {
    type: "warning",
    message: "WhatsApp API rate limit — تم تجاوز 100 رسالة / دقيقة",
    time: "منذ 8 ساعات",
  },
];

/* ── Component ────────────────────────────────────────────────── */

export default function TechDashboardPage() {
  const [harvesterRunning, setHarvesterRunning] = useState(true);

  const criticalErrors = recentErrors.filter((e) => e.type === "critical");
  const warnings = recentErrors.filter((e) => e.type === "warning");

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Monitor size={24} className="text-[#1B7A3D]" />
            حالة النظام
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            مراقبة الخدمات والأداء — آخر تحديث: منذ دقيقة
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* ── Services Status Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((svc) => {
          const sc = statusColor[svc.status];
          return (
            <div
              key={svc.name}
              className="bg-white rounded-2xl border border-gray-200 p-4"
            >
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
                  <div className={`w-2.5 h-2.5 rounded-full ${sc.dot} animate-pulse`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                    {statusLabel[svc.status]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                {svc.uptime && (
                  <span>
                    Uptime: <span className="font-bold text-dark">{svc.uptime}</span>
                  </span>
                )}
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
            <div className={`w-2.5 h-2.5 rounded-full ${harvesterRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <span className={`text-xs font-medium ${harvesterRunning ? "text-green-700" : "text-gray-500"}`}>
              {harvesterRunning ? "يعمل" : "متوقف"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">نطاقات نشطة</p>
            <p className="text-xl font-bold text-dark">15</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">آخر حصاد</p>
            <p className="text-xl font-bold text-dark flex items-center justify-center gap-1">
              <Clock size={14} className="text-gray-400" />
              12 <span className="text-sm font-normal text-gray-text">دقيقة</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">إعلانات اليوم</p>
            <p className="text-xl font-bold text-[#1B7A3D]">2,700</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">أرقام مستخرجة</p>
            <p className="text-xl font-bold text-[#D4A843]">1,080</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>اليوم: 12 حصادة</span>
            <span className="text-gray-300">|</span>
            <span>0 أخطاء ✅</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHarvesterRunning(true)}
              disabled={harvesterRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                harvesterRunning
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              <Play size={12} />
              تشغيل
            </button>
            <button
              onClick={() => setHarvesterRunning(false)}
              disabled={!harvesterRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !harvesterRunning
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              <Pause size={12} />
              إيقاف
            </button>
            <Link
              href="/admin/tech/harvester"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <BarChart3 size={12} />
              تفاصيل
            </Link>
          </div>
        </div>
      </div>

      {/* ── Errors Section ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-dark mb-4">
          🛡️ الأخطاء والتحذيرات — آخر 24 ساعة
        </h3>

        {criticalErrors.length === 0 ? (
          <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3 mb-3">
            <CheckCircle2 size={18} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              لا توجد أخطاء حرجة ✅
            </span>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            {criticalErrors.map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-red-50 rounded-xl p-3"
              >
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{err.message}</p>
                  <p className="text-[11px] text-red-400 mt-0.5">{err.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">
              ⚠️ {warnings.length} تحذيرات
            </p>
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-yellow-50 rounded-xl p-3"
              >
                <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-700">{w.message}</p>
                  <p className="text-[11px] text-yellow-500 mt-0.5">{w.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── System Metrics ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {systemMetrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white rounded-2xl border border-gray-200 p-4"
          >
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
