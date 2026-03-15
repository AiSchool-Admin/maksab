"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BookmarkletInfo {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  category: string;
  hostname: string;
  detailPath: string;
  buildFn: (appUrl: string) => string;
}

const BOOKMARKLETS: BookmarkletInfo[] = [
  {
    id: "dubizzle-ahe",
    name: "Dubizzle AHE",
    nameAr: "دوبيزل — حصاد بائعين",
    icon: "📱",
    color: "#E53935",
    category: "sellers",
    hostname: "dubizzle",
    detailPath: "/admin/crm/harvester/bookmarklet",
    buildFn: () => "", // existing bookmarklet — link to detail page
  },
  {
    id: "facebook-bhe",
    name: "Facebook BHE",
    nameAr: "فيسبوك — حصاد مشترين",
    icon: "🛒",
    color: "#1877F2",
    category: "buyers",
    hostname: "facebook",
    detailPath: "/admin/sales/buyer-harvest/bookmarklet",
    buildFn: () => "",
  },
  {
    id: "hatla2ee",
    name: "Hatla2ee",
    nameAr: "هتلاقي — سيارات",
    icon: "🚗",
    color: "#1565C0",
    category: "vehicles",
    hostname: "hatla2ee",
    detailPath: "/admin/sales/buyer-harvest/bookmarklet-hatla2ee",
    buildFn: () => "",
  },
  {
    id: "contactcars",
    name: "ContactCars",
    nameAr: "كونتاكت كارز — سيارات",
    icon: "🚗",
    color: "#E65100",
    category: "vehicles",
    hostname: "contactcars",
    detailPath: "/admin/sales/harvester/bookmarklet-contactcars",
    buildFn: buildContactCarsBookmarkletCode,
  },
  {
    id: "yallamotor",
    name: "Yallamotor",
    nameAr: "يلا موتور — سيارات",
    icon: "🚗",
    color: "#1565C0",
    category: "vehicles",
    hostname: "yallamotor",
    detailPath: "/admin/sales/harvester/bookmarklet-yallamotor",
    buildFn: buildYallamotorBookmarkletCode,
  },
  {
    id: "sooqmsr",
    name: "SooqMsr",
    nameAr: "سوق مصر — مبوبة",
    icon: "📋",
    color: "#7B1FA2",
    category: "classifieds",
    hostname: "sooqmsr",
    detailPath: "/admin/sales/harvester/bookmarklet-sooqmsr",
    buildFn: buildSooqMsrBookmarkletCode,
  },
];

