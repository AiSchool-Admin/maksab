"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone, Plus, Search, Filter, Play, Pause, CheckCircle,
  Clock, Users, MessageCircle, TrendingUp, BarChart3, Eye,
  Edit, Trash2, Copy, ChevronLeft, ChevronRight, RefreshCw,
  Send, Target, Zap, Calendar
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  target_filters: Record<string, unknown>;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: {
    targeted: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    responded: number;
    positive_responses: number;
    negative_responses: number;
    converted: number;
    unsubscribed: number;
    failed: number;
    response_rate_pct: number;
    conversion_rate_pct: number;
    cost_egp: number;
    revenue_generated_egp: number;
    roi_pct: number;
  };
  created_at: string;
  updated_at: string;
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  welcome: "ترحيب",
  onboarding: "تفعيل",
  engagement: "تفاعل",
  reactivation: "إعادة تنشيط",
  upsell: "ترقية",
  retention: "احتفاظ",
  announcement: "إعلان",
  promotion: "عرض",
  feedback: "تقييم",
  referral: "إحالة",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  scheduled: "مجدولة",
  active: "نشطة",
  paused: "متوقفة",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function CrmCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/admin/crm/campaigns?limit=50&sort_by=created_at&sort_order=desc";
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&campaign_type=${typeFilter}`;
      const res = await fetch(url, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Aggregate stats
  const totalSent = campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0);
  const totalDelivered = campaigns.reduce((s, c) => s + (c.stats?.delivered || 0), 0);
  const totalResponded = campaigns.reduce((s, c) => s + (c.stats?.responded || 0), 0);
  const totalConverted = campaigns.reduce((s, c) => s + (c.stats?.converted || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Megaphone size={20} className="text-[#1B7A3D]" />
          إدارة الحملات
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors"
        >
          <Plus size={16} />
          حملة جديدة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">إجمالي الحملات</span>
          </div>
          <p className="text-2xl font-bold">{campaigns.length}</p>
        </div>
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Play size={16} className="text-green-600" />
            <span className="text-xs text-green-700">نشطة الآن</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{activeCampaigns}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Send size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500">رسائل مرسلة</span>
          </div>
          <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle size={16} className="text-amber-600" />
            <span className="text-xs text-gray-500">ردود</span>
          </div>
          <p className="text-2xl font-bold">{totalResponded.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-red-600" />
            <span className="text-xs text-gray-500">تحويلات</span>
          </div>
          <p className="text-2xl font-bold">{totalConverted.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(CAMPAIGN_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={fetchCampaigns} className="px-3 py-2 border rounded-xl text-xs hover:bg-gray-50">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2.5 text-right">اسم الحملة</th>
                <th className="px-3 py-2.5 text-right">النوع</th>
                <th className="px-3 py-2.5 text-right">الحالة</th>
                <th className="px-3 py-2.5 text-center">مستهدفين</th>
                <th className="px-3 py-2.5 text-center">مرسلة</th>
                <th className="px-3 py-2.5 text-center">تم التسليم</th>
                <th className="px-3 py-2.5 text-center">ردود</th>
                <th className="px-3 py-2.5 text-center">تحويل%</th>
                <th className="px-3 py-2.5 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Megaphone size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-400 text-sm mb-1">لا توجد حملات بعد</p>
                    <p className="text-gray-400 text-xs">ابدأ بإنشاء حملة جديدة للتواصل مع عملائك</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-xs font-medium hover:bg-[#145C2E]"
                    >
                      <Plus size={14} className="inline ml-1" />
                      حملة جديدة
                    </button>
                  </td>
                </tr>
              ) : (
                campaigns.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.description}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{CAMPAIGN_TYPE_LABELS[c.campaign_type] || c.campaign_type}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">{c.stats?.targeted || 0}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{c.stats?.sent || 0}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{c.stats?.delivered || 0}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{c.stats?.responded || 0}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-medium">
                      {(c.stats?.conversion_rate_pct || 0).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchCampaigns(); }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    campaign_type: "engagement",
    target_lifecycle: "",
    target_category: "",
    target_governorate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("اسم الحملة مطلوب"); return; }
    setLoading(true);
    setError("");

    try {
      const targetFilters: Record<string, string> = {};
      if (form.target_lifecycle) targetFilters.lifecycle_stage = form.target_lifecycle;
      if (form.target_category) targetFilters.primary_category = form.target_category;
      if (form.target_governorate) targetFilters.governorate = form.target_governorate;

      const res = await fetch("/api/admin/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          campaign_type: form.campaign_type,
          target_filters: targetFilters,
          status: "draft",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "حصل مشكلة");
        return;
      }
      onCreated();
    } catch {
      setError("حصل مشكلة في الاتصال");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm">حملة جديدة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Trash2 size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg">{error}</div>}
          <div>
            <label className="text-xs text-gray-600 block mb-1">اسم الحملة *</label>
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="مثال: حملة إعادة تنشيط مارس"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">الوصف</label>
            <textarea
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm" rows={2}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">نوع الحملة</label>
            <select value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
              {Object.entries(CAMPAIGN_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">استهداف — مرحلة العميل</label>
            <select value={form.target_lifecycle} onChange={e => setForm(f => ({ ...f, target_lifecycle: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
              <option value="">الكل</option>
              <option value="lead">عميل محتمل</option>
              <option value="active">نشط</option>
              <option value="at_risk">معرض للخطر</option>
              <option value="dormant">خامل</option>
              <option value="churned">مفقود</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border rounded-xl text-sm hover:bg-gray-50">إلغاء</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50">
              {loading ? "جاري الحفظ..." : "إنشاء الحملة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
