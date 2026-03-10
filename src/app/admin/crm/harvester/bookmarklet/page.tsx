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

  // Selected token + scope for bookmarklet generation
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [overrideScopeCode, setOverrideScopeCode] = useState("");
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

  // Build the bookmarklet code for selected token + scope
  const selectedToken = tokens.find((t) => t.id === selectedTokenId);
  const effectiveScopeCode = overrideScopeCode || selectedToken?.scope_code || "";
  const bookmarkletCode = selectedToken
    ? buildBookmarkletCode(appUrl, selectedToken.token, effectiveScopeCode)
    : "";

  const activeTokens = tokens.filter((t) => t.is_active);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔖 Bookmarklet — حصاد دوبيزل</h1>
          <p className="text-gray-500 text-sm mt-1">
            للمنصات المحظورة من server-side fetch — الموظف يفتح الصفحة ويضغط الـ Bookmarklet
          </p>
        </div>
        <Link
          href="/admin/crm/harvester"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          → العودة للمحرك
        </Link>
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
            🌾 Bookmarklet — {selectedToken.employee_name}
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
        <h2 className="text-lg font-bold mb-3">🧠 استراتيجيات الاستخراج</h2>
        <p className="text-gray-500 text-sm mb-3">الـ Bookmarklet يجرب 3 طرق بالترتيب:</p>
        <div className="space-y-3 text-sm">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <span className="font-bold text-green-700">1. __NEXT_DATA__</span>
            <span className="text-green-600 mr-2">— الأفضل والأدق</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <span className="font-bold text-blue-700">2. JSON-LD</span>
            <span className="text-blue-600 mr-2">— بديل من schema.org</span>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <span className="font-bold text-yellow-700">3. DOM Traversal</span>
            <span className="text-yellow-600 mr-2">— آخر محاولة</span>
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
 * Build the bookmarklet JavaScript code with embedded token and scope.
 */
