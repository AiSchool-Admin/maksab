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
            📋 Bookmarklet — حصاد سمسار مصر (تلقائي)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            يحصد كل الصفحات تلقائياً بضغطة واحدة — حتى 10 صفحات
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
        <h2 className="text-base font-bold text-red-700 mb-2">
          ليه Bookmarklet مش Server Fetch؟
        </h2>
        <p className="text-sm text-red-600">
          سمسار مصر بيحظر الطلبات من سيرفرات Cloud بكود 403.
          الـ Bookmarklet بيشتغل من متصفح الموظف.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-blue-700 mb-3">كيف يشتغل؟</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <span>ثبّت الـ Bookmarklet في شريط المفضلة (مرة واحدة فقط)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <span>افتح أي صفحة إعلانات في <code className="bg-blue-100 px-1 rounded" dir="ltr">semsarmasr.com</code></span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
            <span>اضغط الـ Bookmarklet — <strong>هيحصد كل الصفحات تلقائياً</strong> (حتى 10 صفحات)</span>
          </li>
        </ol>
      </div>

      {/* Drag & Drop */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-green-700 mb-3">اسحب للمفضلة</h2>
        <div className="flex items-center gap-4 mb-3">
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
      </div>

      {/* Copy Code */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-base font-bold text-gray-700 mb-3">نسخ الكود يدوياً</h2>
        <button
          onClick={() => {
            navigator.clipboard.writeText(bookmarkletCode).then(() => {
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 3000);
            });
          }}
          className={`px-6 py-3 rounded-xl font-bold text-lg mb-3 transition-colors ${
            codeCopied ? "bg-green-600 text-white" : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {codeCopied ? "تم النسخ!" : "انسخ كود الـ Bookmarklet"}
        </button>
      </div>

      {/* Recent Results */}
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
  const code = `(function(){var MAKSAB='${appUrl}';var TOKEN='${TOKEN}';var MAX_PAGES=10;if(!location.hostname.includes('semsarmasr')&&!location.hostname.includes('sooqmsr')){alert('افتح semsarmasr.com الأول');return;}var sd=document.createElement('div');sd.style.cssText='position:fixed;top:20px;right:20px;background:#7B1FA2;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);min-width:280px;';sd.textContent='جاري حصاد كل الصفحات...';document.body.appendChild(sd);function ext(doc){var ls=[];var seen={};var cards=doc.querySelectorAll('a[href*="/3akarat/"],a[href*="/ad/"],.card,article,[class*="listing"]');for(var i=0;i<cards.length;i++){var el=cards[i];var a=el.tagName==='A'?el:el.querySelector('a[href*="/3akarat/"],a[href]');if(!a)continue;var u=a.href;if(!u||seen[u]||!/semsarmasr|sooqmsr/.test(u)||u.includes('/category')||u.includes('/search'))continue;try{if(new URL(u).pathname.split('/').length<3)continue;}catch(e){continue;}seen[u]=true;var p=a.closest('div,li,article')||a.parentElement;var t=p?p.textContent:'';var ti=a.getAttribute('title')||a.textContent.trim().split('\\n')[0];if(!ti||ti.length<3||ti.length>300)continue;var pm=t.match(/([\\d,]+)\\s*(?:EGP|LE|جنيه)/i);var ph=t.match(/01[0-25]\\d{8}/);ls.push({url:u,title:ti,price:pm?parseInt(pm[1].replace(/,/g,'')):null,currency:'EGP',description:t.substring(0,500),thumbnailUrl:null,location:'',dateText:'',sellerName:null,sellerProfileUrl:null,sellerPhone:ph?ph[0]:null,isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false});}return ls;}function getUrl(pg){var u=new URL(location.href);u.searchParams.set('s',pg);return u.toString();}function send(all,pages){var pl=JSON.stringify({url:location.href,listings:all,timestamp:new Date().toISOString(),source:'bookmarklet-auto',strategy:'semsarmasr-multi',scope_code:null,platform:'semsarmasr'});var pop=window.open(MAKSAB+'/admin/crm/harvester/receive','mh','width=500,height=400');if(!pop){sd.style.background='#DC2626';sd.textContent='اسمح بالـ popups';return;}var ci=setInterval(function(){try{pop.postMessage({type:'harvest_data',payload:pl,token:TOKEN},MAKSAB);}catch(e){}},500);var to=setTimeout(function(){clearInterval(ci);sd.style.background='#DC2626';sd.textContent='انتهت المهلة';setTimeout(function(){sd.remove();},5000);},60000);window.addEventListener('message',function h(e){if(e.origin!==MAKSAB)return;if(e.data&&e.data.type==='harvest_result'){clearInterval(ci);clearTimeout(to);window.removeEventListener('message',h);sd.style.background='#1B7A3D';sd.innerHTML='✅ تم حصاد '+pages+' صفحات<br>'+e.data.received+' إعلان — '+e.data.new_count+' جديد — '+e.data.duplicate+' مكرر';setTimeout(function(){sd.remove();},10000);setTimeout(function(){try{pop.close();}catch(e){}},3000);}});}var all=[];function go(pg){if(pg>MAX_PAGES){if(all.length>0){sd.textContent='إرسال '+all.length+' إعلان من '+(pg-1)+' صفحات...';send(all,pg-1);}else{sd.style.background='#DC2626';sd.textContent='لم يتم العثور على إعلانات';setTimeout(function(){sd.remove();},5000);}return;}if(pg===1){var ls=ext(document);all=all.concat(ls);sd.textContent='صفحة 1: '+ls.length+' إعلان';setTimeout(function(){go(2);},500);return;}sd.textContent='تحميل صفحة '+pg+'...';fetch(getUrl(pg)).then(function(r){return r.text();}).then(function(html){var doc=new DOMParser().parseFromString(html,'text/html');var ls=ext(doc);if(ls.length===0){sd.textContent='إرسال '+all.length+' إعلان من '+(pg-1)+' صفحات...';send(all,pg-1);return;}all=all.concat(ls);sd.textContent='صفحة '+pg+': '+ls.length+' (إجمالي: '+all.length+')';setTimeout(function(){go(pg+1);},1000);}).catch(function(){sd.textContent='إرسال '+all.length+' إعلان...';send(all,pg-1);});}go(1);})();`;

  return `javascript:${encodeURIComponent(code)}`;
}
