"use client";

import { useState, useEffect, useMemo } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import { Plus, Pencil, Trash2, Save, X, Copy, Check, Eye } from "lucide-react";

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
  agent: string;
}

const PREVIEW_VALUES: Record<string, string> = {
  "{{name}}": "وكالة ICON Automotive",
  "{{product}}": "سيارة تويوتا كورولا 2022",
  "{{platform}}": "Dubizzle",
  "{{category}}": "سيارات",
  "{{category_ar}}": "سيارات",
  "{{count}}": "45",
  "{{car_model}}": "تويوتا كورولا 2022",
  "{{price}}": "450,000",
  "{{property_size}}": "150",
  "{{district}}": "سموحة",
  "{{city}}": "الإسكندرية",
  "{{governorate}}": "الإسكندرية",
  "{{listings_count}}": "8",
  "{{join_url}}": "https://maksab.vercel.app/join",
  "{{source_platform}}": "Dubizzle",
};

const TIER_LABELS: Record<string, string> = {
  all: "الكل", whale: "🐋 حوت", agency: "🏢 وكيل",
  broker: "🏷️ سمسار", individual: "👤 فرد",
};

const AGENT_LABELS: Record<string, string> = {
  waleed: "🚗 وليد", ahmed: "🏠 أحمد", general: "عام",
};

function previewMessage(text: string): string {
  let result = text;
  for (const [key, val] of Object.entries(PREVIEW_VALUES)) {
    result = result.replaceAll(key, val);
  }
  return result;
}

