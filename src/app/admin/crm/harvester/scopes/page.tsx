"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import type {
  AheScope,
  AheCategoryMapping,
  AheGovernorateMapping,
  AheSubcategoryMapping,
} from "@/lib/crm/harvester/types";

interface ScopesData {
  scopes: AheScope[];
  categories: AheCategoryMapping[];
  governorates: AheGovernorateMapping[];
  subcategories: AheSubcategoryMapping[];
}

type ScopeGroupTab = "all" | "general" | "whale_hunting" | "high_value" | "seasonal";

export default function ScopesPage() {
  const [data, setData] = useState<ScopesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<ScopeGroupTab>("all");

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

  const { scopes, categories, governorates, subcategories } = data;

  // Group counts
  const groupCounts: Record<ScopeGroupTab, number> = {
    all: scopes.length,
    general: scopes.filter((s) => (s.scope_group || "general") === "general").length,
    whale_hunting: scopes.filter((s) => s.scope_group === "whale_hunting").length,
    high_value: scopes.filter((s) => s.scope_group === "high_value").length,
    seasonal: scopes.filter((s) => s.scope_group === "seasonal").length,
  };

  // Filter scopes by active tab
  const filteredScopes =
    activeTab === "all"
      ? scopes
      : scopes.filter((s) => (s.scope_group || "general") === activeTab);

  const groupTabs: { key: ScopeGroupTab; label: string; icon: string }[] = [
    { key: "all", label: "الكل", icon: "📋" },
    { key: "general", label: "عام", icon: "🌐" },
    { key: "whale_hunting", label: "حيتان", icon: "🐋" },
    { key: "high_value", label: "عالي القيمة", icon: "💎" },
    { key: "seasonal", label: "موسمي", icon: "📅" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
            إجمالي النطاقات: {scopes.length} | نشط: {scopes.filter((s) => s.is_active).length} | متوقف: {scopes.filter((s) => !s.is_active).length}
            {scopes.filter((s) => s.scope_group === "whale_hunting").length > 0 && (
              <span className="mr-2">
                | 🐋 {scopes.filter((s) => s.scope_group === "whale_hunting").length} صيد حيتان
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <GenerateAllScopesButton onDone={loadData} />
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + إضافة نطاق
          </button>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {groupTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}{" "}
            <span className="text-xs text-gray-400">({groupCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      {/* Scopes List */}
      <div className="space-y-3">
        {filteredScopes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            لا توجد نطاقات في هذه المجموعة
          </div>
        ) : (
          filteredScopes.map((scope) => (
            <ScopeCard
              key={scope.id}
              scope={scope}
              onAction={scopeAction}
              actionLoading={actionLoading}
            />
          ))
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <ScopeWizard
          categories={categories}
          governorates={governorates}
          subcategories={subcategories || []}
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

  const groupBadge: Record<string, { label: string; color: string }> = {
    whale_hunting: { label: "🐋 صيد حيتان", color: "bg-blue-100 text-blue-700" },
    high_value: { label: "💎 عالي القيمة", color: "bg-purple-100 text-purple-700" },
    seasonal: { label: "📅 موسمي", color: "bg-orange-100 text-orange-700" },
  };

  const group = scope.scope_group || "general";
  const badge = groupBadge[group];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-4 ${
        !scope.is_active ? "opacity-60" : ""
      } ${group === "whale_hunting" ? "border-blue-200" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
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
            {badge && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${badge.color}`}>
                {badge.label}
              </span>
            )}
            {scope.subcategory_ar && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                {scope.subcategory_ar}
              </span>
            )}
          </div>

          {/* Description */}
          {scope.description && (
            <p className="text-xs text-gray-500 mt-1">{scope.description}</p>
          )}

          <p className="text-xs text-gray-400 mt-1">
            <code className="bg-gray-100 px-1 rounded">{scope.code}</code>
            {" · "}أولوية: {scope.priority}
            {" · "}كل {scope.harvest_interval_minutes} دقيقة
            {" · "}{scope.max_pages_per_harvest} صفحات
          </p>

          {/* Advanced Filters Summary */}
          {(scope.target_seller_type !== "all" ||
            scope.target_listing_type !== "all" ||
            scope.price_min != null ||
            scope.price_max != null ||
            scope.product_condition != null) && (
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {scope.target_seller_type !== "all" && (
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                  👤 {scope.target_seller_type === "whales" ? "حيتان 🐋" :
                       scope.target_seller_type === "business" ? "تجار" :
                       scope.target_seller_type === "verified" ? "موثقين" : "أفراد"}
                </span>
              )}
              {scope.target_listing_type !== "all" && (
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                  ⭐ {scope.target_listing_type === "featured" ? "مميز" :
                       scope.target_listing_type === "elite" ? "إيليت" : "مميز + إيليت"}
                </span>
              )}
              {(scope.price_min != null || scope.price_max != null) && (
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                  💰 {scope.price_min ? scope.price_min.toLocaleString() : "0"}
                  {" — "}
                  {scope.price_max ? scope.price_max.toLocaleString() : "∞"} جنيه
                </span>
              )}
              {scope.product_condition && (
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                  📦 {scope.product_condition === "new" ? "جديد" : "مستعمل"}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
            <span>🌾 {scope.total_harvests} حصاد</span>
            <span>📰 {scope.total_listings_found} إعلان</span>
            <span>📱 {scope.total_phones_extracted} رقم</span>
            {(scope.total_whales_found || 0) > 0 && (
              <span className="text-blue-600">🐋 {scope.total_whales_found} حوت</span>
            )}
            {(scope.total_filtered_out || 0) > 0 && (
              <span className="text-orange-500">🔍 {scope.total_filtered_out} مفلتر</span>
            )}
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

// ═══ SCOPE CREATION WIZARD (5 steps — Phase 3) ═══

function ScopeWizard({
  categories,
  governorates,
  subcategories,
  onClose,
  onCreated,
}: {
  categories: AheCategoryMapping[];
  governorates: AheGovernorateMapping[];
  subcategories: AheSubcategoryMapping[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    source_platform: "dubizzle",
    maksab_category: "",
    subcategory: "",
    subcategory_ar: "",
    governorate: "",
    city: "",
    harvest_interval_minutes: 60,
    max_pages_per_harvest: 5,
    priority: 5,
    delay_between_requests_ms: 5000,
    detail_fetch_enabled: true,
    // Phase 3: Advanced
    price_min: "",
    price_max: "",
    product_condition: "" as "" | "new" | "used",
    target_seller_type: "all" as string,
    target_listing_type: "all" as string,
    scope_group: "general" as string,
    description: "",
  });

  const selectedCategory = categories.find(
    (c) => c.maksab_category === form.maksab_category
  );
  const selectedGov = governorates.find(
    (g) => g.maksab_governorate === form.governorate
  );

  // Filter subcategories by selected category
  const availableSubcategories = subcategories.filter(
    (s) => s.maksab_category === form.maksab_category
  );

  // Auto-generate name, code, and URL
  const subLabel = form.subcategory_ar ? ` (${form.subcategory_ar})` : "";
  const groupPrefix =
    form.scope_group === "whale_hunting" ? "🐋 " :
    form.scope_group === "high_value" ? "💎 " : "";
  const autoName = selectedCategory && selectedGov
    ? `${groupPrefix}${selectedCategory.maksab_category_ar}${subLabel} — ${selectedGov.maksab_governorate_ar} — دوبيزل`
    : "";

  const autoCode = selectedCategory && selectedGov
    ? `dub_${form.scope_group !== "general" ? form.scope_group.replace("_", "") + "_" : ""}${form.subcategory || form.maksab_category}_${form.governorate}${form.city ? "_" + form.city : ""}`
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
          // Phase 3
          subcategory: form.subcategory || null,
          subcategory_ar: form.subcategory_ar || null,
          price_min: form.price_min ? parseInt(form.price_min) : null,
          price_max: form.price_max ? parseInt(form.price_max) : null,
          product_condition: form.product_condition || null,
          target_seller_type: form.target_seller_type,
          target_listing_type: form.target_listing_type,
          scope_group: form.scope_group,
          description: form.description || null,
        }),
      });

      if (res.ok) {
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  }

  const TOTAL_STEPS = 5;

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
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${
                  s <= step ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">الخطوة {step} من {TOTAL_STEPS}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Step 1: Platform & Category + Subcategory */}
          {step === 1 && (
            <>
              <h3 className="font-bold">1. المنصة والقسم</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">المنصة</label>
                <select
                  value={form.source_platform}
                  onChange={(e) => setForm({ ...form, source_platform: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                >
                  <option value="dubizzle">دوبيزل</option>
                  <option value="opensooq">السوق المفتوح</option>
                  <option value="hatla2ee">هتلاقي</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">القسم الرئيسي</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.maksab_category}
                      onClick={() =>
                        setForm({
                          ...form,
                          maksab_category: cat.maksab_category,
                          subcategory: "",
                          subcategory_ar: "",
                        })
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

              {/* Subcategory (optional) */}
              {availableSubcategories.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    القسم الفرعي <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() =>
                        setForm({ ...form, subcategory: "", subcategory_ar: "" })
                      }
                      className={`p-2 rounded-lg border text-xs text-center ${
                        !form.subcategory
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      الكل
                    </button>
                    {availableSubcategories.map((sub) => (
                      <button
                        key={sub.subcategory}
                        onClick={() =>
                          setForm({
                            ...form,
                            subcategory: sub.subcategory,
                            subcategory_ar: sub.subcategory_ar,
                          })
                        }
                        className={`p-2 rounded-lg border text-xs text-center ${
                          form.subcategory === sub.subcategory
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {sub.subcategory_ar}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <>
              <h3 className="font-bold">2. المحافظة</h3>
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

          {/* Step 4: Advanced Filters (Phase 3) */}
          {step === 4 && (
            <>
              <h3 className="font-bold">4. الفلاتر المتقدمة</h3>
              <p className="text-xs text-gray-400">
                تصفية ما بعد الجلب — الإعلانات التي لا تطابق الشروط يتم استبعادها تلقائياً
              </p>
              <div className="space-y-4">
                {/* Price Range */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">نطاق السعر (جنيه)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="من"
                      value={form.price_min}
                      onChange={(e) => setForm({ ...form, price_min: e.target.value })}
                      className="flex-1 border rounded-lg p-2.5 text-sm"
                    />
                    <span className="text-gray-400">—</span>
                    <input
                      type="number"
                      placeholder="إلى"
                      value={form.price_max}
                      onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                      className="flex-1 border rounded-lg p-2.5 text-sm"
                    />
                  </div>
                </div>

                {/* Product Condition */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">حالة المنتج</label>
                  <div className="flex gap-2">
                    {[
                      { value: "", label: "الكل" },
                      { value: "new", label: "جديد" },
                      { value: "used", label: "مستعمل" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setForm({ ...form, product_condition: opt.value as "" | "new" | "used" })
                        }
                        className={`flex-1 py-2 rounded-lg border text-sm ${
                          form.product_condition === opt.value
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Seller Type */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">نوع المعلن</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "all", label: "الكل" },
                      { value: "business", label: "تجار" },
                      { value: "individual", label: "أفراد" },
                      { value: "verified", label: "موثقين" },
                      { value: "whales", label: "🐋 حيتان" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setForm({ ...form, target_seller_type: opt.value })
                        }
                        className={`py-2 rounded-lg border text-sm ${
                          form.target_seller_type === opt.value
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Listing Type */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">نوع الإعلانات</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "all", label: "الكل" },
                      { value: "featured", label: "⭐ مميز" },
                      { value: "elite", label: "👑 إيليت" },
                      { value: "featured_and_elite", label: "⭐👑 مميز + إيليت" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setForm({ ...form, target_listing_type: opt.value })
                        }
                        className={`py-2 rounded-lg border text-sm ${
                          form.target_listing_type === opt.value
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope Group */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">المجموعة</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "general", label: "🌐 عام" },
                      { value: "whale_hunting", label: "🐋 صيد حيتان" },
                      { value: "high_value", label: "💎 عالي القيمة" },
                      { value: "seasonal", label: "📅 موسمي" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setForm({ ...form, scope_group: opt.value })
                        }
                        className={`py-2 rounded-lg border text-sm ${
                          form.scope_group === opt.value
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    وصف <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: استهداف تجار آيفونات سيدي جابر"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <>
              <h3 className="font-bold">5. مراجعة ونشر</h3>
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
                  <span>{form.source_platform === "dubizzle" ? "دوبيزل" :
                         form.source_platform === "opensooq" ? "السوق المفتوح" : "هتلاقي"}</span>
                </div>
                {form.subcategory_ar && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">القسم الفرعي:</span>
                    <span className="text-indigo-600">{form.subcategory_ar}</span>
                  </div>
                )}
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

                {/* Advanced filters summary */}
                {(form.target_seller_type !== "all" ||
                  form.target_listing_type !== "all" ||
                  form.price_min ||
                  form.price_max ||
                  form.product_condition ||
                  form.scope_group !== "general") && (
                  <div className="pt-2 border-t space-y-1">
                    <span className="text-gray-500 text-xs font-medium">فلاتر متقدمة:</span>
                    {form.scope_group !== "general" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">المجموعة:</span>
                        <span>
                          {form.scope_group === "whale_hunting" ? "🐋 صيد حيتان" :
                           form.scope_group === "high_value" ? "💎 عالي القيمة" : "📅 موسمي"}
                        </span>
                      </div>
                    )}
                    {form.target_seller_type !== "all" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">نوع المعلن:</span>
                        <span>
                          {form.target_seller_type === "whales" ? "🐋 حيتان" :
                           form.target_seller_type === "business" ? "تجار" :
                           form.target_seller_type === "verified" ? "موثقين" : "أفراد"}
                        </span>
                      </div>
                    )}
                    {form.target_listing_type !== "all" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">نوع الإعلانات:</span>
                        <span>
                          {form.target_listing_type === "featured" ? "⭐ مميز" :
                           form.target_listing_type === "elite" ? "👑 إيليت" : "⭐👑 مميز + إيليت"}
                        </span>
                      </div>
                    )}
                    {(form.price_min || form.price_max) && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">نطاق السعر:</span>
                        <span>
                          {form.price_min || "0"} — {form.price_max || "∞"} جنيه
                        </span>
                      </div>
                    )}
                    {form.product_condition && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">الحالة:</span>
                        <span>{form.product_condition === "new" ? "جديد" : "مستعمل"}</span>
                      </div>
                    )}
                  </div>
                )}

                {form.description && (
                  <div className="pt-2 border-t">
                    <span className="text-gray-500 text-xs">الوصف:</span>
                    <p className="text-xs text-gray-700 mt-1">{form.description}</p>
                  </div>
                )}

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

          {step < TOTAL_STEPS ? (
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

// ═══ GENERATE ALL SCOPES BUTTON ═══

function GenerateAllScopesButton({ onDone }: { onDone: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    total: number;
  } | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setShowConfirm(false);
    try {
      const res = await fetch("/api/admin/sales/scopes/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onDone();
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={generating}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
      >
        {generating ? "جاري الإنشاء..." : "🔄 إنشاء كل النطاقات"}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="text-4xl mb-3">🔄</div>
            <h3 className="text-lg font-bold mb-2">إنشاء كل النطاقات</h3>
            <p className="text-sm text-gray-500 mb-4">
              سيتم إنشاء ~200 نطاق جديد لكل الفئات والمحافظات.
              النطاقات الموجودة لن تُحذف — سيتم تحديثها فقط.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                onClick={handleGenerate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                متأكد — ابدأ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold mb-3">تم بنجاح!</h3>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>🆕 نطاقات جديدة: <span className="font-bold text-green-600">{result.created}</span></p>
              <p>🔄 نطاقات محدّثة: <span className="font-bold text-blue-600">{result.updated}</span></p>
              <p>⏭️ تم تخطيها: <span className="font-bold text-gray-400">{result.skipped}</span></p>
              <p>📊 الإجمالي: <span className="font-bold">{result.total}</span></p>
            </div>
            <button
              onClick={() => setResult(null)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
