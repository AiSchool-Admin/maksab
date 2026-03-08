"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, ArrowRight, Plus, Edit, Trash2, RefreshCw, X,
  MessageCircle, Copy, CheckCircle, Eye
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Template {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  category: string | null;
  campaign_type: string | null;
  body: string;
  times_sent: number;
  times_responded: number;
  response_rate: number;
  is_active: boolean;
  version: number;
  created_at: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "واتساب", sms: "SMS", email: "بريد إلكتروني", in_app: "داخل التطبيق",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-700",
  sms: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
  in_app: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS: Record<string, string> = {
  acquisition: "اكتساب", activation: "تفعيل", engagement: "تفاعل",
  retention: "احتفاظ", reactivation: "إعادة تنشيط", upsell: "ترقية",
  commission: "عمولة", promotion: "عرض", referral: "إحالة",
  announcement: "إعلان",
};

export default function CampaignTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/admin/crm/templates?";
      if (filterChannel) url += `channel=${filterChannel}&`;
      if (filterType) url += `campaign_type=${filterType}&`;
      const res = await fetch(url, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterChannel, filterType]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    try {
      await fetch(`/api/admin/crm/templates?id=${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      fetchTemplates();
    } catch { /* ignore */ }
  };

  const copyBody = (template: Template) => {
    navigator.clipboard.writeText(template.body);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group by campaign_type
  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const key = t.campaign_type || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/crm/campaigns" className="hover:text-[#1B7A3D]">إدارة الحملات</Link>
        <ArrowRight size={12} />
        <span className="text-gray-800 font-medium">قوالب الرسائل</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText size={20} className="text-[#1B7A3D]" />
          قوالب الرسائل
          <span className="text-sm font-normal text-gray-500">({templates.length})</span>
        </h2>
        <button onClick={() => { setEditTemplate(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E]">
          <Plus size={16} />
          قالب جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل القنوات</option>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={fetchTemplates} className="px-3 py-2 border rounded-xl text-xs hover:bg-gray-50">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Templates grouped */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border text-center py-12">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">لا توجد قوالب</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, tmps]) => (
          <div key={type}>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <MessageCircle size={14} className="text-[#1B7A3D]" />
              {TYPE_LABELS[type] || type}
              <span className="text-xs font-normal text-gray-400">({tmps.length})</span>
            </h3>
            <div className="space-y-2 mb-4">
              {tmps.map(t => (
                <div key={t.id} className="bg-white rounded-xl border p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium">{t.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${CHANNEL_COLORS[t.channel] || 'bg-gray-100'}`}>
                          {CHANNEL_LABELS[t.channel] || t.channel}
                        </span>
                        {!t.is_active && (
                          <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full">معطّل</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{t.body.substring(0, 120)}...</p>
                      {t.times_sent > 0 && (
                        <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                          <span>مرسلة: {t.times_sent}</span>
                          <span>ردود: {t.times_responded}</span>
                          <span>نسبة الرد: {t.response_rate}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setViewTemplate(t)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="عرض">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => copyBody(t)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="نسخ">
                        {copiedId === t.id ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                      <button onClick={() => { setEditTemplate(t); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="تعديل">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* View Modal */}
      {viewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewTemplate(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm">{viewTemplate.name}</h3>
              <button onClick={() => setViewTemplate(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${CHANNEL_COLORS[viewTemplate.channel]}`}>
                  {CHANNEL_LABELS[viewTemplate.channel]}
                </span>
                {viewTemplate.campaign_type && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {TYPE_LABELS[viewTemplate.campaign_type]}
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {viewTemplate.body}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">ID: {viewTemplate.id} — v{viewTemplate.version}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <TemplateFormModal
          template={editTemplate}
          onClose={() => { setShowForm(false); setEditTemplate(null); }}
          onSaved={() => { setShowForm(false); setEditTemplate(null); fetchTemplates(); }}
        />
      )}
    </div>
  );
}

function TemplateFormModal({
  template,
  onClose,
  onSaved,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!template;
  const [form, setForm] = useState({
    id: template?.id || "",
    name: template?.name || "",
    description: template?.description || "",
    channel: template?.channel || "whatsapp",
    campaign_type: template?.campaign_type || "",
    category: template?.category || "",
    body: template?.body || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.id.trim() || !form.name.trim() || !form.body.trim()) {
      setError("المعرف والاسم ونص القالب مطلوبون");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/crm/templates", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          description: form.description || null,
          channel: form.channel,
          campaign_type: form.campaign_type || null,
          category: form.category || null,
          body: form.body,
        }),
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm">{isEdit ? "تعديل القالب" : "قالب جديد"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {error && <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="text-xs text-gray-600 block mb-1">معرف القالب * (بالإنجليزية)</label>
            <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              disabled={isEdit}
              className="w-full border rounded-xl px-3 py-2 text-sm disabled:bg-gray-50" dir="ltr"
              placeholder="مثال: acq_phones_special_v1" />
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">الاسم *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="اسم وصفي بالعربي" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">القناة *</label>
              <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">نوع الحملة</label>
              <select value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                <option value="">عام</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">نص القالب *</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm" rows={8}
              placeholder="استخدم {{name}} للاسم، {{category_ar}} للفئة..." />
            <p className="text-[10px] text-gray-400 mt-1">{form.body.length} حرف</p>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50">
            {loading ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء القالب"}
          </button>
        </div>
      </div>
    </div>
  );
}
