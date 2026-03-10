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
            <span className="text-green-600 mr-2">— الأفضل والأدق (deep recursive search)</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <span className="font-bold text-blue-700">2. JSON-LD</span>
            <span className="text-blue-600 mr-2">— بديل من schema.org</span>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <span className="font-bold text-yellow-700">3. DOM-images</span>
            <span className="text-yellow-600 mr-2">— يبدأ من صور CDN دوبيزل ويطلع للـ card</span>
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
var MAKSAB='${appUrl}';
var TOKEN='${token}';
var SCOPE='${scopeCode}';
var listings=[];
var strategy='unknown';

/* ═══ Helper: deep-search any object for arrays of ad-like items ═══ */
function findAdArrays(obj,depth){
  if(!obj||depth>6)return null;
  if(Array.isArray(obj)){
    if(obj.length>0&&obj[0]&&typeof obj[0]==='object'){
      var hasTitle=obj[0].title||obj[0].name||obj[0].display_title;
      if(hasTitle)return obj;
    }
    return null;
  }
  if(typeof obj==='object'){
    var keys=Object.keys(obj);
    for(var k=0;k<keys.length;k++){
      var found=findAdArrays(obj[keys[k]],depth+1);
      if(found&&found.length>2)return found;
    }
  }
  return null;
}

/* ═══ Helper: parse one ad object into a listing ═══ */
function parseAdObject(ad){
  if(!ad)return null;
  var title=ad.title||ad.name||ad.display_title||'';
  if(!title)return null;
  var price=null;
  if(typeof ad.price==='number')price=ad.price;
  else if(ad.price&&typeof ad.price==='object')price=ad.price.value||ad.price.amount||null;
  else if(ad.price)price=parseFloat(String(ad.price).replace(/[,\\u066C]/g,''))||null;
  var adUrl=ad.url||ad.absolute_url||(ad.slug?'/'+ad.slug:'')||(ad.id?'/listing/'+ad.id:'');
  if(adUrl&&adUrl.charAt(0)==='/')adUrl='https://www.dubizzle.com.eg'+adUrl;
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
  return{
    url:adUrl||'',title:title,price:price,currency:'EGP',
    thumbnailUrl:thumb,location:loc,dateText:dateText,
    sellerName:sellerName,sellerProfileUrl:sellerUrl,
    isVerified:isVerified,isBusiness:isBusiness,
    isFeatured:!!(ad.is_featured||ad.featured||ad.is_promoted),
    supportsExchange:!!(ad.exchange_enabled)||(title.indexOf('تبادل')>-1)||(title.indexOf('بدل')>-1),
    isNegotiable:!!(ad.is_negotiable||ad.negotiable)||(title.indexOf('قابل للتفاوض')>-1),
    category:ad.category_name||ad.category||null
  };
}

/* ═══ Strategy 1: __NEXT_DATA__ (deep recursive search) ═══ */
try{
  var nd=document.getElementById('__NEXT_DATA__');
  if(nd){
    var json=JSON.parse(nd.textContent);
    var pp=json.props&&json.props.pageProps;
    console.log('Maksab DEBUG: __NEXT_DATA__ found, pageProps keys:', pp?Object.keys(pp):'(no pageProps)');
    console.log('Maksab DEBUG: __NEXT_DATA__ sample:', JSON.stringify(pp).substring(0,2000));
    if(pp){
      var items=findAdArrays(pp,0);
      if(items&&items.length>0){
        strategy='__NEXT_DATA__';
        console.log('Maksab: __NEXT_DATA__ found '+items.length+' ad objects');
        console.log('Maksab: Sample ad keys:', Object.keys(items[0]));
        for(var i=0;i<items.length;i++){
          var parsed=parseAdObject(items[i]);
          if(parsed)listings.push(parsed);
        }
      }else{
        console.log('Maksab: __NEXT_DATA__ exists but no ad arrays found via deep search');
      }
    }
  }else{
    console.log('Maksab: No __NEXT_DATA__ element on page');
  }
}catch(e){console.log('Maksab: __NEXT_DATA__ error',e);}

