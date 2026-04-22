"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Bookmarklet installer page for the Unified Harvester v11.
 * Renders a drag-to-bookmarks-bar button + copy-code fallback + full usage guide.
 */
export default function BookmarkletInstallPage() {
  const [appUrl, setAppUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Origin of the current app — used to build absolute URL to the script
    setAppUrl(window.location.origin);
  }, []);

  // The bookmarklet loads the unified harvester script dynamically with a
  // cache-buster so users always get the latest version.
  const scriptUrl = appUrl ? `${appUrl}/scripts/harvest-unified.js` : "";
  const bookmarkletCode = appUrl
    ? `javascript:(function(){var s=document.createElement('script');s.src='${scriptUrl}?v='+Date.now();document.body.appendChild(s);})();`
    : "";

  const buttonHtml = bookmarkletCode
    ? `<a href="${bookmarkletCode.replace(/"/g, "&quot;")}" style="display:inline-flex;align-items:center;gap:10px;padding:14px 28px;background:linear-gradient(135deg,#1B7A3D,#145C2E);color:white;border-radius:14px;text-decoration:none;font-weight:700;font-size:17px;cursor:grab;user-select:none;box-shadow:0 4px 14px rgba(27,122,61,0.35);font-family:inherit;" onclick="event.preventDefault();alert('اسحب الزر ده بالماوس لشريط المفضلة — متضغطش عليه هنا!');">🌾 مكسب — حصاد موحّد v11</a>`
    : "";

  const platforms = [
    { icon: "🏠", name: "سمسار مصر", example: "https://www.semsarmasr.com/3akarat?cid=952&purpose=sale&g=979&p=1", note: "شقق للبيع في الإسكندرية" },
    { icon: "🏢", name: "أقارماب", example: "https://aqarmap.com.eg/ar/for-sale/property-type/alexandria/", note: "عقارات للبيع في الإسكندرية" },
    { icon: "📱", name: "دوبيزل", example: "https://www.dubizzle.com.eg/ar/alexandria/properties/apartments-for-sale/", note: "شقق للبيع في الإسكندرية" },
    { icon: "🛒", name: "أوبن سوق", example: "https://eg.opensooq.com/ar/alexandria/real-estate/apartments-for-sale", note: "شقق للبيع في الإسكندرية" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-[#1B7A3D] text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold">مكسب 💚</Link>
            <p className="text-xs opacity-80 mt-1">تثبيت الحصّاد الموحّد</p>
          </div>
          <Link href="/admin/marketplace" className="text-xs opacity-90 hover:opacity-100">
            ← لوحة السوق
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">🌾 الحصّاد الموحّد v11</h1>
          <p className="text-sm text-gray-600">
            أداة واحدة تحصد من 4 منصات: سمسار مصر، دوبيزل، أوبن سوق، أقارماب. تعرف تلقائياً
            القسم والمحافظة من الصفحة اللي أنت فيها.
          </p>
        </div>

        {/* ═══ Step 1: Drag to bookmarks bar ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1B7A3D] text-white font-bold text-sm">1</span>
            <h2 className="text-lg font-bold text-[#1A1A2E]">اسحب الزر لشريط المفضلة</h2>
          </div>

          {/* The drag button — plain HTML anchor rendered via dangerouslySetInnerHTML
              so the href remains javascript:... and the browser treats the element
              as a draggable bookmark candidate. */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 mb-4 border border-green-100">
            <div className="flex items-center justify-center mb-3">
              {buttonHtml ? (
                <div dangerouslySetInnerHTML={{ __html: buttonHtml }} />
              ) : (
                <span className="text-gray-400">جاري التحميل...</span>
              )}
            </div>
            <p className="text-xs text-center text-gray-500">
              ☝️ <b>اسحب الزر الأخضر بالماوس</b> إلى شريط المفضلة (Bookmarks Bar) في أعلى المتصفح
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-900">
            <p className="font-bold mb-1">💡 مش شايف شريط المفضلة؟</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><b>Chrome / Edge:</b> اضغط <code className="bg-yellow-100 px-1 rounded">Ctrl+Shift+B</code> (أو <code className="bg-yellow-100 px-1 rounded">⌘+Shift+B</code> على Mac)</li>
              <li><b>Firefox:</b> View → Toolbars → Bookmarks Toolbar → Always Show</li>
              <li><b>Safari:</b> View → Show Favorites Bar</li>
            </ul>
          </div>
        </div>

        {/* ═══ Step 2: Copy code (alternative) ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-400 text-white font-bold text-sm">2</span>
            <h2 className="text-lg font-bold text-[#1A1A2E]">أو — انسخ الكود يدوياً (بديل)</h2>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            لو السحب مش شغال (بعض المتصفحات بتمنع)، انسخ الكود وضيفه يدوياً كـ bookmark:
          </p>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                if (!bookmarkletCode) return;
                navigator.clipboard.writeText(bookmarkletCode).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                });
              }}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                copied ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {copied ? "✓ تم النسخ" : "📋 انسخ الكود"}
            </button>
          </div>

          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">👁️ اظهر الكود الكامل</summary>
            <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-[11px] leading-relaxed">
              {bookmarkletCode || "جاري التحميل..."}
            </pre>
          </details>

          <div className="bg-gray-50 rounded-lg p-3 mt-3 text-xs text-gray-600 space-y-1">
            <p className="font-bold text-gray-800">طريقة التثبيت اليدوي:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>انسخ الكود (الزر أعلاه)</li>
              <li>كليك يمين على شريط المفضلة ← &ldquo;Add page&rdquo; / &ldquo;إضافة صفحة&rdquo;</li>
              <li>الاسم: <code className="bg-gray-200 px-1 rounded">Maksab Harvester v11</code></li>
              <li>الرابط (URL): الصق الكود المنسوخ</li>
              <li>احفظ</li>
            </ol>
          </div>
        </div>

        {/* ═══ Step 3: Use it ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#D4A843] text-[#1A1A2E] font-bold text-sm">3</span>
            <h2 className="text-lg font-bold text-[#1A1A2E]">جرّبه على السيتات المدعومة</h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            افتح واحد من الروابط دي في تاب جديد، ولما الصفحة تحمّل، اضغط الـ bookmark من شريط المفضلة.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {platforms.map((p) => (
              <a
                key={p.name}
                href={p.example}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#1A1A2E]">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>
                  <p className="text-[10px] text-blue-600 truncate mt-1" dir="ltr">↗ {p.example}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ═══ What to expect ═══ */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>اللي هيحصل لما تضغط الـ bookmark</span>
          </h3>
          <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
            <li>لوحة خضراء تظهر على يمين الصفحة تعرض: المنصة / المحافظة / القسم / نوع البيع</li>
            <li>عدّ 8 ثواني ثم يبدأ الحصاد تلقائياً (أو اضغط &quot;ابدأ الآن&quot;)</li>
            <li>يلف على كل صفحات الإعلانات (حتى 200 صفحة أو لحد إعلانات قديمة)</li>
            <li>يفتح كل إعلان لاستخراج الرقم واسم البائع</li>
            <li>يفتح popup صغير لـ <code className="bg-blue-100 px-1 rounded">maksab.vercel.app</code> علشان يحفظ (ده طبيعي)</li>
            <li>في الآخر: تقرير نهائي بعدد اللي اتحصد</li>
          </ol>
        </div>

        {/* ═══ Safety reminder ═══ */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
          <p className="font-bold mb-1">⚠️ تنبيه</p>
          <p>
            الـ bookmarklet <b>مش بيشتغل على صفحات مكسب</b> — بيشتغل على سيتات المنصات الخارجية فقط
            (سمسار مصر / دوبيزل / أوبن سوق / أقارماب). لو ضغطته على <code className="bg-amber-100 px-1 rounded">maksab.vercel.app</code>
            هيقولك &quot;السيت مش مدعومة&quot;.
          </p>
        </div>
      </div>
    </div>
  );
}
