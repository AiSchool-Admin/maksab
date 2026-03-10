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
}

export default function BookmarkletPage() {
  const [appUrl, setAppUrl] = useState("");
  const [recentResults, setRecentResults] = useState<BookmarkletResult[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadRecentResults();
  }, [loadRecentResults]);

  async function testBookmarklet() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/harvester/receive-bookmarklet", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          url: "https://www.dubizzle.com.eg/test",
          listings: [
            {
              url: "https://www.dubizzle.com.eg/test/listing-1",
              title: "اختبار — إعلان تجريبي من Bookmarklet",
              price: 10000,
              location: "القاهرة",
              dateText: "منذ ساعة",
              sellerName: "اختبار",
            },
          ],
          timestamp: new Date().toISOString(),
          source: "bookmarklet_test",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecentResults((prev) => [data, ...prev].slice(0, 10));
        alert(`تم استقبال ${data.received} إعلان — ${data.new} جديد، ${data.duplicate} مكرر`);
      } else {
        alert("خطأ: " + (data.error || "فشل الإرسال"));
      }
    } catch (err) {
      alert("خطأ في الاتصال: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  // Build the bookmarklet JavaScript code
  const bookmarkletCode = buildBookmarkletCode(appUrl);

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

      {/* Setup Instructions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">📋 طريقة الإعداد</h2>

        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">1</span>
            <div>
              <p className="font-bold">اسحب الزر ده لشريط المفضلة:</p>
              <div className="mt-2 bg-gray-50 rounded-lg p-4 flex items-center gap-4">
                {appUrl ? (
                  <a
                    href={bookmarkletCode}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-lg cursor-grab hover:bg-green-700 inline-block select-none"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("اسحب الزر ده لشريط المفضلة (Bookmarks Bar) في المتصفح — متضغطش عليه هنا!");
                    }}
                    draggable
                  >
                    🌾 حصاد مكسب
                  </a>
                ) : (
                  <span className="text-gray-400">جاري التحميل...</span>
                )}
                <span className="text-gray-400 text-xs">← اسحب لشريط المفضلة</span>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                لو شريط المفضلة مش ظاهر: Chrome → View → Show Bookmarks Bar (Ctrl+Shift+B)
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">2</span>
            <div>
              <p className="font-bold">افتح صفحة دوبيزل اللي عايز تحصدها:</p>
              <p className="text-gray-500 mt-1">
                مثلاً: صفحة قوائم الموبايلات في الإسكندرية
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">3</span>
            <div>
              <p className="font-bold">اضغط على &quot;🌾 حصاد مكسب&quot; في شريط المفضلة</p>
              <p className="text-gray-500 mt-1">
                الـ Bookmarklet هيقرأ الإعلانات من الصفحة ويبعتها لمكسب تلقائياً
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">4</span>
            <div>
              <p className="font-bold">هتشوف رسالة: &quot;تم إرسال XX إعلان لمكسب&quot;</p>
              <p className="text-gray-500 mt-1">
                البيانات بتروح لنفس pipeline المحرك (dedup + enrich + store)
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Bookmarklet Code (for debugging / manual copy) */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-3">🔧 الكود (للنسخ اليدوي)</h2>
        <p className="text-gray-400 text-xs mb-2">لو السحب مش شغال، انسخ الكود ده وأضفه كـ bookmark يدوياً:</p>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-40" dir="ltr">
          {bookmarkletCode || "جاري التحميل..."}
        </div>
      </div>

      {/* Test Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-3">🧪 اختبار الاستقبال</h2>
        <p className="text-gray-500 text-sm mb-4">
          اضغط الزر ده لإرسال إعلان تجريبي والتأكد إن الـ API شغال
        </p>
        <button
          onClick={testBookmarklet}
          disabled={loading}
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

function buildBookmarkletCode(appUrl: string): string {
  if (!appUrl) return "";

  // The bookmarklet JavaScript that runs on dubizzle.com.eg
  const code = `
(function(){
  var API='${appUrl}/api/admin/crm/harvester/receive-bookmarklet';
  var listings=[];

  /* Try to find listing cards on the page */
  /* Dubizzle uses various card selectors */
  var cards=document.querySelectorAll('[data-testid*="listing"], [class*="listing-card"], [class*="ad-card"], li[aria-label], a[href*="/listing/"]');

  /* If no cards found, try broader selectors */
  if(cards.length===0){
    cards=document.querySelectorAll('article, [role="article"], .css-qfzx1y, ul li a[href]');
  }

  /* Extract all listing links from the page */
  var links=document.querySelectorAll('a[href]');
  var seen={};

  for(var i=0;i<links.length;i++){
    var a=links[i];
    var href=a.href||'';

    /* Match dubizzle listing URLs */
    if(!href.match(/dubizzle\\.com\\.eg\\/[\\w-]+\\/[\\w-]+\\//)) continue;
    if(href.includes('/search')||href.includes('/login')||href.includes('/signup')) continue;
    if(seen[href]) continue;
    seen[href]=true;

    /* Try to get title and price from nearby elements */
    var parent=a.closest('li,article,div[class]')||a.parentElement;
    var title=a.getAttribute('aria-label')||a.getAttribute('title')||'';
    if(!title&&parent){
      var h=parent.querySelector('h2,h3,[class*="title"]');
      if(h) title=h.textContent.trim();
    }
    if(!title) title=a.textContent.trim().substring(0,100);
    if(!title||title.length<3) continue;

    var price=null;
    if(parent){
      var priceEl=parent.querySelector('[class*="price"],[data-testid*="price"]');
      if(priceEl){
        var priceText=priceEl.textContent.replace(/[^0-9]/g,'');
        if(priceText) price=parseInt(priceText);
      }
    }

    var location='';
    if(parent){
      var locEl=parent.querySelector('[class*="location"],[class*="address"],[data-testid*="location"]');
      if(locEl) location=locEl.textContent.trim();
    }

    var img=null;
    if(parent){
      var imgEl=parent.querySelector('img');
      if(imgEl) img=imgEl.src||imgEl.getAttribute('data-src')||null;
    }

    listings.push({
      url:href,
      title:title,
      price:price,
      location:location,
      thumbnailUrl:img,
      dateText:'',
      sellerName:null
    });
  }

  if(listings.length===0){
    alert('لم يتم العثور على إعلانات في هذه الصفحة');
    return;
  }

  /* Send to Maksab API */
  var xhr=new XMLHttpRequest();
  xhr.open('POST',API,true);
  xhr.setRequestHeader('Content-Type','application/json');
  xhr.onload=function(){
    if(xhr.status===200){
      var r=JSON.parse(xhr.responseText);
      alert('تم إرسال '+r.received+' إعلان لمكسب ✅\\n'+r.new+' جديد — '+r.duplicate+' مكرر');
    }else{
      alert('خطأ في الإرسال: '+xhr.status);
    }
  };
  xhr.onerror=function(){
    alert('خطأ في الاتصال بمكسب — تأكد إن التطبيق شغال');
  };
  xhr.send(JSON.stringify({
    url:window.location.href,
    listings:listings,
    timestamp:new Date().toISOString(),
    source:'bookmarklet'
  }));
})();
`.trim().replace(/\n\s*/g, '');

  return `javascript:${encodeURIComponent(code)}`;
}
