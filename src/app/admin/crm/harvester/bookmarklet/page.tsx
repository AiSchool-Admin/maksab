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

      {/* Extraction Strategy */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-3">🧠 استراتيجيات الاستخراج</h2>
        <p className="text-gray-500 text-sm mb-3">الـ Bookmarklet يجرب 3 طرق بالترتيب:</p>
        <div className="space-y-3 text-sm">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <span className="font-bold text-green-700">1. __NEXT_DATA__</span>
            <span className="text-green-600 mr-2">— الأفضل والأدق</span>
            <p className="text-green-600 text-xs mt-1">
              دوبيزل مبني على Next.js — كل بيانات الإعلانات موجودة في JSON مدمج في الصفحة.
              يستخرج: العنوان، السعر، الرابط، الصور، الموقع، التاريخ، اسم المعلن، التوثيق، متجر/فرد، تبديل، تفاوض
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <span className="font-bold text-blue-700">2. JSON-LD</span>
            <span className="text-blue-600 mr-2">— بديل من schema.org</span>
            <p className="text-blue-600 text-xs mt-1">
              لو __NEXT_DATA__ مش موجود، يدور على بيانات schema.org المهيكلة (ItemList / Product)
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <span className="font-bold text-yellow-700">3. DOM Traversal</span>
            <span className="text-yellow-600 mr-2">— آخر محاولة</span>
            <p className="text-yellow-600 text-xs mt-1">
              يمسح كل الروابط في الصفحة ويستخرج البيانات من العناصر المحيطة (data-testid, class names, text content)
            </p>
          </div>
        </div>
      </div>

      {/* Fields Extracted */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-3">📋 الحقول المستخرجة</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {[
            "عنوان الإعلان",
            "السعر (رقم + عملة)",
            "رابط الإعلان",
            "صورة مصغرة",
            "الموقع (محافظة، مدينة)",
            "التاريخ النسبي",
            "اسم المعلن",
            "رابط بروفايل المعلن",
            "شارة التوثيق ✓",
            "متجر / فرد",
            "إعلان مميز ⭐",
            "متوفر التبادل 🔄",
            "قابل للتفاوض",
            "القسم (category)",
          ].map((field) => (
            <div key={field} className="bg-gray-50 rounded px-2 py-1 text-gray-700">
              {field}
            </div>
          ))}
        </div>
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

/**
 * Build the bookmarklet JavaScript code.
 *
 * 3 strategies (in order):
 *   1. __NEXT_DATA__  — Next.js embeds ALL listing data as JSON in the page.
 *      Available in the real browser (not from server fetch).
 *      Most reliable: structured data with all fields.
 *   2. JSON-LD (schema.org) — <script type="application/ld+json">
 *   3. DOM traversal — fallback using links + nearby elements.
 *
 * Fields extracted per listing:
 *   url, title, price, location, thumbnailUrl, dateText,
 *   sellerName, sellerProfileUrl, isVerified, isBusiness,
 *   isFeatured, supportsExchange, isNegotiable, category
 */