/* ═══ Strategy 2: JSON-LD ═══ */
if(listings.length===0){
  try{
    var scripts=document.querySelectorAll('script[type="application/ld+json"]');
    console.log('Maksab: Checking '+scripts.length+' JSON-LD scripts');
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
    if(listings.length>0)console.log('Maksab: JSON-LD found '+listings.length+' listings');
  }catch(e){console.log('Maksab: JSON-LD error',e);}
}

/* ═══ Strategy 3: Image-based DOM extraction ═══ */
/* Instead of scanning all <a> links, start from dubizzle CDN thumbnail images */
if(listings.length===0){
  strategy='DOM-images';
  var adImages=document.querySelectorAll('img[src*="images.dubizzle.com.eg"],img[src*="dbzl.com/images"],img[data-src*="images.dubizzle.com.eg"],img[src*="dubizzle"][src*="thumbnail"]');
  console.log('Maksab: DOM-images strategy — found '+adImages.length+' dubizzle CDN images');
  /* ═══ DEBUG: Parent chain for first 3 images ═══ */
  for(var dbg=0;dbg<Math.min(3,adImages.length);dbg++){
    var dbgImg=adImages[dbg];
    console.log('Maksab IMG #'+dbg+':', {
      src: dbgImg.src,
      alt: dbgImg.alt||dbgImg.title||'(no alt)',
      p1_tag: dbgImg.parentElement?dbgImg.parentElement.tagName:null,
      p1_class: dbgImg.parentElement?dbgImg.parentElement.className.substring(0,80):null,
      p2_tag: dbgImg.parentElement&&dbgImg.parentElement.parentElement?dbgImg.parentElement.parentElement.tagName:null,
      p2_class: dbgImg.parentElement&&dbgImg.parentElement.parentElement?dbgImg.parentElement.parentElement.className.substring(0,80):null,
      p3_tag: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement?dbgImg.parentElement.parentElement.parentElement.tagName:null,
      p3_class: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement?dbgImg.parentElement.parentElement.parentElement.className.substring(0,80):null,
      p4_tag: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement?dbgImg.parentElement.parentElement.parentElement.parentElement.tagName:null,
      p4_class: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement?dbgImg.parentElement.parentElement.parentElement.parentElement.className.substring(0,80):null,
      p5_tag: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement.parentElement?dbgImg.parentElement.parentElement.parentElement.parentElement.parentElement.tagName:null,
      p5_class: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement.parentElement?dbgImg.parentElement.parentElement.parentElement.parentElement.parentElement.className.substring(0,80):null,
      closest_a: dbgImg.closest('a')?(dbgImg.closest('a').href||'').substring(0,100):'(no <a>)',
      p3_text_sample: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement?(dbgImg.parentElement.parentElement.parentElement.textContent||'').substring(0,200):'',
      p5_text_sample: dbgImg.parentElement&&dbgImg.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement&&dbgImg.parentElement.parentElement.parentElement.parentElement.parentElement?(dbgImg.parentElement.parentElement.parentElement.parentElement.parentElement.textContent||'').substring(0,200):''
    });
  }
  /* ═══ DEBUG: Ad links with /ad/ ═══ */
  var adLinks=document.querySelectorAll('a[href*="/ad/"]');
  console.log('Maksab: عدد روابط /ad/:', adLinks.length);
  if(adLinks.length>0){
    console.log('Maksab: أول رابط إعلان:', adLinks[0].href);
    console.log('Maksab: parent:', adLinks[0].parentElement?(adLinks[0].parentElement.className||'').substring(0,100):'');
    console.log('Maksab: text:', (adLinks[0].textContent||'').substring(0,200));
  }
  /* ═══ DEBUG: aria/data-testid/class ad elements ═══ */
  var adElements=document.querySelectorAll('[aria-label*="ad"],[data-testid*="ad"],[data-testid*="listing"],[class*="listing-card"],[class*="ad-card"]');
  console.log('Maksab: عناصر ad/listing:', adElements.length);
  if(adElements.length>0){
    for(var ae=0;ae<Math.min(3,adElements.length);ae++){
      console.log('Maksab: ad element #'+ae+':', {tag:adElements[ae].tagName, class:(adElements[ae].className||'').substring(0,100), testid:adElements[ae].getAttribute('data-testid'), aria:adElements[ae].getAttribute('aria-label'), text:(adElements[ae].textContent||'').substring(0,150)});
    }
  }
  /* ═══ END DEBUG ═══ */
  var seen={};
  for(var di=0;di<adImages.length;di++){
    var img=adImages[di];
    /* Walk up to find the card container (usually an <a> or a wrapper) */
    var card=img.closest('a[href*="dubizzle"]')||img.closest('[class*="card"]')||img.closest('li')||img.closest('article')||img.closest('[role="article"]');
    if(!card){
      /* Try walking up manually 5 levels */
      var el=img;
      for(var up=0;up<5;up++){
        el=el.parentElement;
        if(!el)break;
        if(el.tagName==='A'||el.querySelector('a[href*="dubizzle"]')){card=el;break;}
      }
    }
    if(!card)continue;
    /* Find the link */
    var link=null;
    if(card.tagName==='A'&&card.href){link=card.href;}
    else{
      var aEl=card.querySelector('a[href*="dubizzle.com.eg"]');
      if(aEl)link=aEl.href;
    }
    if(!link||seen[link])continue;
    seen[link]=true;
    /* Extract title */
    var title='';
    var hEl=card.querySelector('h2,h3,h4,[data-testid*="title"],[class*="title"]');
    if(hEl)title=hEl.textContent.trim();
    if(!title){
      var aTitle=card.querySelector('a[aria-label]');
      if(aTitle)title=aTitle.getAttribute('aria-label');
    }
    if(!title&&card.tagName==='A')title=card.getAttribute('aria-label')||card.getAttribute('title')||'';
    if(!title||title.length<3)continue;
    /* Extract price from card text */
    var price=null;
    var priceEl=card.querySelector('[data-testid*="price"],[class*="price"],[class*="Price"]');
    if(priceEl){
      var pt=priceEl.textContent.replace(/[^0-9]/g,'');
      if(pt)price=parseInt(pt);
    }
    if(!price){
      var cardText=card.textContent||'';
      var pm=cardText.match(/(\\d[\\d,\\u066C]*(?:\\.\\d+)?)\\s*(?:ج\\.م|جنيه|EGP|LE)/);
      if(pm)price=parseInt(pm[1].replace(/[,\\u066C]/g,''));
    }
    /* Extract location */
    var loc='';
    var locEl=card.querySelector('[data-testid*="location"],[class*="location"],[class*="Location"],[class*="address"]');
    if(locEl)loc=locEl.textContent.trim();
    if(!loc){
      var locMatch=(card.textContent||'').match(/([\\u0600-\\u06FF][\\u0600-\\u06FF\\s]+)[,،]\\s*([\\u0600-\\u06FF][\\u0600-\\u06FF\\s]+)/);
      if(locMatch)loc=locMatch[1].trim()+', '+locMatch[2].trim();
    }
    /* Extract date */
    var dateText='';
    var dateEl=card.querySelector('[data-testid*="date"],time,[class*="date"],[class*="time"]');
    if(dateEl)dateText=dateEl.textContent.trim();
    if(!dateText){
      var dm=(card.textContent||'').match(/(?:منذ[^,،]*|\\d+\\s+\\w+\\s+ago)/);
      if(dm)dateText=dm[0].trim();
    }
    /* Thumbnail URL */
    var thumb=img.src||img.getAttribute('data-src')||null;
    /* Seller info */
    var sellerName=null;
    var selEl=card.querySelector('[data-testid*="seller"],[class*="seller"],[class*="Seller"]');
    if(selEl)sellerName=selEl.textContent.trim();
    var ct=card.textContent||'';
    listings.push({
      url:link,title:title,price:price,currency:'EGP',
      thumbnailUrl:thumb,location:loc,dateText:dateText,
      sellerName:sellerName,sellerProfileUrl:null,
      isVerified:ct.indexOf('موثق')>-1,isBusiness:false,
      isFeatured:ct.indexOf('مميز')>-1,
      supportsExchange:ct.indexOf('تبادل')>-1||ct.indexOf('بدل')>-1,
      isNegotiable:ct.indexOf('قابل للتفاوض')>-1,
      category:null
    });
  }
  console.log('Maksab: DOM-images extracted '+listings.length+' listings from image cards');
}

