"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";

interface BookmarkletResult {
  received: number;
  new: number;
  duplicate: number;
  errors: string[];
  timestamp: string;
  employee?: string;
  scope_matched?: boolean;
}

interface BookmarkletToken {
  id: string;
  token: string;
  employee_name: string;
  scope_code: string | null;
  is_active: boolean;
  last_used_at: string | null;
  total_submissions: number;
  created_at: string;
}

interface AheScope {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

type BookmarkletPlatform = "dubizzle" | "hatla2ee" | "contactcars" | "semsarmasr";

const PLATFORM_INFO: Record<BookmarkletPlatform, { name: string; nameAr: string; domain: string; color: string }> = {
  dubizzle: { name: "Dubizzle", nameAr: "دوبيزل", domain: "dubizzle.com.eg", color: "#E53935" },
  hatla2ee: { name: "Hatla2ee", nameAr: "هتلاقي", domain: "eg.hatla2ee.com", color: "#1565C0" },
  contactcars: { name: "ContactCars", nameAr: "كونتاكت كارز", domain: "contactcars.com", color: "#2E7D32" },
  semsarmasr: { name: "SemsarMasr", nameAr: "سمسار مصر", domain: "semsarmasr.com", color: "#E65100" },
};

export default function BookmarkletPage() {
  const [appUrl, setAppUrl] = useState("");
  const [recentResults, setRecentResults] = useState<BookmarkletResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Token management
  const [tokens, setTokens] = useState<BookmarkletToken[]>([]);
  const [scopes, setScopes] = useState<AheScope[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newScopeCode, setNewScopeCode] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);

