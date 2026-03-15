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

export default function ContactCarsBookmarkletPage() {
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

  const bookmarkletCode = appUrl ? buildContactCarsBookmarklet(appUrl) : "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🚗 Bookmarklet — حصاد كونتاكت كارز
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            استخراج إعلانات السيارات من contactcars.com — محظور من السيرفر (403)
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
          ContactCars بيحظر الطلبات من سيرفرات Cloud (Vercel / Railway) بكود 403.
          الـ Bookmarklet بيشتغل من متصفح الموظف بـ IP عادي.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-blue-700 mb-3">كيف يشتغل؟</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <span>ثبّت الـ Bookmarklet في شريط المفضلة</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <span>افتح صفحة سيارات في <code className="bg-blue-100 px-1 rounded" dir="ltr">contactcars.com</code></span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
            <span>اضغط الـ Bookmarklet — هيستخرج الإعلانات ويبعتها لمكسب</span>
          </li>
        </ol>
      </div>

      {/* Drag & Drop */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-green-700 mb-3">
          اسحب للمفضلة
        </h2>
        <div className="flex items-center gap-4 mb-3">
          {appUrl ? (
            <div
              dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarkletCode}" style="display:inline-block;padding:12px 24px;background:#E65100;color:white;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;cursor:grab;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onclick="event.preventDefault();alert('اسحب الزر ده لشريط المفضلة!');">🚗 حصاد كونتاكت كارز</a>`,
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
            codeCopied ? "bg-green-600 text-white" : "bg-orange-600 text-white hover:bg-orange-700"
          }`}
        >
          {codeCopied ? "تم النسخ!" : "انسخ كود الـ Bookmarklet"}
        </button>
      </div>

      {/* Raw Code */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-base font-bold text-gray-700 mb-3">الكود الخام</h2>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-40" dir="ltr">
          {bookmarkletCode || "جاري التحميل..."}
        </div>
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
                  <span className="text-gray-500">{r.received} مستقبل</span>
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

function buildContactCarsBookmarklet(appUrl: string): string {
  const code = `
(function(){
var MAKSAB='${appUrl}';
var PLATFORM='contactcars';

if(!window.location.hostname.includes('contactcars')){
  alert('\\u274C هذا الـ Bookmarklet خاص بموقع ContactCars\\n\\nافتح contactcars.com وجرب تاني');
  return;
}

function extractListings(){
  var listings=[];
  var seenUrls={};

  /* Strategy 1: car listing cards — try multiple selectors */
  var cards=document.querySelectorAll('a[href*="/car/"],a[href*="/used-car/"],a[href*="/new-car/"],[class*="car-card"],[class*="listing-card"],[class*="vehicle"]');
  console.log('Maksab ContactCars: Found',cards.length,'potential cards');

  for(var i=0;i<cards.length;i++){
    var el=cards[i];
    var a=el.tagName==='A'?el:el.querySelector('a[href*="/car/"],a[href*="/used-car/"],a[href]');
    if(!a)continue;
    var url=a.href;
    if(!url||seenUrls[url])continue;
    if(url.includes('/search')||url.includes('/filter')||url.includes('/compare')||url.includes('/login'))continue;
    seenUrls[url]=true;

    var card=a.closest('[class*=card],[class*=listing],[class*=vehicle],[class*=item]')||a.parentElement.parentElement||a;
    var cardText=card?card.textContent:'';

    var title=a.getAttribute('title')||'';
    if(!title||title.length<3){
      var h=card.querySelector('h2,h3,h4,[class*=title],[class*=name]');
      if(h)title=h.textContent.trim();
    }
    if(!title||title.length<3){
      title=a.textContent.trim().split('\\n')[0];
    }
    if(!title||title.length<3)continue;

    var priceMatch=cardText.match(/([\\d,\\.]+)\\s*(?:EGP|LE|L\\.E|جنيه|ج\\.م)/i);
    var price=priceMatch?parseInt(priceMatch[1].replace(/[,\\.]/g,'')):null;
    if(!price){
      var priceEl=card.querySelector('[class*=price],[class*=Price]');
      if(priceEl){var pt=priceEl.textContent.replace(/[^\\d]/g,'');if(pt)price=parseInt(pt);}
    }

    var img=card.querySelector('img[src*=".jpg"],img[src*=".jpeg"],img[src*=".png"],img[src*=".webp"],img[data-src]');
    var thumbnail=img?(img.src||img.getAttribute('data-src')):null;

    var locEl=card.querySelector('[class*=location],[class*=Location],[class*=area],[class*=city]');
    var location=locEl?locEl.textContent.trim():'';

    var sellerEl=card.querySelector('[class*=dealer],[class*=seller],[class*=shop],[class*=owner]');
    var sellerName=sellerEl?sellerEl.textContent.trim():null;

    var yearMatch=cardText.match(/(20[0-2]\\d|19[89]\\d)/);
    var kmMatch=cardText.match(/([\\d,]+)\\s*(?:km|كم)/i);

    listings.push({
      url:url,
      title:title,
      price:price,
      currency:'EGP',
      thumbnailUrl:thumbnail,
      location:location,
      dateText:'',
      sellerName:sellerName,
      sellerProfileUrl:null,
      isVerified:false,
      isBusiness:!!sellerEl,
      isFeatured:cardText.indexOf('featured')>-1||cardText.indexOf('premium')>-1,
      supportsExchange:false,
      isNegotiable:cardText.indexOf('negotiable')>-1||cardText.indexOf('قابل للتفاوض')>-1
    });
  }

  /* Strategy 2: generic anchor fallback */
  if(listings.length===0){
    var allLinks=document.querySelectorAll('a[href]');
    for(var j=0;j<allLinks.length;j++){
      var link=allLinks[j];
      var href=link.href;
      if(!href||seenUrls[href])continue;
      if(!/contactcars\\.com.*\\/(car|used|new)/.test(href))continue;
      if(href.includes('/search')||href.includes('/filter'))continue;
      seenUrls[href]=true;
      var parent=link.parentElement.parentElement||link.parentElement;
      var text=parent.textContent||'';
      var linkTitle=link.getAttribute('title')||link.textContent.trim().split('\\n')[0];
      if(!linkTitle||linkTitle.length<3)continue;
      var pm=text.match(/([\\d,]+)\\s*(?:EGP|LE|جنيه)/i);
      listings.push({
        url:href,title:linkTitle,price:pm?parseInt(pm[1].replace(/[,]/g,'')):null,currency:'EGP',
        thumbnailUrl:null,location:'',dateText:'',sellerName:null,sellerProfileUrl:null,
        isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false
      });
    }
  }

  console.log('Maksab ContactCars: Extracted',listings.length,'listings');
  return listings;
}

var listings=extractListings();
if(listings.length===0){
  alert('لم يتم العثور على إعلانات\\n\\nتأكد إنك على صفحة قوائم سيارات في ContactCars');
  return;
}

var payload=JSON.stringify({
  url:window.location.href,
  listings:listings,
  timestamp:new Date().toISOString(),
  source:'bookmarklet',
  strategy:'contactcars-cards',
  scope_code:null,
  platform:'contactcars'
});

var statusDiv=document.createElement('div');
statusDiv.style.cssText='position:fixed;top:20px;right:20px;background:#E65100;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
statusDiv.textContent='\\u{1F697} جاري إرسال '+listings.length+' إعلان لمكسب...';
document.body.appendChild(statusDiv);

var popup=window.open(MAKSAB+'/admin/crm/harvester/receive','maksab_harvest','width=500,height=400,scrollbars=yes');
if(!popup){statusDiv.style.background='#DC2626';statusDiv.textContent='\\u274C المتصفح منع النافذة — اسمح بالـ popups';setTimeout(function(){statusDiv.remove();},8000);return;}

var checkReady=setInterval(function(){
  try{popup.postMessage({type:'harvest_data',payload:payload,token:'bookmarklet-contactcars'},MAKSAB);}catch(e){}
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
      statusDiv.innerHTML='\\u2705 تم إرسال '+e.data.received+' إعلان<br><span style="font-size:13px">'+e.data.new_count+' جديد — '+e.data.duplicate+' مكرر</span>';
    }
    setTimeout(function(){statusDiv.remove();},8000);
    setTimeout(function(){try{popup.close();}catch(e){}},2000);
  }
});

})();
`.trim().replace(/\n\s*/g, "");

  return `javascript:${encodeURIComponent(code)}`;
}