function buildBookmarkletCode(appUrl: string, token: string, scopeCode: string): string {
  if (!appUrl || !token) return "";

  const code = `
(function(){
var API='${appUrl}/api/admin/crm/harvester/receive-bookmarklet';
var TOKEN='${token}';
var SCOPE='${scopeCode}';
var listings=[];
var strategy='unknown';

/* ═══ Strategy 1: __NEXT_DATA__ ═══ */
try{
  var nd=document.getElementById('__NEXT_DATA__');
  if(nd){
    var json=JSON.parse(nd.textContent);
    var pp=json.props&&json.props.pageProps;
    if(pp){
      var keys=['listings','ads','results','searchResults','data','items','initialData'];
      var items=null;
      for(var k=0;k<keys.length;k++){
        var v=pp[keys[k]];
        if(Array.isArray(v)&&v.length>0){items=v;break;}
        if(v&&typeof v==='object'){
          var sub=['data','results','items','ads','docs'];
          for(var s=0;s<sub.length;s++){
            if(Array.isArray(v[sub[s]])&&v[sub[s]].length>0){items=v[sub[s]];break;}
          }
          if(items)break;
        }
      }
      if(!items&&pp.dehydratedState&&pp.dehydratedState.queries){
        var qs=pp.dehydratedState.queries;
        for(var qi=0;qi<qs.length;qi++){
          var qd=qs[qi].state&&qs[qi].state.data;
          if(!qd)continue;
          var sa=['data','results','items','ads','docs'];
          for(var si=0;si<sa.length;si++){
            if(Array.isArray(qd[sa[si]])&&qd[sa[si]].length>0){items=qd[sa[si]];break;}
          }
          if(!items&&Array.isArray(qd)&&qd.length>0)items=qd;
          if(items)break;
        }
      }
      if(items&&items.length>0){
        strategy='__NEXT_DATA__';
        for(var i=0;i<items.length;i++){
          var ad=items[i];
          if(!ad)continue;
          var title=ad.title||ad.name||ad.display_title||'';
          if(!title)continue;
          var price=null;
          if(typeof ad.price==='number')price=ad.price;
          else if(ad.price&&typeof ad.price==='object')price=ad.price.value||ad.price.amount||null;
          else if(ad.price)price=parseFloat(String(ad.price).replace(/[,\\u066C]/g,''))||null;
          var adUrl=ad.url||ad.absolute_url||(ad.slug?'/'+ad.slug:'')||(ad.id?'/listing/'+ad.id:'');
          if(!adUrl)continue;
          if(adUrl.charAt(0)==='/')adUrl='https://www.dubizzle.com.eg'+adUrl;
          var thumb=null;
          if(ad.images&&ad.images.length>0){
            var fi=ad.images[0];
            thumb=(typeof fi==='string')?fi:(fi.url||fi.src||fi.thumbnail||null);
          }else if(ad.image){
            thumb=(typeof ad.image==='string')?ad.image:(ad.image.url||null);
          }else if(ad.thumbnail){thumb=ad.thumbnail;}
          else if(ad.main_photo){thumb=ad.main_photo;}
          var loc='';
          if(ad.locations_resolved){
            var lv=Object.values(ad.locations_resolved);
            var ln=[];for(var li=0;li<lv.length;li++){var lx=lv[li];ln.push(lx.name_ar||lx.name||'');}
            loc=ln.filter(Boolean).join(', ');
          }else if(ad.location){
            if(typeof ad.location==='string')loc=ad.location;
            else loc=ad.location.region_name_ar||ad.location.city_name_ar||ad.location.name||'';
          }
          var dateText=ad.created_at||ad.date||ad.display_date||ad.created_at_first||'';
          var sellerName=null,sellerUrl=null,isVerified=false,isBusiness=false;
          if(ad.user){
            sellerName=ad.user.name||ad.user.display_name||null;
            if(ad.user.id)sellerUrl='https://www.dubizzle.com.eg/profile/'+ad.user.id;
            isVerified=!!(ad.user.is_verified||ad.user.verified||ad.user.phone_verified);
            isBusiness=!!(ad.user.is_business||ad.user.account_type==='business'||ad.user.is_dealer);
          }
          listings.push({
            url:adUrl,title:title,price:price,currency:'EGP',
            thumbnailUrl:thumb,location:loc,dateText:dateText,
            sellerName:sellerName,sellerProfileUrl:sellerUrl,
            isVerified:isVerified,isBusiness:isBusiness,
            isFeatured:!!(ad.is_featured||ad.featured||ad.is_promoted),
            supportsExchange:!!(ad.exchange_enabled)||(title.indexOf('تبادل')>-1)||(title.indexOf('بدل')>-1),
            isNegotiable:!!(ad.is_negotiable||ad.negotiable)||(title.indexOf('قابل للتفاوض')>-1),
            category:ad.category_name||ad.category||null
          });
        }
      }
    }
  }
}catch(e){console.log('Maksab: __NEXT_DATA__ error',e);}

/* ═══ Strategy 2: JSON-LD ═══ */
if(listings.length===0){
  try{
    var scripts=document.querySelectorAll('script[type="application/ld+json"]');
    for(var si=0;si<scripts.length;si++){
      try{
        var ld=JSON.parse(scripts[si].textContent);
        if(ld['@type']==='ItemList'&&ld.itemListElement){
          strategy='JSON-LD';
          for(var li=0;li<ld.itemListElement.length;li++){
            var it=ld.itemListElement[li].item||ld.itemListElement[li];
            if(!it.name)continue;
            listings.push({
              url:it.url||'',title:it.name,
              price:it.offers&&it.offers.price?parseFloat(it.offers.price):null,
              currency:'EGP',thumbnailUrl:it.image||null,
              location:it.contentLocation?it.contentLocation.name:'',
              dateText:it.datePublished||'',
              sellerName:it.seller?it.seller.name:null,
              sellerProfileUrl:null,isVerified:false,isBusiness:false,
              isFeatured:false,supportsExchange:false,isNegotiable:false,
              category:null
            });
          }
        }
        if(Array.isArray(ld)){
          for(var ai=0;ai<ld.length;ai++){
            if(ld[ai]['@type']==='Product'&&ld[ai].name){
              strategy='JSON-LD';
              listings.push({
                url:ld[ai].url||'',title:ld[ai].name,
                price:ld[ai].offers&&ld[ai].offers.price?parseFloat(ld[ai].offers.price):null,
                currency:'EGP',thumbnailUrl:ld[ai].image||null,
                location:'',dateText:'',sellerName:null,sellerProfileUrl:null,
                isVerified:false,isBusiness:false,isFeatured:false,
                supportsExchange:false,isNegotiable:false,category:null
              });
            }
          }
        }
      }catch(e2){}
    }
  }catch(e){console.log('Maksab: JSON-LD error',e);}
}

/* ═══ Strategy 3: DOM traversal ═══ */
if(listings.length===0){
  strategy='DOM';
  var allLinks=document.querySelectorAll('a[href]');
  var seen={};
  for(var di=0;di<allLinks.length;di++){
    var a=allLinks[di];
    var href=a.href||'';
    if(!href.match(/dubizzle\\.com\\.eg\\/[\\w-]+\\/[\\w-]+\\/[\\w-]+-ID[\\w]+\\.html/i)&&
       !href.match(/dubizzle\\.com\\.eg\\/[\\w-]+\\/[\\w-]+\\/[\\w-]+-\\d+/)){
      try{var segs=(new URL(href)).pathname.split('/').filter(Boolean);
      if(segs.length<3)continue;}catch(eu){continue;}
    }
    if(href.indexOf('/search')>-1||href.indexOf('/login')>-1||href.indexOf('/signup')>-1||href.indexOf('/post')>-1)continue;
    if(seen[href])continue;
    seen[href]=true;
    var card=a.closest('li,article,[role="article"],[data-testid]')||a.parentElement;
    if(!card)continue;
    var title=a.getAttribute('aria-label')||a.getAttribute('title')||'';
    if(!title){
      var hEl=card.querySelector('h2,h3,h4,[data-testid*="title"],[class*="title"]');
      if(hEl)title=hEl.textContent.trim();
    }
    if(!title)title=a.textContent.trim().replace(/\\s+/g,' ').substring(0,120);
    if(!title||title.length<3)continue;
    var price=null;
    var priceEl=card.querySelector('[data-testid*="price"],[class*="price"],[class*="Price"]');
    if(priceEl){
      var pt=priceEl.textContent.replace(/[^0-9]/g,'');
      if(pt)price=parseInt(pt);
    }
    if(!price){
      var allText=card.textContent;
      var pm=allText.match(/(\\d[\\d,\\u066C]*(?:\\.\\d+)?)\\s*(?:ج\\.م|جنيه|EGP|LE)/);
      if(pm)price=parseInt(pm[1].replace(/[,\\u066C]/g,''));
    }
    var loc='';
    var locEl=card.querySelector('[data-testid*="location"],[class*="location"],[class*="Location"],[class*="address"]');
    if(locEl)loc=locEl.textContent.trim();
    var dateText='';
    var dateEl=card.querySelector('[data-testid*="date"],time,[class*="date"],[class*="time"]');
    if(dateEl)dateText=dateEl.textContent.trim();
    if(!dateText){
      var dm=card.textContent.match(/(?:منذ[^,،]*|\\d+\\s+\\w+\\s+ago)/);
      if(dm)dateText=dm[0].trim();
    }
    var img=null;
    var imgEl=card.querySelector('img[src*="dubizzle"],img[src*="olx"],img[data-src*="dubizzle"],img[data-src*="olx"]');
    if(!imgEl)imgEl=card.querySelector('img');
    if(imgEl)img=imgEl.src||imgEl.getAttribute('data-src')||null;
    var sellerName=null;
    var selEl=card.querySelector('[data-testid*="seller"],[class*="seller"],[class*="Seller"]');
    if(selEl)sellerName=selEl.textContent.trim();
    var cardText=card.textContent||'';
    var isVerified=cardText.indexOf('موثق')>-1||!!card.querySelector('[data-testid*="verified"],[class*="verified"],[class*="Verified"]');
    var isFeatured=cardText.indexOf('مميز')>-1||!!card.querySelector('[data-testid*="featured"],[class*="featured"]');
    var supportsExchange=cardText.indexOf('تبادل')>-1||cardText.indexOf('متوفر التبادل')>-1||cardText.indexOf('بدل')>-1;
    var isNegotiable=cardText.indexOf('قابل للتفاوض')>-1;
    listings.push({
      url:href,title:title,price:price,currency:'EGP',
      thumbnailUrl:img,location:loc,dateText:dateText,
      sellerName:sellerName,sellerProfileUrl:null,
      isVerified:isVerified,isBusiness:false,
      isFeatured:isFeatured,supportsExchange:supportsExchange,
      isNegotiable:isNegotiable,category:null
    });
  }
}

/* ═══ Result ═══ */
if(listings.length===0){
  alert('لم يتم العثور على إعلانات في هذه الصفحة\\n\\nتأكد إنك على صفحة قوائم (مش صفحة إعلان واحد).\\nStrategy tried: '+strategy);
  return;
}

var statusDiv=document.createElement('div');
statusDiv.style.cssText='position:fixed;top:20px;right:20px;background:#1B7A3D;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
statusDiv.textContent='🌾 جاري إرسال '+listings.length+' إعلان لمكسب... ('+strategy+')';
document.body.appendChild(statusDiv);

var xhr=new XMLHttpRequest();
xhr.open('POST',API,true);
xhr.setRequestHeader('Content-Type','application/json');
xhr.setRequestHeader('X-Bookmarklet-Token',TOKEN);
xhr.onload=function(){
  if(xhr.status===200){
    var r=JSON.parse(xhr.responseText);
    statusDiv.style.background='#1B7A3D';
    statusDiv.innerHTML='✅ تم إرسال '+r.received+' إعلان لمكسب<br><span style="font-size:13px">'+r.new+' جديد — '+r.duplicate+' مكرر — طريقة: '+strategy+'</span>';
    setTimeout(function(){statusDiv.remove();},8000);
  }else if(xhr.status===401){
    statusDiv.style.background='#DC2626';
    statusDiv.textContent='🔒 التوكن غير صالح — اطلب bookmarklet جديد من المسؤول';
    setTimeout(function(){statusDiv.remove();},8000);
  }else{
    statusDiv.style.background='#DC2626';
    statusDiv.textContent='❌ خطأ في الإرسال: HTTP '+xhr.status;
    setTimeout(function(){statusDiv.remove();},5000);
  }
};
xhr.onerror=function(){
  statusDiv.style.background='#DC2626';
  statusDiv.textContent='❌ خطأ في الاتصال بمكسب';
  setTimeout(function(){statusDiv.remove();},5000);
};
xhr.send(JSON.stringify({
  url:window.location.href,
  listings:listings,
  timestamp:new Date().toISOString(),
  source:'bookmarklet',
  strategy:strategy,
  scope_code:SCOPE||null
}));
})();
`.trim().replace(/\n\s*/g, '');

  return `javascript:${encodeURIComponent(code)}`;
}
