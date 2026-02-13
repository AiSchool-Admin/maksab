"use client";

import { useState, useEffect } from "react";
import { Settings, Key, Eye, EyeOff, Save, Trash2, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { useAdmin } from "../layout";

interface AppSetting {
  key: string;
  value: string;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
}

const KNOWN_SETTINGS = [
  {
    key: "OPENAI_API_KEY",
    description: "مفتاح OpenAI API — مطلوب للتعرف الذكي على الصور والأصوات",
    is_secret: true,
    placeholder: "sk-...",
  },
  {
    key: "WHATSAPP_NOTIFICATION_TEMPLATE",
    description: "اسم قالب واتساب للإشعارات (اختياري — الافتراضي: maksab_notification)",
    is_secret: false,
    placeholder: "maksab_notification",
  },
];

export default function AdminSettingsPage() {
  const admin = useAdmin();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(false);

  const fetchSettings = async () => {
    if (!admin) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { "x-admin-id": admin.id },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // Failed to load
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  const handleSave = async (key: string, value: string, description?: string, isSecret?: boolean) => {
    if (!admin) return;
    setSaving((p) => ({ ...p, [key]: true }));
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-id": admin.id,
        },
        body: JSON.stringify({
          key,
          value,
          description,
          is_secret: isSecret,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `تم حفظ ${key} بنجاح` });
        setEditValues((p) => { const n = { ...p }; delete n[key]; return n; });
        await fetchSettings();
      } else {
        setMessage({ type: "error", text: "فشل في الحفظ" });
      }
    } catch {
      setMessage({ type: "error", text: "حصل مشكلة في الاتصال" });
    }

    setSaving((p) => ({ ...p, [key]: false }));
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (key: string) => {
    if (!admin) return;
    if (!confirm(`متأكد تحذف ${key}?`)) return;

    try {
      const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { "x-admin-id": admin.id },
      });

      if (res.ok) {
        setMessage({ type: "success", text: `تم حذف ${key}` });
        await fetchSettings();
      }
    } catch {
      setMessage({ type: "error", text: "فشل في الحذف" });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddNew = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    await handleSave(newKey.trim(), newValue.trim(), newDescription.trim() || undefined, newIsSecret);
    setNewKey("");
    setNewValue("");
    setNewDescription("");
    setNewIsSecret(false);
    setShowAddNew(false);
  };

  // Merge known settings with existing ones
  const existingKeys = new Set(settings.map((s) => s.key));
  const missingKnown = KNOWN_SETTINGS.filter((k) => !existingKeys.has(k.key));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 h-24 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-dark flex items-center gap-2">
          <Settings size={20} />
          الإعدادات
        </h2>
        <p className="text-xs text-gray-text mt-1">إدارة مفاتيح API والإعدادات العامة للتطبيق</p>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-brand-green-light text-brand-green border border-brand-green/20"
              : "bg-error/5 text-error border border-error/20"
          }`}
        >
          {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Missing required settings warning */}
      {missingKnown.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">إعدادات مطلوبة مش مضافة</p>
              <p className="text-xs text-amber-700 mt-1">
                الإعدادات دي لازم تضيفها عشان بعض المميزات تشتغل:
              </p>
              <div className="mt-2 space-y-2">
                {missingKnown.map((k) => (
                  <div key={k.key} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                    <div>
                      <span className="text-xs font-bold text-dark" dir="ltr">{k.key}</span>
                      <p className="text-[11px] text-gray-text">{k.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        setNewKey(k.key);
                        setNewDescription(k.description);
                        setNewIsSecret(k.is_secret);
                        setShowAddNew(true);
                      }}
                      className="text-xs text-brand-green font-bold hover:underline flex-shrink-0"
                    >
                      أضفه
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing settings */}
      <div className="space-y-3">
        {settings.map((setting) => {
          const isEditing = setting.key in editValues;
          const showValue = showSecrets[setting.key] || false;
          const currentValue = isEditing ? editValues[setting.key] : setting.value;

          return (
            <div key={setting.key} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Key size={14} className="text-brand-green flex-shrink-0" />
                    <span className="text-sm font-bold text-dark" dir="ltr">{setting.key}</span>
                    {setting.is_secret && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">سرّي</span>
                    )}
                  </div>
                  {setting.description && (
                    <p className="text-xs text-gray-text mb-2">{setting.description}</p>
                  )}

                  {/* Value display/edit */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={setting.is_secret && !showValue ? "password" : "text"}
                        value={currentValue}
                        onChange={(e) => setEditValues((p) => ({ ...p, [setting.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
                        dir="ltr"
                        placeholder="القيمة..."
                      />
                      {setting.is_secret && (
                        <button
                          type="button"
                          onClick={() => setShowSecrets((p) => ({ ...p, [setting.key]: !showValue }))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showValue ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-text mt-1">
                    آخر تحديث: {new Date(setting.updated_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isEditing && (
                    <button
                      onClick={() => handleSave(setting.key, editValues[setting.key], setting.description || undefined, setting.is_secret)}
                      disabled={saving[setting.key]}
                      className="p-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                      title="حفظ"
                    >
                      <Save size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(setting.key)}
                    className="p-2 text-gray-400 hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {settings.length === 0 && !showAddNew && (
          <div className="text-center py-8">
            <Settings size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-text">مفيش إعدادات مضافة لسه</p>
          </div>
        )}
      </div>

      {/* Add new setting */}
      {showAddNew ? (
        <div className="bg-white rounded-xl border-2 border-brand-green/20 p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark flex items-center gap-2">
            <Plus size={16} className="text-brand-green" />
            إضافة إعداد جديد
          </h3>

          <div>
            <label className="block text-xs font-medium text-dark mb-1">المفتاح (Key)</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="OPENAI_API_KEY"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dark mb-1">القيمة (Value)</label>
            <input
              type={newIsSecret ? "password" : "text"}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={KNOWN_SETTINGS.find((k) => k.key === newKey)?.placeholder || "القيمة..."}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dark mb-1">الوصف (اختياري)</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="وصف الإعداد..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-dark cursor-pointer">
            <input
              type="checkbox"
              checked={newIsSecret}
              onChange={(e) => setNewIsSecret(e.target.checked)}
              className="accent-brand-green"
            />
            قيمة سرّية (هيتم إخفاؤها)
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddNew}
              disabled={!newKey.trim() || !newValue.trim()}
              className="flex-1 py-2.5 bg-brand-green text-white font-bold rounded-lg text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save size={14} />
              حفظ
            </button>
            <button
              onClick={() => { setShowAddNew(false); setNewKey(""); setNewValue(""); setNewDescription(""); }}
              className="px-4 py-2.5 bg-gray-100 text-gray-text rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddNew(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-text hover:border-brand-green hover:text-brand-green transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          إضافة إعداد جديد
        </button>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-bold text-blue-800">تعليمات مهمة</h3>
        <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
          <li>
            <strong>OPENAI_API_KEY:</strong> مطلوب للتعرف الذكي على الصور والأصوات عند إضافة إعلان.
            احصل عليه من{" "}
            <span className="font-bold" dir="ltr">platform.openai.com/api-keys</span>
          </li>
          <li>
            <strong>WHATSAPP_NOTIFICATION_TEMPLATE:</strong> اسم القالب في Meta Business Manager لإرسال إشعارات واتساب.
            القالب لازم يكون معتمد من Meta.
          </li>
          <li>
            الإعدادات السرّية يتم إخفاء قيمتها ولا يمكن رؤيتها بعد الحفظ إلا الأحرف الأخيرة.
          </li>
        </ul>
      </div>
    </div>
  );
}