function buildBookmarkletCode(appUrl: string): string {
  if (!appUrl) return "";

  // ── Readable source kept here; minified version is generated below ──
  const code = `
(function(){
var API='${appUrl}/api/admin/crm/harvester/receive-bookmarklet';
var listings=[];
var strategy='unknown';

/* ═══ Strategy 1: __NEXT_DATA__ ═══ */
try{
  var nd=document.getElementById('__NEXT_DATA__');
  if(nd){
    var json=JSON.parse(nd.textContent);
    var pp=json.props&&json.props.pageProps;
    if(pp){
      /* Find the listing array — check common keys */
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
      /* Also check dehydratedState (React Query / TanStack) */
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
          /* price */
          var price=null;
          if(typeof ad.price==='number')price=ad.price;
          else if(ad.price&&typeof ad.price==='object')price=ad.price.value||ad.price.amount||null;
          else if(ad.price)price=parseFloat(String(ad.price).replace(/[,\\u066C]/g,''))||null;
          /* url */
          var adUrl=ad.url||ad.absolute_url||(ad.slug?'/'+ad.slug:'')||(ad.id?'/listing/'+ad.id:'');
          if(!adUrl)continue;
          if(adUrl.charAt(0)==='/')adUrl='https://www.dubizzle.com.eg'+adUrl;
          /* thumbnail */
          var thumb=null;
          if(ad.images&&ad.images.length>0){
            var fi=ad.images[0];
            thumb=(typeof fi==='string')?fi:(fi.url||fi.src||fi.thumbnail||null);
          }else if(ad.image){
            thumb=(typeof ad.image==='string')?ad.image:(ad.image.url||null);
          }else if(ad.thumbnail){thumb=ad.thumbnail;}
          else if(ad.main_photo){thumb=ad.main_photo;}
          /* location */
          var loc='';
          if(ad.locations_resolved){
            var lv=Object.values(ad.locations_resolved);
            var ln=[];for(var li=0;li<lv.length;li++){var lx=lv[li];ln.push(lx.name_ar||lx.name||'');}
            loc=ln.filter(Boolean).join(', ');
          }else if(ad.location){
            if(typeof ad.location==='string')loc=ad.location;
            else loc=ad.location.region_name_ar||ad.location.city_name_ar||ad.location.name||'';
          }
          /* date */
          var dateText=ad.created_at||ad.date||ad.display_date||ad.created_at_first||'';
          /* seller */
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
    /* Match dubizzle listing URLs: /category/subcategory/item-slug-ID */
    if(!href.match(/dubizzle\\.com\\.eg\\/[\\w-]+\\/[\\w-]+\\/[\\w-]+-ID[\\w]+\\.html/i)&&
       !href.match(/dubizzle\\.com\\.eg\\/[\\w-]+\\/[\\w-]+\\/[\\w-]+-\\d+/)){
      /* Try broader: at least 3 path segments */
      var segs=(new URL(href)).pathname.split('/').filter(Boolean);
      if(segs.length<3)continue;
    }
    if(href.indexOf('/search')>-1||href.indexOf('/login')>-1||href.indexOf('/signup')>-1||href.indexOf('/post')>-1)continue;
    if(seen[href])continue;
    seen[href]=true;
    /* Find the card container */
    var card=a.closest('li,article,[role="article"],[data-testid]')||a.parentElement;
    if(!card)continue;
    /* Title */
    var title=a.getAttribute('aria-label')||a.getAttribute('title')||'';
    if(!title){
      var hEl=card.querySelector('h2,h3,h4,[data-testid*="title"],[class*="title"]');
      if(hEl)title=hEl.textContent.trim();
    }
    if(!title)title=a.textContent.trim().replace(/\\s+/g,' ').substring(0,120);
    if(!title||title.length<3)continue;
    /* Price */
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
    /* Location */
    var loc='';
    var locEl=card.querySelector('[data-testid*="location"],[class*="location"],[class*="Location"],[class*="address"]');
    if(locEl)loc=locEl.textContent.trim();
    /* Date */
    var dateText='';
    var dateEl=card.querySelector('[data-testid*="date"],time,[class*="date"],[class*="time"]');
    if(dateEl)dateText=dateEl.textContent.trim();
    if(!dateText){
      var dm=card.textContent.match(/(?:منذ[^,،]*|\\d+\\s+\\w+\\s+ago)/);
      if(dm)dateText=dm[0].trim();
    }
    /* Image */
    var img=null;
    var imgEl=card.querySelector('img[src*="dubizzle"],img[src*="olx"],img[data-src*="dubizzle"],img[data-src*="olx"]');
    if(!imgEl)imgEl=card.querySelector('img');
    if(imgEl)img=imgEl.src||imgEl.getAttribute('data-src')||null;
    /* Seller */
    var sellerName=null;
    var selEl=card.querySelector('[data-testid*="seller"],[class*="seller"],[class*="Seller"]');
    if(selEl)sellerName=selEl.textContent.trim();
    /* Badges */
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

/* Show progress */
var statusDiv=document.createElement('div');
statusDiv.style.cssText='position:fixed;top:20px;right:20px;background:#1B7A3D;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
statusDiv.textContent='🌾 جاري إرسال '+listings.length+' إعلان لمكسب... ('+strategy+')';
document.body.appendChild(statusDiv);

/* Send to Maksab API */
var xhr=new XMLHttpRequest();
xhr.open('POST',API,true);
xhr.setRequestHeader('Content-Type','application/json');
xhr.onload=function(){
  if(xhr.status===200){
    var r=JSON.parse(xhr.responseText);
    statusDiv.style.background='#1B7A3D';
    statusDiv.innerHTML='✅ تم إرسال '+r.received+' إعلان لمكسب<br><span style="font-size:13px">'+r.new+' جديد — '+r.duplicate+' مكرر — طريقة: '+strategy+'</span>';
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
  strategy:strategy
}));
})();
`.trim().replace(/\n\s*/g, '');

  return `javascript:${encodeURIComponent(code)}`;
}
