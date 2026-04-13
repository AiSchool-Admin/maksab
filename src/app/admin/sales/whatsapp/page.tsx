"use client";

import { useState, useEffect, useCallback } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import Link from "next/link";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  TrendingUp,
  RefreshCw,
  Eye,
  Users,
  Zap,
  ArrowLeft,
} from "lucide-react";

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replied: number;
}

interface PipelineStats {
  phone_found: number;
  contacted_1: number;
  contacted_2: number;
  consent_given: number;
  registered: number;
  total: number;
}

interface RecentMessage {
  id: string;
  seller_name: string;
  phone: string;
  action: string;
  channel: string;
  notes: string;
  created_at: string;
  external_message_id: string | null;
}

export default function WhatsAppDashboard() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();

      // Fetch stats from outreach API
      const statsRes = await fetch("/api/admin/sales/outreach?tab=stats", { headers });
      const statsData = await statsRes.json();

      if (statsData.stats) {
        setStats({
          date: new Date().toLocaleDateString("ar-EG"),
          sent: statsData.stats.sentToday || 0,
          delivered: 0,
          read: 0,
          failed: 0,
          replied: statsData.stats.totalResponded || 0,
        });
      }

      // Fetch pipeline counts
      const pipelineRes = await fetch("/api/admin/sales/pipeline?view=funnel", { headers });
      const pipelineData = await pipelineRes.json();

      if (pipelineData) {
        setPipeline({
          phone_found: pipelineData.phone_found || 0,
          contacted_1: pipelineData.contacted_1 || pipelineData.contacted || 0,
          contacted_2: pipelineData.contacted_2 || 0,
          consent_given: pipelineData.consent_given || 0,
          registered: pipelineData.registered || 0,
          total: pipelineData.total || 0,
        });
      }

      // Check WhatsApp config
      const healthRes = await fetch("/api/admin/tech/status", { headers });
      const healthData = await healthRes.json();
      setIsConfigured(healthData.whatsapp_configured ?? null);

      // Fetch recent outreach logs
      const recentRes = await fetch("/api/admin/sales/outreach?tab=new&limit=1", { headers });
      const recentData = await recentRes.json();

      // Use the outreach contacts as recent activity proxy
      if (recentData.contacts) {
        setRecentMessages(
          recentData.contacts.slice(0, 10).map((c: Record<string, unknown>) => ({
            id: c.id,
            seller_name: c.name,
            phone: c.phone,
            action: c.pipelineStatus || "new",
            channel: "whatsapp_api",
            notes: "",
            created_at: c.lastOutreachAt || "",
            external_message_id: null,
          }))
        );
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards = stats
    ? [
        {
          label: "اتبعت النهاردة",
          value: stats.sent,
          icon: Send,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "إجمالي الردود",
          value: stats.replied,
          icon: MessageSquare,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "تم التسجيل",
          value: pipeline?.registered || 0,
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "مستنيين رسالة",
          value: pipeline?.phone_found || 0,
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
      ]
    : [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/sales/outreach"
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              لوحة واتساب
            </h1>
            <p className="text-sm text-gray-500">
              مراقبة الإرسال التلقائي والـ Pipeline
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Config status badge */}
          {isConfigured !== null && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isConfigured
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isConfigured ? "API متصل" : "API غير متصل"}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* WhatsApp not configured warning */}
      {isConfigured === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-2">
            واتساب مش متوصل بعد
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            محتاج تضيف الـ Environment Variables في Vercel + Railway:
          </p>
          <div className="bg-white rounded-lg p-3 text-xs font-mono space-y-1 text-gray-800">
            <div>WHATSAPP_PHONE_NUMBER_ID=...</div>
            <div>WHATSAPP_ACCESS_TOKEN=...</div>
            <div>WHATSAPP_BOT_NUMBER=...</div>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            حالياً الرسائل بتتسجل بس مش بتتبعت فعلياً (Simulation Mode)
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 border animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl p-4 border"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Funnel */}
      {pipeline && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1B7A3D]" />
            Pipeline الاستحواذ
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "عندهم تليفون",
                value: pipeline.phone_found,
                icon: Users,
                color: "bg-gray-200",
              },
              {
                label: "رسالة 1 اتبعتت",
                value: pipeline.contacted_1,
                icon: Send,
                color: "bg-blue-200",
              },
              {
                label: "رسالة 2 (Consent Link)",
                value: pipeline.contacted_2,
                icon: Eye,
                color: "bg-purple-200",
              },
              {
                label: "وافق (Consent)",
                value: pipeline.consent_given,
                icon: CheckCircle2,
                color: "bg-amber-200",
              },
              {
                label: "تم التسجيل",
                value: pipeline.registered,
                icon: Zap,
                color: "bg-green-200",
              },
            ].map((stage) => {
              const maxVal = Math.max(
                pipeline.phone_found,
                pipeline.contacted_1,
                pipeline.contacted_2,
                pipeline.consent_given,
                pipeline.registered,
                1
              );
              const pct = Math.max((stage.value / maxVal) * 100, 2);

              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <stage.icon className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{stage.label}</span>
                      <span className="font-bold text-gray-900">
                        {stage.value}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stage.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversion rate */}
          {pipeline.phone_found > 0 && pipeline.registered > 0 && (
            <div className="mt-4 pt-3 border-t text-center">
              <span className="text-sm text-gray-500">معدل التحويل: </span>
              <span className="font-bold text-[#1B7A3D]">
                {Math.round(
                  (pipeline.registered / pipeline.phone_found) * 100
                )}
                %
              </span>
              <span className="text-xs text-gray-400 mr-2">
                (من أول تليفون لحد التسجيل)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Automation Status */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          الأتمتة
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>رسالة 1 — أول تواصل</span>
            </div>
            <span className="text-gray-500">
              تلقائي لكل بائع جديد عنده تليفون
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>رسالة 2 — رابط الموافقة</span>
            </div>
            <span className="text-gray-500">بعد 48 ساعة تلقائي</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>رسالة 3 — تسجيل + Magic Link</span>
            </div>
            <span className="text-gray-500">
              بعد 36 ساعة — تسجيل تلقائي + إرسال
            </span>
          </div>
        </div>
      </div>

      {/* Daily Limit Info */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-bold mb-1">حدود الإرسال (Limited Access)</p>
        <p>
          250 محادثة/يوم مجاناً بدون Business Verification.
          {stats && stats.sent > 0 && (
            <span className="font-bold mr-1">
              استخدمت {stats.sent}/250 النهاردة.
            </span>
          )}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          لما تعمل Business Verification → 100,000 محادثة/يوم
        </p>
      </div>

      {/* Recent Activity */}
      {recentMessages.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-bold text-gray-900 mb-3">آخر النشاط</h2>
          <div className="space-y-2">
            {recentMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                <div className="flex items-center gap-2">
                  {msg.action === "sent" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : msg.action === "failed" ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-gray-800">
                    {msg.seller_name || "بائع"}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {msg.action === "sent"
                    ? "تم الإرسال"
                    : msg.action === "failed"
                    ? "فشل"
                    : msg.action || "جديد"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