function getAgent(t: Template): string {
  return t.agent || "general";
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: "", name_ar: "", category: "acquisition",
    target_type: "seller", target_tier: "all", message_text: "", agent: "general",
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales/templates", { headers: getAdminHeaders() });
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const agent = getAgent(t);
      if (agentFilter !== "all" && agent !== agentFilter) return false;
      if (tierFilter !== "all" && t.target_tier !== tierFilter) return false;
      return true;
    });
  }, [templates, agentFilter, tierFilter]);

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditForm({
      name: t.name, name_ar: t.name_ar, category: t.category,
      target_type: t.target_type, target_tier: t.target_tier, message_text: t.message_text,
      agent: t.agent || "general",
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
      showToast("✅ تم الحفظ");
    } catch { showToast("❌ حدث خطأ"); }
  };

  const createTemplate = async () => {
    if (!editForm.name || !editForm.message_text) { showToast("❌ الاسم والنص مطلوبين"); return; }
    try {
      await fetch("/api/admin/sales/templates", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, name_ar: editForm.name_ar || editForm.name }),
      });
      setShowNew(false);
      setEditForm({ name: "", name_ar: "", category: "acquisition", target_type: "seller", target_tier: "all", message_text: "", agent: "general" });
      fetchTemplates();
      showToast("✅ تم الإنشاء");
    } catch { showToast("❌ حدث خطأ"); }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    try {
      await fetch(`/api/admin/sales/templates?id=${id}`, { method: "DELETE", headers: getAdminHeaders() });
      fetchTemplates();
      showToast("✅ تم الحذف");
    } catch { showToast("❌ حدث خطأ"); }
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Edit/Create Modal
  const renderModal = (isNew: boolean) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => isNew ? setShowNew(false) : setEditingId(null)}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark">{isNew ? "قالب جديد" : "تعديل القالب"}</h3>
          <button onClick={() => isNew ? setShowNew(false) : setEditingId(null)} className="p-1 text-gray-400 hover:text-dark">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-bold text-dark mb-1 block">الاسم</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none" placeholder="رسالة وليد — أفراد Dubizzle" />
          </div>

          <div>
            <label className="text-sm font-bold text-dark mb-1 block">الاسم بالعربي</label>
            <input value={editForm.name_ar} onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none" placeholder="رسالة وليد — أفراد" />
          </div>

          <div>
            <label className="text-sm font-bold text-dark mb-1 block">الـ Agent</label>
            <div className="flex gap-2">
              {[
                { key: "waleed", label: "🚗 وليد" },
                { key: "ahmed", label: "🏠 أحمد" },
                { key: "general", label: "عام" },
              ].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setEditForm({ ...editForm, agent: key })}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    editForm.agent === key ? "bg-brand-green text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-dark mb-1 block">نوع البائع</label>
              <select value={editForm.target_tier} onChange={(e) => setEditForm({ ...editForm, target_tier: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none">
                <option value="all">الكل</option>
                <option value="individual">👤 فرد</option>
                <option value="broker">🏷️ سمسار</option>
                <option value="agency">🏢 وكيل</option>
                <option value="whale">🐋 حوت</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-dark mb-1 block">الفئة</label>
              <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none">
                <option value="acquisition">استحواذ</option>
                <option value="followup">متابعة</option>
                <option value="general">عام</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-dark mb-1 block">نص الرسالة</label>
            <textarea value={editForm.message_text} onChange={(e) => setEditForm({ ...editForm, message_text: e.target.value })}
              rows={8} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none resize-none leading-relaxed"
              placeholder="السلام عليكم {{name}} 👋..." dir="rtl" />
          </div>

          <div>
            <p className="text-[10px] text-gray-text mb-1">المتغيرات المتاحة (اضغط للإضافة):</p>
            <div className="flex flex-wrap gap-1">
              {Object.keys(PREVIEW_VALUES).map((v) => (
                <button key={v} onClick={() => setEditForm({ ...editForm, message_text: editForm.message_text + " " + v })}
                  className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full hover:bg-brand-green-light hover:text-brand-green">
                  {v}
                </button>
              ))}
            </div>
          </div>

          {editForm.message_text && (
            <div>
              <p className="text-sm font-bold text-dark mb-1">معاينة:</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <pre className="text-sm text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed" dir="rtl">
                  {previewMessage(editForm.message_text)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t flex gap-3">
          <button onClick={isNew ? createTemplate : saveEdit}
            className="flex-1 py-2.5 bg-brand-green text-white font-bold rounded-xl text-sm hover:bg-brand-green-dark flex items-center justify-center gap-2">
            <Save size={16} /> حفظ
          </button>
          <button onClick={() => isNew ? setShowNew(false) : setEditingId(null)}
            className="px-6 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-dark text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark">📝 قوالب الرسائل</h1>
          <p className="text-sm text-gray-text">{templates.length} قالب</p>
        </div>
        <button onClick={() => { setShowNew(true); setEditForm({ name: "", name_ar: "", category: "acquisition", target_type: "seller", target_tier: "all", message_text: "", agent: "general" }); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green-dark">
          <Plus size={16} /> قالب جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "الكل" },
          { key: "waleed", label: "🚗 وليد" },
          { key: "ahmed", label: "🏠 أحمد" },
          { key: "general", label: "عام" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAgentFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              agentFilter === key ? "bg-brand-green text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {label}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {[
          { key: "all", label: "الكل" },
          { key: "individual", label: "👤 فرد" },
          { key: "broker", label: "🏷️ سمسار" },
          { key: "agency", label: "🏢 وكالة" },
          { key: "whale", label: "🐋 حوت" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTierFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tierFilter === key ? "bg-[#D4A843] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-32 animate-pulse border border-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📝</p>
          <p className="text-sm">لا توجد قوالب مطابقة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const agent = getAgent(t);
            const isPreview = previewId === t.id;
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-dark">{t.name_ar || t.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          agent === "waleed" ? "bg-blue-50 text-blue-600" : agent === "ahmed" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500"
                        }`}>
                          {AGENT_LABELS[agent] || agent}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {TIER_LABELS[t.target_tier] || t.target_tier}
                        </span>
                        <span className="text-[10px] text-gray-400">{t.usage_count || 0} استخدام</span>
                        {t.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green-light text-brand-green font-bold">افتراضي</span>}
                      </div>
                    </div>
                  </div>

                  {/* Message text */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <pre className="text-xs text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed" dir="rtl">
                      {isPreview ? previewMessage(t.message_text) : t.message_text}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => startEdit(t)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700">
                      <Pencil size={12} /> تعديل
                    </button>
                    <button onClick={() => copyText(t.id, t.message_text)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700">
                      {copiedId === t.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                      {copiedId === t.id ? "تم!" : "نسخ"}
                    </button>
                    <button onClick={() => setPreviewId(isPreview ? null : t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700">
                      <Eye size={12} /> {isPreview ? "النص الأصلي" : "معاينة"}
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-xs text-red-600">
                      <Trash2 size={12} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showNew && renderModal(true)}
      {editingId && renderModal(false)}
    </div>
  );
}