  // Selected token + scope + platform for bookmarklet generation
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [overrideScopeCode, setOverrideScopeCode] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<BookmarkletPlatform>("dubizzle");
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const loadRecentResults = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm/harvester/receive-bookmarklet?recent=true", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRecentResults(data.results || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm/harvester/bookmarklet-tokens", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadScopes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm/harvester/scopes", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setScopes(data.scopes || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadRecentResults();
    loadTokens();
    loadScopes();
  }, [loadRecentResults, loadTokens, loadScopes]);

  async function createToken() {
    if (!newEmployeeName.trim()) return;
    setCreatingToken(true);
    try {
      const res = await fetch("/api/admin/crm/harvester/bookmarklet-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          employee_name: newEmployeeName.trim(),
          scope_code: newScopeCode || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setTokens((prev) => [data.token, ...prev]);
        setNewEmployeeName("");
        setNewScopeCode("");
        setSelectedTokenId(data.token.id);
      } else {
        alert("خطأ: " + (data.error || "فشل الإنشاء"));
      }
    } catch (err) {
      alert("خطأ: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCreatingToken(false);
    }
  }

  async function deactivateToken(tokenId: string) {
    if (!confirm("تعطيل هذا التوكن؟ الموظف مش هيقدر يستخدم الـ Bookmarklet تاني.")) return;
    try {
      const res = await fetch("/api/admin/crm/harvester/bookmarklet-tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ token_id: tokenId }),
      });
      if (res.ok) {
        setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, is_active: false } : t)));
      }
    } catch {
      // ignore
    }
  }

  async function testBookmarklet() {
    const selectedToken = tokens.find((t) => t.id === selectedTokenId);
    if (!selectedToken) {
      alert("اختار توكن موظف الأول!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/harvester/receive-bookmarklet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bookmarklet-Token": selectedToken.token,
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          url: "https://www.dubizzle.com.eg/test",
          listings: [
            {
              url: `https://www.dubizzle.com.eg/test/listing-${Date.now()}`,
              title: "اختبار — إعلان تجريبي من Bookmarklet",
              price: 10000,
              location: "القاهرة",
              dateText: "منذ ساعة",
              sellerName: "اختبار",
            },
          ],
          timestamp: new Date().toISOString(),
          source: "bookmarklet_test",
          scope_code: overrideScopeCode || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecentResults((prev) => [data, ...prev].slice(0, 10));
        alert(
          `تم استقبال ${data.received} إعلان — ${data.new} جديد، ${data.duplicate} مكرر\nالموظف: ${data.employee}\nScope matched: ${data.scope_matched ? "نعم" : "لا"}`
        );
      } else {
        alert("خطأ: " + (data.error || "فشل الإرسال"));
      }
    } catch (err) {
      alert("خطأ في الاتصال: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  // Build the bookmarklet code for selected token + scope + platform
  const selectedToken = tokens.find((t) => t.id === selectedTokenId);
  const effectiveScopeCode = overrideScopeCode || selectedToken?.scope_code || "";
  const bookmarkletCode = selectedToken
    ? buildBookmarkletForPlatform(selectedPlatform, appUrl, selectedToken.token, effectiveScopeCode)
    : "";

  const activeTokens = tokens.filter((t) => t.is_active);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔖 Bookmarklet — حصاد المنصات المحظورة</h1>
          <p className="text-gray-500 text-sm mt-1">
            للمنصات المحظورة من server-side fetch (403) — الموظف يفتح الصفحة ويضغط الـ Bookmarklet
          </p>
        </div>
        <Link
          href="/admin/crm/harvester"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          → العودة للمحرك
        </Link>
      </div>

      {/* Platform Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">🎯 اختار المنصة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.entries(PLATFORM_INFO) as [BookmarkletPlatform, typeof PLATFORM_INFO[BookmarkletPlatform]][]).map(([id, info]) => (
            <button
              key={id}
              onClick={() => setSelectedPlatform(id)}
              className={`p-4 rounded-xl border-2 text-right transition-all ${
                selectedPlatform === id
                  ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-bold text-lg" style={{ color: info.color }}>
                {info.name}
              </div>
              <div className="text-gray-500 text-sm">{info.nameAr}</div>
              <div className="text-gray-400 text-xs mt-1" dir="ltr">{info.domain}</div>
              {id !== "dubizzle" && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  محظور 403 — يحتاج Bookmarklet
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Token Management */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">🔑 توكنات الموظفين</h2>
        <p className="text-gray-500 text-sm mb-4">
          كل موظف لازم يكون عنده توكن فريد — الـ Bookmarklet مش هيشتغل من غيره
        </p>

        {/* Create new token */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-bold text-sm mb-3">إنشاء توكن جديد</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="اسم الموظف"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={newScopeCode}
              onChange={(e) => setNewScopeCode(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">بدون scope افتراضي (auto-detect)</option>
              {scopes
                .filter((s) => s.is_active)
                .map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
            </select>
            <button
              onClick={createToken}
              disabled={creatingToken || !newEmployeeName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
            >
              {creatingToken ? "جاري..." : "➕ إنشاء"}
            </button>
          </div>
        </div>

        {/* Token list */}
        {tokens.length > 0 ? (
          <div className="space-y-2">
            {tokens.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                  t.is_active ? "bg-white" : "bg-gray-100 opacity-60"
                } ${selectedTokenId === t.id ? "ring-2 ring-green-500" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => t.is_active && setSelectedTokenId(t.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedTokenId === t.id
                        ? "border-green-600 bg-green-600"
                        : "border-gray-300"
                    }`}
                    disabled={!t.is_active}
                  >
                    {selectedTokenId === t.id && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </button>
                  <div>
                    <span className="font-bold">{t.employee_name}</span>
                    {t.scope_code && (
                      <span className="text-gray-400 text-xs mr-2">
                        [scope: {t.scope_code}]
                      </span>
                    )}
                    {!t.is_active && (
                      <span className="text-red-500 text-xs mr-2">معطّل</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{t.total_submissions} إرسال</span>
                  {t.last_used_at && (
                    <span>آخر استخدام: {new Date(t.last_used_at).toLocaleDateString("ar-EG")}</span>
                  )}
                  {t.is_active && (
                    <button
                      onClick={() => deactivateToken(t.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      تعطيل
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">
            لا توجد توكنات — أنشئ توكن للموظف الأول
          </p>
        )}
      </div>

      {/* Bookmarklet Generation (only if token selected) */}
      {selectedToken && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">
            🌾 Bookmarklet {PLATFORM_INFO[selectedPlatform].nameAr} — {selectedToken.employee_name}
          </h2>

          {/* Optional scope override */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <label className="block text-sm font-bold mb-2">
              تخصيص الـ Scope (اختياري):
            </label>
            <select
              value={overrideScopeCode}
              onChange={(e) => setOverrideScopeCode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">
                {selectedToken.scope_code
                  ? `الافتراضي: ${selectedToken.scope_code}`
                  : "كشف تلقائي من URL الصفحة"}
              </option>
              {scopes
                .filter((s) => s.is_active)
                .map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
            </select>
            <p className="text-gray-400 text-xs mt-2">
              لو مختارتش scope — النظام هيكشف تلقائياً من URL دوبيزل (مثلاً: mobile-phones/alexandria → dub_phones_alex)
            </p>
          </div>

          {/* ═══ Method 1: Drag & Drop (Primary) ═══ */}
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-green-800 mb-3">الطريقة 1 — اسحب للمفضلة (الأساسية)</h3>
            <div className="flex items-center gap-4 mb-3">
              {appUrl ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: `<a href="${bookmarkletCode}" style="display:inline-block;padding:12px 24px;background:#1B5E20;color:white;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;cursor:grab;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onclick="event.preventDefault();alert('اسحب الزر ده بالماوس لشريط المفضلة — متضغطش عليه هنا!');">🌾 حصاد مكسب — اسحبني لشريط المفضلة</a>`,
                  }}
                />
              ) : (
                <span className="text-gray-400">جاري التحميل...</span>
              )}
            </div>
            <p className="text-green-600 text-xs mb-2">
              الـ Token: {selectedToken.token.substring(0, 8)}...
              {effectiveScopeCode && ` | Scope: ${effectiveScopeCode}`}
            </p>
            <p className="text-gray-500 text-xs">
              اسحب الزر الأخضر بالماوس إلى شريط المفضلة (Bookmarks Bar) — اضغط Ctrl+Shift+B لإظهاره
            </p>
          </div>

          {/* ═══ Method 2: Copy Code (Alternative) ═══ */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-blue-800 mb-3">الطريقة 2 — نسخ الكود يدوياً</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(bookmarkletCode).then(() => {
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 3000);
                });
              }}
              className={`px-6 py-3 rounded-xl font-bold text-lg mb-3 transition-colors ${
                codeCopied
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {codeCopied ? "✅ تم النسخ!" : "📋 انسخ كود الـ Bookmarklet"}
            </button>
            <ol className="space-y-2 text-sm text-blue-900">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                <span>اضغط الزر لنسخ الكود</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                <span>اعمل كليك يمين على شريط المفضلة ← Add Page / إضافة صفحة</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                <span>في حقل الاسم اكتب: <strong>حصاد مكسب</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold text-xs">4</span>
                <span>في حقل الـ URL الصق الكود المنسوخ</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold text-xs">5</span>
                <span>احفظ — وبعدها افتح صفحة دوبيزل واضغط عليه</span>
              </li>
            </ol>
          </div>

          {/* ═══ Method 3: Direct Test Run ═══ */}
          <div className="bg-yellow-50 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-yellow-800 mb-3">الطريقة 3 — تشغيل تجريبي مباشر</h3>
            <p className="text-yellow-700 text-sm mb-3">
              ⚠️ للاختبار فقط — يعمل فقط لو فاتح صفحة دوبيزل في تاب تاني. هيفتح نافذة جديدة وينفذ الكود عليها.
            </p>
            <button
              onClick={() => {
                // Extract the raw JS code (without the javascript: prefix)
                const rawCode = decodeURIComponent(
                  bookmarkletCode.replace(/^javascript:/, "")
                );
                try {
                  const fn = new Function(rawCode);
                  fn();
                } catch (err) {
                  alert(
                    "⚠️ الكود يحتاج يتنفذ على صفحة دوبيزل مش هنا.\n\nجرب افتح صفحة دوبيزل واستخدم الطريقة 1 أو 2.\n\nالخطأ: " +
                      (err instanceof Error ? err.message : String(err))
                  );
                }
              }}
              className="px-6 py-3 bg-yellow-600 text-white rounded-xl font-bold text-lg hover:bg-yellow-700"
            >
              🧪 تشغيل تجريبي
            </button>
          </div>

          {/* Setup steps summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-700 mb-3">خطوات الاستخدام بعد التثبيت:</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                <span>ثبّت الـ Bookmarklet بأي طريقة من الطرق أعلاه</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                <span>افتح صفحة قوائم دوبيزل (مثل: موبايلات الإسكندرية)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                <span>اضغط &quot;🌾 حصاد مكسب&quot; من شريط المفضلة — هيرسل الإعلانات تلقائياً</span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Why Bookmarklet */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h2 className="text-lg font-bold text-blue-800 mb-3">ليه Bookmarklet؟</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-bold text-red-700 mb-2">Server-side (محظور):</p>
            <ul className="space-y-1 text-red-600">
              <li>IP سيرفرات Vercel معروف كـ cloud</li>
              <li>دوبيزل يحظره فوراً (403)</li>
              <li>حتى مع headers مثالية — IP مكشوف</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-green-700 mb-2">Bookmarklet (يعمل دائماً):</p>
            <ul className="space-y-1 text-green-600">
              <li>IP عادي (شبكة الموظف)</li>
              <li>متصفح حقيقي مع Cookies</li>
              <li>دوبيزل مستحيل يحظره</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Extraction Strategy */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-3">🧠 استراتيجية الاستخراج</h2>
        <p className="text-gray-500 text-sm mb-3">الـ Bookmarklet يستخدم استراتيجية واحدة مباشرة:</p>
        <div className="space-y-3 text-sm">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <span className="font-bold text-green-700">Article-based</span>
            <span className="text-green-600 mr-2">— يبحث في عناصر {'<article>'} ويستخرج البيانات من a[href*=&quot;/ad/&quot;] + img[src*=&quot;-400x300&quot;]</span>
          </div>
        </div>
      </div>

      {/* Bookmarklet Raw Code (for debugging) */}
      {selectedToken && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">🔧 الكود الخام (للتصحيح)</h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(bookmarkletCode);
                alert("تم نسخ الكود!");
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300"
            >
              📋 نسخ
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-40" dir="ltr">
            {bookmarkletCode || "اختار توكن موظف الأول..."}
          </div>
        </div>
      )}

      {/* Test Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-3">🧪 اختبار الاستقبال</h2>
        <p className="text-gray-500 text-sm mb-4">
          {selectedToken
            ? `سيتم الاختبار بتوكن: ${selectedToken.employee_name}`
            : "اختار توكن موظف أعلاه للاختبار"}
        </p>
        <button
          onClick={testBookmarklet}
          disabled={loading || !selectedToken}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "جاري الاختبار..." : "🧪 إرسال إعلان تجريبي"}
        </button>
      </div>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-3">📬 آخر الإرساليات</h2>
          <div className="space-y-3">
            {recentResults.map((result, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="text-green-700 font-bold">✨ {result.new} جديد</span>
                  <span className="text-yellow-600">🔁 {result.duplicate} مكرر</span>
                  <span className="text-gray-500">📦 {result.received} مستقبل</span>
                  {result.employee && (
                    <span className="text-blue-600">👤 {result.employee}</span>
                  )}
                  {result.scope_matched !== undefined && (
                    <span className={result.scope_matched ? "text-green-600" : "text-gray-400"}>
                      {result.scope_matched ? "🎯 scope" : "⚠️ no scope"}
                    </span>
                  )}
                </div>
                <span className="text-gray-400 text-xs">
                  {result.timestamp
                    ? new Date(result.timestamp).toLocaleString("ar-EG")
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Route bookmarklet code generation based on platform
 */
function buildBookmarkletForPlatform(platform: BookmarkletPlatform, appUrl: string, token: string, scopeCode: string): string {
  if (!appUrl || !token) return "";
  switch (platform) {
    case "hatla2ee": return buildHatla2eeBookmarklet(appUrl, token, scopeCode);
    case "contactcars": return buildContactCarsBookmarklet(appUrl, token, scopeCode);
    case "semsarmasr": return buildSemsarMasrBookmarklet(appUrl, token, scopeCode);
    default: return buildDubizzleBookmarklet(appUrl, token, scopeCode);
  }
}

/**
 * Common send logic shared by all bookmarklets
 */
function buildSendCode(): string {
  return `
var statusDiv=document.createElement('div');
statusDiv.style.cssText='position:fixed;top:20px;right:20px;background:#1B7A3D;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
statusDiv.textContent='\\u{1F33E} جاري إرسال '+listings.length+' إعلان لمكسب... ('+PLATFORM+')';
document.body.appendChild(statusDiv);
var popup=window.open(MAKSAB+'/admin/crm/harvester/receive','maksab_harvest','width=500,height=400,scrollbars=yes');
if(!popup){statusDiv.style.background='#DC2626';statusDiv.textContent='\\u274C المتصفح منع فتح النافذة — اسمح بالـ popups';setTimeout(function(){statusDiv.remove();},8000);return;}
var checkReady=setInterval(function(){try{popup.postMessage({type:'harvest_data',payload:payload,token:TOKEN},MAKSAB);}catch(e){}},500);
var timeout=setTimeout(function(){clearInterval(checkReady);statusDiv.style.background='#DC2626';statusDiv.textContent='\\u274C انتهت المهلة';setTimeout(function(){statusDiv.remove();},5000);try{popup.close();}catch(e){}},30000);
window.addEventListener('message',function handler(e){if(e.origin!==MAKSAB)return;if(e.data&&e.data.type==='harvest_result'){clearInterval(checkReady);clearTimeout(timeout);window.removeEventListener('message',handler);if(e.data.error){statusDiv.style.background='#DC2626';statusDiv.textContent='\\u274C خطأ: '+e.data.error;}else{statusDiv.style.background='#1B7A3D';statusDiv.innerHTML='\\u2705 تم إرسال '+e.data.received+' إعلان<br><span style="font-size:13px">'+e.data.new_count+' جديد — '+e.data.duplicate+' مكرر</span>';}setTimeout(function(){statusDiv.remove();},8000);setTimeout(function(){try{popup.close();}catch(e){}},2000);}});
`;
}

/**
 * Dubizzle Bookmarklet (existing — article-based)
 */
function buildDubizzleBookmarklet(appUrl: string, token: string, scopeCode: string): string {
  const code = `
(function(){
var MAKSAB='${appUrl}';var TOKEN='${token}';var SCOPE='${scopeCode}';var PLATFORM='dubizzle';
function extractListings(){var articles=document.querySelectorAll('article');var listings=[];var seenUrls={};
for(var i=0;i<articles.length;i++){var article=articles[i];var adLink=article.querySelector('a[href*="/ad/"]');if(!adLink)continue;var url=adLink.href;var idMatch=url.match(/ID(\\d+)\\.html/);if(!idMatch)continue;if(seenUrls[url])continue;seenUrls[url]=true;var title=adLink.getAttribute('title')||adLink.textContent.trim()||'';if(!title||title.length<3)continue;var img=article.querySelector('img[src*="-400x300"]');var thumbnail=img?img.src:null;var cardText=article.textContent||'';var priceMatch=cardText.match(/([\\d,]+)\\s*ج\\.م/);var price=priceMatch?parseInt(priceMatch[1].replace(/,/g,'')):null;var supportsExchange=cardText.indexOf('تبادل')>-1;var isNegotiable=cardText.indexOf('قابل للتفاوض')>-1;var isFeatured=cardText.indexOf('مميز')>-1||cardText.indexOf('إيليت')>-1;var isVerified=cardText.indexOf('موثق')>-1;var isBusiness=cardText.indexOf('صاحب عمل')>-1;var sellerLink=article.querySelector('a[href*="/companies/"]');var sellerName=sellerLink?sellerLink.textContent.trim():null;var sellerProfileUrl=sellerLink?sellerLink.href:null;
listings.push({url:url,title:title,price:price,currency:'EGP',thumbnailUrl:thumbnail,location:'',dateText:'',sellerName:sellerName,sellerProfileUrl:sellerProfileUrl,isVerified:isVerified,isBusiness:isBusiness,isFeatured:isFeatured,supportsExchange:supportsExchange,isNegotiable:isNegotiable});}return listings;}
var listings=extractListings();
if(listings.length===0){alert('لم يتم العثور على إعلانات\\n\\nتأكد إنك على صفحة قوائم دوبيزل');return;}
var payload=JSON.stringify({url:window.location.href,listings:listings,timestamp:new Date().toISOString(),source:'bookmarklet',strategy:'dubizzle-article',scope_code:SCOPE||null,platform:'dubizzle'});
${buildSendCode()}
})();
`.trim().replace(/\n\s*/g, '');
  return `javascript:${encodeURIComponent(code)}`;
}

/**
 * Hatla2ee Bookmarklet — eg.hatla2ee.com (سيارات)
 * يستخرج إعلانات السيارات من صفحات هتلاقي
 */
function buildHatla2eeBookmarklet(appUrl: string, token: string, scopeCode: string): string {
  const extractionCode = buildHatla2eeExtractionCode();
  const code = `
(function(){
var MAKSAB='${appUrl}';var TOKEN='${token}';var SCOPE='${scopeCode}';var PLATFORM='hatla2ee';
if(!window.location.hostname.includes('hatla2ee')){alert('\\u274C هذا الـ Bookmarklet خاص بموقع هتلاقي (hatla2ee.com)\\n\\nافتح eg.hatla2ee.com وجرب تاني');return;}
${extractionCode}
var listings=extractListings();
if(listings.length===0){alert('لم يتم العثور على إعلانات سيارات في هذه الصفحة\\n\\nتأكد إنك على صفحة قوائم سيارات في هتلاقي\\neg.hatla2ee.com/en/car/used-cars-for-sale');return;}
/* Auto-harvest panel */
if(!window._maksabAutoPanel){
var panel=document.createElement('div');
panel.id='maksab-auto-panel';
panel.style.cssText='position:fixed;bottom:20px;left:20px;background:#1B5E20;color:white;padding:12px 18px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:14px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);cursor:pointer;';
panel.innerHTML='\\u{1F504} حصاد تلقائي كل 5 دقائق <span id="maksab-auto-status" style="display:block;font-size:12px;opacity:0.8;">اضغط لتفعيل</span>';
panel.onclick=function(){
if(window._maksabAutoInterval){clearInterval(window._maksabAutoInterval);window._maksabAutoInterval=null;document.getElementById('maksab-auto-status').textContent='متوقف — اضغط لتفعيل';panel.style.background='#1B5E20';return;}
window._maksabAutoInterval=setInterval(function(){
document.getElementById('maksab-auto-status').textContent='جاري الحصاد...';
try{var autoListings=extractListings();if(autoListings.length>0){var autoPayload=JSON.stringify({url:window.location.href,listings:autoListings,timestamp:new Date().toISOString(),source:'bookmarklet_auto',strategy:'hatla2ee-cards',scope_code:SCOPE||null,platform:'hatla2ee'});
fetch(MAKSAB+'/api/admin/crm/harvester/receive-bookmarklet',{method:'POST',headers:{'Content-Type':'application/json'},body:autoPayload}).then(function(r){return r.json();}).then(function(d){document.getElementById('maksab-auto-status').textContent='آخر حصاد: '+(d.new_count||0)+' جديد — '+new Date().toLocaleTimeString('ar-EG');}).catch(function(e){document.getElementById('maksab-auto-status').textContent='خطأ: '+e.message;});}
else{location.reload();}
}catch(e){document.getElementById('maksab-auto-status').textContent='خطأ: '+e.message;}
},300000);/* 5 minutes */
document.getElementById('maksab-auto-status').textContent='شغّال — حصاد كل 5 دقائق';panel.style.background='#E65100';
};
document.body.appendChild(panel);window._maksabAutoPanel=true;}
var payload=JSON.stringify({url:window.location.href,listings:listings,timestamp:new Date().toISOString(),source:'bookmarklet',strategy:'hatla2ee-cards',scope_code:SCOPE||null,platform:'hatla2ee'});
${buildSendCode()}
})();
`.trim().replace(/\n\s*/g, '');
  return `javascript:${encodeURIComponent(code)}`;
}

/** Shared extraction code for Hatla2ee */
function buildHatla2eeExtractionCode(): string {
  return `
function extractListings(){var listings=[];var seenUrls={};
/* Strategy 1: car listing cards with links */
var links=document.querySelectorAll('a[href*="/car/"],a[href*="/en/car/"]');
console.log('Maksab Hatla2ee: Found',links.length,'car links');
for(var i=0;i<links.length;i++){var a=links[i];var url=a.href;if(!url||seenUrls[url])continue;if(url.includes('/search')||url.includes('/filter'))continue;if(!/\\/car\\/.*\\d/.test(url))continue;seenUrls[url]=true;
var card=a.closest('.card,.listing-card,.newCarListingCard,.vehicle-card,[class*=listing],[class*=card]')||a.parentElement.parentElement;if(!card)card=a.parentElement;var cardText=card?card.textContent:'';
var title=a.getAttribute('title')||a.textContent.trim();if(!title||title.length<3){var h=card?card.querySelector('h2,h3,h4,[class*=title]'):null;if(h)title=h.textContent.trim();}if(!title||title.length<3)continue;
var priceMatch=cardText.match(/([\\d,\\.]+)\\s*(?:EGP|LE|L\\.E|جنيه|ج\\.م)/i);var price=priceMatch?parseInt(priceMatch[1].replace(/[,\\.]/g,'')):null;if(!price){var priceEl=card?card.querySelector('[class*=price],[class*=Price]'):null;if(priceEl){var pt=priceEl.textContent.replace(/[^\\d]/g,'');if(pt)price=parseInt(pt);}}
var img=card?card.querySelector('img[src*=".jpg"],img[src*=".jpeg"],img[src*=".png"],img[src*=".webp"],img[data-src]'):null;var thumbnail=img?(img.src||img.getAttribute('data-src')):null;
var locEl=card?card.querySelector('[class*=location],[class*=Location],[class*=area]'):null;var location=locEl?locEl.textContent.trim():'';
var yearMatch=cardText.match(/(20[0-2]\\d|19[89]\\d)/);var kmMatch=cardText.match(/([\\d,]+)\\s*(?:km|كم)/i);
var isFeatured=cardText.indexOf('featured')>-1||cardText.indexOf('premium')>-1||cardText.indexOf('مميز')>-1;var isDealer=cardText.indexOf('dealer')>-1||cardText.indexOf('showroom')>-1||cardText.indexOf('معرض')>-1;
listings.push({url:url,title:title,price:price,currency:'EGP',thumbnailUrl:thumbnail,location:location,dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:isDealer,isBusiness:isDealer,isFeatured:isFeatured,supportsExchange:false,isNegotiable:cardText.indexOf('negotiable')>-1||cardText.indexOf('قابل للتفاوض')>-1});}
/* Strategy 2: structured data / JSON-LD */
if(listings.length===0){var scripts=document.querySelectorAll('script[type="application/ld+json"]');for(var s=0;s<scripts.length;s++){try{var ld=JSON.parse(scripts[s].textContent);if(ld.itemListElement){for(var j=0;j<ld.itemListElement.length;j++){var item=ld.itemListElement[j];var iurl=item.url||item.item&&item.item.url;var iname=item.name||item.item&&item.item.name;if(iurl&&iname&&!seenUrls[iurl]){seenUrls[iurl]=true;listings.push({url:iurl,title:iname,price:item.offers?parseInt(String(item.offers.price)):null,currency:'EGP',thumbnailUrl:item.image||null,location:'',dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false});}}}}catch(e){}}}
console.log('Maksab Hatla2ee: Extracted',listings.length,'listings');return listings;}
`;
}

/**
 * ContactCars Bookmarklet — contactcars.com (سيارات)
 * يستخرج إعلانات السيارات من ContactCars
 */
function buildContactCarsBookmarklet(appUrl: string, token: string, scopeCode: string): string {
  const code = `
(function(){
var MAKSAB='${appUrl}';var TOKEN='${token}';var SCOPE='${scopeCode}';var PLATFORM='contactcars';
if(!window.location.hostname.includes('contactcars')){alert('\\u274C هذا الـ Bookmarklet خاص بموقع ContactCars\\n\\nافتح contactcars.com وجرب تاني');return;}
function extractListings(){var listings=[];var seenUrls={};
/* Strategy 1: car listing cards */
var links=document.querySelectorAll('a[href*="/car/"],a[href*="/cars/"],a[href*="/listing/"],a[href*="/en/car"]');
console.log('Maksab ContactCars: Found',links.length,'car links');
for(var i=0;i<links.length;i++){var a=links[i];var url=a.href;if(!url||seenUrls[url])continue;if(url.includes('/search')||url.includes('/filter')||url.includes('/compare'))continue;if(!/\\d/.test(url.split('/').pop()))continue;seenUrls[url]=true;
var card=a.closest('.card,.listing-card,.vehicle-card,[class*=listing],[class*=card],[class*=vehicle]')||a.parentElement.parentElement;if(!card)card=a.parentElement;var cardText=card?card.textContent:'';
var title=a.getAttribute('title')||a.textContent.trim();if(!title||title.length<3){var h=card?card.querySelector('h2,h3,h4,[class*=title]'):null;if(h)title=h.textContent.trim();}if(!title||title.length<3)continue;
var priceMatch=cardText.match(/([\\d,\\.]+)\\s*(?:EGP|LE|L\\.E|جنيه|ج\\.م)/i);var price=priceMatch?parseInt(priceMatch[1].replace(/[,\\.]/g,'')):null;if(!price){var priceEl=card?card.querySelector('[class*=price],[class*=Price]'):null;if(priceEl){var pt=priceEl.textContent.replace(/[^\\d]/g,'');if(pt)price=parseInt(pt);}}
var img=card?card.querySelector('img[src*=".jpg"],img[src*=".jpeg"],img[src*=".png"],img[src*=".webp"],img[data-src]'):null;var thumbnail=img?(img.src||img.getAttribute('data-src')):null;
var locEl=card?card.querySelector('[class*=location],[class*=city]'):null;var location=locEl?locEl.textContent.trim():'';
var isDealer=cardText.indexOf('dealer')>-1||cardText.indexOf('معرض')>-1;
listings.push({url:url,title:title,price:price,currency:'EGP',thumbnailUrl:thumbnail,location:location,dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:isDealer,isBusiness:isDealer,isFeatured:cardText.indexOf('featured')>-1||cardText.indexOf('مميز')>-1,supportsExchange:false,isNegotiable:cardText.indexOf('قابل للتفاوض')>-1});}
/* Strategy 2: __NEXT_DATA__ (ContactCars may use Next.js) */
if(listings.length===0){var nd=document.getElementById('__NEXT_DATA__');if(nd){try{var data=JSON.parse(nd.textContent);var props=data.props&&data.props.pageProps;if(props){var items=props.cars||props.listings||props.vehicles||props.data||[];if(Array.isArray(items)){for(var j=0;j<items.length;j++){var item=items[j];var iurl=item.url||item.link||(item.id?'https://contactcars.com/en/car/'+item.id:'');var ititle=item.title||((item.brand||'')+(item.model?' '+item.model:'')+(item.year?' '+item.year:''));if(iurl&&ititle&&!seenUrls[iurl]){seenUrls[iurl]=true;listings.push({url:iurl.startsWith('http')?iurl:'https://contactcars.com'+iurl,title:ititle,price:typeof item.price==='number'?item.price:null,currency:'EGP',thumbnailUrl:item.image||item.thumbnail||null,location:item.location||item.city||'',dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:false,isBusiness:!!item.is_dealer,isFeatured:!!item.is_featured,supportsExchange:false,isNegotiable:false});}}}}}catch(e){}}}
console.log('Maksab ContactCars: Extracted',listings.length,'listings');return listings;}
var listings=extractListings();
if(listings.length===0){alert('لم يتم العثور على إعلانات سيارات\\n\\nتأكد إنك على صفحة قوائم سيارات في ContactCars\\ncontactcars.com/en/cars-for-sale');return;}
var payload=JSON.stringify({url:window.location.href,listings:listings,timestamp:new Date().toISOString(),source:'bookmarklet',strategy:'contactcars-cards',scope_code:SCOPE||null,platform:'contactcars'});
${buildSendCode()}
})();
`.trim().replace(/\n\s*/g, '');
  return `javascript:${encodeURIComponent(code)}`;
}

/**
 * SemsarMasr Bookmarklet — semsarmasr.com (عقارات)
 */
function buildSemsarMasrBookmarklet(appUrl: string, token: string, scopeCode: string): string {
  const code = `
(function(){
var MAKSAB='${appUrl}';var TOKEN='${token}';var SCOPE='${scopeCode}';var PLATFORM='semsarmasr';
if(!window.location.hostname.includes('semsarmasr')){alert('\\u274C هذا الـ Bookmarklet خاص بموقع سمسار مصر\\n\\nافتح semsarmasr.com وجرب تاني');return;}
function extractListings(){var listings=[];var seenUrls={};
/* Strategy 0: Extract phone numbers from inline JSON in HTML */
var phoneMap={};var nameMap={};var html=document.body.innerHTML;
var jsonRe=/'AdID':'(\\d+)','name':'([^']*)','AdTitle':'([^']*)','IntlPhone':'([^']*)','AdPhone':'([^']*)'/g;
var m;while((m=jsonRe.exec(html))!==null){var adId=m[1];var selName=m[2].trim();var intlPhone=m[4].trim();var adPhone=m[5].trim();var phone=intlPhone||adPhone;if(phone){phone=phone.replace(/[^\\d+]/g,'');phoneMap[adId]=phone;}if(selName){nameMap[adId]=selName;}}
console.log('Maksab SemsarMasr: Found',Object.keys(phoneMap).length,'phones from inline JSON');
/* Strategy 1: ListCont cards (main SemsarMasr layout) */
var cards=document.querySelectorAll('.ListCont,.Prem_ListDesStyle,[class*=ListCont]');
console.log('Maksab SemsarMasr: Found',cards.length,'ListCont cards');
for(var i=0;i<cards.length;i++){var card=cards[i];var link=card.querySelector('a[href*="/3akarat/"]');if(!link)continue;var url=link.href;if(!url||seenUrls[url])continue;seenUrls[url]=true;
var adIdMatch=url.match(/\\/3akarat\\/(\\d+)/);var adId=adIdMatch?adIdMatch[1]:null;
var cardText=card.textContent||'';
var titleEl=card.querySelector('.Intcell,.ListInfo');var title=titleEl?titleEl.textContent.trim():'';title=title.replace(/^\\d+/,'').trim();if(!title||title.length<5)continue;
var priceMatch=cardText.match(/([\\d,]+)\\s*جنيه/);var price=priceMatch?parseInt(priceMatch[1].replace(/,/g,'')):null;
var img=card.querySelector('img[src*=".jpg"],img[src*=".jpeg"],img[src*=".png"],img[src*=".webp"]');var thumbnail=img?img.src:null;
var locMatch=cardText.match(/(الإسكندرية|اسكندرية|سموحة|سيدي بشر|المنتزه|العجمي|رشدي|لوران|ستانلي|جليم|محرم بك|كفر عبد|المعمورة|المندرة|ميامي|العصافرة|بحري|طوسون|العطارين|المنشية)/);var location=locMatch?locMatch[1]+' — الإسكندرية':'الإسكندرية';
var areaMatch=cardText.match(/(\\d+)\\s*(?:م |متر|m²)/);
var isRent=cardText.indexOf('إيجار')>-1||cardText.indexOf('للإيجار')>-1||window.location.href.indexOf('purpose=rent')>-1;
var isFeatured=cardText.indexOf('مميز')>-1||cardText.indexOf('مُميز')>-1;
var sellerPhone=adId&&phoneMap[adId]?phoneMap[adId]:null;
var sellerName=adId&&nameMap[adId]?nameMap[adId]:null;
listings.push({url:url,title:title+(areaMatch?' — '+areaMatch[1]+'م²':''),price:price,currency:'EGP',thumbnailUrl:thumbnail,location:location,dateText:'',sellerName:sellerName,sellerPhone:sellerPhone,sellerProfileUrl:null,isVerified:false,isBusiness:false,isFeatured:isFeatured,supportsExchange:false,isNegotiable:cardText.indexOf('تفاوض')>-1,category:'properties'});}
/* Strategy 2: any link to /3akarat/DIGITS/ */
if(listings.length===0){var links=document.querySelectorAll('a[href*="/3akarat/"]');for(var j=0;j<links.length;j++){var a=links[j];var aurl=a.href;if(!aurl||seenUrls[aurl]||!/\\/3akarat\\/\\d/.test(aurl))continue;seenUrls[aurl]=true;var aIdM=aurl.match(/\\/3akarat\\/(\\d+)/);var aId=aIdM?aIdM[1]:null;var parent=a.parentElement;var pText=parent?parent.textContent:'';var atitle=a.textContent.trim();if(!atitle||atitle.length<5)continue;atitle=atitle.replace(/^\\d+/,'').trim();var ap=pText.match(/([\\d,]+)\\s*جنيه/);listings.push({url:aurl,title:atitle,price:ap?parseInt(ap[1].replace(/,/g,'')):null,currency:'EGP',thumbnailUrl:null,location:'الإسكندرية',dateText:'',sellerName:aId&&nameMap[aId]?nameMap[aId]:null,sellerPhone:aId&&phoneMap[aId]?phoneMap[aId]:null,sellerProfileUrl:null,isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false,category:'properties'});}}
var withPhone=listings.filter(function(l){return l.sellerPhone;}).length;
console.log('Maksab SemsarMasr: Extracted',listings.length,'listings,',withPhone,'with phone numbers');return listings;}
var listings=extractListings();
if(listings.length===0){alert('لم يتم العثور على إعلانات عقارات\\n\\nتأكد إنك على صفحة قوائم عقارات في سمسار مصر');return;}
var withPhone=listings.filter(function(l){return l.sellerPhone;}).length;
alert('\\u2705 تم العثور على '+listings.length+' إعلان\\n\\u260E '+withPhone+' إعلان مع رقم تليفون\\n\\nجاري الإرسال...');
var payload=JSON.stringify({url:window.location.href,listings:listings,timestamp:new Date().toISOString(),source:'bookmarklet',strategy:'semsarmasr-listcont',scope_code:SCOPE||null,platform:'semsarmasr'});
${buildSendCode()}
})();
`.trim().replace(/\n\s*/g, '');
  return `javascript:${encodeURIComponent(code)}`;
}
