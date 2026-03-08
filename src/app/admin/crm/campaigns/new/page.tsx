"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Megaphone, ArrowRight, Target, MessageCircle, Settings, CheckCircle,
  Plus, Trash2, X, Zap, Clock
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";
import { CATEGORY_LABELS } from "@/types/crm";

interface Template {
  id: string;
  name: string;
  channel: string;
  campaign_type: string | null;
  category: string | null;
  body: string;
}

const CAMPAIGN_TYPES = [
  { value: "acquisition", label: "اكتساب عملاء", icon: "🎯", desc: "دعوة عملاء محتملين جدد" },
  { value: "activation", label: "تفعيل", icon: "🚀", desc: "تفعيل مسجلين جدد" },
  { value: "engagement", label: "تفاعل", icon: "💬", desc: "زيادة تفاعل العملاء" },
  { value: "retention", label: "احتفاظ", icon: "🛡️", desc: "منع العملاء من المغادرة" },
  { value: "reactivation", label: "إعادة تنشيط", icon: "🔄", desc: "إعادة عملاء خاملين" },
  { value: "upsell", label: "ترقية", icon: "⬆️", desc: "ترقية باقة العميل" },
  { value: "commission", label: "عمولة", icon: "💰", desc: "تشجيع دفع العمولة" },
  { value: "promotion", label: "عرض ترويجي", icon: "🎁", desc: "عروض وخصومات" },
  { value: "referral", label: "إحالة", icon: "👥", desc: "تشجيع الإحالات" },
  { value: "announcement", label: "إعلان", icon: "📢", desc: "إعلانات عامة" },
];

const LIFECYCLE_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "lead", label: "عميل محتمل" },
  { value: "qualified", label: "مؤهل" },
  { value: "contacted", label: "تم التواصل" },
  { value: "interested", label: "مهتم" },
  { value: "onboarding", label: "تسجيل" },
  { value: "activated", label: "مفعّل" },
  { value: "active", label: "نشط" },
  { value: "power_user", label: "مستخدم قوي" },
  { value: "at_risk", label: "معرض للخطر" },
  { value: "dormant", label: "خامل" },
  { value: "churned", label: "مفقود" },
  { value: "reactivated", label: "معاد تنشيطه" },
];

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "واتساب", sms: "SMS", email: "بريد إلكتروني", in_app: "داخل التطبيق",
};

