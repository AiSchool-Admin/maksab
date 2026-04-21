"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface SubmissionResult {
  received: number;
  new_count: number;
  duplicate: number;
  errors: string[];
  timestamp: string;
}

export default function SemsarMasrBookmarkletPage() {
  const [appUrl, setAppUrl] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [recentResults, setRecentResults] = useState<SubmissionResult[]>([]);

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!appUrl || event.origin !== appUrl) return;
      if (event.data?.type === "harvest_result") {
        setRecentResults((prev) =>
          [
            {
              received: event.data.received || 0,
              new_count: event.data.new_count || 0,
              duplicate: event.data.duplicate || 0,
              errors: event.data.errors || [],
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 20)
        );
      }
    },
    [appUrl]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const bookmarkletCode = appUrl ? buildBookmarklet(appUrl) : "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📋 حصاد سمسار مصر — تلقائي بالكامل
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            يحصد حتى 50 صفحة + يستخرج الأرقام من صفحات التفاصيل + يفلتر الإسكندرية فقط
          </p>
        </div>
        <Link
          href="/admin/sales/harvester/bookmarklets"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          ← كل الـ Bookmarklets
        </Link>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-red-700 mb-2">ليه Bookmarklet؟</h2>
        <p className="text-sm text-red-600">
          سمسار مصر بيحظر الطلبات من السيرفرات (403). الـ Bookmarklet بيشتغل من متصفحك مباشرة.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-blue-700 mb-3">الخطوات:</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <span>اسحب الزر البنفسجي لشريط المفضلة (مرة واحدة)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <span>افتح <code className="bg-blue-100 px-1 rounded" dir="ltr">semsarmasr.com</code> — صفحة عقارات الإسكندرية</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
            <span>اضغط الـ Bookmarklet — <strong>يحصد كل الصفحات + الأرقام تلقائياً</strong></span>
          </li>
        </ol>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-green-700 mb-3">اسحب للمفضلة</h2>
        {appUrl ? (
          <div
            dangerouslySetInnerHTML={{
              __html: `<a href="${bookmarkletCode}" style="display:inline-block;padding:12px 24px;background:#7B1FA2;color:white;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;cursor:grab;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onclick="event.preventDefault();alert('اسحب الزر ده لشريط المفضلة!');">📋 حصاد سمسار مصر</a>`,
            }}
          />
        ) : (
          <span className="text-gray-400">جاري التحميل...</span>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <button
          onClick={() => {
            navigator.clipboard.writeText(bookmarkletCode).then(() => {
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 3000);
            });
          }}
          className={`px-6 py-3 rounded-xl font-bold text-lg transition-colors ${
            codeCopied ? "bg-green-600 text-white" : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {codeCopied ? "تم النسخ!" : "انسخ كود الـ Bookmarklet"}
        </button>
      </div>

      {recentResults.length > 0 && (
        <div className="bg-white border rounded-2xl p-5">
          <h2 className="text-base font-bold text-gray-700 mb-3">آخر الإرساليات</h2>
          <div className="space-y-2">
            {recentResults.map((r, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <span className="text-green-700 font-bold">{r.new_count} جديد</span>
                  <span className="text-yellow-600">{r.duplicate} مكرر</span>
                </div>
                <span className="text-gray-400 text-xs">{new Date(r.timestamp).toLocaleString("ar-EG")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildBookmarklet(appUrl: string): string {
  const TOKEN = "8424a27fde826eaf7d6e3ab0e7710804f7f9ff7f3e94fef0dc467e945a8b3f58";

  const code = `void(function(){window.__MAKSAB_URL='${appUrl}';window.__MAKSAB_TOKEN='${TOKEN}';var s=document.createElement('script');s.src='${appUrl}/scripts/harvest-semsarmasr.js?v='+Date.now();document.body.appendChild(s);}())`;

  return `javascript:${code}`;
}
