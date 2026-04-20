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

  const code = `(function(){
var MAKSAB='${appUrl}';
var TOKEN='${TOKEN}';
var PAGES_PER_RUN=10;
var CONCURRENT=5;

if(!location.hostname.includes('semsarmasr')&&!location.hostname.includes('sooqmsr')){
  alert('افتح semsarmasr.com الأول');return;
}

var STORE_KEY='maksab_harvest_'+location.pathname.replace(/[^a-z0-9]/gi,'_');
var saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
var harvestedUrls=saved.urls||{};
var prevCount=Object.keys(harvestedUrls).length;

var sd=document.createElement('div');
sd.style.cssText='position:fixed;top:20px;right:20px;background:#7B1FA2;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);min-width:340px;line-height:1.8;';
document.body.appendChild(sd);

function log(msg){sd.innerHTML=msg;}

log('🚀 حصاد من صفحة 1'+(prevCount>0?' ('+prevCount+' إعلان سابق — يتجاهلهم)':''));

function saveProgress(){
  saved.urls=harvestedUrls;
  saved.urls=harvestedUrls;
  saved.updatedAt=new Date().toISOString();
  localStorage.setItem(STORE_KEY,JSON.stringify(saved));
}

function extractCards(doc){
  var cards=doc.querySelectorAll('div.ListDesStyle');
  var results=[];
  for(var i=0;i<cards.length;i++){
    var card=cards[i];
    var dataId=card.getAttribute('data-id')||'';
    var linkEl=card.querySelector('.AdTitleStyle h2 a');
    if(!linkEl)continue;
    var fullUrl=linkEl.href||linkEl.getAttribute('href')||'';
    if(!fullUrl)continue;
    var url=fullUrl.split('?')[0];
    var title=(linkEl.textContent||'').trim()||linkEl.getAttribute('title')||'';
    if(!title)continue;
    var descEl=card.querySelector('.AdDesc');
    var desc=descEl?(descEl.textContent||'').trim():'';
    var locEl=card.querySelector('.ListingLocation');
    var locText=locEl?(locEl.textContent||'').trim():'';
    var locParts=locText.split('-').map(function(s){return s.trim();});
    var area=locParts[0]||'';
    var city=locParts.length>1?locParts[locParts.length-1]:'';
    var imgEl=card.querySelector('.ThumbCont img');
    var img='';
    if(imgEl){
      img=imgEl.getAttribute('src')||imgEl.src||'';
      if(img.indexOf('//')===0)img='https:'+img;
    }
    var priceEl=card.querySelector('.Price')||card.querySelector('#cellPriceMob');
    var priceText=priceEl?(priceEl.textContent||''):'';
    var pm=priceText.match(/([\\d,]+)/);
    var price=pm?parseInt(pm[1].replace(/,/g,'')):null;
    var specs=card.querySelectorAll('.SpecsCont span');
    var specArr=[];
    for(var j=0;j<specs.length;j++){
      var sp=(specs[j].textContent||'').trim();
      if(sp)specArr.push(sp);
    }
    results.push({
      url:url,
      external_id:dataId,
      title:title,
      description:desc||specArr.join(' — '),
      price:price,
      thumbnailUrl:img||null,
      location:locText,
      city:city,
      area:area,
      sellerPhone:null,
      dateText:'',
      sellerName:null,
      sellerProfileUrl:null,
      isVerified:false,
      isBusiness:false,
      isFeatured:false,
      supportsExchange:false,
      isNegotiable:false
    });
  }
  return results;
}

function isAlexandria(item){
  var loc=(item.city+' '+item.area+' '+item.location+' '+item.title+' '+item.description).toLowerCase();
  if(loc.includes('الإسكندرية')||loc.includes('الاسكندرية')||loc.includes('اسكندرية')||loc.includes('alexandria'))return true;
  var alexAreas=['سموحة','سيدي بشر','المنتزه','لوران','ستانلي','كليوباترا','جناكليس','محرم بك','سيدي جابر','المعمورة','العصافرة','الإبراهيمية','رشدي','ميامي','المندرة','العامرية','كينج مريوط','أبيس','جليم','كفر عبدو','النخيل','كامب شيزار','سبورتنج','الشاطبي','بولكلي','فلمنج','العجمي','البيطاش','برج العرب','السيوف','صواري','مروج','بالم هيلز','المنشية','محطة الرمل','القباري','الدخيلة','الهانوفيل','أبو تلات','زيزينيا','سان ستيفانو','وابور المياة','باكوس','الحضرة','المكس','بحري'];
  for(var i=0;i<alexAreas.length;i++){if(loc.includes(alexAreas[i]))return true;}
  return false;
}

function fetchPhone(url){
  return fetch(url).then(function(r){return r.text();}).then(function(html){
    var phones=html.match(/(?:\\+?201|01)[0-25]\\d{8}/g);
    if(phones&&phones.length>0){
      var p=phones[0].replace(/^\\+?2/,'');
      if(p.startsWith('0'))return p;
      return '0'+p;
    }
    return null;
  }).catch(function(){return null;});
}

function fetchPhonesBatch(items,batchSize){
  var idx=0;
  var total=items.filter(function(it){return !it.sellerPhone;}).length;
  var done=0;
  function next(){
    var batch=[];
    while(batch.length<batchSize&&idx<items.length){
      if(!items[idx].sellerPhone)batch.push(idx);
      idx++;
    }
    if(batch.length===0)return Promise.resolve();
    return Promise.all(batch.map(function(i){
      return fetchPhone(items[i].url+'?'+Date.now()).then(function(ph){
        if(ph)items[i].sellerPhone=ph;
        done++;
        log('📞 استخراج الأرقام: '+done+'/'+total);
      });
    })).then(next);
  }
  return next();
}

function getPageUrl(pg){
  var u=new URL(location.href);
  u.searchParams.set('s',pg);
  return u.toString();
}

function sendToMaksab(items,fromPg,toPg){
  var payload=JSON.stringify({
    url:location.href,
    listings:items,
    timestamp:new Date().toISOString(),
    source:'bookmarklet-v5',
    strategy:'semsarmasr-listdesstyle',
    scope_code:null,
    platform:'semsarmasr'
  });
  var pop=window.open(MAKSAB+'/admin/crm/harvester/receive','mh','width=500,height=400');
  if(!pop){sd.style.background='#DC2626';sd.textContent='اسمح بالـ popups';return;}
  var ci=setInterval(function(){
    try{pop.postMessage({type:'harvest_data',payload:payload,token:TOKEN},MAKSAB);}catch(e){}
  },500);
  var to=setTimeout(function(){clearInterval(ci);sd.style.background='#DC2626';sd.textContent='انتهت المهلة';},120000);
  window.addEventListener('message',function h(e){
    if(e.origin!==MAKSAB)return;
    if(e.data&&e.data.type==='harvest_result'){
      clearInterval(ci);clearTimeout(to);window.removeEventListener('message',h);
      var withPhone=items.filter(function(it){return it.sellerPhone;}).length;
      var totalHarvested=Object.keys(harvestedUrls).length;
      sd.style.background='#1B7A3D';
      sd.innerHTML='✅ تم!<br>صفحة '+fromPg+' → '+toPg+'<br>'+items.length+' إعلان جديد إسكندرية<br>'+e.data.new_count+' حُفظ — '+e.data.duplicate+' مكرر<br>📞 '+withPhone+' بأرقام<br>📊 إجمالي محصود: '+totalHarvested+'<br><br>▶️ <b>اضغط الـ bookmarklet تاني للصفحات التالية</b>';
      setTimeout(function(){try{pop.close();}catch(e){}},3000);
    }
  });
}

var allItems=[];
var lastPageProcessed=0;
var noNewPages=0;
var MAX_PAGE=200;

function harvestPage(pg){
  if(pg>MAX_PAGE||noNewPages>=3){finish();return;}
  log('🔄 صفحة '+pg+'...<br>جديد: '+allItems.length+' | سابق: '+prevCount);
  if(pg===1){
    processPage(document,pg);
    lastPageProcessed=pg;
    saveProgress();
    setTimeout(function(){harvestPage(2);},300);
    return;
  }
  fetch(getPageUrl(pg)).then(function(r){return r.text();}).then(function(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    var cards=doc.querySelectorAll('div.ListDesStyle');
    if(!cards||cards.length===0){
      log('📄 صفحة '+pg+' فارغة — انتهت النتائج');
      finish();return;
    }
    var before=allItems.length;
    processPage(doc,pg);
    lastPageProcessed=pg;
    saveProgress();
    if(allItems.length===before){
      noNewPages++;
    }else{
      noNewPages=0;
    }
    setTimeout(function(){harvestPage(pg+1);},800);
  }).catch(function(){finish();});
}

function processPage(doc,pg){
  var cards=extractCards(doc);
  var alexCards=cards.filter(isAlexandria);
  var newCount=0;
  for(var i=0;i<alexCards.length;i++){
    var u=alexCards[i].url;
    if(!harvestedUrls[u]){
      harvestedUrls[u]=1;
      allItems.push(alexCards[i]);
      newCount++;
    }
  }
  log('📄 صفحة '+pg+': '+cards.length+' إعلان ('+alexCards.length+' إسكندرية, '+newCount+' جديد)<br>إجمالي الدفعة: '+allItems.length+' | إجمالي كلي: '+Object.keys(harvestedUrls).length);
}

function finish(){
  if(allItems.length===0){
    sd.style.background='#F59E0B';sd.innerHTML='⚠️ لا توجد إعلانات جديدة<br>📊 إجمالي محصود سابقاً: '+prevCount+' إعلان<br>فحصت '+lastPageProcessed+' صفحة';
    setTimeout(function(){sd.remove();},15000);return;
  }
  var needPhone=allItems.filter(function(it){return !it.sellerPhone;}).length;
  if(needPhone>0){
    log('📞 استخراج الأرقام من '+needPhone+' إعلان...');
    fetchPhonesBatch(allItems,CONCURRENT).then(function(){
      log('📤 إرسال '+allItems.length+' إعلان...');
      sendToMaksab(allItems,1,lastPageProcessed);
    });
  }else{
    log('📤 إرسال '+allItems.length+' إعلان...');
    sendToMaksab(allItems,1,lastPageProcessed);
  }
}

harvestPage(1);
})();`;

  return `javascript:${encodeURIComponent(code.replace(/\n/g, ''))}`;
}
