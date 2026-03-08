"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Globe, Plus, Edit, Trash2, Eye, RefreshCw, X, ExternalLink,
  TrendingUp, Users, Target, MapPin, Tag, Activity, ArrowRight
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";
import { CATEGORY_LABELS } from "@/types/crm";

interface CompetitorSource {
  id: string;
  source_type: string;
  name: string;
  url: string | null;
  category: string | null;
  governorate: string | null;
  city: string | null;
  estimated_sellers: number | null;
  estimated_active_sellers: number | null;
  estimated_listings: number | null;
  estimated_monthly_transactions: number | null;
  activity_level: string | null;
  posting_frequency: string | null;
  is_monitored: boolean;
  monitoring_priority: number;
  last_checked_at: string | null;
  sellers_discovered: number;
  sellers_acquired: number;
  acquisition_rate: number;
  notes: string | null;
  tags: string[];
  created_at: string;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  dubizzle_profile: "دوبيزل",
  facebook_group: "جروب فيسبوك",
  facebook_marketplace: "فيسبوك ماركتبليس",
  instagram_shop: "متجر انستجرام",
  whatsapp_group: "جروب واتساب",
  website: "موقع إلكتروني",
  physical_store: "متجر فعلي",
  opensooq: "أوبن سوق",
};

const SOURCE_TYPE_ICONS: Record<string, string> = {
  dubizzle_profile: "🏪",
  facebook_group: "👥",
  facebook_marketplace: "🛍️",
  instagram_shop: "📸",
  whatsapp_group: "💬",
  website: "🌐",
  physical_store: "🏬",
  opensooq: "📋",
};

const ACTIVITY_LABELS: Record<string, string> = {
  very_active: "نشط جداً",
  active: "نشط",
  moderate: "متوسط",
  low: "منخفض",
  dead: "متوقف",
};

const ACTIVITY_COLORS: Record<string, string> = {
  very_active: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-orange-100 text-orange-700",
  dead: "bg-red-100 text-red-700",
};

