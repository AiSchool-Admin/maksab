"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Megaphone, ArrowRight, Users, Send, CheckCircle, MessageCircle,
  Eye, Clock, Play, Pause, StopCircle, X, Target, AlertTriangle,
  TrendingUp, RefreshCw, Rocket
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  target_filters: Record<string, unknown>;
  messages: Array<{ channel: string; content: string; sequence?: number; delay_hours?: number }>;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  daily_send_limit: number;
  hourly_send_limit: number;
  send_window_start: string;
  send_window_end: string;
  max_messages_per_customer_per_week: number;
  stats: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface ConversationEntry {
  id: string;
  customer_id: string;
  channel: string;
  content: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  crm_customers?: { full_name: string; phone: string };
}

const TYPE_LABELS: Record<string, string> = {
  acquisition: "اكتساب", activation: "تفعيل", engagement: "تفاعل",
  retention: "احتفاظ", reactivation: "إعادة تنشيط", upsell: "ترقية",
  commission: "عمولة", promotion: "عرض", referral: "إحالة",
  announcement: "إعلان", welcome: "ترحيب", onboarding: "تفعيل",
  feedback: "تقييم",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", scheduled: "مجدولة", active: "نشطة",
  paused: "متوقفة", completed: "مكتملة", cancelled: "ملغاة",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700", paused: "bg-amber-100 text-amber-700",
  completed: "bg-purple-100 text-purple-700", cancelled: "bg-red-100 text-red-700",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "واتساب", sms: "SMS", email: "بريد إلكتروني",
  in_app: "داخل التطبيق",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "messages" | "recipients">("overview");

  const fetchCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/campaigns?id=${id}`, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        const campaigns = data.campaigns || [];
        if (campaigns.length > 0) setCampaign(campaigns[0]);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    try {
      await fetch("/api/admin/crm/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ id: campaign.id, status: newStatus }),
      });
      fetchCampaign();
    } catch { /* ignore */ }
  };

  const handleLaunch = async () => {
    if (!campaign || !confirm("هل أنت متأكد من إطلاق الحملة؟")) return;
    try {
      const res = await fetch("/api/admin/crm/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`تم الإطلاق! مستهدفين: ${data.targeted}، مرسلة: ${data.sent}، فشل: ${data.failed}`);
        fetchCampaign();
      } else {
        alert(data.error || "حصل مشكلة");
      }
    } catch { alert("حصل مشكلة في الاتصال"); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <Megaphone size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">الحملة غير موجودة</p>
        <Link href="/admin/crm/campaigns" className="text-[#1B7A3D] text-sm mt-2 inline-block">
          العودة للحملات
        </Link>
      </div>
    );
  }

  const stats = campaign.stats || {};

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/crm/campaigns" className="hover:text-[#1B7A3D]">إدارة الحملات</Link>
        <ArrowRight size={12} />
        <span className="text-gray-800 font-medium">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{campaign.name}</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
            {STATUS_LABELS[campaign.status]}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {TYPE_LABELS[campaign.campaign_type] || campaign.campaign_type}
          </span>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button onClick={handleLaunch}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700">
              <Rocket size={14} />
              إطلاق
            </button>
          )}
          {campaign.status === "active" && (
            <>
              <button onClick={() => handleStatusChange("paused")}
                className="flex items-center gap-1 px-3 py-2 border rounded-xl text-xs hover:bg-amber-50 text-amber-600">
                <Pause size={14} /> إيقاف مؤقت
              </button>
              <button onClick={() => handleStatusChange("completed")}
                className="flex items-center gap-1 px-3 py-2 border rounded-xl text-xs hover:bg-purple-50 text-purple-600">
                <StopCircle size={14} /> إنهاء
              </button>
            </>
          )}
          {campaign.status === "paused" && (
            <button onClick={() => handleStatusChange("active")}
              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-xl text-xs hover:bg-green-700">
              <Play size={14} /> استئناف
            </button>
          )}
        </div>
      </div>

      {campaign.description && (
        <p className="text-sm text-gray-600">{campaign.description}</p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "مستهدفين", value: stats.targeted || 0, icon: Users, color: "text-gray-700" },
          { label: "مرسلة", value: stats.sent || 0, icon: Send, color: "text-blue-600" },
          { label: "تم التسليم", value: stats.delivered || 0, icon: CheckCircle, color: "text-green-600" },
          { label: "ردود", value: stats.responded || 0, icon: MessageCircle, color: "text-purple-600" },
          { label: "تحويلات", value: stats.converted || 0, icon: TrendingUp, color: "text-[#1B7A3D]" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{(value as number).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Rates */}
      {(stats.sent || 0) > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-700">
              {stats.sent ? ((stats.delivered || 0) / stats.sent * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] text-gray-500">نسبة التسليم</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-700">
              {stats.delivered ? ((stats.read || 0) / stats.delivered * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] text-gray-500">نسبة القراءة</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-purple-600">
              {stats.sent ? ((stats.responded || 0) / stats.sent * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] text-gray-500">نسبة الرد</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-600">
              {stats.sent ? ((stats.converted || 0) / stats.sent * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] text-gray-500">نسبة التحويل</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: "overview" as const, label: "نظرة عامة" },
          { key: "messages" as const, label: `الرسائل (${campaign.messages?.length || 0})` },
          { key: "recipients" as const, label: "الإعدادات" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#1B7A3D] text-[#1B7A3D]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {/* Target Filters */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Target size={16} className="text-blue-600" />
              فلاتر الاستهداف
            </h3>
            {Object.keys(campaign.target_filters || {}).length === 0 ? (
              <p className="text-xs text-gray-400">كل العملاء مستهدفون</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(campaign.target_filters).map(([k, v]) => (
                  <span key={k} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    {k}: <b>{String(v)}</b>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Clock size={16} className="text-gray-600" />
              التواريخ
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>إنشاء: {new Date(campaign.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              {campaign.started_at && <p>إطلاق: {new Date(campaign.started_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
              {campaign.completed_at && <p>اكتمال: {new Date(campaign.completed_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
            </div>
          </div>

          {/* Failures */}
          {(stats.failed || 0) > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <h3 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2">
                <AlertTriangle size={16} />
                رسائل فاشلة: {stats.failed}
              </h3>
              <p className="text-xs text-red-600">تحقق من سجل الرسائل للتفاصيل</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "messages" && (
        <div className="space-y-3">
          {(campaign.messages || []).map((msg, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-700">رسالة {i + 1}</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                  {CHANNEL_LABELS[msg.channel] || msg.channel}
                </span>
                {msg.delay_hours !== undefined && msg.delay_hours > 0 && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    بعد {msg.delay_hours} ساعة
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "recipients" && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-bold">إعدادات الإرسال</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">الحد اليومي</span>
              <p className="font-bold text-lg">{campaign.daily_send_limit}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">الحد بالساعة</span>
              <p className="font-bold text-lg">{campaign.hourly_send_limit}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">نافذة الإرسال</span>
              <p className="font-bold">{campaign.send_window_start} — {campaign.send_window_end}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">حد أسبوعي/عميل</span>
              <p className="font-bold text-lg">{campaign.max_messages_per_customer_per_week}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