export default function CampaignWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    campaign_type: "acquisition",
    // Targeting
    target_lifecycle: "",
    target_category: "",
    target_governorate: "",
    target_account_type: "",
    target_subscription: "",
    target_source: "",
    // Messages
    messages: [{ channel: "whatsapp", content: "", delay_hours: 0, sequence: 1, stop_if_responded: true }],
    // Settings
    daily_send_limit: 500,
    hourly_send_limit: 50,
    send_window_start: "09:00",
    send_window_end: "21:00",
    max_messages_per_customer_per_week: 3,
  });

  // Fetch templates for insertion
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/crm/templates?is_active=true", { headers: getAdminHeaders() });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const addMessage = () => {
    setForm(f => ({
      ...f,
      messages: [...f.messages, {
        channel: "whatsapp",
        content: "",
        delay_hours: f.messages.length * 48,
        sequence: f.messages.length + 1,
        stop_if_responded: true,
      }],
    }));
  };

  const removeMessage = (idx: number) => {
    setForm(f => ({ ...f, messages: f.messages.filter((_, i) => i !== idx) }));
  };

  const updateMessage = (idx: number, field: string, value: unknown) => {
    setForm(f => ({
      ...f,
      messages: f.messages.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }));
  };

  const applyTemplate = (idx: number, template: Template) => {
    updateMessage(idx, "content", template.body);
    updateMessage(idx, "channel", template.channel);
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
    if (form.target_source) targetFilters.source = form.target_source;

    try {
      const res = await fetch("/api/admin/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          campaign_type: form.campaign_type,
          target_filters: targetFilters,
          messages: form.messages.filter(m => m.content.trim()),
          daily_send_limit: form.daily_send_limit,
          hourly_send_limit: form.hourly_send_limit,
          send_window_start: form.send_window_start,
          send_window_end: form.send_window_end,
          max_messages_per_customer_per_week: form.max_messages_per_customer_per_week,
          status: "draft",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/crm/campaigns/${data.campaign?.id || ""}`);
      } else {
        const data = await res.json();
        setError(data.error || "حصل مشكلة");
      }
    } catch {
      setError("حصل مشكلة في الاتصال");
    }
    setLoading(false);
  };

  // Filter templates for the current campaign type
  const relevantTemplates = templates.filter(t =>
    !t.campaign_type || t.campaign_type === form.campaign_type
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/crm/campaigns" className="hover:text-[#1B7A3D]">إدارة الحملات</Link>
        <ArrowRight size={12} />
        <span className="text-gray-800 font-medium">حملة جديدة</span>
      </div>

      <h2 className="text-lg font-bold flex items-center gap-2">
        <Megaphone size={20} className="text-[#1B7A3D]" />
        معالج إنشاء الحملة
      </h2>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-[#1B7A3D]' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-center text-gray-500">
        {step === 1 ? "١. معلومات الحملة" : step === 2 ? "٢. الاستهداف" : step === 3 ? "٣. الرسائل" : "٤. الإعدادات والمراجعة"}
      </p>

      {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl">{error}</div>}

      {/* Step 1: Info */}
      {step === 1 && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-600 block mb-1">اسم الحملة *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="مثال: حملة اكتساب تجار موبايلات مارس" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">الوصف</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm" rows={2} />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-2">نوع الحملة</label>
            <div className="grid grid-cols-2 gap-2">
              {CAMPAIGN_TYPES.map(t => (
                <button key={t.value}
                  onClick={() => setForm(f => ({ ...f, campaign_type: t.value }))}
                  className={`text-right p-3 rounded-xl border-2 transition-colors ${
                    form.campaign_type === t.value
                      ? "border-[#1B7A3D] bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <span className="text-lg ml-2">{t.icon}</span>
                  <span className="text-sm font-medium">{t.label}</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Targeting */}
      {step === 2 && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-xl flex items-start gap-2">
            <Target size={14} className="mt-0.5 shrink-0" />
            <span>العملاء اللي هيطابقوا كل الفلاتر هم اللي هيوصلهم الرسالة. اترك الحقل فاضي = الكل.</span>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">مرحلة العميل</label>
            <select value={form.target_lifecycle} onChange={e => setForm(f => ({ ...f, target_lifecycle: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
              {LIFECYCLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">الفئة</label>
              <select value={form.target_category} onChange={e => setForm(f => ({ ...f, target_category: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                <option value="">الكل</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">المحافظة</label>
              <input value={form.target_governorate} onChange={e => setForm(f => ({ ...f, target_governorate: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="مثال: القاهرة" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>
        </div>
      )}

      {/* Step 3: Messages */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl flex items-start gap-2">
            <MessageCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              أضف رسالة أو أكتر بتسلسل (Drip Campaign). استخدم {"{{name}}"} لاسم العميل، {"{{category_ar}}"} للفئة، {"{{join_url}}"} لرابط التسجيل.
            </span>
          </div>

          {/* Template Quick-Insert */}
          {relevantTemplates.length > 0 && (
            <div className="bg-white rounded-xl border p-3">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <Zap size={12} className="text-amber-500" />
                قوالب جاهزة — اضغط لإدراج
              </p>
              <div className="flex gap-2 flex-wrap">
                {relevantTemplates.slice(0, 6).map(t => (
                  <button key={t.id}
                    onClick={() => {
                      const emptyIdx = form.messages.findIndex(m => !m.content.trim());
                      if (emptyIdx >= 0) applyTemplate(emptyIdx, t);
                      else {
                        addMessage();
                        setTimeout(() => applyTemplate(form.messages.length, t), 0);
                      }
                    }}
                    className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-100">
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.messages.map((msg, idx) => (
            <div key={idx} className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">رسالة {idx + 1}</span>
                {form.messages.length > 1 && (
                  <button onClick={() => removeMessage(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">القناة</label>
                  <select value={msg.channel} onChange={e => updateMessage(idx, "channel", e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white">
                    {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">تأخير (ساعات)</label>
                  <input type="number" min="0" value={msg.delay_hours}
                    onChange={e => updateMessage(idx, "delay_hours", parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-1.5 text-xs" />
                </div>
              </div>

              <textarea
                value={msg.content}
                onChange={e => updateMessage(idx, "content", e.target.value)}
                placeholder="اكتب محتوى الرسالة..."
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                rows={5}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">{msg.content.length} حرف</p>
                <label className="flex items-center gap-1 text-[10px] text-gray-500">
                  <input type="checkbox" checked={msg.stop_if_responded}
                    onChange={e => updateMessage(idx, "stop_if_responded", e.target.checked)}
                    className="rounded" />
                  توقف إذا رد
                </label>
              </div>
            </div>
          ))}

          <button onClick={addMessage}
            className="w-full py-2.5 border border-dashed rounded-xl text-xs text-gray-500 hover:text-[#1B7A3D] hover:border-[#1B7A3D]">
            <Plus size={14} className="inline ml-1" />
            أضف رسالة أخرى
          </button>
        </div>
      )}

      {/* Step 4: Settings & Review */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Settings size={16} className="text-gray-600" />
              إعدادات الإرسال
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">الحد اليومي</label>
                <input type="number" value={form.daily_send_limit}
                  onChange={e => setForm(f => ({ ...f, daily_send_limit: parseInt(e.target.value) || 500 }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">الحد بالساعة</label>
                <input type="number" value={form.hourly_send_limit}
                  onChange={e => setForm(f => ({ ...f, hourly_send_limit: parseInt(e.target.value) || 50 }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
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
            <div>
              <label className="text-xs text-gray-600 block mb-1">حد أسبوعي لكل عميل</label>
              <input type="number" value={form.max_messages_per_customer_per_week}
                onChange={e => setForm(f => ({ ...f, max_messages_per_customer_per_week: parseInt(e.target.value) || 3 }))}
                className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl border p-4 space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle size={16} className="text-[#1B7A3D]" />
              ملخص الحملة
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>الاسم: <b className="text-gray-800">{form.name || "—"}</b></p>
              <p>النوع: <b className="text-gray-800">{CAMPAIGN_TYPES.find(t => t.value === form.campaign_type)?.label || form.campaign_type}</b></p>
              <p>عدد الرسائل: <b className="text-gray-800">{form.messages.filter(m => m.content.trim()).length}</b></p>
              <p>إعدادات الإرسال: <b className="text-gray-800">{form.send_window_start}—{form.send_window_end}، حد يومي {form.daily_send_limit}</b></p>
              {form.target_lifecycle && <p>مرحلة: <b className="text-blue-700">{LIFECYCLE_OPTIONS.find(o => o.value === form.target_lifecycle)?.label}</b></p>}
              {form.target_category && <p>فئة: <b className="text-blue-700">{CATEGORY_LABELS[form.target_category] || form.target_category}</b></p>}
              {form.target_governorate && <p>محافظة: <b className="text-blue-700">{form.target_governorate}</b></p>}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50">السابق</button>
        )}
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E]">
            التالي
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            إنشاء الحملة (مسودة)
          </button>
        )}
      </div>
    </div>
  );
}
