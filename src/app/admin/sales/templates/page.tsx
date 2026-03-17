"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Star,
  BarChart3,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  name_ar: string;
  category: string;
  target_type: string;
  target_tier: string;
  message_text: string;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  response_rate: number;
  created_at: string;
  updated_at: string;
}

const TIER_LABELS: Record<string, string> = {
  all: "الكل",
  whale: "🐋 حوت",
  big_fish: "🦈 كبير",
  regular: "🐟 عادي",
  small_fish: "🐠 صغير",
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "عام",
  acquisition: "استحواذ",
  followup: "متابعة",
  retention: "استبقاء",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    name_ar: "",
    category: "acquisition",
    target_type: "seller",
    target_tier: "all",
    message_text: "",
  });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales/templates", {
        headers: getAdminHeaders(),
      });
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditForm({
      name: t.name,
      name_ar: t.name_ar,
      category: t.category,
      target_type: t.target_type,
      target_tier: t.target_tier,
      message_text: t.message_text,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await fetch("/api/admin/sales/templates", {
        method: "PUT",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      setEditingId(null);
      fetchTemplates();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const createTemplate = async () => {
    if (!editForm.name || !editForm.name_ar || !editForm.message_text) return;
    try {
      await fetch("/api/admin/sales/templates", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setShowNew(false);
      setEditForm({ name: "", name_ar: "", category: "acquisition", target_type: "seller", target_tier: "all", message_text: "" });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to create:", err);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    try {
      await fetch(`/api/admin/sales/templates?id=${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/sales/outreach"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowRight size={16} />
            رجوع
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark">مكتبة الرسائل</h1>
            <p className="text-sm text-gray-text mt-1">
              إدارة قوالب رسائل التواصل والمتابعة
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowNew(true);
            setEditForm({ name: "", name_ar: "", category: "acquisition", target_type: "seller", target_tier: "all", message_text: "" });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B7A3D] hover:bg-[#145C2E] text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          رسالة جديدة
        </button>
      </div>

      {/* New Template Form */}
      {showNew && (
        <TemplateForm
          form={editForm}
          setForm={setEditForm}
          onSave={createTemplate}
          onCancel={() => setShowNew(false)}
          title="رسالة جديدة"
        />
      )}

      {/* Templates List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-64" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) =>
            editingId === t.id ? (
              <TemplateForm
                key={t.id}
                form={editForm}
                setForm={setEditForm}
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
                title="تعديل الرسالة"
              />
            ) : (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Template header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-dark">{t.name_ar}</h3>
                      {t.is_default && (
                        <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 bg-[#FFF8E1] text-[#D4A843] rounded-full font-bold">
                          <Star size={10} /> افتراضية
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        {TIER_LABELS[t.target_tier] || t.target_tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-text">
                      <span className="flex items-center gap-1">
                        <BarChart3 size={12} />
                        {t.usage_count} استخدام
                      </span>
                      <span className="flex items-center gap-1">
                        📈 {t.response_rate}% نسبة رد
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                      title="عرض الرسالة"
                    >
                      {expandedId === t.id ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => copyText(t.id, t.message_text)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                      title="نسخ"
                    >
                      {copiedId === t.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => startEdit(t)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                      title="تعديل"
                    >
                      <Pencil size={16} />
                    </button>
                    {!t.is_default && (
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded message text */}
                {expandedId === t.id && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <pre className="text-sm text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed">
                      {t.message_text}
                    </pre>
                  </div>
                )}
              </div>
            )
          )}

          {templates.length === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <span className="text-4xl mb-3 block">📝</span>
              <h3 className="text-lg font-bold text-dark mb-1">مفيش رسائل</h3>
              <p className="text-sm text-gray-text">أضف أول رسالة من الزر أعلاه</p>
            </div>
          )}
        </div>
      )}

      {/* Variables reference */}
      <div className="bg-[#FFF8E1] rounded-2xl p-5 border border-[#D4A843]/20">
        <h3 className="text-sm font-bold text-[#D4A843] mb-2">📌 المتغيرات المتاحة</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div><code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{name}}"}</code> — اسم البائع</div>
          <div><code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{product}}"}</code> — المنتج الرئيسي</div>
          <div><code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{category}}"}</code> — الفئة (EN)</div>
          <div><code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{category_ar}}"}</code> — الفئة (عربي)</div>
          <div><code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{count}}"}</code> — عدد الإعلانات المشابهة</div>
        </div>
      </div>
    </div>
  );
}

// ─── Template Form Component ─────────────────────────────────────────────────

function TemplateForm({
  form,
  setForm,
  onSave,
  onCancel,
  title,
}: {
  form: {
    name: string;
    name_ar: string;
    category: string;
    target_type: string;
    target_tier: string;
    message_text: string;
  };
  setForm: (f: any) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border-2 border-[#1B7A3D]/30">
      <h3 className="text-base font-bold text-dark mb-4">{title}</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-text mb-1 block">الاسم (EN)</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
              placeholder="template_name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-text mb-1 block">الاسم (عربي)</label>
            <input
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
              placeholder="اسم الرسالة"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-text mb-1 block">التصنيف</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
            >
              <option value="acquisition">استحواذ</option>
              <option value="followup">متابعة</option>
              <option value="retention">استبقاء</option>
              <option value="general">عام</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-text mb-1 block">النوع</label>
            <select
              value={form.target_type}
              onChange={(e) => setForm({ ...form, target_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
            >
              <option value="seller">بائع</option>
              <option value="buyer">مشتري</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-text mb-1 block">الشريحة</label>
            <select
              value={form.target_tier}
              onChange={(e) => setForm({ ...form, target_tier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
            >
              <option value="all">الكل</option>
              <option value="whale">🐋 حوت</option>
              <option value="big_fish">🦈 كبير</option>
              <option value="regular">🐟 عادي</option>
              <option value="small_fish">🐠 صغير</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-text mb-1 block">نص الرسالة</label>
          <textarea
            value={form.message_text}
            onChange={(e) => setForm({ ...form, message_text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20 font-[Cairo] leading-relaxed"
            placeholder="اكتب نص الرسالة... استخدم {{name}} و {{product}} للمتغيرات"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors"
          >
            <Save size={16} />
            حفظ
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