/* ═══ DEBUG: final summary ═══ */
console.log('Maksab: Strategy used:', strategy);
console.log('Maksab: Found', listings.length, 'real listings');
if(listings.length>0){
  console.log('Maksab: Sample:', JSON.stringify(listings[0]));
  console.log('Maksab: All titles:', listings.map(function(l){return l.title;}).join(' | '));
}

/* ═══ Result ═══ */
if(listings.length===0){
  alert('لم يتم العثور على إعلانات في هذه الصفحة\\n\\nStrategy tried: '+strategy+'\\nتأكد إنك على صفحة قوائم (مش صفحة إعلان واحد).\\n\\nافتح الـ Console (F12) وابحث عن Maksab لمزيد من التفاصيل.');
  return;
}

/* ═══ Send via popup window (no CORS needed!) ═══ */
var payload=JSON.stringify({
  url:window.location.href,
  listings:listings,
  timestamp:new Date().toISOString(),
  source:'bookmarklet',
  strategy:strategy,
  scope_code:SCOPE||null
});

var statusDiv=document.createElement('div');
statusDiv.style.cssText='position:fixed;top:20px;right:20px;background:#1B7A3D;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
statusDiv.textContent='🌾 جاري إرسال '+listings.length+' إعلان لمكسب... (strategy: '+strategy+')';
document.body.appendChild(statusDiv);

