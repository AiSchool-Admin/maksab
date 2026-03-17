"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Bot,
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";
import type { CSSettings } from "@/types/cs";

const DEFAULT_SETTINGS: CSSettings = {
  ai_enabled: true,
  ai_auto_greet: true,
  ai_auto_transfer: true,
  ai_handle_complaints: false,
  ai_max_messages: 3,
  ai_transfer_delay_seconds: 30,
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  outside_hours_ai_only: true,
};

export default function CSSettingsPage() {
  const [settings, setSettings] = useState<CSSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cs/settings", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings && Object.keys(data.settings).length > 0) {
          setSettings({
            ai_enabled: data.settings.ai_enabled ?? DEFAULT_SETTINGS.ai_enabled,
            ai_auto_greet:
              data.settings.ai_auto_greet ?? DEFAULT_SETTINGS.ai_auto_greet,
            ai_auto_transfer:
              data.settings.ai_auto_transfer ??
              DEFAULT_SETTINGS.ai_auto_transfer,
            ai_handle_complaints:
              data.settings.ai_handle_complaints ??
              DEFAULT_SETTINGS.ai_handle_complaints,
            ai_max_messages:
              data.settings.ai_max_messages ?? DEFAULT_SETTINGS.ai_max_messages,
            ai_transfer_delay_seconds:
              data.settings.ai_transfer_delay_seconds ??
              DEFAULT_SETTINGS.ai_transfer_delay_seconds,
            working_hours_start:
              data.settings.working_hours_start ??
              DEFAULT_SETTINGS.working_hours_start,
            working_hours_end:
              data.settings.working_hours_end ??
              DEFAULT_SETTINGS.working_hours_end,
            outside_hours_ai_only:
              data.settings.outside_hours_ai_only ??
              DEFAULT_SETTINGS.outside_hours_ai_only,
          });
        }
      }
    } catch {
      // Network error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/cs/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Network error
    }
    setSaving(false);
  };

  const updateSetting = <K extends keyof CSSettings>(
    key: K,
    value: CSSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={24} className="text-[#1B7A3D]" />
            إعدادات خدمة العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            التحكم في سارة AI وساعات العمل والتحويل التلقائي
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            saved
              ? "bg-green-500 text-white"
              : "bg-[#1B7A3D] text-white hover:bg-[#145C2E]"
          } disabled:opacity-50`}
        >
          {saved ? (
            <>
              <CheckCircle2 size={16} />
              تم الحفظ!
            </>
          ) : saving ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save size={16} />
              حفظ الإعدادات
            </>
          )}
        </button>
      </div>

      {/* Sara AI Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bot size={20} className="text-purple-500" />
          <h2 className="text-lg font-bold text-gray-900">سارة AI</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600">
            🤖 المساعدة الذكية
          </span>
        </div>

        <div className="space-y-5">
          {/* AI Enabled */}
          <ToggleSetting
            label="تفعيل الرد التلقائي"
            description="سارة AI ترد على المحادثات الجديدة تلقائياً"
            checked={settings.ai_enabled}
            onChange={(v) => updateSetting("ai_enabled", v)}
          />

          {/* Auto Greet */}
          <ToggleSetting
            label="ترحيب تلقائي لكل محادثة جديدة"
            description="سارة تبعت رسالة ترحيب أول ما المستخدم يفتح شات"
            checked={settings.ai_auto_greet}
            onChange={(v) => updateSetting("ai_auto_greet", v)}
            disabled={!settings.ai_enabled}
          />

          {/* Auto Transfer */}
          <ToggleSetting
            label="تحويل تلقائي للموظف لو AI مش قادرة"
            description="بعد عدد معين من الرسائل بدون حل، تحول لموظف"
            checked={settings.ai_auto_transfer}
            onChange={(v) => updateSetting("ai_auto_transfer", v)}
            disabled={!settings.ai_enabled}
          />

          {/* Handle Complaints */}
          <ToggleSetting
            label="AI ترد على الشكاوى"
            description="غير موصى — الشكاوى أحسن يتعامل معاها موظف بشري"
            checked={settings.ai_handle_complaints}
            onChange={(v) => updateSetting("ai_handle_complaints", v)}
            disabled={!settings.ai_enabled}
            warning
          />

          {/* Max Messages */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                حد أقصى رسائل AI قبل التحويل
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                عدد رسائل AI قبل ما تحول لموظف بشري
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateSetting(
                    "ai_max_messages",
                    Math.max(1, settings.ai_max_messages - 1)
                  )
                }
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
              >
                -
              </button>
              <span className="w-10 text-center font-bold text-gray-900">
                {settings.ai_max_messages}
              </span>
              <button
                onClick={() =>
                  updateSetting(
                    "ai_max_messages",
                    Math.min(10, settings.ai_max_messages + 1)
                  )
                }
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Transfer Delay */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                وقت الانتظار قبل التحويل (ثانية)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                الوقت اللي AI تستنى قبل ما تحول
              </p>
            </div>
            <select
              value={settings.ai_transfer_delay_seconds}
              onChange={(e) =>
                updateSetting(
                  "ai_transfer_delay_seconds",
                  Number(e.target.value)
                )
              }
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
            >
              <option value={10}>10 ثانية</option>
              <option value={30}>30 ثانية</option>
              <option value={60}>دقيقة</option>
              <option value={120}>دقيقتين</option>
              <option value={300}>5 دقائق</option>
            </select>
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock size={20} className="text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900">ساعات العمل</h2>
        </div>

        <div className="space-y-5">
          {/* Working Hours */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                من
              </label>
              <input
                type="time"
                value={settings.working_hours_start}
                onChange={(e) =>
                  updateSetting("working_hours_start", e.target.value)
                }
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                إلى
              </label>
              <input
                type="time"
                value={settings.working_hours_end}
                onChange={(e) =>
                  updateSetting("working_hours_end", e.target.value)
                }
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
              />
            </div>
          </div>

          {/* Outside Hours AI Only */}
          <ToggleSetting
            label="خارج ساعات العمل: AI فقط"
            description="خارج ساعات العمل سارة AI بترد + رسالة &quot;هنرد عليك الصبح&quot;"
            checked={settings.outside_hours_ai_only}
            onChange={(v) => updateSetting("outside_hours_ai_only", v)}
          />
        </div>
      </div>

      {/* Logic Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-purple-500" />
          <h2 className="text-lg font-bold text-gray-900">كيف بيشتغل النظام</h2>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5">1.</span>
            <p>
              رسالة جديدة من مستخدم → سارة AI ترد (لو مفعّلة)
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5">2.</span>
            <p>
              لو AI ردت {settings.ai_max_messages} مرات ولسه مش محلول → تحويل
              لموظف
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5">3.</span>
            <p>
              لو شكوى/احتيال → تحويل فوري لموظف (بدون AI)
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5">4.</span>
            <p>
              خارج ساعات العمل ({settings.working_hours_start} -{" "}
              {settings.working_hours_end}) → AI فقط + رسالة &quot;هنرد عليك
              الصبح&quot;
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5">5.</span>
            <p>الموظف يقدر ياخد أي محادثة من AI في أي وقت</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toggle Setting Component
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  warning = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {warning && (
            <AlertTriangle size={14} className="text-yellow-500" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-[#1B7A3D]" : "bg-gray-200"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "-translate-x-6" : "-translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
