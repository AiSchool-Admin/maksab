// SemsarMasr Harvester v6 — loaded externally to avoid bookmarklet size limits
(function(){
var MAKSAB=window.__MAKSAB_URL||'https://maksab.vercel.app';
var TOKEN=window.__MAKSAB_TOKEN||'';
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

log('🚀 حصاد من صفحة 1'+(prevCount>0?' ('+prevCount+' سابق)':''));

function saveProgress(){
  saved.urls=harvestedUrls;
  saved.updatedAt=new Date().toISOString();
  localStorage.setItem(STORE_KEY,JSON.stringify(saved));
}

function extractCards(doc){
  var cards=doc.querySelectorAll('div.ListCont, div.ListDesStyle');
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
    var pm=priceText.match(/([\d,]+)/);
    var price=pm?parseInt(pm[1].replace(/,/g,'')):null;
    var specs=card.querySelectorAll('.SpecsCont span');
    var specArr=[];
    for(var j=0;j<specs.length;j++){
      var sp=(specs[j].textContent||'').trim();
      if(sp)specArr.push(sp);
    }
    var dateEl=card.querySelector('.ListingDate,[class*="date"]');
    var dateText=dateEl?(dateEl.textContent||'').trim():'';
    results.push({
      url:url,external_id:dataId,title:title,
      description:desc||specArr.join(' — '),
      price:price,thumbnailUrl:img||null,
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
  if(!text)return null;
  var t=text.trim();
  if(/الآن|لسه|just now/i.test(t))return 0;
  var m=t.match(/(\d+)/);
  var n=m?parseInt(m[1]):1;
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
  return fetch(url).then(function(r){return r.text();}).then(function(html){
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
        log('📞 أرقام: '+done+'/'+total);
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
    url:location.href,listings:items,
    timestamp:new Date().toISOString(),
    source:'bookmarklet-v6',strategy:'semsarmasr-listdesstyle',
    scope_code:null,platform:'semsarmasr'
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
      sd.style.background='#1B7A3D';
      sd.innerHTML='✅ تم!<br>صفحة '+fromPg+' → '+toPg+'<br>'+items.length+' إعلان جديد<br>'+e.data.new_count+' حُفظ — '+e.data.duplicate+' مكرر<br>📞 '+withPhone+' بأرقام';
      setTimeout(function(){try{pop.close();}catch(e){}},3000);
    }
  });
}

var allItems=[];
var lastPageProcessed=0;
var noNewPages=0;
var reachedArchive=false;
var MAX_PAGE=200;
var MAX_AGE_DAYS=30;

function harvestPage(pg){
  if(pg>MAX_PAGE||noNewPages>=3||reachedArchive){finish();return;}
  log('🔄 صفحة '+pg+'<br>جديد: '+allItems.length);
  if(pg===1){
    processPage(document,pg);
    lastPageProcessed=pg;saveProgress();
    setTimeout(function(){harvestPage(2);},300);
    return;
  }
  fetch(getPageUrl(pg)).then(function(r){return r.text();}).then(function(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    var cards=doc.querySelectorAll('div.ListCont, div.ListDesStyle');
    if(!cards||cards.length===0){finish();return;}
    var before=allItems.length;
    processPage(doc,pg);
    lastPageProcessed=pg;saveProgress();
    if(allItems.length===before){noNewPages++;}else{noNewPages=0;}
    setTimeout(function(){harvestPage(pg+1);},800);
  }).catch(function(){finish();});
}

function processPage(doc,pg){
  var cards=extractCards(doc);
  var alexCards=cards.filter(isAlexandria);
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
      allItems.push(freshCards[i]);
      newCount++;
    }
  }
  log('📄 ص'+pg+': '+cards.length+' ('+alexCards.length+' إسكندرية, '+fresh+' حديث, '+stale+' قديم, '+newCount+' جديد)'+(reachedArchive?'<br>🛑 أرشيف':''));
}

function finish(){
  if(allItems.length===0){
    sd.style.background='#F59E0B';sd.innerHTML='⚠️ لا إعلانات جديدة<br>سابق: '+prevCount+' | فحصت: '+lastPageProcessed+' صفحة';
    setTimeout(function(){sd.remove();},15000);return;
  }
  var needPhone=allItems.filter(function(it){return !it.sellerPhone;}).length;
  if(needPhone>0){
    log('📞 أرقام من '+needPhone+' إعلان...');
    fetchPhonesBatch(allItems,CONCURRENT).then(function(){
      sendToMaksab(allItems,1,lastPageProcessed);
    });
  }else{
    sendToMaksab(allItems,1,lastPageProcessed);
  }
}

harvestPage(1);
})();