var popup=window.open(MAKSAB+'/admin/crm/harvester/receive','maksab_harvest','width=500,height=400,scrollbars=yes');
if(!popup){
  statusDiv.style.background='#DC2626';
  statusDiv.textContent='❌ المتصفح منع فتح النافذة — اسمح بالـ popups لموقع مكسب';
  setTimeout(function(){statusDiv.remove();},8000);
  return;
}

var checkReady=setInterval(function(){
  try{
    popup.postMessage({type:'harvest_data',payload:payload,token:TOKEN},MAKSAB);
  }catch(e){}
},500);

var timeout=setTimeout(function(){
  clearInterval(checkReady);
  statusDiv.style.background='#DC2626';
  statusDiv.textContent='❌ انتهت المهلة — النافذة لم تستجب';
  setTimeout(function(){statusDiv.remove();},5000);
  try{popup.close();}catch(e){}
},30000);

window.addEventListener('message',function handler(e){
  if(e.origin!==MAKSAB)return;
  if(e.data&&e.data.type==='harvest_result'){
    clearInterval(checkReady);
    clearTimeout(timeout);
    window.removeEventListener('message',handler);
    if(e.data.error){
      statusDiv.style.background='#DC2626';
      statusDiv.textContent='❌ خطأ: '+e.data.error;
    }else{
      statusDiv.style.background='#1B7A3D';
      statusDiv.innerHTML='✅ تم إرسال '+e.data.received+' إعلان لمكسب<br><span style="font-size:13px">'+e.data.new_count+' جديد — '+e.data.duplicate+' مكرر — طريقة: '+strategy+'</span>';
    }
    setTimeout(function(){statusDiv.remove();},8000);
    setTimeout(function(){try{popup.close();}catch(e){}},2000);
  }
});
})();
`.trim().replace(/\n\s*/g, '');

  return `javascript:${encodeURIComponent(code)}`;
}
