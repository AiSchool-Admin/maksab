// Maksab Unified Harvester v11 — dubizzle + semsarmasr + opensooq + aqarmap
// Run from any supported listing page. Detects platform, category, governorate,
// paginates through results, fetches phones from detail pages, delivers to Maksab.
(function(){
  'use strict';

  // ═════════════════════════════════════════════════════════
  //  Config
  // ═════════════════════════════════════════════════════════

  var MAKSAB = window.__MAKSAB_URL || 'https://maksab.vercel.app';
  var TOKEN = window.__MAKSAB_TOKEN || '';
  var MAX_PAGES = 200;
  var MAX_AGE_DAYS = 30;
  var CONCURRENT = 4;           // parallel detail fetches
  var PAGE_DELAY_MS = 800;      // delay between list pages
  var COUNTDOWN_SECS = 8;       // auto-start countdown on ready panel
  var STORE_KEY_PREFIX = 'maksab_harvest_v10_';

  // ═════════════════════════════════════════════════════════
  //  Governorate slug → Arabic name (shared across platforms)
  // ═════════════════════════════════════════════════════════

  var GOV_AR = {
    alexandria: 'الإسكندرية',
    cairo: 'القاهرة',
    giza: 'الجيزة',
    dakahlia: 'الدقهلية',
    sharqia: 'الشرقية',
    qalyubia: 'القليوبية',
    gharbia: 'الغربية',
    monufia: 'المنوفية',
    beheira: 'البحيرة',
    'kafr-el-sheikh': 'كفر الشيخ',
    damietta: 'دمياط',
    'port-said': 'بورسعيد',
    ismailia: 'الإسماعيلية',
    suez: 'السويس',
    matrouh: 'مطروح',
    'north-sinai': 'شمال سيناء',
    'south-sinai': 'جنوب سيناء',
    'red-sea': 'البحر الأحمر',
    'new-valley': 'الوادي الجديد',
    asyut: 'أسيوط',
    aswan: 'أسوان',
    luxor: 'الأقصر',
    sohag: 'سوهاج',
    qena: 'قنا',
    'bani-suef': 'بني سويف',
    fayoum: 'الفيوم',
    minya: 'المنيا',
  };

  // SemsarMasr uses numeric IDs for governorate
  var SEMSAR_GOV_IDS = {
    '979': 'الإسكندرية',
    '981': 'القاهرة',
    '980': 'الجيزة',
    '1002': 'الساحل الشمالي',
    '984': 'الشرقية',
    '985': 'الدقهلية',
    '983': 'القليوبية',
    '988': 'الغربية',
    '989': 'المنوفية',
    '986': 'البحيرة',
    '992': 'الفيوم',
  };

  // SemsarMasr numeric category IDs (partial — learned from existing scopes)
  var SEMSAR_CAT_IDS = {
    '952': 'شقق',
    '953': 'شاليهات',
    '954': 'عقار تجاري',
    '955': 'فيلات',
    '956': 'أراضي',
    '957': 'محلات',
    '958': 'مكاتب',
  };

  // ═════════════════════════════════════════════════════════
  //  Platform registry — each platform implements:
  //    id, displayName, match(hostname) -> boolean
  //    detectContext(href, doc) -> ctx {valid, governorate, category, purpose, summary, startUrl}
  //    buildPageUrl(ctx, pageNum) -> url string
  //    parseList(html, doc) -> items[]  (url, title, price, image, date, sellerName?, sellerPhone?, location)
  //    parseDetail(html) -> {phone, sellerName}
  //    maksabCategory(ctx) -> 'سيارات' | 'عقارات' | ...  (for save)
  // ═════════════════════════════════════════════════════════

  var PLATFORMS = {}; // populated below by stage 2/3/4

  function detectPlatform() {
    var host = location.hostname.toLowerCase();
    for (var id in PLATFORMS) {
      if (PLATFORMS[id].match && PLATFORMS[id].match(host)) return PLATFORMS[id];
    }
    return null;
  }

  // ═════════════════════════════════════════════════════════
  //  Egyptian phone normalization (same rules as server)
  // ═════════════════════════════════════════════════════════

  function normalizeEgPhone(input) {
    if (!input) return null;
    var s = String(input).trim();
    // Arabic-Indic → Western digits
    s = s.replace(/[٠-٩]/g, function(d){ return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
    s = s.replace(/[\s.\-+()]/g, '');
    if (s.indexOf('0020') === 0 && s.length === 14) s = '0' + s.slice(4);
    if (s.indexOf('20') === 0 && s.length === 12) s = '0' + s.slice(2);
    return /^01[0-25]\d{8}$/.test(s) ? s : null;
  }

  function findPhoneInText(text) {
    if (!text) return null;
    var patterns = [
      /\+?20\s?1[0-25]\d{8}/,
      /01[0-25]\d{8}/,
      /01[0-25][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m) {
        var n = normalizeEgPhone(m[0]);
        if (n) return n;
      }
    }
    return null;
  }

  // ═════════════════════════════════════════════════════════
  //  Common: age parsing (same heuristics across platforms)
  // ═════════════════════════════════════════════════════════

  function parseAgeDays(text) {
    if (!text) return null;
    var t = String(text).trim();
    if (/الآن|لسه|just now/i.test(t)) return 0;
    var m = t.match(/(\d+)/);
    var n = m ? parseInt(m[1], 10) : 1;
    if (/دقيق|minute/i.test(t)) return n / (60 * 24);
    if (/ساع|hour/i.test(t)) return n / 24;
    if (/أمس|امبارح|yesterday/i.test(t)) return 1;
    if (/يوم|day/i.test(t)) return n;
    if (/أسبوع|week/i.test(t)) return n * 7;
    if (/شهر|month/i.test(t)) return n * 30;
    if (/سنة|year/i.test(t)) return n * 365;
    return null;
  }

  // ═════════════════════════════════════════════════════════
  //  State management (persisted across runs)
  // ═════════════════════════════════════════════════════════

  function storeKey(platformId) { return STORE_KEY_PREFIX + platformId; }

  function loadStore(platformId) {
    try { return JSON.parse(localStorage.getItem(storeKey(platformId)) || '{}'); }
    catch(e) { return {}; }
  }

  function saveStore(platformId, data) {
    data.updatedAt = new Date().toISOString();
    try { localStorage.setItem(storeKey(platformId), JSON.stringify(data)); } catch(e) {}
  }

  // ═════════════════════════════════════════════════════════
  //  UI Overlay
  // ═════════════════════════════════════════════════════════

  function buildUI() {
    var root = document.createElement('div');
    root.setAttribute('dir', 'rtl');
    root.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px',
      'background:#1B7A3D', 'color:#fff',
      'padding:18px 22px', 'border-radius:16px',
      'z-index:2147483647', 'font-family:"Cairo","Segoe UI",sans-serif',
      'font-size:14px', 'line-height:1.8',
      'box-shadow:0 8px 30px rgba(0,0,0,0.3)',
      'min-width:340px', 'max-width:420px', 'max-height:85vh',
      'overflow-y:auto',
    ].join(';');
    document.body.appendChild(root);
    return {
      root: root,
      set: function(html) { root.innerHTML = html; },
      bg: function(color) { root.style.background = color; },
      close: function() { try { root.remove(); } catch(e){} },
    };
  }

  function renderReady(ui, ctx, platform, onStart, onCancel) {
    var countdown = COUNTDOWN_SECS;
    var cancelled = false;
    var prevStore = loadStore(platform.id);
    var prevCount = prevStore.urls ? Object.keys(prevStore.urls).length : 0;

    function html() {
      return ''
        + '<div style="font-size:16px;font-weight:700;margin-bottom:12px;">🏗️ مكسب — الحصاد الموحّد</div>'
        + '<div style="background:rgba(0,0,0,0.15);padding:10px 12px;border-radius:10px;font-size:13px;">'
        + '  <div>🌐 <b>المنصة:</b> ' + platform.displayName + '</div>'
        + '  <div>📍 <b>المحافظة:</b> ' + (ctx.governorateLabel || '—') + '</div>'
        + '  <div>🏷️ <b>القسم:</b> ' + (ctx.categoryLabel || '—') + '</div>'
        + '  <div>🏦 <b>نوع البيع:</b> ' + (ctx.purposeLabel || '—') + '</div>'
        + '</div>'
        + (prevCount > 0
            ? ('<div style="margin-top:8px;font-size:11px;background:rgba(0,0,0,0.1);padding:6px 10px;border-radius:8px;">'
               + 'لاحظ: ' + prevCount + ' URL محفوظ من جلسات سابقة. '
               + '<a href="#" id="mk-clear" style="color:#FFE082;text-decoration:underline;">مسح cache</a>'
               + '</div>')
            : '')
        + '<div style="margin-top:12px;font-size:13px;">'
        + (ctx.valid
            ? ('سيبدأ الحصاد خلال <b>' + countdown + '</b> ثانية...')
            : '<span style="color:#FFE082;">⚠️ مش قادر أكتشف القسم. افتح صفحة قسم معيّن الأول.</span>')
        + '</div>'
        + '<div style="margin-top:14px;display:flex;gap:8px;">'
        + (ctx.valid
            ? '<button id="mk-start" style="flex:1;background:#D4A843;color:#1A1A2E;border:0;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;">ابدأ الآن</button>'
            : '')
        + '  <button id="mk-cancel" style="flex:1;background:rgba(255,255,255,0.2);color:#fff;border:0;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;">إلغاء</button>'
        + '</div>';
    }

    ui.set(html());

    var startBtn = document.getElementById('mk-start');
    var cancelBtn = document.getElementById('mk-cancel');
    var clearBtn = document.getElementById('mk-clear');
    if (startBtn) startBtn.addEventListener('click', function(){
      if (cancelled) return;
      cancelled = true; onStart();
    });
    if (cancelBtn) cancelBtn.addEventListener('click', function(){
      if (cancelled) return;
      cancelled = true; onCancel();
    });
    if (clearBtn) clearBtn.addEventListener('click', function(e){
      e.preventDefault();
      try { localStorage.removeItem(storeKey(platform.id)); } catch(_) {}
      prevCount = 0;
      ui.set(html()); // re-render without the cache hint
      // re-attach handlers after re-render
      var sb = document.getElementById('mk-start');
      var cb = document.getElementById('mk-cancel');
      if (sb) sb.addEventListener('click', function(){ if (!cancelled) { cancelled = true; onStart(); } });
      if (cb) cb.addEventListener('click', function(){ if (!cancelled) { cancelled = true; onCancel(); } });
    });

    if (!ctx.valid) return;

    var timer = setInterval(function(){
      if (cancelled) { clearInterval(timer); return; }
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        cancelled = true;
        onStart();
      } else {
        // Just update the countdown text rather than full re-render
        var text = ui.root.querySelector('div[style*="font-size:13px"]:nth-of-type(2)');
        if (text) text.innerHTML = 'سيبدأ الحصاد خلال <b>' + countdown + '</b> ثانية...';
      }
    }, 1000);
  }

  function renderProgress(ui, msg) {
    ui.set('<div style="font-size:15px;line-height:1.8;">' + msg + '</div>');
  }

  function renderDone(ui, stats) {
    // If extracted 50+ but saved 0 → something's wrong on server. Warn user.
    var savedAny = (stats.newCount + stats.dupCount) > 0;
    var extractedMany = stats.total >= 20;
    var failed = extractedMany && !savedAny;

    ui.bg(failed ? '#DC2626' : '#1B7A3D');
    var html = ''
      + '<div style="font-size:16px;font-weight:700;margin-bottom:10px;">'
      + (failed ? '⚠️ حصاد تم لكن لم يُحفظ!' : '✅ انتهى الحصاد')
      + '</div>'
      + '<div style="background:rgba(0,0,0,0.15);padding:10px;border-radius:10px;font-size:13px;">'
      + '  <div>📊 إجمالي: <b>' + stats.total + '</b></div>'
      + '  <div>📞 بأرقام: <b>' + stats.withPhone + '</b></div>'
      + '  <div>👤 بأسماء: <b>' + stats.withName + '</b></div>'
      + '  <div>💾 جديد: <b>' + stats.newCount + '</b> | مكرر: ' + stats.dupCount + '</div>'
      + (stats.scopeMatched === false ? '<div style="color:#FFE082;">⚠️ scope غير مطابق</div>' : '')
      + '</div>'
      + (stats.firstError
          ? ('<div style="background:rgba(0,0,0,0.25);margin-top:10px;padding:8px;border-radius:8px;font-size:11px;font-family:monospace;direction:ltr;text-align:left;word-break:break-all;">'
             + 'Error: ' + String(stats.firstError).substring(0, 250)
             + '</div>')
          : '')
      + '<button onclick="this.parentNode.remove()" style="margin-top:12px;width:100%;background:rgba(255,255,255,0.2);color:#fff;border:0;padding:8px;border-radius:8px;cursor:pointer;">إغلاق</button>';
    ui.set(html);
  }

  function renderError(ui, msg) {
    ui.bg('#DC2626');
    ui.set('<div style="font-weight:700;margin-bottom:8px;">❌ خطأ</div><div style="font-size:13px;">' + msg + '</div>'
      + '<button onclick="this.parentNode.remove()" style="margin-top:10px;background:rgba(255,255,255,0.2);color:#fff;border:0;padding:8px 16px;border-radius:8px;cursor:pointer;">إغلاق</button>');
  }

  // ═════════════════════════════════════════════════════════
  //  Harvest main loop
  // ═════════════════════════════════════════════════════════

  function harvestAllPages(platform, ctx, ui, onDone) {
    // localStorage cache used to filter URLs across runs — but if the DB is
    // wiped server-side, the client cache becomes wrong (filters out items
    // that need to be re-saved). Server handles dedup via source_listing_url
    // match; client just collects.
    //
    // We still load `store.urls` so we can show "X previously seen" in the
    // UI, but we DON'T use it to filter what gets sent.
    var store = loadStore(platform.id);
    var prevSeenUrls = store.urls || {};
    var prevCount = Object.keys(prevSeenUrls).length;
    var seenInThisRun = {}; // dedup WITHIN one run only

    var allItems = [];
    var page = 1;
    var emptyStreak = 0;
    var archiveReached = false;

    function next() {
      if (page > MAX_PAGES || emptyStreak >= 3 || archiveReached) {
        // Update store with everything we collected this run
        var mergedUrls = {};
        for (var u in prevSeenUrls) mergedUrls[u] = prevSeenUrls[u];
        for (var u2 in seenInThisRun) mergedUrls[u2] = 1;
        saveStore(platform.id, { urls: mergedUrls });
        return onDone(allItems, mergedUrls);
      }

      renderProgress(ui, '🔍 <b>' + platform.displayName + '</b> — صفحة ' + page
        + '<br>وُجد حتى الآن: <b>' + allItems.length + '</b>'
        + (prevCount > 0 ? '<br><span style="opacity:0.7;font-size:11px;">(جلسات سابقة: ' + prevCount + ')</span>' : ''));

      var url = platform.buildPageUrl(ctx, page);
      platform.fetchPage(url).then(function(res) {
        var items = platform.parseList(res.html, res.doc, ctx) || [];
        var fresh = 0, stale = 0, newOnPage = 0;

        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var age = parseAgeDays(it.dateText);
          if (age !== null && age > MAX_AGE_DAYS) { stale++; continue; }
          fresh++;
          // Only filter intra-run duplicates (same URL appears on 2 list pages).
          // Cross-run filtering is the SERVER's job (source_listing_url match).
          if (!seenInThisRun[it.url]) {
            seenInThisRun[it.url] = 1;
            allItems.push(it);
            newOnPage++;
          }
        }

        // More than half are archive-age → stop walking further
        if ((fresh + stale) >= 5 && stale / (fresh + stale) >= 0.5) archiveReached = true;
        // No items at all on the page = real empty page (end of pagination)
        if (items.length === 0) emptyStreak++;
        else emptyStreak = 0;

        page++;
        setTimeout(next, PAGE_DELAY_MS);
      }).catch(function(err){
        console.warn('[maksab] fetch error page', page, err);
        emptyStreak++;
        page++;
        setTimeout(next, PAGE_DELAY_MS);
      });
    }

    next();
  }

  function fetchDetailsBatch(platform, items, ui) {
    var total = items.filter(function(it){ return !it.sellerPhone || !it.sellerName; }).length;
    var done = 0;
    var idx = 0;

    function update() {
      renderProgress(ui, '📞 جلب الأرقام والأسماء: <b>' + done + '/' + total + '</b><br>إجمالي: ' + items.length);
    }

    return new Promise(function(resolve){
      if (total === 0) return resolve();
      update();

      function launchOne(i) {
        var it = items[i];
        // Always fetch detail page (even if phone/name already known) to grab
        // additional images from the gallery. Skip only if we have everything.
        var needsFetch = !it.sellerPhone || !it.sellerName || !(it.allImages && it.allImages.length > 1);
        if (!needsFetch) { done++; update(); return Promise.resolve(); }
        return platform.fetchPage(it.url + (it.url.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now())
          .then(function(res){
            var detail = platform.parseDetail(res.html, res.doc) || {};
            if (detail.phone && !it.sellerPhone) it.sellerPhone = detail.phone;
            if (detail.sellerName && !it.sellerName) it.sellerName = detail.sellerName;
            if (detail.allImages && detail.allImages.length > 0) {
              it.allImages = detail.allImages;
              if (!it.thumbnailUrl) it.thumbnailUrl = detail.allImages[0];
            }
            done++; update();
          })
          .catch(function(){ done++; update(); });
      }

      function drain() {
        var inFlight = [];
        while (inFlight.length < CONCURRENT && idx < items.length) {
          inFlight.push(launchOne(idx++));
        }
        if (inFlight.length === 0) return resolve();
        Promise.all(inFlight).then(drain);
      }

      drain();
    });
  }

  function sendToMaksab(platform, ctx, items, ui) {
    renderProgress(ui, '📤 إرسال ' + items.length + ' إعلان لمكسب...');
    var payload = {
      url: ctx.startUrl,
      listings: items,
      timestamp: new Date().toISOString(),
      source: 'bookmarklet-v11-unified',
      platform: platform.id,
      scope_code: ctx.scopeCode || null,
      meta: {
        governorate: ctx.governorate,
        governorate_label: ctx.governorateLabel,
        category: ctx.category,
        category_label: ctx.categoryLabel,
        purpose: ctx.purpose,
        maksab_category: platform.maksabCategory ? platform.maksabCategory(ctx) : null,
      },
    };

    return new Promise(function(resolve){
      var pop = window.open(MAKSAB + '/admin/crm/harvester/receive', 'mk-receive', 'width=600,height=500');
      if (!pop) {
        renderError(ui, 'البراوزر منع فتح النافذة. سماح popups من إعدادات الموقع.');
        return resolve({new_count: 0, duplicate: 0, error: 'popup_blocked'});
      }

      var delivered = false;
      var ci = setInterval(function(){
        if (delivered) return;
        try { pop.postMessage({type:'harvest_data', payload: JSON.stringify(payload), token: TOKEN}, MAKSAB); } catch(e) {}
      }, 800);

      var to = setTimeout(function(){
        clearInterval(ci);
        if (!delivered) resolve({new_count: 0, duplicate: 0, error: 'timeout'});
      }, 5 * 60 * 1000);

      window.addEventListener('message', function handler(e){
        if (e.origin !== MAKSAB) return;
        if (!e.data || e.data.type !== 'harvest_result') return;
        delivered = true;
        clearInterval(ci); clearTimeout(to);
        window.removeEventListener('message', handler);
        setTimeout(function(){ try { pop.close(); } catch(e){} }, 3000);
        resolve(e.data);
      });
    });
  }

  // ═════════════════════════════════════════════════════════
  //  Entry point
  // ═════════════════════════════════════════════════════════

  function run() {
    var platform = detectPlatform();
    var ui = buildUI();

    if (!platform) {
      renderError(ui, 'السيت دي مش مدعومة. المدعومة حالياً: dubizzle — semsarmasr — opensooq — aqarmap');
      return;
    }

    var ctx = platform.detectContext(location.href, document);
    ctx.startUrl = location.href;

    renderReady(ui, ctx, platform, function onStart(){
      if (!ctx.valid) { ui.close(); return; }
      harvestAllPages(platform, ctx, ui, function(items){
        if (items.length === 0) {
          renderDone(ui, {total: 0, withPhone: 0, withName: 0, newCount: 0, dupCount: 0});
          return;
        }
        fetchDetailsBatch(platform, items, ui).then(function(){
          var withPhone = items.filter(function(it){ return it.sellerPhone; }).length;
          var withName = items.filter(function(it){ return it.sellerName; }).length;
          sendToMaksab(platform, ctx, items, ui).then(function(res){
            renderDone(ui, {
              total: items.length,
              withPhone: withPhone,
              withName: withName,
              newCount: res.new_count || 0,
              dupCount: res.duplicate || res.duplicates || 0,
              scopeMatched: res.scope_matched,
              firstError: res.first_insert_error || res.error,
            });
          });
        });
      });
    }, function onCancel(){
      ui.close();
    });
  }

  // Expose platform registry globally so stage-2/3/4 files could extend it if needed.
  // In this monolithic file, platform implementations are defined below.
  window.__MAKSAB_PLATFORMS = PLATFORMS;
  window.__MAKSAB_HELPERS = { normalizeEgPhone: normalizeEgPhone, findPhoneInText: findPhoneInText, GOV_AR: GOV_AR, SEMSAR_GOV_IDS: SEMSAR_GOV_IDS, SEMSAR_CAT_IDS: SEMSAR_CAT_IDS };

  // ═════════════════════════════════════════════════════════
  //  STAGE 2: SemsarMasr
  //  - Pure HTML (no JS-rendered content)
  //  - Windows-1256 encoding (!)
  //  - URL: semsarmasr.com/3akarat?cid=952&purpose=sale&g=979&p=N
  // ═════════════════════════════════════════════════════════

  PLATFORMS.semsarmasr = {
    id: 'semsarmasr',
    displayName: 'سمسار مصر',

    match: function(host) { return /semsarmasr\.com|sooqmsr/i.test(host); },

    detectContext: function(href, doc) {
      var ctx = { valid: false, platform: 'semsarmasr' };
      var qIdx = href.indexOf('?');
      var qs = qIdx >= 0 ? new URLSearchParams(href.slice(qIdx + 1)) : new URLSearchParams('');

      var cid = qs.get('cid');
      var purpose = qs.get('purpose'); // sale | rent
      var g = qs.get('g');

      ctx.category = 'عقارات'; // SemsarMasr is real-estate only
      ctx.categoryLabel = SEMSAR_CAT_IDS[cid || ''] || 'عقارات';
      ctx.subcategoryId = cid;
      ctx.purpose = purpose;
      ctx.purposeLabel = purpose === 'sale' ? 'بيع' : purpose === 'rent' ? 'إيجار' : 'الكل';
      ctx.governorate = SEMSAR_GOV_IDS[g || ''] || null;
      ctx.governorateLabel = ctx.governorate || '—';
      ctx.governorateId = g;

      // Valid when we at least know the sub-category and purpose
      ctx.valid = !!(cid && purpose);
      ctx.scopeCode = ctx.valid ? ('semsarmasr:' + cid + ':' + purpose + ':' + (g || 'all')) : null;
      return ctx;
    },

    buildPageUrl: function(ctx, page) {
      return 'https://www.semsarmasr.com/3akarat?r=70'
        + '&purpose=' + encodeURIComponent(ctx.purpose || 'sale')
        + '&cid=' + encodeURIComponent(ctx.subcategoryId || '952')
        + '&s=1'
        + '&g=' + encodeURIComponent(ctx.governorateId || '979')
        + '&a=0&pf=0&pt=0&af=0&at=0&ismortgage=-1&pm=any&furniture=-1&finishing=-1&rooms=0&q='
        + '&p=' + page;
    },

    // SemsarMasr responses are Windows-1256 encoded.
    fetchPage: function(url) {
      return fetch(url, {credentials: 'include'})
        .then(function(r) { return r.arrayBuffer(); })
        .then(function(buf){
          var html = new TextDecoder('windows-1256').decode(buf);
          var doc = new DOMParser().parseFromString(html, 'text/html');
          return { html: html, doc: doc };
        });
    },

    parseList: function(html, doc, ctx) {
      var results = [];
      var cards = doc.querySelectorAll('div.ListCont, div.ListDesStyle');
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var linkEl = c.querySelector('.AdTitleStyle h2 a') || c.querySelector('a[href*="/3akarat/"]');
        if (!linkEl) continue;
        var fullUrl = linkEl.href || linkEl.getAttribute('href') || '';
        if (!fullUrl) continue;
        var url = fullUrl.split('?')[0];

        var title = (linkEl.getAttribute('title') || (linkEl.textContent || '')).trim();
        if (!title) { var h2 = c.querySelector('h2'); if (h2) title = h2.textContent.trim(); }
        if (!title) { var at = c.querySelector('.AdTitleStyle,.AdTitle'); if (at) title = at.textContent.trim(); }
        if (!title) continue;

        var descEl = c.querySelector('.AdDesc');
        var desc = descEl ? (descEl.textContent || '').trim() : '';
        var locEl = c.querySelector('.ListingLocation');
        var locText = locEl ? (locEl.textContent || '').trim() : '';
        var lp = locText.split('-').map(function(s){ return s.trim(); });

        var imgEl = c.querySelector('.ThumbCont img');
        var img = '';
        if (imgEl) { img = imgEl.getAttribute('src') || imgEl.src || ''; if (img.indexOf('//') === 0) img = 'https:' + img; }

        var priceEl = c.querySelector('.Price') || c.querySelector('#cellPriceMob');
        var pt = priceEl ? (priceEl.textContent || '') : '';
        var pm = pt.match(/([\d,]+)/);
        var price = pm ? parseInt(pm[1].replace(/,/g, ''), 10) : null;

        var dateEl = c.querySelector('.ListingDate, [class*="date"]');
        var dateText = dateEl ? (dateEl.textContent || '').trim() : '';

        results.push({
          url: url,
          external_id: c.getAttribute('data-id') || '',
          title: title,
          description: desc,
          price: price,
          thumbnailUrl: img || null,
          location: locText || (ctx.governorateLabel || ''),
          city: lp.length > 1 ? lp[lp.length - 1] : (ctx.governorateLabel || ''),
          area: lp[0] || '',
          sellerPhone: null,
          sellerName: null,
          sellerProfileUrl: null,
          dateText: dateText,
          isVerified: false,
          isBusiness: false,
          isFeatured: false,
          supportsExchange: false,
          isNegotiable: false,
          category: ctx.categoryLabel,
        });
      }
      return results;
    },

    parseDetail: function(html) {
      var result = { phone: null, sellerName: null, allImages: [] };
      // Phone
      var phoneMatch = html.match(/(?:\+?201|01)[0-25]\d{8}/);
      if (phoneMatch) result.phone = normalizeEgPhone(phoneMatch[0]);

      // Seller name — priority 1: "الوكيل: Name" / "الوكيل / Name" in description text
      // SemsarMasr descriptions frequently include agent name like "الوكيل / احمد جمال"
      var agentPatterns = [
        /الوكيل\s*[\/:\-]\s*([^\n<>\r،,]{2,40})/,
        /لمزيد من التفاصيل[^>]*?(?:الوكيل|بالوكيل)\s*[\/:\-]?\s*([^\n<>\r،,]{2,40})/,
        /(?:صاحب الإعلان|المعلن|اسم المعلن|بواسطة|الناشر)\s*[:：\/\-]?\s*([^\n<>\r،,<>]{2,40})/,
      ];
      // Priority 2: HTML classes (but rejected if it's a generic label)
      var classPatterns = [
        /class="[^"]*(?:OwnerName|ownerName|AdvertName)[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
        /<h3[^>]*class="[^"]*owner[^"]*"[^>]*>\s*([^<]{2,60})\s*<\/h3>/i,
      ];

      // Words/phrases that look like labels, not real names — reject these
      var BAD_NAMES = /^(سمسار|عقارات|مكتب|شركة|وكيل|مالك|معلن|seller|agent|broker|owner|admin|user|سمسار\s*مصر)$/i;

      function tryPatterns(patterns, src) {
        for (var i = 0; i < patterns.length; i++) {
          var m = src.match(patterns[i]);
          if (m && m[1]) {
            var n = m[1].trim()
              .replace(/\s+/g, ' ')
              .replace(/User\s*photo/gi, '')
              .replace(/صورة المستخدم/g, '')
              .replace(/[•\-\.]+$/g, '')
              .trim();
            // Strip trailing ".", numbers, prices, "جنيه", etc.
            n = n.split(/\s*[\.•،,]\s*(?:السعر|شقة|للبيع|جنيه|\d)/)[0].trim();
            if (n.length >= 2 && n.length <= 50 && !/^\d+$/.test(n) && !BAD_NAMES.test(n)) {
              return n;
            }
          }
        }
        return null;
      }

      result.sellerName = tryPatterns(agentPatterns, html) || tryPatterns(classPatterns, html);

      // Images — grab ALL gallery images from the detail page
      var imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
      var seenImgs = {};
      for (var ii = 0; ii < imgMatches.length; ii++) {
        var srcMatch = imgMatches[ii].match(/src=["']([^"']+)["']/i);
        if (!srcMatch) continue;
        var src = srcMatch[1];
        // Filter to images that look like property photos (skip icons, avatars, logos)
        if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(src)) continue;
        if (/icon|logo|avatar|flag|emoji|thumb_sm|small/i.test(src)) continue;
        if (src.indexOf('//') === 0) src = 'https:' + src;
        else if (src.charAt(0) === '/') src = 'https://www.semsarmasr.com' + src;
        if (!seenImgs[src]) {
          seenImgs[src] = 1;
          result.allImages.push(src);
        }
      }
      // Cap at 10 images
      result.allImages = result.allImages.slice(0, 10);

      return result;
    },

    maksabCategory: function() { return 'عقارات'; },
  };

  // ═════════════════════════════════════════════════════════
  //  STAGE 3: Dubizzle
  //  - Next.js site — data in __NEXT_DATA__ script tag
  //  - URL patterns:
  //      /ar/<governorate>/<category>/<subcategory>/      (gov-scoped)
  //      /ar/<category>/<subcategory>/                    (national)
  //  - Pagination: ?page=N
  // ═════════════════════════════════════════════════════════

  // Dubizzle category slug → Arabic label + Maksab category
  var DUBIZZLE_CATS = {
    'vehicles':          { ar: 'مركبات',      mk: 'سيارات' },
    'cars':              { ar: 'سيارات',     mk: 'سيارات' },
    'motorcycles':       { ar: 'موتوسيكلات', mk: 'سيارات' },
    'buses-trucks':      { ar: 'نقل',        mk: 'سيارات' },
    'properties':        { ar: 'عقارات',    mk: 'عقارات' },
    'real-estate':       { ar: 'عقارات',    mk: 'عقارات' },
    'apartments-for-sale':{ ar: 'شقق للبيع', mk: 'عقارات' },
    'apartments-for-rent':{ ar: 'شقق للإيجار', mk: 'عقارات' },
    'villas-for-sale':   { ar: 'فيلات للبيع', mk: 'عقارات' },
    'villas-for-rent':   { ar: 'فيلات للإيجار', mk: 'عقارات' },
    'commercial-for-sale':{ ar: 'تجاري للبيع', mk: 'عقارات' },
    'commercial-for-rent':{ ar: 'تجاري للإيجار', mk: 'عقارات' },
    'land-plots':        { ar: 'أراضي',     mk: 'عقارات' },
    'shops':             { ar: 'محلات',     mk: 'عقارات' },
    'offices':           { ar: 'مكاتب',     mk: 'عقارات' },
  };

  PLATFORMS.dubizzle = {
    id: 'dubizzle',
    displayName: 'دوبيزل',

    match: function(host) { return /dubizzle\.com/i.test(host); },

    detectContext: function(href, doc) {
      var ctx = { valid: false, platform: 'dubizzle' };

      // Strip host + /ar/ prefix, take path segments
      var m = href.match(/dubizzle\.com\.eg(?:\/ar)?\/([^?#]*)/i);
      var segs = m ? m[1].split('/').filter(Boolean) : [];

      // First segment may be a governorate slug; otherwise it's a category.
      var gov = null, rest = segs;
      if (segs.length > 0 && GOV_AR[segs[0]]) {
        gov = segs[0];
        rest = segs.slice(1);
      }

      // rest: [category, subcategory, maybe-brand, ...]
      var category = rest[0] || null;
      var subcategory = rest[1] || null;
      var deepest = subcategory || category;

      ctx.governorate = gov ? GOV_AR[gov] : null;
      ctx.governorateLabel = ctx.governorate || (gov ? gov : 'كل المحافظات');
      ctx.categoryKey = category;
      var catMeta = DUBIZZLE_CATS[deepest || ''] || DUBIZZLE_CATS[category || ''] || null;
      ctx.categoryLabel = catMeta ? catMeta.ar : (deepest || category || null);
      ctx.maksabCat = catMeta ? catMeta.mk : null;

      if (subcategory) {
        if (/for-sale|-sale$/.test(subcategory)) ctx.purpose = 'sale';
        else if (/for-rent|-rent$/.test(subcategory)) ctx.purpose = 'rent';
      }
      ctx.purposeLabel = ctx.purpose === 'sale' ? 'بيع' : ctx.purpose === 'rent' ? 'إيجار' : '—';

      // Validity: must be on a category page (not root homepage)
      ctx.valid = !!category;
      ctx.scopeCode = ctx.valid ? ('dubizzle:' + (gov || 'eg') + ':' + (category || '') + ':' + (subcategory || '')) : null;
      return ctx;
    },

    buildPageUrl: function(ctx, page) {
      var base = ctx.startUrl.split('?')[0].split('#')[0].replace(/\/+$/, '') + '/';
      if (page <= 1) return base;
      return base + '?page=' + page;
    },

    fetchPage: function(url) {
      return fetch(url, {credentials: 'include'})
        .then(function(r){ return r.text(); })
        .then(function(html){
          var doc = new DOMParser().parseFromString(html, 'text/html');
          return { html: html, doc: doc };
        });
    },

    // Extract listings from __NEXT_DATA__ if present, otherwise from HTML DOM.
    parseList: function(html, doc, ctx) {
      var items = [];

      // Strategy 1: __NEXT_DATA__
      var scriptMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        try {
          var data = JSON.parse(scriptMatch[1]);
          var pageProps = (data && data.props && data.props.pageProps) || {};
          var ads = pageProps.ads || pageProps.listings || pageProps.items ||
                    (pageProps.searchResult && pageProps.searchResult.ads) ||
                    (pageProps.results && pageProps.results.ads) || [];
          if (Array.isArray(ads) && ads.length > 0) {
            for (var i = 0; i < ads.length; i++) {
              var a = ads[i];
              var adUrl = a.url || a.canonical_url || a.absolute_url || null;
              if (!adUrl && a.slug) adUrl = 'https://www.dubizzle.com.eg' + (a.slug.charAt(0) === '/' ? a.slug : '/ar/ad/' + a.slug);
              if (!adUrl && a.id) adUrl = 'https://www.dubizzle.com.eg/ar/ad/' + a.id;
              if (!adUrl) continue;
              if (adUrl.charAt(0) === '/') adUrl = 'https://www.dubizzle.com.eg' + adUrl;

              var title = a.name || a.title || a.subject || '';
              if (!title) continue;

              var price = null;
              if (a.price != null) price = parseInt(String(a.price).replace(/[^\d]/g,''), 10) || null;
              else if (a.price_value) price = parseInt(String(a.price_value), 10) || null;

              var img = null;
              if (a.image_url) img = a.image_url;
              else if (a.images && a.images.length > 0) img = typeof a.images[0] === 'string' ? a.images[0] : (a.images[0].url || a.images[0].src);
              else if (a.thumbnail) img = a.thumbnail;

              var user = a.user || a.seller || {};
              var sellerName = user.name || user.display_name || null;
              var sellerProfileUrl = user.id ? ('https://www.dubizzle.com.eg/profile/' + user.id) : null;

              items.push({
                url: adUrl.split('?')[0],
                external_id: String(a.id || a.listing_id || a.slug || ''),
                title: String(title),
                description: a.description || a.subtitle || a.snippet || '',
                price: price,
                thumbnailUrl: img || null,
                location: a.location_name || a.neighborhood || ctx.governorateLabel || '',
                city: (a.city && (a.city.name || a.city)) || ctx.governorateLabel || '',
                area: a.neighborhood || a.area_name || '',
                sellerPhone: null, // not in list — need detail fetch
                sellerName: sellerName,
                sellerProfileUrl: sellerProfileUrl,
                dateText: a.date || a.date_listed || a.created_at || a.display_date || '',
                isVerified: !!(user.is_verified || user.verified),
                isBusiness: !!(user.is_business || user.account_type === 'business'),
                isFeatured: !!(a.is_featured || a.is_promoted),
                supportsExchange: !!a.exchange_enabled,
                isNegotiable: !!(a.is_negotiable || a.negotiable),
                category: ctx.categoryLabel,
              });
            }
            if (items.length > 0) return items;
          }
        } catch (e) { /* fall through */ }
      }

      // Strategy 2: DOM fallback — look for cards with listing links
      var links = doc.querySelectorAll('a[href*="/ar/ad/"], a[href*="/ad/"]');
      var seen = {};
      for (var j = 0; j < links.length; j++) {
        var a2 = links[j];
        var href = a2.getAttribute('href') || '';
        if (!href) continue;
        var full = href.charAt(0) === '/' ? 'https://www.dubizzle.com.eg' + href : href;
        var cleanUrl = full.split('?')[0];
        if (seen[cleanUrl]) continue;
        seen[cleanUrl] = 1;
        var title2 = (a2.getAttribute('title') || a2.textContent || '').trim();
        if (!title2 || title2.length < 5) continue;
        items.push({
          url: cleanUrl,
          title: title2,
          description: '',
          price: null,
          thumbnailUrl: null,
          location: ctx.governorateLabel || '',
          city: ctx.governorateLabel || '',
          area: '',
          sellerPhone: null,
          sellerName: null,
          sellerProfileUrl: null,
          dateText: '',
          isVerified: false,
          isBusiness: false,
          isFeatured: false,
          supportsExchange: false,
          isNegotiable: false,
          category: ctx.categoryLabel,
        });
      }
      return items;
    },

    parseDetail: function(html) {
      var result = { phone: null, sellerName: null };

      // Try __NEXT_DATA__
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          var pageProps = (data && data.props && data.props.pageProps) || {};
          var ad = pageProps.ad || pageProps.listing || pageProps.item || pageProps.data || {};
          var user = ad.user || ad.seller || {};
          if (user.name || user.display_name) {
            result.sellerName = String(user.name || user.display_name).trim().replace(/User\s*photo/gi, '').trim() || null;
          }
          // Phone sometimes appears in hidden fields
          var candidates = [ad.phone, ad.phone_number, ad.contact_phone, user.phone, user.mobile];
          for (var k = 0; k < candidates.length; k++) {
            if (candidates[k]) {
              var p = normalizeEgPhone(candidates[k]);
              if (p) { result.phone = p; break; }
            }
          }
        } catch (e) {}
      }

      // Fallback: regex scan
      if (!result.phone) result.phone = findPhoneInText(html);
      if (!result.sellerName) {
        var pats = [
          /class="[^"]*(?:seller|member|advertiser|user)[\w-]*name[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
          /itemprop=["']name["'][^>]*>\s*([^<]{2,60})\s*</i,
          /"seller"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,60})"/i,
          /"user"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,60})"/i,
        ];
        for (var i = 0; i < pats.length; i++) {
          var mm = html.match(pats[i]);
          if (mm && mm[1]) {
            var n = mm[1].trim().replace(/\s+/g, ' ').replace(/User\s*photo/gi, '').trim();
            if (n.length >= 2 && n.length <= 60 && !/^\d+$/.test(n)) { result.sellerName = n; break; }
          }
        }
      }
      return result;
    },

    maksabCategory: function(ctx) { return ctx.maksabCat || null; },
  };

  // ═════════════════════════════════════════════════════════
  //  STAGE 4: OpenSooq
  //  - Next.js site — data in __NEXT_DATA__
  //  - URL: eg.opensooq.com/ar/<governorate-slug>/<category>/<subcategory>?page=N
  //  - LIST data already includes seller name (member_display_name)
  //  - Phone typically only in detail page
  // ═════════════════════════════════════════════════════════

  // OpenSooq uses slightly different slugs
  var OPENSOOQ_GOV_AR = Object.assign({}, GOV_AR, {
    'alexandria-governorate': 'الإسكندرية',
    'cairo-governorate': 'القاهرة',
    'giza-governorate': 'الجيزة',
  });

  var OPENSOOQ_CATS = {
    'real-estate':            { ar: 'عقارات',      mk: 'عقارات' },
    'apartments-for-sale':    { ar: 'شقق للبيع',   mk: 'عقارات' },
    'apartments-for-rent':    { ar: 'شقق للإيجار', mk: 'عقارات' },
    'villas-for-sale':        { ar: 'فيلات للبيع', mk: 'عقارات' },
    'villas-for-rent':        { ar: 'فيلات للإيجار', mk: 'عقارات' },
    'lands-for-sale':         { ar: 'أراضي',       mk: 'عقارات' },
    'commercial-shops':       { ar: 'محلات تجارية', mk: 'عقارات' },
    'commercial-for-rent':    { ar: 'تجاري للإيجار', mk: 'عقارات' },
    'commercial-for-sale':    { ar: 'تجاري للبيع',  mk: 'عقارات' },
    'cars-for-sale':          { ar: 'سيارات للبيع', mk: 'سيارات' },
    'cars':                   { ar: 'سيارات',      mk: 'سيارات' },
    'motorcycles':            { ar: 'موتوسيكلات',  mk: 'سيارات' },
    'vehicles':               { ar: 'مركبات',      mk: 'سيارات' },
  };

  PLATFORMS.opensooq = {
    id: 'opensooq',
    displayName: 'أوبن سوق',

    match: function(host) { return /opensooq\.com/i.test(host); },

    detectContext: function(href) {
      var ctx = { valid: false, platform: 'opensooq' };
      // URL: eg.opensooq.com/ar/<gov>/<category>[/<subcategory>]
      var m = href.match(/opensooq\.com\/ar\/([^\/?#]+)(?:\/([^\/?#]+))?(?:\/([^\/?#]+))?/i);
      if (!m) { ctx.valid = false; return ctx; }

      var seg1 = m[1], seg2 = m[2], seg3 = m[3];
      var govKey = null, catKey = null, subKey = null;

      // If seg1 matches a governorate, it's gov-scoped
      if (OPENSOOQ_GOV_AR[seg1] || GOV_AR[seg1]) {
        govKey = seg1;
        catKey = seg2;
        subKey = seg3;
      } else {
        catKey = seg1;
        subKey = seg2;
      }

      var deepestKey = subKey || catKey;
      var catMeta = (subKey && OPENSOOQ_CATS[subKey]) || OPENSOOQ_CATS[catKey || ''] || null;

      ctx.governorate = govKey ? (OPENSOOQ_GOV_AR[govKey] || GOV_AR[govKey] || null) : null;
      ctx.governorateLabel = ctx.governorate || 'كل المحافظات';
      ctx.categoryKey = catKey;
      ctx.subcategoryKey = subKey;
      ctx.categoryLabel = catMeta ? catMeta.ar : (deepestKey || '—');
      ctx.maksabCat = catMeta ? catMeta.mk : null;

      if (deepestKey) {
        if (/for-sale|-sale/.test(deepestKey)) ctx.purpose = 'sale';
        else if (/for-rent|-rent/.test(deepestKey)) ctx.purpose = 'rent';
      }
      ctx.purposeLabel = ctx.purpose === 'sale' ? 'بيع' : ctx.purpose === 'rent' ? 'إيجار' : '—';

      ctx.valid = !!catKey;
      ctx.scopeCode = ctx.valid ? ('opensooq:' + (govKey || 'eg') + ':' + (catKey || '') + ':' + (subKey || '')) : null;
      return ctx;
    },

    buildPageUrl: function(ctx, page) {
      var base = ctx.startUrl.split('?')[0].split('#')[0].replace(/\/+$/, '');
      return base + '?page=' + page;
    },

    fetchPage: function(url) {
      return fetch(url, {credentials: 'include'})
        .then(function(r){ return r.text(); })
        .then(function(html){
          var doc = new DOMParser().parseFromString(html, 'text/html');
          return { html: html, doc: doc };
        });
    },

    parseList: function(html, doc, ctx) {
      var items = [];
      var BASE = 'https://eg.opensooq.com';

      // Strategy 1: __NEXT_DATA__
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          // OpenSooq nests search results under various keys — try each
          var arrays = [];
          function collect(obj, depth) {
            if (depth <= 0 || !obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
              // Is this a listings array? Heuristic: at least 3 items with a URL-like field
              if (obj.length >= 3 && obj[0] && typeof obj[0] === 'object'
                  && (obj[0].post_id || obj[0].id || obj[0].post_url || obj[0].slug || obj[0].uri)) {
                arrays.push(obj);
              }
              return;
            }
            for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) collect(obj[k], depth - 1);
          }
          collect(data, 6);

          // Pick the biggest candidate array
          arrays.sort(function(a, b){ return b.length - a.length; });
          var listings = arrays[0] || [];
          var seenUrls = {};

          for (var i = 0; i < listings.length; i++) {
            var it = listings[i];
            var url = null;
            var urlKeys = ['post_url', 'uri', 'url', 'link', 'href', 'detail_url', 'canonical_url', 'seo_url'];
            for (var uk = 0; uk < urlKeys.length; uk++) {
              var v = it[urlKeys[uk]];
              if (v && typeof v === 'string') { url = v.charAt(0) === 'h' ? v : BASE + (v.charAt(0) === '/' ? v : '/' + v); break; }
            }
            if (!url && it.slug) url = BASE + (it.slug.charAt(0) === '/' ? it.slug : '/ar/' + it.slug);
            if (!url && (it.post_id || it.id)) url = BASE + '/ar/post/' + (it.post_id || it.id);
            if (!url) continue;
            var cleanUrl = url.split('?')[0];
            if (seenUrls[cleanUrl]) continue;
            seenUrls[cleanUrl] = 1;

            var title = it.title || it.subject || it.post_title || it.highlights || it.name || '';
            if (!title || String(title).length < 4) continue;

            var price = null;
            if (it.price != null) price = parseInt(String(it.price).replace(/[^\d]/g, ''), 10) || null;

            var img = null;
            if (it.image_url) img = it.image_url;
            else if (it.thumb) img = it.thumb;
            else if (it.images && it.images.length > 0) img = typeof it.images[0] === 'string' ? it.images[0] : (it.images[0].url || it.images[0].src);
            else if (it.cover_image) img = it.cover_image;

            var sellerName = it.member_display_name || it.member_name || it.seller_name
              || (it.member && (it.member.display_name || it.member.name))
              || (it.user && (it.user.display_name || it.user.name))
              || null;
            if (sellerName) sellerName = String(sellerName).trim();

            var sellerProfileUrl = null;
            if (it.member_id) sellerProfileUrl = BASE + '/ar/profile/' + it.member_id;
            else if (it.member && it.member.id) sellerProfileUrl = BASE + '/ar/profile/' + it.member.id;

            items.push({
              url: cleanUrl,
              external_id: String(it.post_id || it.id || ''),
              title: String(title),
              description: it.description || it.short_description || '',
              price: price,
              thumbnailUrl: img || null,
              location: it.city_name || it.location_name || it.neighborhood || ctx.governorateLabel || '',
              city: it.city_name || ctx.governorateLabel || '',
              area: it.neighborhood_name || it.area_name || '',
              sellerPhone: null,
              sellerName: sellerName,
              sellerProfileUrl: sellerProfileUrl,
              dateText: it.post_date || it.date || it.created_at || '',
              isVerified: !!(it.is_verified || (it.member && it.member.is_verified)),
              isBusiness: !!(it.is_business || (it.member && it.member.is_business)),
              isFeatured: !!(it.is_featured || it.featured || it.is_premium),
              supportsExchange: false,
              isNegotiable: !!(it.is_negotiable || it.negotiable),
              category: ctx.categoryLabel,
            });
          }
          if (items.length > 0) return items;
        } catch (e) { /* fall through */ }
      }

      // Strategy 2: DOM fallback
      var links = doc.querySelectorAll('a[href*="/ar/post/"], a[href*="/post/"]');
      var seen = {};
      for (var j = 0; j < links.length; j++) {
        var a = links[j];
        var href = a.getAttribute('href') || '';
        if (!href) continue;
        var full = href.charAt(0) === '/' ? BASE + href : href;
        var clean = full.split('?')[0];
        if (seen[clean]) continue;
        seen[clean] = 1;
        var ttl = (a.getAttribute('title') || a.textContent || '').trim();
        if (!ttl || ttl.length < 5) continue;
        items.push({
          url: clean, title: ttl, description: '', price: null, thumbnailUrl: null,
          location: ctx.governorateLabel || '', city: ctx.governorateLabel || '', area: '',
          sellerPhone: null, sellerName: null, sellerProfileUrl: null, dateText: '',
          isVerified: false, isBusiness: false, isFeatured: false,
          supportsExchange: false, isNegotiable: false,
          category: ctx.categoryLabel,
        });
      }
      return items;
    },

    parseDetail: function(html) {
      var result = { phone: null, sellerName: null };

      // __NEXT_DATA__
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          var pp = (data && data.props && data.props.pageProps) || {};
          var item = pp.post || pp.listing || pp.item || pp.data || pp.ad || {};
          var user = item.user || item.member || item.seller || {};
          if (user.name || user.display_name) {
            result.sellerName = String(user.name || user.display_name).trim() || null;
          }
          var phoneCandidates = [item.phone, item.mobile, item.contact_phone, user.phone, user.mobile];
          for (var k = 0; k < phoneCandidates.length; k++) {
            if (phoneCandidates[k]) {
              var p = normalizeEgPhone(phoneCandidates[k]);
              if (p) { result.phone = p; break; }
            }
          }
        } catch (e) {}
      }

      if (!result.phone) result.phone = findPhoneInText(html);

      if (!result.sellerName) {
        // OpenSooq's owner card has h3 with name
        var own = html.match(/id=["']PostViewOwnerCard["'][\s\S]{0,2000}?<h3[^>]*>([^<]{2,60})<\/h3>/i);
        if (own && own[1]) {
          result.sellerName = own[1].trim().replace(/\s+/g, ' ') || null;
        }
      }
      return result;
    },

    maksabCategory: function(ctx) { return ctx.maksabCat || null; },
  };

  // ═════════════════════════════════════════════════════════
  //  STAGE 5: Aqarmap (عقارماب)
  //  - Next.js SPA — data in __NEXT_DATA__ (pageProps + dehydratedState)
  //  - URL: aqarmap.com.eg/ar/<for-sale|for-rent>/<property-type>/<governorate>[/<city>]
  //  - Pagination: ?page=N
  //  - Real estate only
  // ═════════════════════════════════════════════════════════

  // Aqarmap URL slugs for purpose
  var AQARMAP_PURPOSE = {
    'for-sale': 'sale',
    'for-rent': 'rent',
  };

  // Aqarmap property-type slugs (partial)
  var AQARMAP_PROP_TYPES = {
    'property-type': 'عقارات',
    'apartment': 'شقق',
    'apartments': 'شقق',
    'villa': 'فيلات',
    'villas': 'فيلات',
    'duplex': 'دوبلكس',
    'penthouse': 'بنتهاوس',
    'studio': 'استوديو',
    'townhouse': 'تاون هاوس',
    'twin-house': 'توين هاوس',
    'chalet': 'شاليهات',
    'commercial': 'تجاري',
    'shop': 'محلات',
    'office': 'مكاتب',
    'land': 'أراضي',
    'whole-building': 'عمارة كاملة',
  };

  PLATFORMS.aqarmap = {
    id: 'aqarmap',
    displayName: 'أقارماب',

    match: function(host) { return /aqarmap\.com/i.test(host); },

    detectContext: function(href) {
      var ctx = { valid: false, platform: 'aqarmap' };
      // URL: aqarmap.com.eg/ar/<purpose>/<property-type>/<governorate>[/<city>]
      var m = href.match(/aqarmap\.com\.eg\/ar\/([^\/?#]+)(?:\/([^\/?#]+))?(?:\/([^\/?#]+))?(?:\/([^\/?#]+))?/i);
      if (!m) { ctx.valid = false; return ctx; }

      var seg1 = m[1]; // for-sale | for-rent
      var seg2 = m[2]; // property-type | apartment | villa
      var seg3 = m[3]; // governorate (alexandria | cairo)
      var seg4 = m[4]; // city (optional)

      ctx.purpose = AQARMAP_PURPOSE[seg1] || null;
      ctx.purposeLabel = ctx.purpose === 'sale' ? 'بيع' : ctx.purpose === 'rent' ? 'إيجار' : '—';

      ctx.categoryKey = seg2 || null;
      ctx.categoryLabel = AQARMAP_PROP_TYPES[seg2 || ''] || 'عقارات';

      // Governorate could be in seg3
      var govKey = seg3 || null;
      ctx.governorate = govKey && GOV_AR[govKey] ? GOV_AR[govKey] : null;
      ctx.governorateLabel = ctx.governorate || (govKey || 'كل المحافظات');
      ctx.cityKey = seg4 || null;

      // Must at least have purpose to be valid
      ctx.valid = !!(ctx.purpose);
      ctx.scopeCode = ctx.valid ? ('aqarmap:' + (govKey || 'eg') + ':' + (seg2 || '') + ':' + (ctx.purpose || '')) : null;
      return ctx;
    },

    buildPageUrl: function(ctx, page) {
      var base = ctx.startUrl.split('?')[0].split('#')[0];
      // Ensure trailing slash (aqarmap is picky about it)
      if (base.charAt(base.length - 1) !== '/') base += '/';
      if (page <= 1) return base;
      return base + '?page=' + page;
    },

    fetchPage: function(url) {
      return fetch(url, {credentials: 'include'})
        .then(function(r){ return r.text(); })
        .then(function(html){
          var doc = new DOMParser().parseFromString(html, 'text/html');
          return { html: html, doc: doc };
        });
    },

    // Recursively find listings array in a deeply-nested JSON structure.
    // Aqarmap puts data under pageProps.listings OR pageProps.dehydratedState.queries[N].state.data
    _findListings: function(obj, depth) {
      if (depth > 8 || !obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        if (obj.length >= 3 && obj[0] && typeof obj[0] === 'object'
            && (obj[0].title || obj[0].name || obj[0].id || obj[0].slug || obj[0].url)) {
          return obj;
        }
        for (var i = 0; i < Math.min(obj.length, 20); i++) {
          var r = PLATFORMS.aqarmap._findListings(obj[i], depth + 1);
          if (r) return r;
        }
        return null;
      }
      // Known keys first (fast path)
      var knownKeys = ['listings', 'properties', 'units', 'results', 'items', 'data'];
      for (var ki = 0; ki < knownKeys.length; ki++) {
        var k = knownKeys[ki];
        if (obj[k]) {
          var r2 = PLATFORMS.aqarmap._findListings(obj[k], depth + 1);
          if (r2) return r2;
        }
      }
      // Fall back to all keys
      for (var key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        if (knownKeys.indexOf(key) >= 0) continue;
        var val = obj[key];
        if (val && typeof val === 'object') {
          var r3 = PLATFORMS.aqarmap._findListings(val, depth + 1);
          if (r3) return r3;
        }
      }
      return null;
    },

    parseList: function(html, doc, ctx) {
      var items = [];
      var BASE = 'https://aqarmap.com.eg';

      // Strategy 1: __NEXT_DATA__
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          var listings = PLATFORMS.aqarmap._findListings(data, 0);
          if (listings && listings.length > 0) {
            var seenUrls = {};
            for (var i = 0; i < listings.length; i++) {
              var it = listings[i];
              var title = String(it.title || it.name || '').trim();
              var id = it.id || it.listing_id;
              if (!title && !id) continue;

              var url = '';
              if (it.url) url = String(it.url);
              else if (it.link) url = String(it.link);
              else if (it.slug) url = BASE + '/ar/' + it.slug;
              else if (id) url = BASE + '/ar/listing/' + id;
              if (!url) continue;
              if (url.charAt(0) === '/') url = BASE + url;
              var clean = url.split('?')[0];
              if (seenUrls[clean]) continue;
              seenUrls[clean] = 1;

              // Price (number, string, or nested { value, currency })
              var price = null;
              var rawPrice = it.price != null ? it.price : (it.salePrice != null ? it.salePrice : it.rentPrice);
              if (rawPrice != null) {
                if (typeof rawPrice === 'number') price = rawPrice;
                else if (typeof rawPrice === 'object') price = parseInt(String(rawPrice.value != null ? rawPrice.value : (rawPrice.amount != null ? rawPrice.amount : '')).replace(/[^\d]/g, ''), 10) || null;
                else price = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || null;
              }

              // Location (city + area, possibly nested)
              var cityName = (it.city && it.city.name) || it.cityName || (it.location && it.location.city) || '';
              var areaName = (it.area && it.area.name) || it.neighborhood || it.district || it.areaName || '';
              var location = [areaName, cityName].filter(function(x){ return x; }).join(', ');

              // Thumbnail
              var img = null;
              if (it.photos && it.photos.length > 0) img = typeof it.photos[0] === 'string' ? it.photos[0] : (it.photos[0].url || it.photos[0].file);
              if (!img && it.mainPhoto) img = typeof it.mainPhoto === 'string' ? it.mainPhoto : (it.mainPhoto.url || it.mainPhoto.file);
              if (!img) img = it.image || it.thumbnail || it.coverPhoto || null;

              // Enrich title with space/rooms
              var enriched = title || ('عقار #' + id);
              var space = it.space || it.area_sqm || it.size;
              var rooms = it.rooms || it.bedrooms;
              if (space && enriched.indexOf('م²') < 0) enriched += ' — ' + space + ' م²';
              if (rooms && enriched.indexOf('غرف') < 0) enriched += ' — ' + rooms + ' غرف';

              // Seller
              var sellerName = (it.user && it.user.name) || (it.owner && it.owner.name) || (it.agent && it.agent.name) || null;
              var isAgent = (it.user && (it.user.type === 'broker' || it.user.type === 'agent'))
                || (it.owner && it.owner.type === 'broker')
                || !!it.agent;

              items.push({
                url: clean,
                external_id: String(id || ''),
                title: enriched,
                description: it.description || '',
                price: price,
                thumbnailUrl: img ? String(img) : null,
                location: location || ctx.governorateLabel || '',
                city: cityName || ctx.governorateLabel || '',
                area: areaName || '',
                sellerPhone: null,
                sellerName: sellerName ? String(sellerName).trim() : null,
                sellerProfileUrl: null,
                dateText: String(it.created_at || it.createdAt || it.publishedAt || it.date || ''),
                isVerified: !!(it.isVerified || it.is_verified || it.verified || (it.user && it.user.isVerified)),
                isBusiness: isAgent || !!(it.is_broker || it.isBroker || it.is_company),
                isFeatured: !!(it.isFeatured || it.is_featured || it.featured || it.isPremium),
                supportsExchange: false,
                isNegotiable: !!(it.isNegotiable || it.is_negotiable || it.negotiable),
                category: ctx.categoryLabel,
              });
            }
            if (items.length > 0) return items;
          }
        } catch (e) { /* fall through */ }
      }

      // Strategy 2: JSON-LD ItemList
      var ldMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
      for (var li = 0; li < ldMatches.length; li++) {
        var innerMatch = ldMatches[li].match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (!innerMatch) continue;
        try {
          var ld = JSON.parse(innerMatch[1]);
          if (ld && ld['@type'] === 'ItemList' && Array.isArray(ld.itemListElement)) {
            for (var lj = 0; lj < ld.itemListElement.length; lj++) {
              var el = ld.itemListElement[lj];
              var item = el.item || el;
              if (!item || !item.url) continue;
              items.push({
                url: String(item.url).split('?')[0],
                title: String(item.name || ''),
                description: item.description || '',
                price: item.offers && item.offers.price ? parseInt(String(item.offers.price).replace(/[^\d]/g, ''), 10) : null,
                thumbnailUrl: item.image || null,
                location: ctx.governorateLabel || '',
                city: ctx.governorateLabel || '',
                area: '',
                sellerPhone: null,
                sellerName: null,
                sellerProfileUrl: null,
                dateText: '',
                isVerified: false,
                isBusiness: false,
                isFeatured: false,
                supportsExchange: false,
                isNegotiable: false,
                category: ctx.categoryLabel,
              });
            }
            if (items.length > 0) return items;
          }
        } catch (e) { /* skip */ }
      }

      return items;
    },

    parseDetail: function(html) {
      var result = { phone: null, sellerName: null };

      // __NEXT_DATA__
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          var pp = (data && data.props && data.props.pageProps) || {};
          var listing = pp.listing || pp.property || pp.unit || pp;
          var user = listing.user || listing.owner || listing.agent || listing.seller || {};
          if (user.name || user.display_name) {
            result.sellerName = String(user.name || user.display_name).trim() || null;
          }
          // Phone candidates (aqarmap sometimes has in user object)
          var cand = [listing.phone, listing.mobile, user.phone, user.mobile, user.contact_phone];
          for (var ci = 0; ci < cand.length; ci++) {
            if (cand[ci]) {
              var p = normalizeEgPhone(cand[ci]);
              if (p) { result.phone = p; break; }
            }
          }
        } catch (e) {}
      }

      // Fallback: regex scan
      if (!result.phone) result.phone = findPhoneInText(html);
      if (!result.sellerName) {
        var pats = [
          /class="[^"]*(?:owner|seller|agent|broker|user)[\w-]*name[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
          /itemprop=["']name["'][^>]*>\s*([^<]{2,60})\s*</i,
          /"name"\s*:\s*"([^"]{2,60})"/i,
        ];
        for (var i = 0; i < pats.length; i++) {
          var mm = html.match(pats[i]);
          if (mm && mm[1]) {
            var n = mm[1].trim().replace(/\s+/g, ' ');
            if (n.length >= 2 && n.length <= 60 && !/^\d+$/.test(n)) { result.sellerName = n; break; }
          }
        }
      }
      return result;
    },

    maksabCategory: function() { return 'عقارات'; },
  };

  // Run after all stages are defined
  run();
})();
