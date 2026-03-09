"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import type {
  AheScope,
  AheCategoryMapping,
  AheGovernorateMapping,
} from "@/lib/crm/harvester/types";

interface ScopesData {
  scopes: AheScope[];
  categories: AheCategoryMapping[];
  governorates: AheGovernorateMapping[];
}

export default function ScopesPage() {
  const [data, setData] = useState<ScopesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm/harvester/scopes", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function scopeAction(action: string, scopeId: string) {
    setActionLoading(scopeId);
    try {
      await fetch("/api/admin/crm/harvester", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ action, scope_id: scopeId }),
      });
      await loadData();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-red-600">فشل في تحميل البيانات</div>;
  }

  const { scopes, categories, governorates } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/crm/harvester"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← محرك الحصاد
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">📋 إدارة النطاقات</h1>
          <p className="text-gray-500 text-sm">
            {scopes.length} نطاق — {scopes.filter((s) => s.is_active).length} نشط
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + إضافة نطاق
        </button>
      </div>

      {/* Scopes List */}
      <div className="space-y-3">
        {scopes.map((scope) => (
          <ScopeCard
            key={scope.id}
            scope={scope}
            onAction={scopeAction}
            actionLoading={actionLoading}
          />
        ))}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <ScopeWizard
          categories={categories}
          governorates={governorates}
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            setShowWizard(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ScopeCard({
  scope,
  onAction,
  actionLoading,
}: {
  scope: AheScope;
  onAction: (action: string, scopeId: string) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === scope.id;

  const categoryIcons: Record<string, string> = {
    phones: "📱",
    electronics: "🖥️",
    vehicles: "🚗",
    properties: "🏠",
    furniture: "🪑",
    fashion: "👗",
    kids: "👶",
    sports: "⚽",
    pets: "🐾",
    jobs: "💼",
    services: "🔧",
    other: "📦",
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-4 ${
        !scope.is_active ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {categoryIcons[scope.maksab_category] || "📦"}
            </span>
            <h3 className="font-bold text-gray-900">{scope.name}</h3>
            {scope.is_active && !scope.is_paused && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                نشط
              </span>
            )}
            {scope.is_active && scope.is_paused && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                متوقف مؤقتاً
              </span>
            )}
            {!scope.is_active && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                غير مفعّل
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-1">
            <code className="bg-gray-100 px-1 rounded">{scope.code}</code>
            {" · "}أولوية: {scope.priority}
            {" · "}كل {scope.harvest_interval_minutes} دقيقة
            {" · "}{scope.max_pages_per_harvest} صفحات
          </p>

          {/* Stats */}
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>🌾 {scope.total_harvests} حصاد</span>
            <span>📰 {scope.total_listings_found} إعلان</span>
            <span>📱 {scope.total_phones_extracted} رقم</span>
            {scope.last_harvest_at && (
              <span>
                آخر حصاد:{" "}
                {new Date(scope.last_harvest_at).toLocaleString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
            {scope.last_harvest_new_listings > 0 && (
              <span className="text-green-600">
                +{scope.last_harvest_new_listings} جديد
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 mr-4">
          {!scope.is_active ? (
            <button
              onClick={() => onAction("activate_scope", scope.id)}
              disabled={isLoading}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
            >
              تفعيل
            </button>
          ) : (
            <>
              {scope.is_paused ? (
                <button
                  onClick={() => onAction("resume_scope", scope.id)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  استئناف
                </button>
              ) : (
                <button
                  onClick={() => onAction("pause_scope", scope.id)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 disabled:opacity-50"
                >
                  إيقاف مؤقت
                </button>
              )}
              <button
                onClick={() => onAction("deactivate_scope", scope.id)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
              >
                إلغاء
              </button>
            </>
          )}
          <button
            onClick={() => onAction("test_scope", scope.id)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50"
          >
            🧪 اختبار
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ SCOPE CREATION WIZARD (4 steps) ═══

function ScopeWizard({
  categories,
  governorates,
  onClose,
  onCreated,
}: {
  categories: AheCategoryMapping[];
  governorates: AheGovernorateMapping[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    source_platform: "dubizzle",
    maksab_category: "",
    governorate: "",
    city: "",
    harvest_interval_minutes: 60,
    max_pages_per_harvest: 5,
    priority: 5,
    delay_between_requests_ms: 5000,
    detail_fetch_enabled: true,
  });

  const selectedCategory = categories.find(
    (c) => c.maksab_category === form.maksab_category
  );
  const selectedGov = governorates.find(
    (g) => g.maksab_governorate === form.governorate
  );

  // Auto-generate name, code, and URL
  const autoName = selectedCategory && selectedGov
    ? `${selectedCategory.maksab_category_ar} — ${selectedGov.maksab_governorate_ar} — دوبيزل`
    : "";

  const autoCode = selectedCategory && selectedGov
    ? `dub_${form.maksab_category}_${form.governorate}${form.city ? "_" + form.city : ""}`
    : "";

  const autoUrl = selectedCategory && selectedGov
    ? selectedCategory.source_url_template.replace(
        "{gov}",
        selectedGov.source_url_segment
      )
    : "";

  async function createScope() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/crm/harvester/scopes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          name: autoName,
          code: autoCode,
          source_platform: form.source_platform,
          maksab_category: form.maksab_category,
          governorate: form.governorate,
          city: form.city || null,
          base_url: autoUrl,
          harvest_interval_minutes: form.harvest_interval_minutes,
          max_pages_per_harvest: form.max_pages_per_harvest,
          priority: form.priority,
          delay_between_requests_ms: form.delay_between_requests_ms,
          detail_fetch_enabled: form.detail_fetch_enabled,
        }),
      });

      if (res.ok) {
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">✨ إضافة نطاق جديد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${
                  s <= step ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">الخطوة {step} من 4</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Step 1: Platform & Category */}
          {step === 1 && (
            <>
              <h3 className="font-bold">1. اختار المنصة والقسم</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">المنصة</label>
                <select
                  value={form.source_platform}
                  onChange={(e) => setForm({ ...form, source_platform: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                >
                  <option value="dubizzle">دوبيزل</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">القسم</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.maksab_category}
                      onClick={() =>
                        setForm({ ...form, maksab_category: cat.maksab_category })
                      }
                      className={`p-3 rounded-lg border text-sm text-center ${
                        form.maksab_category === cat.maksab_category
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {cat.maksab_category_ar}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <>
              <h3 className="font-bold">2. اختار المحافظة</h3>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {governorates.map((gov) => (
                  <button
                    key={gov.maksab_governorate}
                    onClick={() =>
                      setForm({
                        ...form,
                        governorate: gov.maksab_governorate,
                        harvest_interval_minutes: gov.suggested_interval_minutes,
                      })
                    }
                    className={`p-3 rounded-lg border text-sm text-right ${
                      form.governorate === gov.maksab_governorate
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">{gov.maksab_governorate_ar}</div>
                    <div className="text-xs text-gray-400">
                      ~{gov.estimated_daily_listings} إعلان/يوم
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <>
              <h3 className="font-bold">3. إعدادات الحصاد</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    تكرار الحصاد (دقيقة)
                  </label>
                  <input
                    type="number"
                    value={form.harvest_interval_minutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        harvest_interval_minutes: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full border rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    عدد الصفحات لكل حصاد
                  </label>
                  <input
                    type="number"
                    value={form.max_pages_per_harvest}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_pages_per_harvest: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full border rounded-lg p-2.5"
                    min={1}
                    max={10}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    الأولوية (1-10)
                  </label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: parseInt(e.target.value) || 5 })
                    }
                    className="w-full border rounded-lg p-2.5"
                    min={1}
                    max={10}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="detail_fetch"
                    checked={form.detail_fetch_enabled}
                    onChange={(e) =>
                      setForm({ ...form, detail_fetch_enabled: e.target.checked })
                    }
                    className="rounded"
                  />
                  <label htmlFor="detail_fetch" className="text-sm">
                    جلب تفاصيل كل إعلان (أبطأ لكن أشمل)
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <>
              <h3 className="font-bold">4. مراجعة ونشر</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">الاسم:</span>
                  <span className="font-medium">{autoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الكود:</span>
                  <code className="bg-gray-200 px-1 rounded text-xs">{autoCode}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">المنصة:</span>
                  <span>دوبيزل</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">التكرار:</span>
                  <span>كل {form.harvest_interval_minutes} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الصفحات:</span>
                  <span>{form.max_pages_per_harvest}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الأولوية:</span>
                  <span>{form.priority}</span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-gray-500 text-xs">الرابط:</span>
                  <p className="text-xs break-all text-blue-600 mt-1">{autoUrl}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                سيتم إنشاء النطاق غير مفعّل. يمكنك تفعيله لاحقاً من قائمة النطاقات.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              → السابق
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              إلغاء
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !form.maksab_category) ||
                (step === 2 && !form.governorate)
              }
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي ←
            </button>
          ) : (
            <button
              onClick={createScope}
              disabled={creating}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? "جاري الإنشاء..." : "✅ إنشاء النطاق"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