export default function BookmarkletsPage() {
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const categories = [
    { id: "sellers", label: "حصاد بائعين", icon: "📱" },
    { id: "buyers", label: "حصاد مشترين", icon: "🛒" },
    { id: "vehicles", label: "سيارات", icon: "🚗" },
    { id: "classifieds", label: "مبوبة عامة", icon: "📋" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🔖 Bookmarklets الحصاد
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كل أدوات الحصاد من المنصات المحظورة — اسحب أي زر لشريط المفضلة
          </p>
        </div>
        <Link
          href="/admin/crm/harvester"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          ← لوحة الحصاد
        </Link>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-blue-700 mb-3">تعليمات الاستخدام</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <span>اظهر شريط المفضلة: <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+Shift+B</kbd></span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <span>اسحب أي زر من الأزرار أدناه إلى شريط المفضلة</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
            <span>افتح الموقع المطلوب واضغط على الـ Bookmarklet</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">4</span>
            <span>الإعلانات هتتحفظ تلقائياً في مكسب</span>
          </li>
        </ol>
      </div>

      {/* Bookmarklets by Category */}
      {categories.map((cat) => {
        const catBookmarklets = BOOKMARKLETS.filter((b) => b.category === cat.id);
        if (catBookmarklets.length === 0) return null;

        return (
          <div key={cat.id} className="bg-white border rounded-2xl p-5">
            <h2 className="text-base font-bold text-gray-700 mb-4">
              {cat.icon} {cat.label}
            </h2>
            <div className="space-y-3">
              {catBookmarklets.map((bm) => {
                const code = appUrl && bm.buildFn !== BOOKMARKLETS[0].buildFn
                  ? bm.buildFn(appUrl)
                  : "";

                return (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between bg-gray-50 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{bm.icon}</span>
                      <div>
                        <div className="font-bold text-gray-800">{bm.nameAr}</div>
                        <div className="text-xs text-gray-500" dir="ltr">
                          {bm.hostname}.com
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {code ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: `<a href="${code}" style="display:inline-block;padding:8px 16px;background:${bm.color};color:white;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;cursor:grab;user-select:none;box-shadow:0 2px 6px rgba(0,0,0,0.15);" onclick="event.preventDefault();alert('اسحب الزر ده لشريط المفضلة!');">${bm.icon} اسحبني</a>`,
                          }}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {appUrl ? "" : "جاري التحميل..."}
                        </span>
                      )}
                      <Link
                        href={bm.detailPath}
                        className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300"
                      >
                        التفاصيل
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Platform Status Legend */}
      <div className="bg-gray-50 border rounded-2xl p-5">
        <h2 className="text-base font-bold text-gray-700 mb-3">حالة المنصات</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-600">محظور من السيرفر (403) — يحتاج Bookmarklet</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600">يعمل من السيرفر — حصاد تلقائي</span>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-xs text-gray-500">
          <div>🔴 hatla2ee.com — محظور (Bookmarklet)</div>
          <div>🔴 contactcars.com — محظور (Bookmarklet)</div>
          <div>🔴 yallamotor.com — محظور (Bookmarklet)</div>
          <div>🔴 sooqmsr.com — محظور (Bookmarklet)</div>
          <div>🟡 opensooq.com — يعمل من Vercel فقط</div>
          <div>🟡 aqarmap.com — يعمل من Vercel فقط</div>
          <div>🟢 dubizzle.com.eg — يعمل من كل السيرفرات</div>
        </div>
      </div>
    </div>
  );
}

// ═══ Simplified bookmarklet builders for the central page ═══
// These create minimal versions — full versions are on the individual pages

function buildContactCarsBookmarkletCode(appUrl: string): string {
  const code = `(function(){var M='${appUrl}',P='contactcars';if(!location.hostname.includes('contactcars')){alert('افتح contactcars.com الأول');return;}var L=[],S={};var cards=document.querySelectorAll('a[href*="/car/"],a[href*="/used-car/"],[class*=car-card],[class*=listing]');for(var i=0;i<cards.length;i++){var el=cards[i];var a=el.tagName==='A'?el:el.querySelector('a[href]');if(!a)continue;var u=a.href;if(!u||S[u])continue;S[u]=true;var c=a.closest('[class*=card],[class*=listing]')||a.parentElement;var t=c.querySelector('h2,h3,h4,[class*=title]');var title=t?t.textContent.trim():a.textContent.trim().split('\\n')[0];if(!title||title.length<3)continue;var pe=c.querySelector('[class*=price]');var price=pe?parseInt(pe.textContent.replace(/[^\\d]/g,'')):null;var img=c.querySelector('img');L.push({url:u,title:title,price:price,currency:'EGP',thumbnailUrl:img?img.src:null,location:'',dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false});}if(!L.length){alert('لا إعلانات');return;}var d=document.createElement('div');d.style.cssText='position:fixed;top:20px;right:20px;background:#E65100;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-size:16px;direction:rtl;';d.textContent='جاري إرسال '+L.length+' إعلان...';document.body.appendChild(d);var w=window.open(M+'/admin/crm/harvester/receive','mh','width=500,height=400');if(!w){d.textContent='اسمح بالـ popups';d.style.background='red';return;}var ci=setInterval(function(){try{w.postMessage({type:'harvest_data',payload:JSON.stringify({url:location.href,listings:L,timestamp:new Date().toISOString(),source:'bookmarklet',platform:P}),token:'bookmarklet-'+P},M);}catch(e){}},500);setTimeout(function(){clearInterval(ci);d.remove();try{w.close();}catch(e){}},30000);window.addEventListener('message',function h(e){if(e.data&&e.data.type==='harvest_result'){clearInterval(ci);d.style.background='#1B7A3D';d.textContent='تم! '+(e.data.new_count||0)+' جديد';setTimeout(function(){d.remove();try{w.close();}catch(e){}},5000);window.removeEventListener('message',h);}});})();`;
  return `javascript:${encodeURIComponent(code)}`;
}

function buildYallamotorBookmarkletCode(appUrl: string): string {
  const code = `(function(){var M='${appUrl}',P='yallamotor';if(!location.hostname.includes('yallamotor')){alert('افتح yallamotor.com الأول');return;}var L=[],S={};var cards=document.querySelectorAll('a[href*="/car/"],[class*=car-card],[class*=listing],[class*=CarCard],[class*=vehicle]');for(var i=0;i<cards.length;i++){var el=cards[i];var a=el.tagName==='A'?el:el.querySelector('a[href]');if(!a)continue;var u=a.href;if(!u||S[u]||!/yallamotor/.test(u))continue;S[u]=true;var c=a.closest('[class*=card],[class*=listing],[class*=vehicle]')||a.parentElement;var t=c.querySelector('h2,h3,h4,[class*=title],[class*=Title]');var title=t?t.textContent.trim():a.textContent.trim().split('\\n')[0];if(!title||title.length<3)continue;var pe=c.querySelector('[class*=price],[class*=Price]');var price=pe?parseInt(pe.textContent.replace(/[^\\d]/g,'')):null;var img=c.querySelector('img');L.push({url:u,title:title,price:price,currency:'EGP',thumbnailUrl:img?img.src:null,location:'',dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false});}if(!L.length){alert('لا إعلانات');return;}var d=document.createElement('div');d.style.cssText='position:fixed;top:20px;right:20px;background:#1565C0;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-size:16px;direction:rtl;';d.textContent='جاري إرسال '+L.length+' إعلان...';document.body.appendChild(d);var w=window.open(M+'/admin/crm/harvester/receive','mh','width=500,height=400');if(!w){d.textContent='اسمح بالـ popups';d.style.background='red';return;}var ci=setInterval(function(){try{w.postMessage({type:'harvest_data',payload:JSON.stringify({url:location.href,listings:L,timestamp:new Date().toISOString(),source:'bookmarklet',platform:P}),token:'bookmarklet-'+P},M);}catch(e){}},500);setTimeout(function(){clearInterval(ci);d.remove();try{w.close();}catch(e){}},30000);window.addEventListener('message',function h(e){if(e.data&&e.data.type==='harvest_result'){clearInterval(ci);d.style.background='#1B7A3D';d.textContent='تم! '+(e.data.new_count||0)+' جديد';setTimeout(function(){d.remove();try{w.close();}catch(e){}},5000);window.removeEventListener('message',h);}});})();`;
  return `javascript:${encodeURIComponent(code)}`;
}

function buildSooqMsrBookmarkletCode(appUrl: string): string {
  const code = `(function(){var M='${appUrl}',P='sooqmsr';if(!location.hostname.includes('sooqmsr')){alert('افتح sooqmsr.com الأول');return;}var L=[],S={};var cards=document.querySelectorAll('a[href*="/ad/"],a[href*="/ads/"],a[href*="/listing/"],[class*=ad-card],[class*=listing],[class*=classified],article,.card');for(var i=0;i<cards.length;i++){var el=cards[i];var a=el.tagName==='A'?el:el.querySelector('a[href]');if(!a)continue;var u=a.href;if(!u||S[u])continue;S[u]=true;var c=a.closest('[class*=card],[class*=listing],[class*=ad],article')||a.parentElement;var t=c.querySelector('h2,h3,h4,[class*=title]');var title=t?t.textContent.trim():a.textContent.trim().split('\\n')[0];if(!title||title.length<3||title.length>150)continue;var pe=c.querySelector('[class*=price]');var price=pe?parseInt(pe.textContent.replace(/[^\\d]/g,'')):null;var img=c.querySelector('img');L.push({url:u,title:title,price:price,currency:'EGP',thumbnailUrl:img?img.src:null,location:'',dateText:'',sellerName:null,sellerProfileUrl:null,isVerified:false,isBusiness:false,isFeatured:false,supportsExchange:false,isNegotiable:false});}if(!L.length){alert('لا إعلانات');return;}var d=document.createElement('div');d.style.cssText='position:fixed;top:20px;right:20px;background:#7B1FA2;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-size:16px;direction:rtl;';d.textContent='جاري إرسال '+L.length+' إعلان...';document.body.appendChild(d);var w=window.open(M+'/admin/crm/harvester/receive','mh','width=500,height=400');if(!w){d.textContent='اسمح بالـ popups';d.style.background='red';return;}var ci=setInterval(function(){try{w.postMessage({type:'harvest_data',payload:JSON.stringify({url:location.href,listings:L,timestamp:new Date().toISOString(),source:'bookmarklet',platform:P}),token:'bookmarklet-'+P},M);}catch(e){}},500);setTimeout(function(){clearInterval(ci);d.remove();try{w.close();}catch(e){}},30000);window.addEventListener('message',function h(e){if(e.data&&e.data.type==='harvest_result'){clearInterval(ci);d.style.background='#1B7A3D';d.textContent='تم! '+(e.data.new_count||0)+' جديد';setTimeout(function(){d.remove();try{w.close();}catch(e){}},5000);window.removeEventListener('message',h);}});})();`;
  return `javascript:${encodeURIComponent(code)}`;
}
