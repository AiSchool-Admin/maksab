"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BuyerBookmarkletPage() {
  const [appUrl, setAppUrl] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const bookmarkletCode = appUrl ? buildBuyerBookmarkletCode(appUrl) : "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">🛒 Bookmarklet — حصاد مشترين فيسبوك</h1>
          <p className="text-sm text-gray-text mt-1">
            استخرج بوستات &ldquo;مطلوب&rdquo; من جروبات فيسبوك تلقائياً
          </p>
        </div>
        <Link
          href="/admin/sales/buyer-harvest"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          ← العودة
        </Link>
      </div>

      {/* How it works */}
      <div className="bg-[#FFF8E1] border border-[#D4A843]/30 rounded-2xl p-5">
        <h2 className="text-base font-bold text-[#D4A843] mb-3">كيف يعمل؟</h2>
        <ol className="space-y-2 text-sm text-[#1A1A2E]">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-[#D4A843] text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <span>افتح أي جروب فيسبوك (مثلاً: &ldquo;بيع وشراء موبايلات إسكندرية&rdquo;)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-[#D4A843] text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <span>اعمل scroll لتحميل بوستات كتير (50-100 بوست)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-[#D4A843] text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
            <span>اضغط الـ Bookmarklet &ldquo;🛒 حصاد مشترين&rdquo;</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-[#D4A843] text-white rounded-full flex items-center justify-center font-bold text-xs">4</span>
            <span>يستخرج كل البوستات اللي فيها &ldquo;مطلوب&rdquo; ويبعتهم لمكسب</span>
          </li>
        </ol>
      </div>

      {/* Method 1: Drag & Drop */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-dark mb-4">الطريقة 1 — اسحب للمفضلة</h2>
        <div className="flex items-center gap-4 mb-3">
          {appUrl ? (
            <div
              dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarkletCode}" style="display:inline-block;padding:12px 24px;background:#D4A843;color:white;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;cursor:grab;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onclick="event.preventDefault();alert('اسحب الزر ده بالماوس لشريط المفضلة — متضغطش عليه هنا!');">🛒 حصاد مشترين — اسحبني</a>`,
              }}
            />
          ) : (
            <span className="text-gray-400">جاري التحميل...</span>
          )}
        </div>
        <p className="text-gray-500 text-xs">
          اسحب الزر بالماوس إلى شريط المفضلة (Bookmarks Bar) — اضغط Ctrl+Shift+B لإظهاره
        </p>
      </div>

      {/* Method 2: Copy Code */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-dark mb-4">الطريقة 2 — نسخ الكود يدوياً</h2>
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
              : "bg-[#D4A843] text-white hover:bg-[#C09935]"
          }`}
        >
          {codeCopied ? "✅ تم النسخ!" : "📋 انسخ كود الـ Bookmarklet"}
        </button>
        <ol className="space-y-2 text-sm text-gray-600">
          <li>1. اضغط الزر لنسخ الكود</li>
          <li>2. كليك يمين على شريط المفضلة ← Add Page</li>
          <li>3. الاسم: <strong>حصاد مشترين</strong></li>
          <li>4. في حقل الـ URL الصق الكود المنسوخ</li>
          <li>5. احفظ — وبعدها افتح جروب فيسبوك واضغط عليه</li>
        </ol>
      </div>

      {/* Method 3: Direct Link */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-dark mb-4">الطريقة 3 — رابط مباشر</h2>
        <p className="text-sm text-gray-600 mb-3">
          انسخ الرابط التالي واحفظه كـ bookmark يدوياً:
        </p>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-32" dir="ltr">
          {bookmarkletCode || "جاري التحميل..."}
        </div>
      </div>

      {/* What it extracts */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-blue-800 mb-3">ماذا يستخرج؟</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-bold text-blue-700 mb-1">من كل بوست &ldquo;مطلوب&rdquo;:</p>
            <ul className="space-y-1 text-blue-600">
              <li>✅ اسم الكاتب</li>
              <li>✅ نص البوست</li>
              <li>✅ الرقم (لو موجود)</li>
              <li>✅ المنتج المطلوب</li>
              <li>✅ الميزانية</li>
              <li>✅ الموقع</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-blue-700 mb-1">يتعرف على:</p>
            <ul className="space-y-1 text-blue-600">
              <li>🔍 &ldquo;مطلوب&rdquo;</li>
              <li>🔍 &ldquo;عايز أشتري&rdquo;</li>
              <li>🔍 &ldquo;بدور على&rdquo;</li>
              <li>🔍 &ldquo;محتاج&rdquo;</li>
              <li>🔍 &ldquo;wanted&rdquo;</li>
              <li>🔍 &ldquo;looking for&rdquo;</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildBuyerBookmarkletCode(appUrl: string): string {
  if (!appUrl) return "";

  const code = `
