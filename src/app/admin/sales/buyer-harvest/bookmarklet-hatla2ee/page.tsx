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

export default function Hatla2eeBookmarkletPage() {
  const [appUrl, setAppUrl] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [recentResults, setRecentResults] = useState<SubmissionResult[]>([]);

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  // Listen for postMessage from bookmarklet popup
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

  const bookmarkletCode = appUrl ? buildHatla2eeBookmarklet(appUrl) : "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🚗 Bookmarklet — حصاد هتلاقي
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            استخراج إعلانات السيارات من eg.hatla2ee.com — محظور من السيرفر (403)
            فلازم bookmarklet
          </p>
        </div>
        <Link
          href="/admin/sales/buyer-harvest"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          ← العودة
        </Link>
      </div>

      {/* Why Bookmarklet */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-red-700 mb-2">
          ليه Bookmarklet مش Server Fetch؟
        </h2>
        <p className="text-sm text-red-600">
          هتلاقي (hatla2ee.com) بيحظر الطلبات من سيرفرات Cloud (Vercel / AWS /
          GCP) بكود 403. الـ Bookmarklet بيشتغل من متصفح الموظف بـ IP عادي
          فبيعدي عادي.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-blue-700 mb-3">كيف يشتغل؟</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              1
            </span>
            <span>
              ثبّت الـ Bookmarklet في شريط المفضلة (اسحب الزر أو انسخ الكود)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              2
            </span>
            <span>
              افتح صفحة قوائم سيارات في هتلاقي (مثلاً:{" "}
              <code className="bg-blue-100 px-1 rounded" dir="ltr">
                eg.hatla2ee.com/en/car/used-cars-for-sale
              </code>
              )
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span>
              اضغط &ldquo;🚗 حصاد هتلاقي&rdquo; — هيستخرج الإعلانات ويبعتها
              لمكسب تلقائياً
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              4
            </span>
            <span>
              الإعلانات بتتحفظ في <code className="bg-blue-100 px-1 rounded">ahe_listings</code> بـ{" "}
              <code className="bg-blue-100 px-1 rounded">source_platform = &apos;hatla2ee&apos;</code>
            </span>
          </li>
        </ol>
      </div>

      {/* ═══ Method 1: Drag & Drop ═══ */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-green-700 mb-3">
          الطريقة 1 — اسحب للمفضلة (الأسهل)
        </h2>
        <div className="flex items-center gap-4 mb-3">
          {appUrl ? (
            <div
              dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarkletCode}" style="display:inline-block;padding:12px 24px;background:#1565C0;color:white;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;cursor:grab;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onclick="event.preventDefault();alert('اسحب الزر ده بالماوس لشريط المفضلة — متضغطش عليه هنا!');">🚗 حصاد هتلاقي — اسحبني</a>`,
              }}
            />
          ) : (
            <span className="text-gray-400">جاري التحميل...</span>
          )}
        </div>
        <p className="text-gray-500 text-xs">
          اسحب الزر الأزرق بالماوس إلى شريط المفضلة (Bookmarks Bar) — اضغط
          Ctrl+Shift+B لإظهاره
        </p>
      </div>

      {/* ═══ Method 2: Copy Code ═══ */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-base font-bold text-gray-700 mb-3">
          الطريقة 2 — نسخ الكود يدوياً
        </h2>
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
        <ol className="space-y-2 text-sm text-gray-600 mt-3">
          <li>1. اضغط الزر لنسخ الكود</li>
          <li>
            2. كليك يمين على شريط المفضلة ← Add Page / إضافة صفحة
          </li>
          <li>
            3. الاسم: <strong>حصاد هتلاقي</strong> — الـ URL: الصق الكود
            المنسوخ
          </li>
        </ol>
      </div>

      {/* Supported Pages */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-base font-bold text-gray-700 mb-3">
          📄 الصفحات المدعومة
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✅</span>
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs" dir="ltr">
              eg.hatla2ee.com/en/car/used-cars-for-sale
            </code>
            <span className="text-gray-500">— سيارات مستعملة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✅</span>
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs" dir="ltr">
              eg.hatla2ee.com/en/car/new-cars
            </code>
            <span className="text-gray-500">— سيارات جديدة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✅</span>
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs" dir="ltr">
              eg.hatla2ee.com/en/car/used-cars-for-sale?...filters
            </code>
            <span className="text-gray-500">— مع فلاتر</span>
          </div>
        </div>
      </div>

      {/* Raw Code (debugging) */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-700">
            🔧 الكود الخام (للتصحيح)
          </h2>
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
        <div
          className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-40"
          dir="ltr"
        >
          {bookmarkletCode || "جاري التحميل..."}
        </div>
      </div>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div className="bg-white border rounded-2xl p-5">
          <h2 className="text-base font-bold text-gray-700 mb-3">
            📬 آخر الإرساليات
          </h2>
          <div className="space-y-2">
            {recentResults.map((r, i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm"
              >
                <div className="flex gap-4">
                  <span className="text-green-700 font-bold">
                    ✨ {r.new_count} جديد
                  </span>
                  <span className="text-yellow-600">
                    🔁 {r.duplicate} مكرر
                  </span>
                  <span className="text-gray-500">
                    📦 {r.received} مستقبل
                  </span>
                </div>
                <span className="text-gray-400 text-xs">
                  {new Date(r.timestamp).toLocaleString("ar-EG")}
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
 * Build Hatla2ee Bookmarklet code
 * Extracts car listings from hatla2ee.com list pages and sends to ahe_listings
 * via the harvester receive endpoint with source_platform = 'hatla2ee'
 */
function buildHatla2eeBookmarklet(appUrl: string): string {
  const code = `
(function(){
var MAKSAB='${appUrl}';
var PLATFORM='hatla2ee';

if(!window.location.hostname.includes('hatla2ee')){
  alert('\\u274C هذا الـ Bookmarklet خاص بموقع هتلاقي (hatla2ee.com)\\n\\nافتح eg.hatla2ee.com وجرب تاني');
  return;
}

function extractListings(){
  var listings=[];
  var seenUrls={};

  /* Strategy 1: car listing card links */
  var links=document.querySelectorAll('a[href*="/car/"],a[href*="/en/car/"]');
  console.log('Maksab Hatla2ee: Found',links.length,'car links');

  for(var i=0;i<links.length;i++){
    var a=links[i];
    var url=a.href;
    if(!url||seenUrls[url])continue;
    if(url.includes('/search')||url.includes('/filter')||url.includes('/compare'))continue;
    if(!/\\/car\\/.*\\d/.test(url))continue;
    seenUrls[url]=true;

    var card=a.closest('.card,.listing-card,.newCarListingCard,.vehicle-card,[class*=listing],[class*=card]')||a.parentElement.parentElement;
    if(!card)card=a.parentElement;
    var cardText=card?card.textContent:'';

    var title=a.getAttribute('title')||a.textContent.trim();
    if(!title||title.length<3){
      var h=card?card.querySelector('h2,h3,h4,[class*=title]'):null;
      if(h)title=h.textContent.trim();
    }
    if(!title||title.length<3)continue;

    var priceMatch=cardText.match(/([\\d,\\.]+)\\s*(?:EGP|LE|L\\.E|جنيه|ج\\.م)/i);
    var price=priceMatch?parseInt(priceMatch[1].replace(/[,\\.]/g,'')):null;
    if(!price){
      var priceEl=card?card.querySelector('[class*=price],[class*=Price]'):null;
      if(priceEl){var pt=priceEl.textContent.replace(/[^\\d]/g,'');if(pt)price=parseInt(pt);}
    }

    var img=card?card.querySelector('img[src*=".jpg"],img[src*=".jpeg"],img[src*=".png"],img[src*=".webp"],img[data-src]'):null;
    var thumbnail=img?(img.src||img.getAttribute('data-src')):null;

    var locEl=card?card.querySelector('[class*=location],[class*=Location],[class*=area]'):null;
    var location=locEl?locEl.textContent.trim():'';

    var isDealer=cardText.indexOf('dealer')>-1||cardText.indexOf('showroom')>-1||cardText.indexOf('معرض')>-1;

    listings.push({
      url:url,
      title:title,
      price:price,
      currency:'EGP',
      thumbnailUrl:thumbnail,
      location:location,
      dateText:'',
      sellerName:null,
      sellerProfileUrl:null,
      isVerified:isDealer,
      isBusiness:isDealer,
      isFeatured:cardText.indexOf('featured')>-1||cardText.indexOf('premium')>-1||cardText.indexOf('مميز')>-1,
      supportsExchange:false,
      isNegotiable:cardText.indexOf('negotiable')>-1||cardText.indexOf('قابل للتفاوض')>-1
    });
  }

  /* Strategy 2: JSON-LD structured data */
  if(listings.length===0){
    var scripts=document.querySelectorAll('script[type="application/ld+json"]');
    for(var s=0;s<scripts.length;s++){
      try{
        var ld=JSON.parse(scripts[s].textContent);
        if(ld.itemListElement){
          for(var j=0;j<ld.itemListElement.length;j++){
            var item=ld.itemListElement[j];
            var iurl=item.url||item.item&&item.item.url;
            var iname=item.name||item.item&&item.item.name;
            if(iurl&&iname&&!seenUrls[iurl]){
              seenUrls[iurl]=true;
              listings.push({url:iurl,title:iname,price:item.offers?parseInt(String(item.offers.price)):null,currency:'EGP',thumbnailUrl:item.image||null,location:'',dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false});
            }
          }
        }
      }catch(e){}
    }
  }

  console.log('Maksab Hatla2ee: Extracted',listings.length,'listings');
  return listings;
}

var listings=extractListings();
if(listings.length===0){
  alert('لم يتم العثور على إعلانات سيارات\\n\\nتأكد إنك على صفحة قوائم سيارات في هتلاقي\\neg.hatla2ee.com/en/car/used-cars-for-sale');
  return;
}

var payload=JSON.stringify({
  url:window.location.href,
  listings:listings,
  timestamp:new Date().toISOString(),
  source:'bookmarklet',
  strategy:'hatla2ee-cards',
  scope_code:null,
  platform:'hatla2ee'
});

var statusDiv=document.createElement('div');
statusDiv.style.cssText='position:fixed;top:20px;right:20px;background:#1565C0;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
statusDiv.textContent='\\u{1F697} جاري إرسال '+listings.length+' إعلان سيارة لمكسب...';
document.body.appendChild(statusDiv);

var popup=window.open(MAKSAB+'/admin/crm/harvester/receive','maksab_harvest','width=500,height=400,scrollbars=yes');
if(!popup){statusDiv.style.background='#DC2626';statusDiv.textContent='\\u274C المتصفح منع فتح النافذة — اسمح بالـ popups';setTimeout(function(){statusDiv.remove();},8000);return;}

var checkReady=setInterval(function(){
  try{popup.postMessage({type:'harvest_data',payload:payload,token:'bookmarklet-hatla2ee'},MAKSAB);}catch(e){}
},500);

var timeout=setTimeout(function(){
  clearInterval(checkReady);
  statusDiv.style.background='#DC2626';
  statusDiv.textContent='\\u274C انتهت المهلة';
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
      statusDiv.textContent='\\u274C خطأ: '+e.data.error;
    }else{
      statusDiv.style.background='#1B7A3D';
      statusDiv.innerHTML='\\u2705 تم إرسال '+e.data.received+' إعلان سيارة<br><span style="font-size:13px">'+e.data.new_count+' جديد — '+e.data.duplicate+' مكرر</span>';
    }
    setTimeout(function(){statusDiv.remove();},8000);
    setTimeout(function(){try{popup.close();}catch(e){}},2000);
  }
});

})();
`.trim().replace(/\n\s*/g, "");

  return `javascript:${encodeURIComponent(code)}`;
}
