// SemsarMasr Harvester v9 — v8 + seller name extraction during phone fetch
(function(){
var MAKSAB=window.__MAKSAB_URL||'https://maksab.vercel.app';
var TOKEN=window.__MAKSAB_TOKEN||'';
var CONCURRENT=5;
var MAX_PAGE=200;
var MAX_AGE_DAYS=30;

if(!location.hostname.includes('semsarmasr')&&!location.hostname.includes('sooqmsr')){
  alert('افتح semsarmasr.com الأول');return;
}

var SCOPES=[
  {name:'شقق للبيع',cid:952,purpose:'sale'},
  {name:'شاليهات للبيع',cid:953,purpose:'sale'},
  {name:'تجاري للبيع',cid:954,purpose:'sale'},
  {name:'شقق للإيجار',cid:952,purpose:'rent'},
  {name:'شاليهات للإيجار',cid:953,purpose:'rent'},
  {name:'تجاري للإيجار',cid:954,purpose:'rent'},
];

var STORE_KEY='maksab_harvest_semsarmasr_v9';
var saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
var harvestedUrls=saved.urls||{};
var prevCount=Object.keys(harvestedUrls).length;

var sd=document.createElement('div');
sd.style.cssText='position:fixed;top:20px;right:20px;background:#7B1FA2;color:white;padding:16px 24px;border-radius:16px;z-index:99999;font-family:sans-serif;font-size:15px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);min-width:380px;line-height:1.8;max-height:90vh;overflow-y:auto;';
document.body.appendChild(sd);
function log(msg){sd.innerHTML=msg;}

var allItems=[];
var scopeStats=[];

function saveProgress(){
  saved.urls=harvestedUrls;
  saved.updatedAt=new Date().toISOString();
  localStorage.setItem(STORE_KEY,JSON.stringify(saved));
}

function buildUrl(scope,pg){
  return 'https://www.semsarmasr.com/3akarat?r=70&purpose='+scope.purpose+'&cid='+scope.cid+'&s=1&g=979&a=0&pf=0&pt=0&af=0&at=0&ismortgage=-1&pm=any&furniture=-1&finishing=-1&rooms=0&q=&p='+pg;
}

function extractCards(doc){
  var cards=doc.querySelectorAll('div.ListCont, div.ListDesStyle');
  var results=[];
  for(var i=0;i<cards.length;i++){
    var c=cards[i];
    var linkEl=c.querySelector('.AdTitleStyle h2 a')||c.querySelector('a[href*="/3akarat/"]');
    if(!linkEl)continue;
    var fullUrl=linkEl.href||linkEl.getAttribute('href')||'';
    if(!fullUrl)continue;
    var url=fullUrl.split('?')[0];
    var title=(linkEl.getAttribute('title')||(linkEl.textContent||'')).trim();
    if(!title){var h2=c.querySelector('h2');if(h2)title=h2.textContent.trim();}
    if(!title){var at=c.querySelector('.AdTitleStyle,.AdTitle');if(at)title=at.textContent.trim();}
    if(!title)continue;
    var descEl=c.querySelector('.AdDesc');
    var desc=descEl?(descEl.textContent||'').trim():'';
    var locEl=c.querySelector('.ListingLocation');
    var locText=locEl?(locEl.textContent||'').trim():'';
    var lp=locText.split('-').map(function(s){return s.trim();});
    var imgEl=c.querySelector('.ThumbCont img');
    var img='';
    if(imgEl){img=imgEl.getAttribute('src')||imgEl.src||'';if(img.indexOf('//')===0)img='https:'+img;}
    var priceEl=c.querySelector('.Price')||c.querySelector('#cellPriceMob');
    var pt=priceEl?(priceEl.textContent||''):'';
    var pm=pt.match(/([\d,]+)/);
    var price=pm?parseInt(pm[1].replace(/,/g,'')):null;
    var dateEl=c.querySelector('.ListingDate,[class*="date"]');
    var dateText=dateEl?(dateEl.textContent||'').trim():'';
    results.push({
      url:url,external_id:c.getAttribute('data-id')||'',title:title,
      description:desc,price:price,thumbnailUrl:img||null,
      location:locText,city:lp.length>1?lp[lp.length-1]:'',area:lp[0]||'',
      sellerPhone:null,dateText:dateText,
      sellerName:null,sellerProfileUrl:null,
      isVerified:false,isBusiness:false,isFeatured:false,
      supportsExchange:false,isNegotiable:false
    });
  }
  return results;
}

function isAlexandria(item){
  var loc=(item.city+' '+item.area+' '+item.location+' '+item.title+' '+item.description).toLowerCase();
  if(loc.includes('الإسكندرية')||loc.includes('الاسكندرية')||loc.includes('اسكندرية')||loc.includes('alexandria'))return true;
  var a=['سموحة','سيدي بشر','المنتزه','لوران','ستانلي','كليوباترا','جناكليس','محرم بك','سيدي جابر','المعمورة','العصافرة','الإبراهيمية','رشدي','ميامي','المندرة','العامرية','كينج مريوط','أبيس','جليم','كفر عبدو','النخيل','كامب شيزار','سبورتنج','الشاطبي','بولكلي','فلمنج','العجمي','البيطاش','برج العرب','السيوف','صواري','مروج','بالم هيلز','المنشية','محطة الرمل','القباري','الدخيلة','الهانوفيل','أبو تلات','زيزينيا','سان ستيفانو','وابور المياة','باكوس','الحضرة','المكس','بحري'];
  for(var i=0;i<a.length;i++){if(loc.includes(a[i]))return true;}
  return false;
}

function parseAgeDays(text){
  if(!text)return null;var t=text.trim();
  if(/الآن|لسه|just now/i.test(t))return 0;
  var m=t.match(/(\d+)/);var n=m?parseInt(m[1]):1;
  if(/دقيق|minute/i.test(t))return n/(60*24);
  if(/ساع|hour/i.test(t))return n/24;
  if(/أمس|امبارح|yesterday/i.test(t))return 1;
  if(/يوم|day/i.test(t))return n;
  if(/أسبوع|week/i.test(t))return n*7;
  if(/شهر|month/i.test(t))return n*30;
  if(/سنة|year/i.test(t))return n*365;
  return null;
}

function extractSellerName(html){
  // SemsarMasr: owner name often appears in these patterns
  var patterns=[
    /class="[^"]*(?:OwnerName|ownerName|AdvertName|sellerName)[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
    /<span[^>]*class="[^"]*(?:owner|seller|advert|user)[\w-]*"[^>]*>\s*([^<]{2,60})\s*<\/span>/i,
    /(?:صاحب الإعلان|المعلن|اسم المعلن|بواسطة)[:：]?\s*([^\n<>\r]{2,60})/,
    /itemprop=["']name["'][^>]*>\s*([^<]{2,60})\s*</i
  ];
  for(var i=0;i<patterns.length;i++){
    var m=html.match(patterns[i]);
    if(m&&m[1]){
      var n=m[1].trim().replace(/\s+/g,' ');
      // Strip common noise
      n=n.replace(/User\s*photo/gi,'').replace(/صورة المستخدم/g,'').replace(/مستخدم خاص/g,'').trim();
      if(n.length>=2&&n.length<=60&&!/^\d+$/.test(n))return n;
    }
  }
  return null;
}

function fetchDetail(url){
  return fetch(url).then(function(r){return r.arrayBuffer();}).then(function(buf){
    var html=new TextDecoder('windows-1256').decode(buf);
    var phones=html.match(/(?:\+?201|01)[0-25]\d{8}/g);
    var phone=null;
    if(phones&&phones.length>0){
      var p=phones[0].replace(/^\+?2/,'');
      phone=p.startsWith('0')?p:'0'+p;
    }
    return {phone:phone,sellerName:extractSellerName(html)};
  }).catch(function(){return {phone:null,sellerName:null};});
}

function fetchPhonesBatch(items,batchSize,onProgress){
  var idx=0;var total=items.filter(function(it){return !it.sellerPhone;}).length;var done=0;
  function next(){
    var batch=[];
    while(batch.length<batchSize&&idx<items.length){if(!items[idx].sellerPhone)batch.push(idx);idx++;}
    if(batch.length===0)return Promise.resolve();
    return Promise.all(batch.map(function(i){
      return fetchDetail(items[i].url+'?'+Date.now()).then(function(d){
        if(d.phone)items[i].sellerPhone=d.phone;
        if(d.sellerName&&!items[i].sellerName)items[i].sellerName=d.sellerName;
        done++;if(onProgress)onProgress(done,total);
      });
    })).then(next);
  }
  return next();
}

function harvestAllScopes(callback){
  function doScope(idx){
    if(idx>=SCOPES.length){callback();return;}
    var scope=SCOPES[idx];var scopeNew=0;var reachedArchive=false;var emptyStreak=0;

    function doPage(pg){
      if(pg>MAX_PAGE||reachedArchive||emptyStreak>=5){
        scopeStats.push({name:scope.name,found:scopeNew});
        setTimeout(function(){doScope(idx+1);},500);
        return;
      }
      log('🏗️ <b>'+scope.name+'</b> ('+(idx+1)+'/'+SCOPES.length+') — ص'+pg+'<br>هذا القسم: '+scopeNew+' | إجمالي: <b>'+allItems.length+'</b>');

      fetch(buildUrl(scope,pg)).then(function(r){return r.arrayBuffer();}).then(function(buf){
        var html=new TextDecoder('windows-1256').decode(buf);
        var doc=new DOMParser().parseFromString(html,'text/html');
        var cards=doc.querySelectorAll('div.ListCont, div.ListDesStyle');
        if(!cards||cards.length===0){
          scopeStats.push({name:scope.name,found:scopeNew});
          setTimeout(function(){doScope(idx+1);},500);return;
        }
        var extracted=extractCards(doc).filter(isAlexandria);
        var fresh=0,stale=0,newOnPage=0;
        for(var k=0;k<extracted.length;k++){
          var age=parseAgeDays(extracted[k].dateText);
          if(age!==null&&age>MAX_AGE_DAYS){stale++;continue;}
          fresh++;
          if(!harvestedUrls[extracted[k].url]){
            harvestedUrls[extracted[k].url]=1;
            allItems.push(extracted[k]);scopeNew++;newOnPage++;
          }
        }
        saveProgress();
        if(fresh+stale>=5&&stale/(fresh+stale)>=0.5)reachedArchive=true;
        if(newOnPage===0)emptyStreak++;else emptyStreak=0;
        setTimeout(function(){doPage(pg+1);},800);
      }).catch(function(){
        scopeStats.push({name:scope.name,found:scopeNew});
        setTimeout(function(){doScope(idx+1);},500);
      });
    }
    doPage(1);
  }
  doScope(0);
}

function extractAllPhones(callback){
  var need=allItems.filter(function(it){return !it.sellerPhone;}).length;
  if(need===0){callback();return;}
  fetchPhonesBatch(allItems,CONCURRENT,function(done,total){
    log('📞 أرقام: '+done+'/'+total+'<br>📊 إعلانات: '+allItems.length);
  }).then(callback);
}

function sendAll(){
  if(allItems.length===0){
    sd.style.background='#F59E0B';sd.innerHTML='⚠️ لا إعلانات جديدة<br>سابق: '+prevCount;
    setTimeout(function(){sd.remove();},15000);return;
  }
  var phones=allItems.filter(function(it){return it.sellerPhone;}).length;
  log('📤 إرسال '+allItems.length+' إعلان ('+phones+' بأرقام)...');
  var payload=JSON.stringify({
    url:'https://www.semsarmasr.com/3akarat',listings:allItems,
    timestamp:new Date().toISOString(),source:'bookmarklet-v9-with-names',
    strategy:'semsarmasr-listdesstyle',scope_code:null,platform:'semsarmasr'
  });
  var pop=window.open(MAKSAB+'/admin/crm/harvester/receive','mh','width=600,height=500');
  if(!pop){sd.style.background='#DC2626';sd.textContent='اسمح بالـ popups';return;}
  var delivered=false;
  var ci=setInterval(function(){
    if(delivered)return;
    try{pop.postMessage({type:'harvest_data',payload:payload,token:TOKEN},MAKSAB);}catch(e){}
  },800);
  var to=setTimeout(function(){clearInterval(ci);sd.style.background='#DC2626';sd.textContent='انتهت المهلة';},300000);
  window.addEventListener('message',function h(e){
    if(e.origin!==MAKSAB)return;
    if(e.data&&e.data.type==='harvest_result'){
      delivered=true;clearInterval(ci);clearTimeout(to);window.removeEventListener('message',h);
      setTimeout(function(){try{pop.close();}catch(e){}},3000);
      var nc=e.data.new_count||e.data.new||e.data.received||0;
      var dp=e.data.duplicate||e.data.duplicates||e.data.dup||0;
      sd.style.background='#1B7A3D';
      var html='✅ <b>اكتمل حصاد الإسكندرية!</b><br><br>';
      html+='<table style="width:100%;font-size:13px;border-collapse:collapse;">';
      html+='<tr style="border-bottom:1px solid rgba(255,255,255,0.3);"><th style="text-align:right;padding:4px;">القسم</th><th>جديد</th></tr>';
      for(var i=0;i<scopeStats.length;i++){
        html+='<tr style="border-bottom:1px solid rgba(255,255,255,0.15);"><td style="padding:4px;">'+scopeStats[i].name+'</td><td style="text-align:center;">'+scopeStats[i].found+'</td></tr>';
      }
      html+='</table><br>';
      html+='📊 إجمالي: <b>'+allItems.length+'</b><br>';
      html+='📞 بأرقام: <b>'+phones+'</b><br>';
      html+='💾 حُفظ: <b>'+nc+'</b> | مكرر: '+dp+'<br>';
      html+='🗃️ كلي: '+Object.keys(harvestedUrls).length;
      sd.innerHTML=html;
    }
  });
}

log('🚀 <b>حصاد تلقائي — '+SCOPES.length+' أقسام</b><br>سابق: '+prevCount+'<br><br>1️⃣ حصاد → 2️⃣ أرقام → 3️⃣ حفظ');
setTimeout(function(){
  harvestAllScopes(function(){
    log('✅ حصاد: <b>'+allItems.length+'</b> إعلان<br>🔄 استخراج الأرقام...');
    setTimeout(function(){
      extractAllPhones(function(){sendAll();});
    },1000);
  });
},1000);
})();
