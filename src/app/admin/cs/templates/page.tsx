"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Save,
  Hash,
  Tag,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";
import type { CSTemplate, CSTemplateCategory } from "@/types/cs";

const CATEGORY_OPTIONS: { value: CSTemplateCategory; label: string }[] = [
  { value: "greeting", label: "ترحيب" },
  { value: "registration", label: "تسجيل" },
  { value: "listing", label: "إعلانات" },
  { value: "payment", label: "دفع" },
  { value: "technical", label: "تقني" },
  { value: "complaint", label: "شكوى" },
  { value: "followup", label: "متابعة" },
  { value: "closing", label: "إغلاق" },
  { value: "general", label: "عام" },
];

const CATEGORY_COLORS: Record<string, string> = {
  greeting: "bg-green-100 text-green-700",
  registration: "bg-purple-100 text-purple-700",
  listing: "bg-blue-100 text-blue-700",
  payment: "bg-yellow-100 text-yellow-700",
  technical: "bg-cyan-100 text-cyan-700",
  complaint: "bg-red-100 text-red-700",
  followup: "bg-orange-100 text-orange-700",
  closing: "bg-gray-100 text-gray-600",
  general: "bg-gray-100 text-gray-600",
};

interface TemplateForm {
  name_ar: string;
  category: CSTemplateCategory;
  message_text: string;
  shortcut: string;
}

const EMPTY_FORM: TemplateForm = {
  name_ar: "",
  category: "general",
  message_text: "",
  shortcut: "",
};

export default function CSTemplatesPage() {
  const [templates, setTemplates] = useState<CSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cs/templates", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      // Network error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const handleEdit = (tmpl: CSTemplate) => {
    setEditingId(tmpl.id);
    setForm({
      name_ar: tmpl.name_ar,
      category: tmpl.category,
      message_text: tmpl.message_text,
      shortcut: tmpl.shortcut || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name_ar.trim() || !form.message_text.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/cs/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          id: editingId,
          ...form,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchTemplates();
      }
    } catch {
      // Network error
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("متأكد تحذف القالب ده؟")) return;

    try {
      const res = await fetch("/api/admin/cs/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({ action: "delete", id }),
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch {
      // Network error
    }
  };

  const handleToggleActive = async (tmpl: CSTemplate) => {
    try {
      await fetch("/api/admin/cs/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          action: "update",
          id: tmpl.id,
          is_active: !tmpl.is_active,
        }),
      });
      fetchTemplates();
    } catch {
      // Network error
    }
  };

  const filteredTemplates =
    filterCategory === "all"
      ? templates
      : templates.filter((t) => t.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-[#D4A843]" />
            قوالب خدمة العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            قوالب جاهزة للرد السريع على المحادثات
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors"
          >
            <Plus size={16} />
            إضافة قالب جديد
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            filterCategory === "all"
              ? "bg-[#1B7A3D] text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          الكل ({templates.length})
        </button>
        {CATEGORY_OPTIONS.map((cat) => {
          const count = templates.filter((t) => t.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat.value
                  ? "bg-[#1B7A3D] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading && templates.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">لا توجد قوالب</p>
          <button
            onClick={handleCreate}
            className="mt-3 text-[#1B7A3D] text-sm font-medium"
          >
            + إضافة قالب جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className={`bg-white rounded-2xl border p-5 transition-shadow hover:shadow-md ${
                tmpl.is_active
                  ? "border-gray-200"
                  : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900">{tmpl.name_ar}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      CATEGORY_COLORS[tmpl.category] || CATEGORY_COLORS.general
                    }`}
                  >
                    {CATEGORY_OPTIONS.find((c) => c.value === tmpl.category)
                      ?.label || tmpl.category}
                  </span>
                  {tmpl.shortcut && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                      {tmpl.shortcut}
                    </span>
                  )}
                  {!tmpl.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500">
                      معطّل
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4 mb-3 bg-gray-50 rounded-xl p-3">
                {tmpl.message_text}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  استخدام: {tmpl.usage_count} مرة
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(tmpl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tmpl.is_active
                        ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {tmpl.is_active ? "تعطيل" : "تفعيل"}
                  </button>
                  <button
                    onClick={() => handleEdit(tmpl)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Pencil size={12} />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "تعديل القالب" : "إضافة قالب جديد"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Tag size={14} className="inline ml-1" />
                    اسم القالب
                  </label>
                  <input
                    type="text"
                    value={form.name_ar}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name_ar: e.target.value }))
                    }
                    placeholder="مثل: ترحيب، خطوات التسجيل..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفئة
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        category: e.target.value as CSTemplateCategory,
                      }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shortcut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Hash size={14} className="inline ml-1" />
                    الاختصار (اختياري)
                  </label>
                  <input
                    type="text"
                    value={form.shortcut}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, shortcut: e.target.value }))
                    }
                    placeholder="مثل: /تسجيل أو /شكوى"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
                    dir="rtl"
                  />
                </div>

                {/* Message Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نص الرسالة
                  </label>
                  <textarea
                    value={form.message_text}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        message_text: e.target.value,
                      }))
                    }
                    placeholder="اكتب نص القالب هنا..."
                    rows={6}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none resize-none"
                    dir="rtl"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    استخدم {"{{agent_name}}"} لاسم الموظف و {"{{category}}"}{" "}
                    للفئة
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={
                    saving || !form.name_ar.trim() || !form.message_text.trim()
                  }
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة القالب"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
