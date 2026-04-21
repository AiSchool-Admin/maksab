// SemsarMasr Harvester v7 — Multi-scope: harvests ALL categories automatically
(function(){
var MAKSAB=window.__MAKSAB_URL||'https://maksab.vercel.app';
var TOKEN=window.__MAKSAB_TOKEN||'';
var CONCURRENT=5;
var MAX_PAGE=200;
var MAX_AGE_DAYS=30;
var TARGET_PER_SCOPE=500;

if(!location.hostname.includes('semsarmasr')&&!location.hostname.includes('sooqmsr')){
  alert('افتح semsarmasr.com الأول');return;
}

// All Alexandria scopes (g=979)
var SCOPES=[
  {name:'شقق للبيع',cid:952,purpose:'sale'},
  {name:'شاليهات للبيع',cid:953,purpose:'sale'},
  {name:'تجاري للبيع',cid:954,purpose:'sale'},
  {name:'شقق للإيجار',cid:952,purpose:'rent'},
  {name:'شاليهات للإيجار',cid:953,purpose:'rent'},
  {name:'تجاري للإيجار',cid:954,purpose:'rent'},
];

var STORE_KEY='maksab_harvest_semsarmasr_all';
var saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
var harvestedUrls=saved.urls||{};
var prevCount=Object.keys(harvestedUrls).length;

var sd=document.createElement('div');
sd.style.cssText='position:fixed;top:20px;right:20px;background:#7B1FA2;color:white;padding:16px 24px;border-radius:16px;z-index:99999;font-family:sans-serif;font-size:15px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,0.3);min-width:360px;line-height:1.8;max-height:90vh;overflow-y:auto;';
document.body.appendChild(sd);

function log(msg){sd.innerHTML=msg;}

var grandTotal=0;
var grandPhones=0;
var scopeResults=[];
var currentScopeIdx=0;

function saveProgress(){
  saved.urls=harvestedUrls;
  saved.updatedAt=new Date().toISOString();
  localStorage.setItem(STORE_KEY,JSON.stringify(saved));
}

function buildScopeUrl(scope,page){
  return 'https://www.semsarmasr.com/3akarat?r=70&purpose='+scope.purpose+'&cid='+scope.cid+'&s=1&g=979&a=0&pf=0&pt=0&af=0&at=0&ismortgage=-1&pm=any&furniture=-1&finishing=-1&rooms=0&q=&p='+page;
}

function extractCards(doc){
  var cards=doc.querySelectorAll('div.ListCont, div.ListDesStyle');
  var results=[];
  for(var i=0;i<cards.length;i++){
    var card=cards[i];
    var dataId=card.getAttribute('data-id')||'';
    var linkEl=card.querySelector('.AdTitleStyle h2 a')||card.querySelector('a[href*="/3akarat/"]');
    if(!linkEl)continue;
    var fullUrl=linkEl.href||linkEl.getAttribute('href')||'';
    if(!fullUrl)continue;
    var url=fullUrl.split('?')[0];
    var title=(linkEl.getAttribute('title')||(linkEl.textContent||'')).trim();
    if(!title){var h2=card.querySelector('h2');if(h2)title=h2.textContent.trim();}
    if(!title){var at=card.querySelector('.AdTitleStyle,.AdTitle');if(at)title=at.textContent.trim();}
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
    if(imgEl){img=imgEl.getAttribute('src')||imgEl.src||'';if(img.indexOf('//')===0)img='https:'+img;}
    var priceEl=card.querySelector('.Price')||card.querySelector('#cellPriceMob');
    var priceText=priceEl?(priceEl.textContent||''):'';
    var pm=priceText.match(/([\d,]+)/);
    var price=pm?parseInt(pm[1].replace(/,/g,'')):null;
    var dateEl=card.querySelector('.ListingDate,[class*="date"]');
    var dateText=dateEl?(dateEl.textContent||'').trim():'';
    results.push({
      url:url,external_id:dataId,title:title,
      description:desc,price:price,thumbnailUrl:img||null,
      location:locText,city:city,area:area,
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

function fetchPhone(url){
  return fetch(url).then(function(r){return r.arrayBuffer();}).then(function(buf){
    var html=new TextDecoder('windows-1256').decode(buf);
    var phones=html.match(/(?:\+?201|01)[0-25]\d{8}/g);
    if(phones&&phones.length>0){
      var p=phones[0].replace(/^\+?2/,'');
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
        log('📞 '+SCOPES[currentScopeIdx].name+': أرقام '+done+'/'+total+'<br>📊 إجمالي كلي: '+grandTotal);
      });
    })).then(next);
  }
  return next();
}

function sendToMaksab(items,scopeName,callback){
  if(items.length===0){callback(0,0);return;}
  var payload=JSON.stringify({
    url:'https://www.semsarmasr.com/3akarat',
    listings:items,
    timestamp:new Date().toISOString(),
    source:'bookmarklet-v7-multi',strategy:'semsarmasr-listdesstyle',
    scope_code:null,platform:'semsarmasr'
  });
  var pop=window.open(MAKSAB+'/admin/crm/harvester/receive','mh','width=500,height=400');
  if(!pop){callback(0,0);return;}
  var delivered=false;
  var ci=setInterval(function(){
    if(delivered)return;
    try{pop.postMessage({type:'harvest_data',payload:payload,token:TOKEN},MAKSAB);}catch(e){}
  },800);
  var to=setTimeout(function(){clearInterval(ci);callback(0,0);},120000);
  window.addEventListener('message',function h(e){
    if(e.origin!==MAKSAB)return;
    if(e.data&&e.data.type==='harvest_result'){
      delivered=true;clearInterval(ci);clearTimeout(to);window.removeEventListener('message',h);
      var nc=e.data.new_count||e.data.new||e.data.received||0;
      var dp=e.data.duplicate||e.data.duplicates||e.data.dup||0;
      setTimeout(function(){try{pop.close();}catch(e){}},2000);
      callback(nc,dp);
    }
  });
}

// ─── Scope harvester ────────────────────────────────────────

function harvestScope(scopeIdx){
  if(scopeIdx>=SCOPES.length){finishAll();return;}
  currentScopeIdx=scopeIdx;
  var scope=SCOPES[scopeIdx];
  var scopeItems=[];
  var reachedArchive=false;

  log('🏗️ قسم '+(scopeIdx+1)+'/'+SCOPES.length+': <b>'+scope.name+'</b><br>📊 إجمالي كلي: '+grandTotal);

  function harvestPage(pg){
    if(pg>MAX_PAGE||scopeItems.length>=TARGET_PER_SCOPE||reachedArchive){
      finishScope();return;
    }
    log('🏗️ <b>'+scope.name+'</b> — ص'+pg+' ('+scopeItems.length+'/'+TARGET_PER_SCOPE+')<br>📊 إجمالي: '+grandTotal+' | أقسام: '+(scopeIdx+1)+'/'+SCOPES.length);

    var url=buildScopeUrl(scope,pg);
    fetch(url).then(function(r){return r.arrayBuffer();}).then(function(buf){
      var html=new TextDecoder('windows-1256').decode(buf);
      var doc=new DOMParser().parseFromString(html,'text/html');
      var cards=doc.querySelectorAll('div.ListCont, div.ListDesStyle');
      if(!cards||cards.length===0){finishScope();return;}

      var extracted=extractCards(doc);
      var alexCards=extracted.filter(isAlexandria);
      var fresh=0,stale=0;
      var freshCards=[];
      for(var k=0;k<alexCards.length;k++){
        var age=parseAgeDays(alexCards[k].dateText);
        if(age===null||age<=MAX_AGE_DAYS){fresh++;freshCards.push(alexCards[k]);}
        else{stale++;}
      }
      if(fresh+stale>=5&&stale/(fresh+stale)>=0.5)reachedArchive=true;

      var newCount=0;
      for(var i=0;i<freshCards.length;i++){
        if(!harvestedUrls[freshCards[i].url]){
          harvestedUrls[freshCards[i].url]=1;
          scopeItems.push(freshCards[i]);
          newCount++;
        }
      }
      saveProgress();

      if(reachedArchive){
        log('🛑 <b>'+scope.name+'</b>: أرشيف (>50% قديم) — '+scopeItems.length+' إعلان');
      }

      if(scopeItems.length>=TARGET_PER_SCOPE||reachedArchive){finishScope();return;}
      setTimeout(function(){harvestPage(pg+1);},800);
    }).catch(function(){finishScope();});
  }

  function finishScope(){
    if(scopeItems.length===0){
      scopeResults.push({name:scope.name,total:0,phones:0,saved:0});
      log('⏭️ <b>'+scope.name+'</b>: لا إعلانات جديدة — التالي...');
      setTimeout(function(){harvestScope(scopeIdx+1);},1000);
      return;
    }
    log('📞 <b>'+scope.name+'</b>: استخراج أرقام '+scopeItems.length+' إعلان...');
    fetchPhonesBatch(scopeItems,CONCURRENT).then(function(){
      var phones=scopeItems.filter(function(it){return it.sellerPhone;}).length;
      grandPhones+=phones;
      log('📤 <b>'+scope.name+'</b>: إرسال '+scopeItems.length+' إعلان ('+phones+' بأرقام)...');
      sendToMaksab(scopeItems,scope.name,function(nc,dp){
        grandTotal+=scopeItems.length;
        scopeResults.push({name:scope.name,total:scopeItems.length,phones:phones,saved:nc,dup:dp});
        log('✅ <b>'+scope.name+'</b>: '+scopeItems.length+' إعلان ('+nc+' حُفظ)<br>⏭️ القسم التالي...');
        setTimeout(function(){harvestScope(scopeIdx+1);},2000);
      });
    });
  }

  harvestPage(1);
}

function finishAll(){
  var total=scopeResults.reduce(function(s,r){return s+r.total;},0);
  var phones=scopeResults.reduce(function(s,r){return s+r.phones;},0);
  var saved=scopeResults.reduce(function(s,r){return s+(r.saved||0);},0);

  sd.style.background='#1B7A3D';
  var html='✅ <b>اكتمل حصاد كل الأقسام!</b><br><br>';
  html+='<table style="width:100%;font-size:13px;border-collapse:collapse;">';
  html+='<tr style="border-bottom:1px solid rgba(255,255,255,0.3);"><th>القسم</th><th>إعلانات</th><th>أرقام</th><th>حُفظ</th></tr>';
  for(var i=0;i<scopeResults.length;i++){
    var r=scopeResults[i];
    html+='<tr style="border-bottom:1px solid rgba(255,255,255,0.15);"><td>'+r.name+'</td><td>'+r.total+'</td><td>'+r.phones+'</td><td>'+(r.saved||0)+'</td></tr>';
  }
  html+='<tr style="font-weight:bold;border-top:2px solid white;"><td>الإجمالي</td><td>'+total+'</td><td>'+phones+'</td><td>'+saved+'</td></tr>';
  html+='</table>';
  html+='<br>📊 إجمالي محصود: '+Object.keys(harvestedUrls).length;
  sd.innerHTML=html;
}

log('🚀 بدء حصاد <b>'+SCOPES.length+' أقسام</b> في الإسكندرية<br>سابق: '+prevCount+' إعلان');
harvestScope(0);
})();
