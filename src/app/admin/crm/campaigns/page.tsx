"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Plus, Play, Pause, CheckCircle, Clock, Users, MessageCircle,
  Target, Send, RefreshCw, Edit, Trash2, Eye, Zap, X, Calendar,
  AlertTriangle, Rocket, Copy, StopCircle
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  target_filters: Record<string, string>;
  messages: Array<{ channel: string; content: string }>;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  daily_send_limit: number;
  send_window_start: string;
  send_window_end: string;
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

const LIFECYCLE_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "lead", label: "عميل محتمل" },
  { value: "qualified", label: "مؤهل" },
  { value: "contacted", label: "تم التواصل" },
  { value: "interested", label: "مهتم" },
  { value: "onboarding", label: "تسجيل" },
  { value: "active", label: "نشط" },
  { value: "power_user", label: "مستخدم قوي" },
  { value: "at_risk", label: "معرض للخطر" },
  { value: "dormant", label: "خامل" },
  { value: "churned", label: "مفقود" },
];

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "واتساب",
  sms: "رسالة نصية",
  email: "بريد إلكتروني",
  in_app: "داخل التطبيق",
};

export default function CrmCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/crm/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) fetchCampaigns();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحملة؟")) return;
    try {
      const res = await fetch(`/api/admin/crm/campaigns?id=${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      if (res.ok) fetchCampaigns();
    } catch { /* ignore */ }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm("هل أنت متأكد من إطلاق هذه الحملة؟ سيتم إرسال الرسائل للعملاء المستهدفين.")) return;
    try {
      const res = await fetch("/api/admin/crm/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ campaign_id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`تم إطلاق الحملة!\nمستهدفين: ${data.targeted}\nمرسلة: ${data.sent}\nفشلت: ${data.failed}`);
        fetchCampaigns();
      } else {
        alert(data.error || "حصل مشكلة");
      }
    } catch {
      alert("حصل مشكلة في الاتصال");
    }
  };

  const totalSent = campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0);
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

      {/* Stats */}
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل الأنواع</option>
          {Object.entries(CAMPAIGN_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={fetchCampaigns} className="px-3 py-2 border rounded-xl text-xs hover:bg-gray-50">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="flex gap-2">
                <div className="h-8 bg-gray-100 rounded w-20" />
                <div className="h-8 bg-gray-100 rounded w-20" />
              </div>
            </div>
          ))
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border text-center py-12">
            <Megaphone size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm mb-1">لا توجد حملات بعد</p>
            <p className="text-gray-400 text-xs mb-3">ابدأ بإنشاء حملة جديدة للتواصل مع عملائك</p>
            <button onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-xs font-medium hover:bg-[#145C2E]">
              <Plus size={14} className="inline ml-1" />
              حملة جديدة
            </button>
          </div>
        ) : (
          campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">{c.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {CAMPAIGN_TYPE_LABELS[c.campaign_type] || c.campaign_type}
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-gray-500 mb-2">{c.description}</p>}

                  {/* Target Filters Summary */}
                  {Object.keys(c.target_filters || {}).length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {Object.entries(c.target_filters).map(([k, v]) => (
                        <span key={k} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {k === "lifecycle_stage" ? "مرحلة: " : k === "governorate" ? "محافظة: " : k === "primary_category" ? "قسم: " : `${k}: `}
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Messages count */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} />
                      {(c.messages || []).length} رسالة
                    </span>
                    {c.started_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        بدأت {new Date(c.started_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(c.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                    </span>
                  </div>

                  {/* Stats Row */}
                  {(c.stats?.sent > 0 || c.stats?.targeted > 0) && (
                    <div className="flex gap-4 mt-2 pt-2 border-t text-[11px]">
                      <span className="text-gray-500">
                        <Users size={12} className="inline ml-0.5" />
                        مستهدفين: <b>{c.stats.targeted}</b>
                      </span>
                      <span className="text-blue-600">
                        <Send size={12} className="inline ml-0.5" />
                        مرسلة: <b>{c.stats.sent}</b>
                      </span>
                      <span className="text-green-600">
                        <CheckCircle size={12} className="inline ml-0.5" />
                        تم التسليم: <b>{c.stats.delivered}</b>
                      </span>
                      <span className="text-purple-600">
                        <MessageCircle size={12} className="inline ml-0.5" />
                        ردود: <b>{c.stats.responded}</b>
                      </span>
                      {c.stats.failed > 0 && (
                        <span className="text-red-500">
                          <AlertTriangle size={12} className="inline ml-0.5" />
                          فشل: <b>{c.stats.failed}</b>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setViewCampaign(c)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="عرض التفاصيل">
                    <Eye size={16} />
                  </button>
                  {c.status === "draft" && (
                    <>
                      <button onClick={() => setEditCampaign(c)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="تعديل">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleLaunch(c.id)}
                        className="p-2 rounded-lg hover:bg-green-50 text-green-600" title="إطلاق الحملة">
                        <Rocket size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="حذف">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {c.status === "active" && (
                    <>
                      <button onClick={() => handleStatusChange(c.id, "paused")}
                        className="p-2 rounded-lg hover:bg-amber-50 text-amber-600" title="إيقاف مؤقت">
                        <Pause size={16} />
                      </button>
                      <button onClick={() => handleStatusChange(c.id, "completed")}
                        className="p-2 rounded-lg hover:bg-purple-50 text-purple-600" title="إنهاء">
                        <StopCircle size={16} />
                      </button>
                    </>
                  )}
                  {c.status === "paused" && (
                    <button onClick={() => handleStatusChange(c.id, "active")}
                      className="p-2 rounded-lg hover:bg-green-50 text-green-600" title="استئناف">
                      <Play size={16} />
                    </button>
                  )}
                  {["active", "paused"].includes(c.status) && (
                    <button onClick={() => handleStatusChange(c.id, "cancelled")}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="إلغاء">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Campaign Modal */}
      {(showCreateModal || editCampaign) && (
        <CampaignFormModal
          campaign={editCampaign}
          onClose={() => { setShowCreateModal(false); setEditCampaign(null); }}
          onSaved={() => { setShowCreateModal(false); setEditCampaign(null); fetchCampaigns(); }}
        />
      )}

      {/* View Campaign Detail Modal */}
      {viewCampaign && (
        <CampaignDetailModal
          campaign={viewCampaign}
          onClose={() => setViewCampaign(null)}
        />
      )}
    </div>
  );
}

function CampaignFormModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!campaign;
  const [form, setForm] = useState({
    name: campaign?.name || "",
    description: campaign?.description || "",
    campaign_type: campaign?.campaign_type || "engagement",
    target_lifecycle: campaign?.target_filters?.lifecycle_stage || "",
    target_category: campaign?.target_filters?.primary_category || "",
    target_governorate: campaign?.target_filters?.governorate || "",
    target_account_type: campaign?.target_filters?.account_type || "",
    target_subscription: campaign?.target_filters?.subscription_plan || "",
    messages: campaign?.messages || [{ channel: "whatsapp", content: "" }],
    daily_send_limit: campaign?.daily_send_limit || 500,
    send_window_start: campaign?.send_window_start || "09:00",
    send_window_end: campaign?.send_window_end || "21:00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: info, 2: targeting, 3: messages, 4: settings

  const addMessage = () => {
    setForm(f => ({ ...f, messages: [...f.messages, { channel: "whatsapp", content: "" }] }));
  };

  const removeMessage = (idx: number) => {
    setForm(f => ({ ...f, messages: f.messages.filter((_, i) => i !== idx) }));
  };

  const updateMessage = (idx: number, field: string, value: string) => {
    setForm(f => ({
      ...f,
      messages: f.messages.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("اسم الحملة مطلوب"); return; }
    if (form.messages.every(m => !m.content.trim())) { setError("أضف رسالة واحدة على الأقل"); return; }

    setLoading(true);
    setError("");

    const targetFilters: Record<string, string> = {};
    if (form.target_lifecycle) targetFilters.lifecycle_stage = form.target_lifecycle;
    if (form.target_category) targetFilters.primary_category = form.target_category;
    if (form.target_governorate) targetFilters.governorate = form.target_governorate;
    if (form.target_account_type) targetFilters.account_type = form.target_account_type;
    if (form.target_subscription) targetFilters.subscription_plan = form.target_subscription;

    const validMessages = form.messages.filter(m => m.content.trim());

    try {
      const payload = {
        ...(isEdit ? { id: campaign!.id } : {}),
        name: form.name,
        description: form.description || null,
        campaign_type: form.campaign_type,
        target_filters: targetFilters,
        messages: validMessages,
        daily_send_limit: form.daily_send_limit,
        send_window_start: form.send_window_start,
        send_window_end: form.send_window_end,
        status: "draft",
      };

      const res = await fetch("/api/admin/crm/campaigns", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "حصل مشكلة");
        setLoading(false);
        return;
      }

      onSaved();
    } catch {
      setError("حصل مشكلة في الاتصال");
    }
    setLoading(false);
  };

  const totalSteps = 4;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm">{isEdit ? "تعديل الحملة" : "حملة جديدة"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 pt-3 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i + 1 <= step ? 'bg-[#1B7A3D]' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1">
          {step === 1 ? "معلومات الحملة" : step === 2 ? "الاستهداف" : step === 3 ? "الرسائل" : "الإعدادات"}
        </p>

        <div className="p-4 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg">{error}</div>}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <div>
                <label className="text-xs text-gray-600 block mb-1">اسم الحملة *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="مثال: حملة إعادة تنشيط مارس" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">الوصف</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">نوع الحملة</label>
                <select value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                  {Object.entries(CAMPAIGN_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Step 2: Targeting */}
          {step === 2 && (
            <>
              <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-xl flex items-start gap-2">
                <Target size={14} className="mt-0.5 shrink-0" />
                <span>اختار فلاتر الاستهداف — العملاء اللي هيطابقوا كل الفلاتر هم اللي هيوصلهم الرسالة</span>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">مرحلة العميل</label>
                <select value={form.target_lifecycle} onChange={e => setForm(f => ({ ...f, target_lifecycle: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                  {LIFECYCLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">نوع الحساب</label>
                <select value={form.target_account_type} onChange={e => setForm(f => ({ ...f, target_account_type: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="">الكل</option>
                  <option value="individual">فرد</option>
                  <option value="store">متجر</option>
                  <option value="chain">سلسلة محلات</option>
                  <option value="wholesaler">تاجر جملة</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">الاشتراك</label>
                <select value={form.target_subscription} onChange={e => setForm(f => ({ ...f, target_subscription: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="">الكل</option>
                  <option value="free">مجاني</option>
                  <option value="silver">فضي</option>
                  <option value="gold">ذهبي</option>
                  <option value="platinum">بلاتيني</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">المحافظة</label>
                <input value={form.target_governorate} onChange={e => setForm(f => ({ ...f, target_governorate: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="مثال: القاهرة" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">القسم الرئيسي</label>
                <input value={form.target_category} onChange={e => setForm(f => ({ ...f, target_category: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="مثال: phones" />
              </div>
            </>
          )}

          {/* Step 3: Messages */}
          {step === 3 && (
            <>
              <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl flex items-start gap-2">
                <MessageCircle size={14} className="mt-0.5 shrink-0" />
                <span>أضف رسالة أو أكتر. استخدم {"{{name}}"} لاسم العميل و{"{{phone}}"} لرقمه</span>
              </div>
              {form.messages.map((msg, idx) => (
                <div key={idx} className="border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">رسالة {idx + 1}</span>
                    {form.messages.length > 1 && (
                      <button onClick={() => removeMessage(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <select value={msg.channel} onChange={e => updateMessage(idx, "channel", e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white">
                    {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <textarea
                    value={msg.content}
                    onChange={e => updateMessage(idx, "content", e.target.value)}
                    placeholder="اكتب محتوى الرسالة هنا..."
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    rows={4}
                  />
                  <p className="text-[10px] text-gray-400">{msg.content.length} حرف</p>
                </div>
              ))}
              <button onClick={addMessage}
                className="w-full py-2 border border-dashed rounded-xl text-xs text-gray-500 hover:text-[#1B7A3D] hover:border-[#1B7A3D] transition-colors flex items-center justify-center gap-1">
                <Plus size={14} />
                أضف رسالة أخرى
              </button>
            </>
          )}

          {/* Step 4: Settings */}
          {step === 4 && (
            <>
              <div>
                <label className="text-xs text-gray-600 block mb-1">الحد اليومي للإرسال</label>
                <input type="number" value={form.daily_send_limit}
                  onChange={e => setForm(f => ({ ...f, daily_send_limit: parseInt(e.target.value) || 500 }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">بداية الإرسال</label>
                  <input type="time" value={form.send_window_start}
                    onChange={e => setForm(f => ({ ...f, send_window_start: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">نهاية الإرسال</label>
                  <input type="time" value={form.send_window_end}
                    onChange={e => setForm(f => ({ ...f, send_window_end: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <h4 className="text-xs font-bold text-gray-700">ملخص الحملة</h4>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>الاسم: <b className="text-gray-700">{form.name}</b></p>
                  <p>النوع: <b className="text-gray-700">{CAMPAIGN_TYPE_LABELS[form.campaign_type]}</b></p>
                  <p>عدد الرسائل: <b className="text-gray-700">{form.messages.filter(m => m.content.trim()).length}</b></p>
                  <p>الحد اليومي: <b className="text-gray-700">{form.daily_send_limit} رسالة</b></p>
                  <p>وقت الإرسال: <b className="text-gray-700">{form.send_window_start} — {form.send_window_end}</b></p>
                  {Object.keys({
                    ...(form.target_lifecycle ? { lifecycle: form.target_lifecycle } : {}),
                    ...(form.target_account_type ? { account: form.target_account_type } : {}),
                    ...(form.target_governorate ? { gov: form.target_governorate } : {}),
                  }).length > 0 && (
                    <p>فلاتر الاستهداف:
                      {form.target_lifecycle && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] mr-1">{form.target_lifecycle}</span>}
                      {form.target_account_type && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] mr-1">{form.target_account_type}</span>}
                      {form.target_governorate && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] mr-1">{form.target_governorate}</span>}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50">السابق</button>
            )}
            {step < totalSteps ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex-1 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E]">التالي</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    {isEdit ? "حفظ التعديلات" : "إنشاء الحملة"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignDetailModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const stats = campaign.stats || {} as Campaign["stats"];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Megaphone size={16} className="text-[#1B7A3D]" />
            {campaign.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status & Type */}
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
              {STATUS_LABELS[campaign.status]}
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
            </span>
          </div>

          {campaign.description && (
            <p className="text-sm text-gray-600">{campaign.description}</p>
          )}

          {/* Stats Grid */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-2">الإحصائيات</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "مستهدفين", value: stats.targeted || 0, color: "text-gray-700" },
                { label: "مرسلة", value: stats.sent || 0, color: "text-blue-600" },
                { label: "تم التسليم", value: stats.delivered || 0, color: "text-green-600" },
                { label: "مقروءة", value: stats.read || 0, color: "text-purple-600" },
                { label: "ردود", value: stats.responded || 0, color: "text-amber-600" },
                { label: "تحويلات", value: stats.converted || 0, color: "text-[#1B7A3D]" },
                { label: "فشلت", value: stats.failed || 0, color: "text-red-500" },
                { label: "نسبة الرد", value: `${(stats.response_rate_pct || 0).toFixed(1)}%`, color: "text-gray-700" },
                { label: "نسبة التحويل", value: `${(stats.conversion_rate_pct || 0).toFixed(1)}%`, color: "text-gray-700" },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Target Filters */}
          {Object.keys(campaign.target_filters || {}).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-700 mb-2">فلاتر الاستهداف</h4>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                {Object.entries(campaign.target_filters).map(([k, v]) => (
                  <p key={k} className="text-xs text-gray-600">
                    <span className="text-gray-400">{k}:</span> <b>{v}</b>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {(campaign.messages || []).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-700 mb-2">الرسائل ({campaign.messages.length})</h4>
              <div className="space-y-2">
                {campaign.messages.map((msg, i) => (
                  <div key={i} className="border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {CHANNEL_LABELS[msg.channel] || msg.channel}
                      </span>
                      <span className="text-[10px] text-gray-400">رسالة {i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
            <p>تم الإنشاء: {new Date(campaign.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            {campaign.started_at && <p>تم الإطلاق: {new Date(campaign.started_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
            {campaign.completed_at && <p>اكتملت: {new Date(campaign.completed_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