(function(){
var MAKSAB='${appUrl}';

/* ═══ Find "مطلوب" posts in Facebook Group ═══ */
var buyPatterns=/مطلوب|عايز اشتر|عاوز اشتر|محتاج|بدور على|wanted|looking for|wtb/i;
var phoneRe=/01[0-2,5][\\s.\\-]?\\d{3,4}[\\s.\\-]?\\d{4,5}/g;

var posts=document.querySelectorAll('[role="article"], [data-ad-comet-preview], div[class*="userContent"], div[data-testid*="post"]');
console.log('Maksab BHE: Found',posts.length,'post elements');

if(posts.length===0){
  posts=document.querySelectorAll('div[dir="auto"]');
  console.log('Maksab BHE: Fallback — found',posts.length,'dir=auto elements');
}

var buyers=[];
var seenTexts={};

for(var i=0;i<posts.length;i++){
  var post=posts[i];
  var text=post.innerText||post.textContent||'';
  if(text.length<15||text.length>2000)continue;
  if(!buyPatterns.test(text))continue;

  var textKey=text.substring(0,100);
  if(seenTexts[textKey])continue;
  seenTexts[textKey]=true;

  /* Extract author name */
  var authorName=null;
  var authorEl=post.querySelector('a[role="link"] strong, h2 a, h3 a, a[class*="profileLink"]');
  if(authorEl)authorName=authorEl.textContent.trim();
  if(!authorName){
    var parent=post.closest('[role="article"]');
    if(parent){
      var aEl=parent.querySelector('h2 a, h3 a, a strong');
      if(aEl)authorName=aEl.textContent.trim();
    }
  }

  /* Extract phone */
  var phones=text.match(phoneRe);
  var phone=phones?phones[0].replace(/[\\s.\\-]/g,''):null;

  /* Extract author profile URL */
  var profileUrl=null;
  var profileLink=post.querySelector('a[href*="/user/"], a[href*="/profile"], a[href*="facebook.com/"]');
  if(!profileLink){
    var parentArticle=post.closest('[role="article"]');
    if(parentArticle)profileLink=parentArticle.querySelector('h2 a, h3 a');
  }
  if(profileLink)profileUrl=profileLink.href;

  buyers.push({
    authorName:authorName,
    authorProfileUrl:profileUrl,
    text:text.substring(0,500),
    phone:phone,
    groupName:document.title.replace(/ \\| Facebook$/,'').trim(),
    url:window.location.href,
    timestamp:new Date().toISOString()
  });
}

console.log('Maksab BHE: Found',buyers.length,'buy requests');

if(buyers.length===0){
  alert('لم يتم العثور على بوستات "مطلوب" في هذه الصفحة\\n\\nتأكد إنك في جروب فيسبوك واعمل scroll كفاية.\\n\\nافتح Console (F12) وابحث عن Maksab لمزيد من التفاصيل.');
  return;
}

/* ═══ Send via popup ═══ */
var payload=JSON.stringify({
  buyers:buyers,
  groupName:document.title.replace(/ \\| Facebook$/,'').trim(),
  groupUrl:window.location.href,
  timestamp:new Date().toISOString(),
  source:'bookmarklet'
});

var statusDiv=document.createElement('div');
statusDiv.style.cssText='position:fixed;top:20px;right:20px;background:#D4A843;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:sans-serif;font-size:16px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
statusDiv.textContent='🛒 جاري إرسال '+buyers.length+' مشتري لمكسب...';
document.body.appendChild(statusDiv);

var popup=window.open(MAKSAB+'/admin/sales/buyer-harvest/receive','maksab_buyer_harvest','width=500,height=400,scrollbars=yes');
if(!popup){
  statusDiv.style.background='#DC2626';
  statusDiv.textContent='❌ المتصفح منع فتح النافذة — اسمح بالـ popups';
  setTimeout(function(){statusDiv.remove();},8000);
  return;
}

var checkReady=setInterval(function(){
  try{
    popup.postMessage({type:'buyer_harvest_data',payload:payload},MAKSAB);
  }catch(e){}
},500);

var timeout=setTimeout(function(){
  clearInterval(checkReady);
  statusDiv.style.background='#DC2626';
  statusDiv.textContent='❌ انتهت المهلة';
  setTimeout(function(){statusDiv.remove();},5000);
  try{popup.close();}catch(e){}
},30000);

window.addEventListener('message',function handler(e){
  if(e.origin!==MAKSAB)return;
  if(e.data&&e.data.type==='buyer_harvest_result'){
    clearInterval(checkReady);
    clearTimeout(timeout);
    window.removeEventListener('message',handler);
    if(e.data.error){
      statusDiv.style.background='#DC2626';
      statusDiv.textContent='❌ '+e.data.error;
    }else{
      statusDiv.style.background='#1B7A3D';
      statusDiv.innerHTML='✅ تم إرسال '+e.data.saved+' مشتري لمكسب<br><span style="font-size:13px">'+e.data.new_count+' جديد — '+e.data.phones+' بأرقام</span>';
    }
    setTimeout(function(){statusDiv.remove();},8000);
    setTimeout(function(){try{popup.close();}catch(e){}},2000);
  }
});
})();
`.trim().replace(/\n\s*/g, '');

  return `javascript:${encodeURIComponent(code)}`;
}