export default function CompetitorSourcesPage() {
  const [sources, setSources] = useState<CompetitorSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSource, setEditSource] = useState<CompetitorSource | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/admin/crm/competitor-sources?limit=100&sort_by=monitoring_priority&sort_order=asc";
      if (filterType) url += `&source_type=${filterType}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      const res = await fetch(url, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterType, filterCategory]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصدر؟")) return;
    try {
      await fetch(`/api/admin/crm/competitor-sources?id=${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      fetchSources();
    } catch { /* ignore */ }
  };

  const totalSellers = sources.reduce((s, src) => s + (src.estimated_sellers || 0), 0);
  const totalDiscovered = sources.reduce((s, src) => s + src.sellers_discovered, 0);
  const totalAcquired = sources.reduce((s, src) => s + src.sellers_acquired, 0);
  const monitoredCount = sources.filter(s => s.is_monitored).length;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/crm/discovery" className="hover:text-[#1B7A3D]">محرك الاكتشاف</Link>
        <ArrowRight size={12} />
        <span className="text-gray-800 font-medium">مصادر المنافسين</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe size={20} className="text-[#1B7A3D]" />
          إدارة مصادر المنافسين
        </h2>
        <button onClick={() => { setEditSource(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E]">
          <Plus size={16} />
          مصدر جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">إجمالي المصادر</span>
          </div>
          <p className="text-2xl font-bold">{sources.length}</p>
          <p className="text-[10px] text-gray-400">{monitoredCount} مراقَب</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500">بائعين مقدرين</span>
          </div>
          <p className="text-2xl font-bold">{totalSellers.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-green-600" />
            <span className="text-xs text-green-700">مكتشفين</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{totalDiscovered.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-amber-600" />
            <span className="text-xs text-gray-500">تم اكتسابهم</span>
          </div>
          <p className="text-2xl font-bold">{totalAcquired.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">
            {totalDiscovered > 0 ? `${((totalAcquired / totalDiscovered) * 100).toFixed(1)}% تحويل` : "—"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل الأنواع</option>
          {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={fetchSources} className="px-3 py-2 border rounded-xl text-xs hover:bg-gray-50">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Sources List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))
        ) : sources.length === 0 ? (
          <div className="bg-white rounded-xl border text-center py-12">
            <Globe size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm mb-1">لا توجد مصادر بعد</p>
            <p className="text-gray-400 text-xs mb-3">أضف مصادر المنافسين لبدء اكتشاف العملاء المحتملين</p>
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-xs font-medium hover:bg-[#145C2E]">
              <Plus size={14} className="inline ml-1" />
              أضف مصدر
            </button>
          </div>
        ) : (
          sources.map(src => (
            <div key={src.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{SOURCE_TYPE_ICONS[src.source_type] || "🔗"}</span>
                    <h3 className="font-bold text-sm">{src.name}</h3>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {SOURCE_TYPE_LABELS[src.source_type] || src.source_type}
                    </span>
                    {src.activity_level && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${ACTIVITY_COLORS[src.activity_level] || 'bg-gray-100'}`}>
                        {ACTIVITY_LABELS[src.activity_level] || src.activity_level}
                      </span>
                    )}
                    {!src.is_monitored && (
                      <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full">متوقف</span>
                    )}
                  </div>

                  <div className="flex gap-3 text-[11px] text-gray-500 mb-2">
                    {src.category && (
                      <span className="flex items-center gap-1">
                        <Tag size={12} />
                        {CATEGORY_LABELS[src.category] || src.category}
                      </span>
                    )}
                    {src.governorate && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {src.governorate}
                      </span>
                    )}
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:underline">
                        <ExternalLink size={12} />
                        رابط
                      </a>
                    )}
                  </div>

                  <div className="flex gap-4 text-[11px]">
                    {src.estimated_sellers !== null && (
                      <span className="text-gray-500">
                        <Users size={12} className="inline ml-0.5" />
                        بائعين: <b>{src.estimated_sellers?.toLocaleString()}</b>
                      </span>
                    )}
                    <span className="text-green-600">
                      <Target size={12} className="inline ml-0.5" />
                      مكتشفين: <b>{src.sellers_discovered}</b>
                    </span>
                    <span className="text-blue-600">
                      <TrendingUp size={12} className="inline ml-0.5" />
                      مكتسبين: <b>{src.sellers_acquired}</b>
                    </span>
                    {src.sellers_discovered > 0 && (
                      <span className="text-purple-600">
                        <Activity size={12} className="inline ml-0.5" />
                        تحويل: <b>{((src.sellers_acquired / src.sellers_discovered) * 100).toFixed(1)}%</b>
                      </span>
                    )}
                  </div>

                  {src.notes && (
                    <p className="text-[11px] text-gray-400 mt-1">{src.notes}</p>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditSource(src); setShowForm(true); }}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="تعديل">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(src.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="حذف">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <SourceFormModal
          source={editSource}
          onClose={() => { setShowForm(false); setEditSource(null); }}
          onSaved={() => { setShowForm(false); setEditSource(null); fetchSources(); }}
        />
      )}
    </div>
  );
}

function SourceFormModal({
  source,
  onClose,
  onSaved,
}: {
  source: CompetitorSource | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!source;
  const [form, setForm] = useState({
    source_type: source?.source_type || "facebook_group",
    name: source?.name || "",
    url: source?.url || "",
    category: source?.category || "",
    governorate: source?.governorate || "",
    city: source?.city || "",
    estimated_sellers: source?.estimated_sellers || "",
    estimated_active_sellers: source?.estimated_active_sellers || "",
    estimated_listings: source?.estimated_listings || "",
    activity_level: source?.activity_level || "active",
    posting_frequency: source?.posting_frequency || "daily",
    is_monitored: source?.is_monitored !== false,
    monitoring_priority: source?.monitoring_priority || 5,
    notes: source?.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("اسم المصدر مطلوب"); return; }
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...(isEdit ? { id: source!.id } : {}),
        source_type: form.source_type,
        name: form.name,
        url: form.url || null,
        category: form.category || null,
        governorate: form.governorate || null,
        city: form.city || null,
        estimated_sellers: form.estimated_sellers ? parseInt(String(form.estimated_sellers)) : null,
        estimated_active_sellers: form.estimated_active_sellers ? parseInt(String(form.estimated_active_sellers)) : null,
        estimated_listings: form.estimated_listings ? parseInt(String(form.estimated_listings)) : null,
        activity_level: form.activity_level || null,
        posting_frequency: form.posting_frequency || null,
        is_monitored: form.is_monitored,
        monitoring_priority: form.monitoring_priority,
        notes: form.notes || null,
      };

      const res = await fetch("/api/admin/crm/competitor-sources", {
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm">{isEdit ? "تعديل المصدر" : "مصدر جديد"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {error && <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="text-xs text-gray-600 block mb-1">نوع المصدر *</label>
            <select value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
              {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{SOURCE_TYPE_ICONS[k]} {v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">الاسم *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="مثال: جروب بيع وشراء موبايلات القاهرة" />
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">الرابط</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm" dir="ltr" placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">الفئة</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                <option value="">غير محدد</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">المحافظة</label>
              <input value={form.governorate} onChange={e => setForm(f => ({ ...f, governorate: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="مثال: القاهرة" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">بائعين مقدرين</label>
              <input type="number" value={form.estimated_sellers}
                onChange={e => setForm(f => ({ ...f, estimated_sellers: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">نشطين</label>
              <input type="number" value={form.estimated_active_sellers}
                onChange={e => setForm(f => ({ ...f, estimated_active_sellers: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">إعلانات</label>
              <input type="number" value={form.estimated_listings}
                onChange={e => setForm(f => ({ ...f, estimated_listings: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">مستوى النشاط</label>
              <select value={form.activity_level} onChange={e => setForm(f => ({ ...f, activity_level: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                {Object.entries(ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">أولوية المراقبة (1-10)</label>
              <input type="number" min="1" max="10" value={form.monitoring_priority}
                onChange={e => setForm(f => ({ ...f, monitoring_priority: parseInt(e.target.value) || 5 }))}
                className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_monitored" checked={form.is_monitored}
              onChange={e => setForm(f => ({ ...f, is_monitored: e.target.checked }))}
              className="rounded" />
            <label htmlFor="is_monitored" className="text-xs text-gray-600">مراقبة نشطة</label>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50">
            {loading ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة المصدر"}
          </button>
        </div>
      </div>
    </div>
  );
}
