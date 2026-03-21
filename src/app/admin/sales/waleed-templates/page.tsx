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
  BarChart3,
  Copy,
  Check,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface WaleedTemplate {
  id: string;
  name: string;
  content: string;
  platform: string;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  all: "الكل",
  olx: "OLX",
  opensooq: "السوق المفتوح",
  hatla2ee: "هتلاقي",
  aqarmap: "عقار ماب",
  facebook: "فيسبوك",
  dubizzle: "دوبيزل",
};

export default function WaleedTemplatesPage() {
  const [templates, setTemplates] = useState<WaleedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WaleedTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPlatform, setFormPlatform] = useState("all");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales/waleed-templates?all=true", {
        headers: getAdminHeaders(),
      });
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch (err) {
      console.error("Failed to fetch waleed templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openNewModal = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormContent("");
    setFormPlatform("all");
    setShowModal(true);
  };

  const openEditModal = (t: WaleedTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormContent(t.content);
    setFormPlatform(t.platform);
    setShowModal(true);
  };

  const saveTemplate = async () => {
    if (!formName.trim() || !formContent.trim()) return;

    try {
      if (editingTemplate) {
        // Update
        await fetch("/api/admin/sales/waleed-templates", {
          method: "PUT",
          headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTemplate.id,
            name: formName,
            content: formContent,
            platform: formPlatform,
          }),
        });
      } else {
        // Create
        await fetch("/api/admin/sales/waleed-templates", {
          method: "POST",
          headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            content: formContent,
            platform: formPlatform,
          }),
        });
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    try {
      await fetch(`/api/admin/sales/waleed-templates?id=${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const toggleActive = async (t: WaleedTemplate) => {
    try {
      await fetch("/api/admin/sales/waleed-templates", {
        method: "PUT",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
      });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to toggle:", err);
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
            <h1 className="text-2xl font-bold text-dark">📱 مكتبة رسائل وليد</h1>
            <p className="text-sm text-gray-text mt-1">
              رسائل وليد الشخصية للتواصل مع البائعين عبر واتساب
            </p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B7A3D] hover:bg-[#145C2E] text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          رسالة جديدة
        </button>
      </div>

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
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
          <span className="text-4xl mb-3 block">📝</span>
          <h3 className="text-lg font-bold text-dark mb-1">مفيش رسائل</h3>
          <p className="text-sm text-gray-text">أضف أول رسالة لوليد من الزر أعلاه</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl p-5 border transition-shadow hover:shadow-md ${
                t.is_active ? "border-gray-100" : "border-red-100 opacity-60"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-dark">{t.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      {PLATFORM_LABELS[t.platform] || t.platform}
                    </span>
                    {!t.is_active && (
                      <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">
                        معطلة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-text">
                    <span className="flex items-center gap-1">
                      <BarChart3 size={12} />
                      {t.use_count} استخدام
                    </span>
                    <span>
                      {t.content.slice(0, 100)}
                      {t.content.length > 100 ? "..." : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(t)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    title={t.is_active ? "تعطيل" : "تفعيل"}
                  >
                    {t.is_active ? (
                      <ToggleRight size={18} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={18} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    title="عرض الرسالة"
                  >
                    {expandedId === t.id ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => copyText(t.id, t.content)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    title="نسخ"
                  >
                    {copiedId === t.id ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(t)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    title="تعديل"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === t.id && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <pre className="text-sm text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed">
                    {t.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Variables Reference */}
      <div className="bg-[#FFF8E1] rounded-2xl p-5 border border-[#D4A843]/20">
        <h3 className="text-sm font-bold text-[#D4A843] mb-2">📌 المتغيرات المتاحة</h3>
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
          <div>
            <code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{name}}"}</code> — اسم
            البائع
          </div>
          <div>
            <code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{platform}}"}</code> —
            المنصة
          </div>
          <div>
            <code className="bg-white px-1 py-0.5 rounded text-[#1B7A3D]">{"{{city}}"}</code> —
            المدينة
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark">
                {editingTemplate ? "تعديل الرسالة" : "رسالة جديدة"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-text mb-1 block">
                  اسم الرسالة
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
                  placeholder="مثلاً: رسالة للتجار / رسالة للأفراد"
                />
              </div>

              <div>
                <label className="text-xs text-gray-text mb-1 block">
                  المنصة
                </label>
                <select
                  value={formPlatform}
                  onChange={(e) => setFormPlatform(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
                >
                  {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-text mb-1 block">
                  نص الرسالة
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20 font-[Cairo] leading-relaxed"
                  placeholder="اكتب نص الرسالة... استخدم {{name}} و {{platform}} و {{city}} للمتغيرات"
                />
              </div>

              {/* Variables hint */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                <span className="font-bold">المتغيرات:</span>{" "}
                <code className="text-[#1B7A3D]">{"{{name}}"}</code> اسم البائع •{" "}
                <code className="text-[#1B7A3D]">{"{{platform}}"}</code> المنصة •{" "}
                <code className="text-[#1B7A3D]">{"{{city}}"}</code> المدينة
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveTemplate}
                  disabled={!formName.trim() || !formContent.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  حفظ
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <X size={16} />
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
