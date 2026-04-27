// Maksab Unified Harvester v12 — dubizzle + semsarmasr + opensooq + aqarmap
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
  // Optional cap — when set, harvest stops after collecting this many items.
  // Used by the install page's "test mode" to limit runs to e.g. 10 listings.
  var MAX_ITEMS = window.__MAKSAB_LIMIT ? parseInt(window.__MAKSAB_LIMIT, 10) : 0;

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
    '0':  null, // "all Egypt" — no specific governorate
    '979': 'الإسكندرية',
    '981': 'القاهرة',
    '980': 'الجيزة',
    '1002': 'الساحل الشمالي',
    '982': 'الدقهلية',
    '984': 'الشرقية',
    '985': 'القليوبية',
    '983': 'الغربية',
    '988': 'المنوفية',
    '989': 'البحيرة',
    '986': 'كفر الشيخ',
    '987': 'دمياط',
    '990': 'بورسعيد',
    '991': 'الإسماعيلية',
    '992': 'السويس',
    '993': 'مطروح',
    '994': 'شمال سيناء',
    '995': 'جنوب سيناء',
    '996': 'البحر الأحمر',
    '997': 'الوادي الجديد',
    '998': 'أسيوط',
    '999': 'أسوان',
    '1000': 'الأقصر',
    '1001': 'سوهاج',
    '1003': 'قنا',
    '1004': 'بني سويف',
    '1005': 'الفيوم',
    '1006': 'المنيا',
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
  //  Logged-in user detection (to block their info from seller extraction)
  //  Runs ONCE at harvest start against the CURRENT document, captures any
  //  name/phone that belongs to the user running the bookmarklet. All
  //  platform parseDetail() calls then reject these values.
  // ═════════════════════════════════════════════════════════

  var BLOCKED_USER = { name: null, phone: null };

  // ═════════════════════════════════════════════════════════
  //  OpenSooq JWT capture
  //  OpenSooq's phone-reveal endpoint requires a JWT Bearer token in
  //  the Authorization header. The token is short-lived (~6 min) and
  //  not stored in localStorage/sessionStorage — it lives in React
  //  memory and is regenerated on the fly. We hook window.fetch on
  //  the OpenSooq origin to capture it when OpenSooq's own code makes
  //  ANY Bearer-authenticated call (analytics, suggestions, reveal).
  //
  //  Then _revealPhonesViaApi(items) replays the same Bearer token
  //  against /api/account/reveal/v3/member-phone with each item's
  //  phone_reveal_key — getting back the unmasked phone.
  // ═════════════════════════════════════════════════════════

  var OPENSOOQ_JWT = null;
  if (typeof window !== 'undefined' && /opensooq\.com/i.test(location.host)) {
    try {
      // Hook fetch
      var _origFetchOS = window.fetch;
      window.fetch = function(url, opts) {
        try {
          var h = (opts && opts.headers) || {};
          var a = h.Authorization || h.authorization
            || (typeof h.get === 'function' && h.get('authorization'))
            || '';
          if (!OPENSOOQ_JWT && String(a).indexOf('Bearer eyJ') === 0) {
            OPENSOOQ_JWT = String(a);
            console.info('[maksab/opensooq] captured JWT via fetch (', String(a).substring(0, 30), '…)');
          }
        } catch (e) { /* ignore */ }
        return _origFetchOS.apply(this, arguments);
      };

      // Hook XMLHttpRequest too — some apps use the older API for some endpoints.
      var _origXhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
        try {
          if (!OPENSOOQ_JWT && /^authorization$/i.test(name)
              && String(value).indexOf('Bearer eyJ') === 0) {
            OPENSOOQ_JWT = String(value);
            console.info('[maksab/opensooq] captured JWT via XHR (', String(value).substring(0, 30), '…)');
          }
        } catch (e) { /* ignore */ }
        return _origXhrSetHeader.apply(this, arguments);
      };
    } catch (e) {
      console.warn('[maksab/opensooq] auth-hook setup failed:', e && e.message);
    }
  }

  function detectLoggedInUser() {
    var captured = { name: null, phone: null };

    // 1. Try __NEXT_DATA__ in the CURRENT page (list page DOM)
    try {
      var nd = document.querySelector('script#__NEXT_DATA__');
      if (nd && nd.textContent) {
        var data = JSON.parse(nd.textContent);
        var props = (data && data.props && data.props.pageProps) || {};
        var candidates = [props.user, props.currentUser, props.loggedInUser,
                         props.session && props.session.user,
                         props.auth && props.auth.user,
                         props.userProfile];
        for (var i = 0; i < candidates.length; i++) {
          var c = candidates[i];
          if (c && typeof c === 'object') {
            if (!captured.name) captured.name = (c.name || c.display_name || c.full_name || '').trim() || null;
            if (!captured.phone) {
              var raw = c.phone || c.mobile || c.phone_number;
              if (raw) captured.phone = normalizeEgPhone(raw);
            }
          }
        }

        // 1b. Deep walk: if still no phone, recursively scan __NEXT_DATA__
        // for any object under a "user/member/profile/me" parent key that
        // contains a phone-shaped value. OpenSooq buries it under varying
        // paths between releases.
        if (!captured.phone) {
          (function deepWalk(obj, parentKey, depth) {
            if (depth > 6 || !obj || typeof obj !== 'object' || captured.phone) return;
            if (Array.isArray(obj)) {
              for (var ai = 0; ai < Math.min(obj.length, 20); ai++) deepWalk(obj[ai], parentKey, depth + 1);
              return;
            }
            var underUserKey = /(^|[._-])(user|member|profile|account|me|loggedIn|auth|session|currentUser)([._-]|$)/i.test(parentKey);
            if (underUserKey) {
              var ph = obj.phone || obj.mobile || obj.phone_number || obj.contactNumber;
              if (ph) {
                var norm = normalizeEgPhone(ph);
                if (norm) { captured.phone = norm; return; }
              }
              if (!captured.name) {
                var nm = obj.name || obj.display_name || obj.full_name || obj.user_name;
                if (nm) captured.name = String(nm).trim() || null;
              }
            }
            for (var k in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, k)) deepWalk(obj[k], k, depth + 1);
            }
          })(props, 'pageProps', 0);
        }
      }
    } catch (e) { /* ignore */ }

    // 2. Scan header / nav / account DOM nodes for any phone pattern
    try {
      var scanSelectors = [
        'header', 'nav',
        '[class*="user-menu"]', '[class*="UserMenu"]',
        '[class*="profile"]', '[class*="Profile"]',
        '[class*="account"]', '[class*="Account"]',
        '[class*="header-user"]', '[class*="my-account"]',
        '[data-testid*="user"]', '[data-testid*="profile"]',
      ];
      var nodes = document.querySelectorAll(scanSelectors.join(','));
      for (var ni = 0; ni < nodes.length; ni++) {
        var text = nodes[ni].textContent || '';
        if (!captured.phone) {
          var pm = text.match(/01[0-25]\d{8}/);
          if (pm) captured.phone = normalizeEgPhone(pm[0]);
        }
      }
    } catch (e) { /* ignore */ }

    // 3. Meta tags — some sites embed user info in <meta name="user-*">
    if (!captured.phone) {
      try {
        var metaTags = document.querySelectorAll('meta[name*="user"], meta[property*="user"]');
        for (var mi = 0; mi < metaTags.length; mi++) {
          var content = metaTags[mi].getAttribute('content') || '';
          var mpm = content.match(/01[0-25]\d{8}/);
          if (mpm) { captured.phone = normalizeEgPhone(mpm[0]); break; }
        }
      } catch (e) { /* ignore */ }
    }

    // 4. localStorage — user can pre-set it via the install page or via
    // the prompt fallback below (persists across sessions per browser).
    if (!captured.phone) {
      try {
        var savedPhone = localStorage.getItem('maksab_self_phone');
        if (savedPhone) {
          var sp = normalizeEgPhone(savedPhone);
          if (sp) captured.phone = sp;
        }
      } catch (e) { /* ignore */ }
    }

    var isOpenSooqHost = /opensooq/i.test(location.host);

    // 5. OpenSooq-only: frequency scan. OpenSooq renders the logged-in
    // user's phone in multiple places (account dropdown, "My ads" sidebar)
    // while other sellers' phones on the list page are masked
    // ("010029285**XX**"), so the 11-digit regex won't match them. The
    // user's own phone wins by frequency. Required: ≥ 2 occurrences —
    // a single match is unreliable (could be a featured listing's
    // unmasked phone leaking into the page).
    //
    // Restricted to OpenSooq because on other platforms (Dubizzle,
    // AqarMap, semsarmasr) seller phones are NOT masked, so a frequent
    // phone might be a popular agent's number rather than the user's.
    if (!captured.phone && isOpenSooqHost) {
      try {
        var bodyText = (document.body && document.body.textContent) || '';
        var phoneCounts = {};
        var matchAll = bodyText.match(/01[0-25]\d{8}/g) || [];
        for (var pi = 0; pi < matchAll.length; pi++) {
          var pn = matchAll[pi];
          phoneCounts[pn] = (phoneCounts[pn] || 0) + 1;
        }
        var topPhone = null, topCount = 0;
        for (var pk in phoneCounts) {
          if (phoneCounts[pk] > topCount) { topPhone = pk; topCount = phoneCounts[pk]; }
        }
        if (topPhone && topCount >= 2) {
          captured.phone = normalizeEgPhone(topPhone);
        }
      } catch (e) { /* ignore */ }
    }

    // 6. Last-ditch: explicitly ask the user. Only on OpenSooq (other
    // platforms expose seller phones unmasked, so missing the user's
    // own phone is harmless — at worst we'd hand back the user's own
    // listing as a candidate).
    if (!captured.phone && isOpenSooqHost) {
      try {
        var ans = prompt(
          'مكسب: ادخل رقم موبايلك المسجّل على OpenSooq\n' +
          '(عشان نستبعده من أرقام البائعين)\n\n' +
          'سيتم حفظه محلياً للجلسات القادمة. اتركه فارغاً لو مش مسجل دخول.',
          ''
        );
        if (ans) {
          var ap = normalizeEgPhone(ans);
          if (ap) {
            captured.phone = ap;
            try { localStorage.setItem('maksab_self_phone', ap); } catch (_) {}
          }
        }
      } catch (e) { /* user dismissed prompt */ }
    }

    return captured;
  }

  // ═════════════════════════════════════════════════════════
  //  Governorate inference from listing locations
  //  (used when the source URL doesn't specify a single governorate,
  //   e.g. SemsarMasr with g=0 = "all Egypt")
  // ═════════════════════════════════════════════════════════

  var GOV_AR_VALUES = [
    'الإسكندرية', 'الاسكندرية',
    'القاهرة', 'الجيزة', 'الدقهلية', 'الشرقية', 'القليوبية',
    'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط',
    'بورسعيد', 'الإسماعيلية', 'السويس', 'مطروح',
    'شمال سيناء', 'جنوب سيناء', 'البحر الأحمر', 'الوادي الجديد',
    'أسيوط', 'أسوان', 'الأقصر', 'سوهاج', 'قنا',
    'بني سويف', 'الفيوم', 'المنيا',
  ];

  // Slug-based governorate hints (English or transliterated Arabic) that should
  // map to the canonical Arabic name when found inside listing text or URL.
  var GOV_EN_TO_AR = {
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

  function inferGovernorateFromItems(items) {
    var counts = {};
    for (var i = 0; i < items.length; i++) {
      var haystack = (
        (items[i].location || '') + ' ' +
        (items[i].city || '') + ' ' +
        (items[i].area || '') + ' ' +
        (items[i].url || '') + ' ' +
        (items[i].title || '')
      );
      var lower = haystack.toLowerCase();

      // Pass 1: Arabic names
      for (var g = 0; g < GOV_AR_VALUES.length; g++) {
        if (haystack.indexOf(GOV_AR_VALUES[g]) >= 0) {
          var canonical = GOV_AR_VALUES[g] === 'الاسكندرية' ? 'الإسكندرية' : GOV_AR_VALUES[g];
          counts[canonical] = (counts[canonical] || 0) + 1;
        }
      }
      // Pass 2: English slugs (Dubizzle uses these)
      for (var en in GOV_EN_TO_AR) {
        if (Object.prototype.hasOwnProperty.call(GOV_EN_TO_AR, en) && lower.indexOf(en) >= 0) {
          var canon = GOV_EN_TO_AR[en];
          counts[canon] = (counts[canon] || 0) + 1;
        }
      }
    }
    var best = null, bestCount = 0;
    for (var k in counts) if (counts[k] > bestCount) { best = k; bestCount = counts[k]; }
    return best;
  }

  // ═════════════════════════════════════════════════════════
  //  Smart page-content detection (universal fallback)
  //  Used when URL params don't tell us what's on the page.
  //  Reads <h1>, <title>, and breadcrumbs to infer:
  //    - Category (عقارات / سيارات)
  //    - Governorate (one of 27 Egyptian governorates)
  // ═════════════════════════════════════════════════════════

  // Keywords that strongly indicate category. Order matters — more specific first.
  var CATEGORY_KEYWORDS_AR = {
    'عقارات': ['شقق', 'شقة', 'فيلا', 'فلل', 'دوبلكس', 'بنتهاوس', 'شاليه',
               'عقار', 'أراضي', 'أرض', 'محل', 'محلات', 'مكتب', 'مكاتب',
               'مبانى', 'مباني', 'عمارة', 'عمارات', 'كمبوند', 'وحدة سكنية',
               'إيجار', 'تمليك', 'للبيع', 'للإيجار', 'apartment', 'villa', 'property'],
    'سيارات': ['سيارة', 'سيارات', 'موتوسيكل', 'موتوسيكلات', 'دراجة نارية',
               'نقل', 'ميكروباص', 'ماركة', 'موديل', 'كيلومترات',
               'car', 'vehicle', 'motorcycle', 'toyota', 'hyundai'],
  };

  function getPageText(doc) {
    var h1 = doc && doc.querySelector ? doc.querySelector('h1') : null;
    var h2 = doc && doc.querySelector ? doc.querySelector('h2') : null;
    var title = (doc && doc.title) || document.title || '';
    var breadcrumb = doc && doc.querySelector ? (doc.querySelector('.breadcrumb, .breadcrumbs, [class*="bread"]') || null) : null;
    return [
      h1 ? (h1.textContent || '') : '',
      h2 ? (h2.textContent || '') : '',
      title,
      breadcrumb ? (breadcrumb.textContent || '') : '',
    ].join(' ').toLowerCase();
  }

  function detectCategoryFromPage(doc) {
    var text = getPageText(doc);
    for (var cat in CATEGORY_KEYWORDS_AR) {
      if (!Object.prototype.hasOwnProperty.call(CATEGORY_KEYWORDS_AR, cat)) continue;
      var kws = CATEGORY_KEYWORDS_AR[cat];
      for (var i = 0; i < kws.length; i++) {
        if (text.indexOf(kws[i].toLowerCase()) >= 0) return cat;
      }
    }
    return null;
  }

  function detectGovernorateFromPage(doc) {
    var text = getPageText(doc);
    for (var i = 0; i < GOV_AR_VALUES.length; i++) {
      if (text.indexOf(GOV_AR_VALUES[i]) >= 0) {
        return GOV_AR_VALUES[i] === 'الاسكندرية' ? 'الإسكندرية' : GOV_AR_VALUES[i];
      }
    }
    // English slugs on URL page title
    var englishMap = {
      'alexandria': 'الإسكندرية', 'cairo': 'القاهرة', 'giza': 'الجيزة',
      'dakahlia': 'الدقهلية', 'sharqia': 'الشرقية', 'monufia': 'المنوفية',
    };
    for (var slug in englishMap) {
      if (text.indexOf(slug) >= 0) return englishMap[slug];
    }
    return null;
  }

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

    function badge(text, fromPage) {
      if (!text || text === '—') return '<span style="opacity:0.6;">—</span>';
      var marker = fromPage ? ' <span style="color:#A5D6A7;font-size:10px;">• من الصفحة</span>' : '';
      return '<b>' + text + '</b>' + marker;
    }

    var blockedInfo = '';
    if (BLOCKED_USER.name || BLOCKED_USER.phone) {
      blockedInfo = '<div style="margin-top:8px;padding:6px 10px;background:rgba(255,193,7,0.15);border:1px solid rgba(255,193,7,0.35);border-radius:8px;font-size:11px;line-height:1.6;">'
        + '🛡️ <b>حسابك تم اكتشافه وهيتم استبعاده:</b><br>'
        + (BLOCKED_USER.name ? 'الاسم: ' + BLOCKED_USER.name + '<br>' : '')
        + (BLOCKED_USER.phone ? 'الموبايل: ' + BLOCKED_USER.phone : '')
        + '</div>';
    }

    function html() {
      return ''
        + '<div style="font-size:16px;font-weight:700;margin-bottom:12px;">🏗️ مكسب — الحصاد الموحّد</div>'
        + '<div style="background:rgba(0,0,0,0.15);padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.9;">'
        + '  <div>🌐 <b>المنصة:</b> ' + platform.displayName + '</div>'
        + '  <div>📍 <b>المحافظة:</b> ' + badge(ctx.governorateLabel, ctx._govFromPage) + '</div>'
        + '  <div>🏷️ <b>القسم:</b> ' + badge(ctx.categoryLabel, ctx._catFromPage) + '</div>'
        + '  <div>🏦 <b>نوع البيع:</b> ' + (ctx.purposeLabel || '—') + '</div>'
        + '  <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.15);font-size:11px;opacity:0.85;">'
        + '    💡 الكشف بيحاول من URL أول. لو المحافظة/القسم غلط، اخرج واختار الفلتر الصحيح من السيت.'
        + '  </div>'
        + '</div>'
        + blockedInfo
        + (prevCount > 0
            ? ('<div style="margin-top:8px;font-size:11px;background:rgba(0,0,0,0.1);padding:6px 10px;border-radius:8px;">'
               + 'ملاحظة: ' + prevCount + ' URL محفوظ من جلسات سابقة. '
               + '<a href="#" id="mk-clear" style="color:#FFE082;text-decoration:underline;">مسح cache</a>'
               + '</div>')
            : '')
        + '<div style="margin-top:12px;font-size:13px;">'
        + (ctx.valid
            ? ('سيبدأ الحصاد خلال <b>' + countdown + '</b> ثانية...')
            : '<span style="color:#FFE082;">⚠️ مش قادر أكتشف القسم من الصفحة. افتح صفحة فيها قائمة إعلانات.</span>')
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
      var limitReached = MAX_ITEMS > 0 && allItems.length >= MAX_ITEMS;
      if (page > MAX_PAGES || emptyStreak >= 3 || archiveReached || limitReached) {
        // Update store with everything we collected this run
        var mergedUrls = {};
        for (var u in prevSeenUrls) mergedUrls[u] = prevSeenUrls[u];
        for (var u2 in seenInThisRun) mergedUrls[u2] = 1;
        saveStore(platform.id, { urls: mergedUrls });
        // If we hit the test limit, trim to exactly MAX_ITEMS
        if (limitReached && allItems.length > MAX_ITEMS) allItems = allItems.slice(0, MAX_ITEMS);
        return onDone(allItems, mergedUrls);
      }

      renderProgress(ui, '🔍 <b>' + platform.displayName + '</b> — صفحة ' + page
        + '<br>وُجد حتى الآن: <b>' + allItems.length + '</b>'
        + (MAX_ITEMS > 0 ? ' / ' + MAX_ITEMS + ' (وضع اختبار)' : '')
        + (prevCount > 0 ? '<br><span style="opacity:0.7;font-size:11px;">(جلسات سابقة: ' + prevCount + ')</span>' : ''));

      var url = platform.buildPageUrl(ctx, page);

      // For page 1: use the LIVE document when the constructed URL matches
      // what the user is already looking at. Many modern listing sites
      // (Dubizzle/OLX, OpenSooq) hydrate data client-side — fetch() returns
      // a skeleton HTML without prices. The live document has everything.
      var pagePromise;
      if (page === 1 && (url === ctx.startUrl || url.split('?')[0] === ctx.startUrl.split('?')[0])) {
        pagePromise = Promise.resolve({
          html: document.documentElement.outerHTML,
          doc: document,
        });
      } else {
        pagePromise = platform.fetchPage(url);
      }
      pagePromise.then(function(res) {
        var items = platform.parseList(res.html, res.doc, ctx) || [];
        var fresh = 0, stale = 0, newOnPage = 0;

        for (var i = 0; i < items.length; i++) {
          // Respect test-mode cap
          if (MAX_ITEMS > 0 && allItems.length >= MAX_ITEMS) break;
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

  // ═════════════════════════════════════════════════════════
  //  Dubizzle phone reveal — calls /api/listing/{id}/contactInfo/
  //  with user's browser cookies (credentials: 'include').
  //  Spaced by random 5–12 second delays so Dubizzle doesn't flag
  //  the session. Hard cap of 50 reveals per run for safety.
  // ═════════════════════════════════════════════════════════

  var DUBIZZLE_REVEAL_CFG = {
    CONCURRENT: 3,          // parallel requests (3 at a time)
    INTER_BATCH_MS: 400,    // short pause between parallel batches
    MAX_REVEALS_PER_RUN: 100, // safety cap
    STOP_ON_ERRORS: 3,      // stop if 3 consecutive fetches fail
  };

  function extractDubizzleListingId(url) {
    if (!url) return null;
    // URL pattern: /ad/<slug>-ID<digits>.html
    var m = url.match(/ID(\d{6,})\.html/i);
    if (m) return m[1];
    // Fallback: any long digit run
    var m2 = url.match(/\/(\d{6,})(?:\/|\b)/);
    return m2 ? m2[1] : null;
  }

  function fetchDubizzleContactInfo(listingId) {
    var url = 'https://www.dubizzle.com.eg/api/listing/' + listingId + '/contactInfo/';
    return fetch(url, {
      credentials: 'include',
      headers: {
        'accept': 'application/json',
        'accept-language': 'ar',
        'x-requested-with': 'XMLHttpRequest',
      },
    }).then(function(r) {
      if (!r.ok) return { _error: r.status };
      return r.json().catch(function() { return { _error: 'parse' }; });
    }).catch(function(e) {
      return { _error: String(e) };
    });
  }

  function extractPhoneFromContactInfo(data) {
    if (!data || data._error) return null;
    // Try common top-level paths
    var candidates = [
      data.phone, data.mobile, data.phone_number, data.contactNumber,
      data.phoneNumber, data.mobileNumber,
      data.data && (data.data.phone || data.data.mobile),
      data.result && (data.result.phone || data.result.mobile),
      data.contact && (data.contact.phone || data.contact.mobile),
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i]) {
        var n = normalizeEgPhone(candidates[i]);
        if (n) return n;
      }
    }
    // Last resort: stringify and regex scan the whole response
    try {
      var asStr = JSON.stringify(data);
      var m = asStr.match(/(?:\+?201|01)[0-25]\d{8}/);
      if (m) return normalizeEgPhone(m[0]);
    } catch (e) {}
    return null;
  }

  function revealDubizzlePhones(items, ui) {
    var needing = [];
    for (var i = 0; i < items.length; i++) {
      if (!items[i].sellerPhone) needing.push(items[i]);
    }
    if (needing.length === 0) return Promise.resolve();

    var cap = Math.min(needing.length, DUBIZZLE_REVEAL_CFG.MAX_REVEALS_PER_RUN);
    var queue = needing.slice(0, cap);
    var done = 0, revealed = 0, consecutiveErrors = 0, stopped = false;

    function revealOne(it) {
      var id = extractDubizzleListingId(it.url);
      if (!id) { done++; return Promise.resolve(); }
      return fetchDubizzleContactInfo(id).then(function(data) {
        if (data && data._error) {
          consecutiveErrors++;
          done++;
          return;
        }
        consecutiveErrors = 0;
        var phone = extractPhoneFromContactInfo(data);
        if (phone && phone !== BLOCKED_USER.phone) {
          it.sellerPhone = phone;
          revealed++;
        }
        done++;
      });
    }

    return new Promise(function(resolve) {
      function nextBatch() {
        if (stopped) return resolve();
        if (queue.length === 0) return resolve();
        if (consecutiveErrors >= DUBIZZLE_REVEAL_CFG.STOP_ON_ERRORS) {
          stopped = true;
          renderProgress(ui, '⚠️ توقف كشف أرقام دوبيزل<br>' + consecutiveErrors + ' أخطاء متتالية — كشفت: <b>' + revealed + '</b>');
          return resolve();
        }

        renderProgress(ui, '📞 كشف أرقام دوبيزل: <b>' + done + '/' + cap + '</b>'
          + ' (كشفت: ' + revealed + ')');

        var batch = queue.splice(0, DUBIZZLE_REVEAL_CFG.CONCURRENT);
        Promise.all(batch.map(revealOne)).then(function() {
          setTimeout(nextBatch, DUBIZZLE_REVEAL_CFG.INTER_BATCH_MS);
        });
      }
      nextBatch();
    });
  }

  function fetchDetailsBatch(platform, items, ui) {
    var total = items.filter(function(it){ return !it.sellerPhone || !it.sellerName; }).length;
    var done = 0;
    var idx = 0;

    // OpenSooq rate-limits phone reveals per session; reduce concurrency
    // and add retries with backoff to lift the success rate.
    var isOpenSooq = platform.id === 'opensooq';
    var concurrent = isOpenSooq ? 2 : CONCURRENT;
    var maxAttempts = isOpenSooq ? 3 : 1;             // 1 initial + 2 retries
    var retryDelays = [1500, 3000];                    // ms before retry 1 and 2

    function update() {
      renderProgress(ui, '📞 جلب الأرقام والأسماء: <b>' + done + '/' + total + '</b><br>إجمالي: ' + items.length);
    }

    function fetchAndParseOnce(it) {
      // Fresh cache-buster every attempt — important for OpenSooq which
      // serves identical responses for repeat fetches in the same window.
      var cacheBuster = '_t=' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      var url = it.url + (it.url.indexOf('?') >= 0 ? '&' : '?') + cacheBuster;
      return platform.fetchPage(url).then(function(res){
        return platform.parseDetail(res.html, res.doc) || {};
      });
    }

    function delay(ms) {
      return new Promise(function(r){ setTimeout(r, ms); });
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

        function attempt(n) {
          return fetchAndParseOnce(it).then(function(detail){
            if (detail.phone && !it.sellerPhone) it.sellerPhone = detail.phone;
            if (detail.sellerName && !it.sellerName) it.sellerName = detail.sellerName;
            if (detail.allImages && detail.allImages.length > 0) {
              it.allImages = detail.allImages;
              if (!it.thumbnailUrl) it.thumbnailUrl = detail.allImages[0];
            }
            if (detail.specs && Object.keys(detail.specs).length > 0) it.specs = detail.specs;
            if (detail.amenities && detail.amenities.length > 0) it.amenities = detail.amenities;
            if (detail.sellerBadge && !it.sellerBadge) it.sellerBadge = detail.sellerBadge;
            if (detail.price && !it.price) it.price = detail.price;

            // Only retry if we still don't have a phone AND we're on a
            // platform that benefits from retries (currently OpenSooq).
            if (!it.sellerPhone && n + 1 < maxAttempts) {
              return delay(retryDelays[n] || 3000).then(function(){ return attempt(n + 1); });
            }
          }).catch(function(err){
            // Permanent failures (4xx — listing deleted/forbidden) — don't retry.
            if (err && err.permanent) return;
            // Network/parse error — retry with backoff if attempts remain.
            if (n + 1 < maxAttempts) {
              return delay(retryDelays[n] || 3000).then(function(){ return attempt(n + 1); });
            }
          });
        }

        return attempt(0).then(function(){ done++; update(); })
                        .catch(function(){ done++; update(); });
      }

      function drain() {
        var inFlight = [];
        while (inFlight.length < concurrent && idx < items.length) {
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
    // When the URL doesn't specify a single governorate (g=0 / all-Egypt),
    // infer it from the majority of the listing locations.
    var inferredGov = ctx.governorate ||
      (items.length > 0 ? inferGovernorateFromItems(items) : null);
    var inferredGovLabel = (ctx.governorateLabel && ctx.governorateLabel !== 'كل المحافظات')
      ? ctx.governorateLabel
      : inferredGov;

    var payload = {
      url: ctx.startUrl,
      listings: items,
      timestamp: new Date().toISOString(),
      source: 'bookmarklet-v11-unified',
      platform: platform.id,
      scope_code: ctx.scopeCode || null,
      meta: {
        governorate: inferredGov,
        governorate_label: inferredGovLabel,
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

    // Detect the logged-in user ONCE from the current tab, so we can exclude
    // them from seller extraction on every subsequent fetched detail page.
    BLOCKED_USER = detectLoggedInUser();
    if (BLOCKED_USER.name || BLOCKED_USER.phone) {
      console.info('[maksab] logged-in user detected (will be excluded):',
        BLOCKED_USER.name, BLOCKED_USER.phone);
    }

    var ctx = platform.detectContext(location.href, document);
    ctx.startUrl = location.href;

    // Smart enhancement: fill detection blanks from actual page content.
    // This makes the bookmarklet work on any URL shape — URL params are just
    // hints; the page content is the source of truth.
    if (!ctx.governorate || !ctx.governorateLabel || ctx.governorateLabel === '—' || ctx.governorateLabel === 'كل المحافظات') {
      var pageGov = detectGovernorateFromPage(document);
      if (pageGov) {
        ctx.governorate = pageGov;
        ctx.governorateLabel = pageGov;
        ctx._govFromPage = true;
      }
    }
    if (!ctx.maksabCat || (platform.id !== 'semsarmasr' && platform.id !== 'aqarmap' && !ctx.categoryLabel)) {
      var pageCat = detectCategoryFromPage(document);
      if (pageCat) {
        ctx.maksabCat = pageCat;
        if (!ctx.categoryLabel || ctx.categoryLabel === '—') ctx.categoryLabel = pageCat;
        ctx._catFromPage = true;
      }
    }
    // Always mark valid if we have at least a category (even inferred)
    if (!ctx.valid && (ctx.maksabCat || ctx.categoryLabel)) {
      ctx.valid = true;
    }

    renderReady(ui, ctx, platform, function onStart(){
      if (!ctx.valid) { ui.close(); return; }
      harvestAllPages(platform, ctx, ui, function(items){
        if (items.length === 0) {
          renderDone(ui, {total: 0, withPhone: 0, withName: 0, newCount: 0, dupCount: 0});
          return;
        }
        fetchDetailsBatch(platform, items, ui).then(function(){
          // Dubizzle-only: after detail pages are fetched, attempt to reveal
          // each listing's real phone via the contactInfo API. Slow but
          // essential since Dubizzle hides phones behind the "إظهار الرقم"
          // button. Other platforms (semsarmasr/aqarmap/opensooq) already
          // expose phones in page HTML.
          var phoneRevealPromise = (platform.id === 'dubizzle')
            ? revealDubizzlePhones(items, ui)
            : Promise.resolve();

          return phoneRevealPromise.then(function() {
            var withPhone = items.filter(function(it){ return it.sellerPhone; }).length;
            var withName = items.filter(function(it){ return it.sellerName; }).length;
            return sendToMaksab(platform, ctx, items, ui).then(function(res){
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
      var result = { phone: null, sellerName: null, allImages: [], specs: {}, amenities: [] };
      // Phone
      var phoneMatch = html.match(/(?:\+?201|01)[0-25]\d{8}/);
      if (phoneMatch) result.phone = normalizeEgPhone(phoneMatch[0]);

      // Seller name — strategy (in order):
      //   Priority 1: "بيانات المعلن" section — SemsarMasr's canonical seller
      //               name label. This is the REAL account owner name.
      //   Priority 2: h2/h3 near the phone number or "طبيعة المعلن" label.
      //   Priority 3: HTML classes tagged with Owner/Advert.
      //   Priority 4: الوكيل in description (last resort — can differ from المعلن).

      var sellerCardPatterns = [
        // Priority 1: بيانات المعلن → next text node within 500 chars is the name.
        // Match the label, then skip any HTML until we find actual text content.
        /بيانات\s*المعلن[\s\S]{0,500}?>\s*([^<\n]{2,40})\s*</i,
        // Priority 2: h3 near "طبيعة المعلن" label (seller card heading)
        /<h3[^>]*>\s*([^<]{2,50})\s*<\/h3>[\s\S]{0,800}طبيعة\s*المعلن/i,
        /<h2[^>]*>\s*([^<]{2,50})\s*<\/h2>[\s\S]{0,800}طبيعة\s*المعلن/i,
        // Priority 3: h3 near the phone number (within 300 chars AFTER the phone).
        /(?:\+?20?1|01)[0-25]\d{8}[\s\S]{0,300}<h3[^>]*>\s*([^<]{2,50})\s*<\/h3>/i,
        // Priority 4: SemsarMasr AgentDetails / AdvertiserName classes
        /class="[^"]*(?:AgentDetails|AdvertiserName|AgentName|OwnerDetails)[^"]*"[^>]*>[\s\S]{0,300}?<(?:h2|h3|strong|span)[^>]*>\s*([^<]{2,50})\s*</i,
      ];

      var agentPatterns = [
        /الوكيل\s*[\/:\-]\s*([^\n<>\r،,]{2,40})/,
        /لمزيد من التفاصيل[^>]*?(?:الوكيل|بالوكيل)\s*[\/:\-]?\s*([^\n<>\r،,]{2,40})/,
        /(?:صاحب الإعلان|اسم المعلن|بواسطة|الناشر)\s*[:：\/\-]?\s*([^\n<>\r،,<>]{2,40})/,
      ];
      var classPatterns = [
        /class="[^"]*(?:OwnerName|ownerName|AdvertName)[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
      ];

      // Reject instruction/help-text phrases that were being captured as names.
      // Any candidate containing these substrings (in Arabic or English) is NOT a name.
      var JUNK_PHRASES = [
        'تتصل', 'من خلال', 'موقع', 'فضلاً', 'فضلا', 'أخبر', 'اخبر',
        'صاحب الإعلان', 'صاحب الاعلان', 'بيانات المعلن', 'طبيعة المعلن',
        'تواصل', 'اتصال', 'اتصل الآن', 'واتس أب', 'أطلب اتصال', 'أطلب',
        'راسل', 'السعر', 'شقة', 'للبيع', 'للإيجار', 'جنيه',
        'click here', 'contact', 'call now', 'send a message',
      ];
      // Reject candidates that are exact generic labels (not names).
      var BAD_NAMES = /^(سمسار|عقارات|مكتب|شركة|وكيل|مالك|معلن|seller|agent|broker|owner|admin|user|سمسار\s*مصر|البائع|المعلن|تفاصيل|بيانات)$/i;

      function isValidName(candidate) {
        if (!candidate) return false;
        var n = String(candidate).trim();
        if (n.length < 2 || n.length > 50) return false;
        if (/^\d+$/.test(n)) return false;
        if (BAD_NAMES.test(n)) return false;
        // Word count: real names are 1-4 words. Longer = probably a sentence.
        var wordCount = n.split(/\s+/).length;
        if (wordCount > 4) return false;
        // Reject if contains any junk phrase
        for (var jp = 0; jp < JUNK_PHRASES.length; jp++) {
          if (n.indexOf(JUNK_PHRASES[jp]) >= 0) return false;
        }
        // Reject if contains common sentence connectors
        if (/\b(?:أن|أنه|إن|لكن|لذا|لأن|بس|عشان)\b/.test(n)) return false;
        return true;
      }

      function tryPatterns(patterns, src) {
        for (var i = 0; i < patterns.length; i++) {
          var m = src.match(patterns[i]);
          if (m && m[1]) {
            var n = m[1].trim()
              .replace(/\s+/g, ' ')
              .replace(/User\s*photo/gi, '')
              .replace(/صورة المستخدم/g, '')
              .replace(/[•←→\-\.]+$/g, '')
              .replace(/^[•←→\-\.]+/g, '')
              .trim();
            // Trim price/listing tails
            n = n.split(/\s*[\.•،,]\s*(?:السعر|شقة|للبيع|جنيه|\d)/)[0].trim();
            if (isValidName(n)) return n;
          }
        }
        return null;
      }

      result.sellerName =
        tryPatterns(sellerCardPatterns, html) ||
        tryPatterns(classPatterns, html) ||
        tryPatterns(agentPatterns, html);

      // ═══ Property specs (تفاصيل العقار) ═══
      // Strip HTML to plain text once (preserving line breaks) — used by both
      // spec and amenity extraction.
      var plainText = html
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<(?:li|tr|td|th|div|p|br|h[1-6])\b[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/[ \t]+/g, ' ');

      var KNOWN_SPEC_LABELS = [
        'السعر', 'سعر المتر', 'القسم', 'الغرض', 'المساحة', 'رقم الدور', 'الدور',
        'عدد الغرف', 'عدد الحمامات', 'نوع التشطيب', 'الفرش', 'طبيعة المعلن',
        'تاريخ البناء', 'نوع العقار', 'نوع الواجهة', 'الإطلالة',
        'حالة العقار', 'طريقة الدفع', 'المقدم',
      ];

      // Label-scan in plain text: "LABEL: VALUE" pattern (after <br>/newlines).
      // This handles most SemsarMasr spec tables regardless of their HTML wrapping.
      for (var si = 0; si < KNOWN_SPEC_LABELS.length; si++) {
        var label = KNOWN_SPEC_LABELS[si];
        var labelEsc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Require the label to be at start of a logical line (newline / space / >)
        // then "<whitespace>:<whitespace>VALUE" up to the next newline.
        var re = new RegExp('(?:^|[\\n\\r>])\\s*' + labelEsc + '\\s*[:：]\\s*([^\\n\\r<]{1,80})', 'i');
        var m = plainText.match(re);
        if (m && m[1]) {
          var v = m[1].trim().replace(/\s+/g, ' ');
          // Reject cases where the captured value starts with another known label
          // (e.g. "السعر: سعر المتر: 32000" — runaway capture).
          var isRunaway = KNOWN_SPEC_LABELS.some(function(otherLabel) {
            return otherLabel !== label && v.indexOf(otherLabel) === 0;
          });
          if (v && v.length < 80 && !isRunaway) {
            result.specs[label] = v;
          }
        }
      }

      // ═══ Amenities (مميزات المشروع + مميزات داخلية + قريبة من + الكماليات) ═══
      // Expanded list — covers both SemsarMasr and Dubizzle amenity wording.
      var KNOWN_AMENITIES = [
        // مميزات المشروع/البناء
        'مصعد', 'جراج/موقف سيارات', 'جراج', 'موقف سيارات', 'موقف سيارات مغطى',
        'حراسة/أمن', 'حراسة', 'أمن', 'كاميرات مراقبة', 'خدمة بواب',
        'إنذار حريق', 'بوابة', 'مركز تجاري', 'كافيهات/مطاعم',
        'دش مركزي', 'حمام سباحة', 'نادي صحي', 'نادي رياضي', 'ملعب', 'حديقة',
        'ممشى',
        // مميزات داخلية
        'تكييف', 'تدفئة', 'تدفئة وتكييف مركزي', 'غاز طبيعي', 'غاز طبيعى',
        'بلكونة', 'تراس', 'شرفة',
        'خزائن ملابس', 'خزائن مطبخ', 'غرفة ملابس',
        'أجهزة المطبخ', 'إنترنت', 'هاتف', 'تليفون أرضى', 'إنتركم',
        'باب مصفح', 'سخان ماء', 'موقد غاز/بلت إن', 'موقد غاز',
        'بلت إن', 'غسالة ملابس', 'غسالة', 'مايكروويف', 'ثلاجة',
        'تلفزيون', 'زجاج شبابيك مزدوج', 'مدفأة',
        'عداد كهرباء', 'أساسير', 'أسانسير',
        // الإطلالة / المنظر
        'شارع رئيسي', 'إطلالة المدينة', 'المدينة', 'إطلالة بحر', 'بحر',
        // قريبة من / الجوار
        'مسجد', 'كنيسة', 'مستشفى', 'صيدلية', 'الشاطئ', 'بنك',
        'الطريق السريع', 'مدرسة', 'جامعة', 'مترو',
      ];

      // Build amenity scan area: concatenate 3000-char windows after each known
      // section heading. If no section found, fall back to whole plain text.
      var amenityMarkers = [
        'وسائل الراحة', 'المميزات', 'مميزات المشروع', 'مميزات داخلية',
        'الإطلالة', 'المنظر', 'قريبة من', 'الجوار', 'المواصلات',
        'الكماليات', 'الخدمات',
      ];
      var amenityText = '';
      for (var mi = 0; mi < amenityMarkers.length; mi++) {
        var mIdx = plainText.indexOf(amenityMarkers[mi]);
        if (mIdx >= 0) amenityText += ' ' + plainText.substring(mIdx, mIdx + 3000);
      }
      if (!amenityText) amenityText = plainText;

      // Scan amenity text for known keywords — no checkmark required.
      // Simple presence check inside the section.
      var seenAmen = {};
      for (var ai = 0; ai < KNOWN_AMENITIES.length; ai++) {
        var feat = KNOWN_AMENITIES[ai];
        if (seenAmen[feat]) continue;
        if (amenityText.indexOf(feat) >= 0) {
          seenAmen[feat] = 1;
          result.amenities.push(feat);
        }
      }

      // Images — grab ALL gallery images from the detail page
      var imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
      var seenImgs = {};
      for (var ii = 0; ii < imgMatches.length; ii++) {
        var srcMatch = imgMatches[ii].match(/src=["']([^"']+)["']/i);
        if (!srcMatch) continue;
        var src = srcMatch[1];
        if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(src)) continue;
        if (/icon|logo|avatar|flag|emoji|thumb_sm|small/i.test(src)) continue;
        if (/banner|cta|call[-_]?now|contact[-_]?now|promo|ad_banner|advertisment|\/ads?\/|sponsor/i.test(src)) continue;
        if (src.indexOf('//') === 0) src = 'https:' + src;
        else if (src.charAt(0) === '/') src = 'https://www.semsarmasr.com' + src;
        if (!seenImgs[src]) {
          seenImgs[src] = 1;
          result.allImages.push(src);
        }
      }
      result.allImages = result.allImages.slice(0, 12);

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
        .then(function(r){
          if (!r.ok && r.status >= 400 && r.status < 500) {
            // 4xx is permanent (listing deleted/forbidden) — flag for caller
            // so the retry layer can skip further attempts.
            var err = new Error('HTTP ' + r.status);
            err.status = r.status;
            err.permanent = true;
            throw err;
          }
          return r.text();
        })
        .then(function(html){
          var doc = new DOMParser().parseFromString(html, 'text/html');
          return { html: html, doc: doc };
        });
    },

    // Extract listings from __NEXT_DATA__ if present, otherwise from HTML DOM.
    parseList: function(html, doc, ctx) {
      var items = [];

      // Debug: report which strategy succeeded so we can diagnose quickly
      var debugInfo = { nextDataFound: false, adsArrayFound: false, adsCount: 0, domFallback: false };

      // Strategy 1: __NEXT_DATA__
      var scriptMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        debugInfo.nextDataFound = true;
        try {
          var data = JSON.parse(scriptMatch[1]);
          var pageProps = (data && data.props && data.props.pageProps) || {};
          var ads = pageProps.ads || pageProps.listings || pageProps.items ||
                    (pageProps.searchResult && pageProps.searchResult.ads) ||
                    (pageProps.results && pageProps.results.ads) || [];
          debugInfo.adsArrayFound = Array.isArray(ads) && ads.length > 0;
          debugInfo.adsCount = Array.isArray(ads) ? ads.length : 0;
          debugInfo.pagePropsKeys = Object.keys(pageProps).slice(0, 20);
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

              // Price — Dubizzle/OLX structure varies across versions.
              // Adaptive extraction: try known paths, then recursive scan for
               //ANY key containing "price" or "amount" with a numeric value
              // in a realistic EGP range (100+ EGP).
              function extractPriceFromObject(obj, depth) {
                if (depth > 4 || !obj || typeof obj !== 'object') return null;
                for (var kk in obj) {
                  if (!Object.prototype.hasOwnProperty.call(obj, kk)) continue;
                  var vv = obj[kk];
                  var keyLower = kk.toLowerCase();
                  // Direct numeric-looking value on a price/amount key
                  if (/price|amount|value/.test(keyLower)
                      && (typeof vv === 'number' || typeof vv === 'string')) {
                    var num = parseInt(String(vv).replace(/[^\d]/g, ''), 10);
                    if (!isNaN(num) && num >= 100 && num < 1e12) return num;
                  }
                  // Recurse into nested objects (e.g. price: { value, amount, currency })
                  if (vv && typeof vv === 'object' && depth < 3) {
                    var nested = extractPriceFromObject(vv, depth + 1);
                    if (nested) return nested;
                  }
                }
                return null;
              }
              var price = extractPriceFromObject(a, 0);

              // Debug: log the first ad's structure so we can diagnose if extraction fails
              if (!price && i === 0 && typeof console !== 'undefined' && console.warn) {
                try {
                  console.warn('[maksab] Dubizzle first ad keys:', Object.keys(a).slice(0, 30));
                  console.warn('[maksab] Dubizzle first ad sample:', JSON.stringify(a).substring(0, 1500));
                } catch (e) {}
              }

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

      // Strategy 2: DOM fallback — look for cards with listing links.
      // We climb each link's ancestors to find a card container and pull
      // price (X,XXX,XXX ج.م) + thumbnail + location from the same card.
      debugInfo.domFallback = true;
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

        // Walk up to find the card — the smallest ancestor that contains the
        // price text "X,XXX,XXX ج.م" or "X,XXX,XXX EGP".
        var card = a2;
        var cardPrice = null;
        var cardImg = null;
        for (var hops = 0; hops < 7; hops++) {
          if (!card.parentElement) break;
          card = card.parentElement;
          var cardText = card.textContent || '';
          if (cardText.length > 2500) break; // went too far up — we're in the page not the card
          // Collect ALL price matches in the card, then pick the FIRST one that
          // falls in a realistic Egyptian property range (1k – 100M EGP).
          // Cards often have "main price" + "down payment" both formatted as
          // "X,XXX,XXX ج.م" — concatenations or installment-total widgets can
          // produce 9-digit false positives (e.g. 125,093,000), so we filter.
          if (!cardPrice) {
            var priceRegex = /([\d]{1,3}(?:,[\d]{3})+|[\d]{4,10})\s*(?:ج\.?\s*م|EGP|جنيه)/gi;
            var pm;
            var candidates = [];
            while ((pm = priceRegex.exec(cardText)) !== null) {
              var p = parseInt(pm[1].replace(/,/g, ''), 10);
              if (!isNaN(p) && p >= 1000 && p <= 100000000) candidates.push(p);
              if (candidates.length >= 5) break; // safety
            }
            if (candidates.length > 0) {
              // Pick the LARGEST realistic value — in a "main + down payment"
              // pair, main price is always bigger. If there's only one match
              // (main price alone), this also works.
              candidates.sort(function(a, b) { return b - a; });
              cardPrice = candidates[0];
            }
          }
          // First image inside the card
          if (!cardImg) {
            var imgEl = card.querySelector('img');
            if (imgEl) {
              var src = imgEl.getAttribute('src') || imgEl.src || '';
              if (src && /\.(jpg|jpeg|png|webp)/i.test(src)) cardImg = src.indexOf('//') === 0 ? 'https:' + src : src;
            }
          }
          if (cardPrice && cardImg) break;
        }

        items.push({
          url: cleanUrl,
          title: title2,
          description: '',
          price: cardPrice,
          thumbnailUrl: cardImg,
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

      // One-time debug dump so we know WHY we fell through to DOM fallback
      if (typeof console !== 'undefined' && console.warn) {
        try {
          console.warn('[maksab] Dubizzle parseList debug:', JSON.stringify(debugInfo),
            '— extracted', items.length, 'items, first price:', items[0] && items[0].price);
        } catch (e) {}
      }
      return items;
    },

    parseDetail: function(html) {
      var result = { phone: null, sellerName: null, allImages: [], specs: {}, amenities: [], sellerBadge: null, price: null };

      // Infer seller type (طبيعة المعلن) from name patterns. Dubizzle doesn't
      // have a "type" field the way SemsarMasr does, so we guess from the name:
      //   Remax / Century21 / Inspire Homes / XYZ Realty → سمسار (broker)
      //   <Name> Development / <Name> مطور / استثمار → مطور عقاري (developer)
      function inferSellerBadge(name) {
        if (!name) return null;
        var n = String(name).toLowerCase();
        if (/remax|century\s*21|era\s+|coldwell|keller|savills/.test(n)) return 'سمسار';
        if (/homes?|realty|real\s*estate|properties|brokers?|عقار(?:ات)?/.test(n)) return 'سمسار';
        if (/developer|development|investment|استثمار|تطوير|مطور/.test(n)) return 'مطور عقاري';
        if (/مكتب|office|شركة|company/.test(n)) return 'شركة';
        return null;
      }

      // Blocked list = logged-in user from current tab (detected once at run start)
      // + optional extras from this fetched page's __NEXT_DATA__.
      var blockedName = BLOCKED_USER.name || null;
      var blockedPhone = BLOCKED_USER.phone || null;

      var loggedInData = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (loggedInData) {
        try {
          var rootData = JSON.parse(loggedInData[1]);
          var rootProps = (rootData && rootData.props && rootData.props.pageProps) || {};
          var sessionUser = rootProps.user || rootProps.currentUser || rootProps.loggedInUser ||
                            (rootProps.session && rootProps.session.user) ||
                            (rootProps.auth && rootProps.auth.user) || null;
          if (sessionUser && typeof sessionUser === 'object') {
            var extraName = (sessionUser.name || sessionUser.display_name || sessionUser.full_name || '').trim() || null;
            if (extraName && !blockedName) blockedName = extraName;
            var extraPhone = sessionUser.phone || sessionUser.mobile || sessionUser.phone_number;
            if (extraPhone) {
              var extraPN = normalizeEgPhone(extraPhone);
              if (extraPN && !blockedPhone) blockedPhone = extraPN;
            }
          }
        } catch (e) { /* ignore */ }
      }

      function isBlocked(name, phone) {
        if (name && blockedName && name.trim().toLowerCase() === blockedName.toLowerCase()) return true;
        if (phone && blockedPhone && phone === blockedPhone) return true;
        return false;
      }

      // ═══ Strategy 1: __NEXT_DATA__ JSON (primary) ═══
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          var pageProps = (data && data.props && data.props.pageProps) || {};

          // Known top-level ad wrappers on Dubizzle / OLX (post-merger)
          var ad = pageProps.ad || pageProps.listing || pageProps.item ||
                   pageProps.property || pageProps.product ||
                   pageProps.adDetail || pageProps.itemDetail ||
                   pageProps.detail ||
                   (pageProps.adModel && pageProps.adModel.ad) ||
                   (pageProps.data && (pageProps.data.ad || pageProps.data.item || pageProps.data.listing)) ||
                   (pageProps.result && (pageProps.result.ad || pageProps.result.item)) ||
                   null;

          // Recursive deep-search: if known paths failed, collect ALL ad-like
          // objects and pick the one with the most ad-specific content.
          // Picking the first match alone can grab a "related ads" sidebar
          // item (which has title + thumb but no description/parameters) and
          // miss the main listing.
          if (!ad) {
            var adCandidates = [];
            (function findAdLike(obj, depth) {
              if (depth > 6 || !obj || typeof obj !== 'object') return;
              if (adCandidates.length >= 20) return; // stop after 20 candidates
              if (Array.isArray(obj)) {
                for (var ai = 0; ai < Math.min(obj.length, 10); ai++) findAdLike(obj[ai], depth + 1);
                return;
              }
              // Score: title + at least one ad-specific field = candidate
              if ((obj.title || obj.name || obj.subject) &&
                  (obj.user || obj.seller || obj.owner || obj.agent ||
                   obj.phone || obj.description || obj.parameters || obj.amenities ||
                   obj.images || obj.photos)) {
                var score = 0;
                if (obj.description && String(obj.description).length > 50) score += 10;
                if (obj.parameters || obj.specifications || obj.attributes) score += 5;
                if (obj.amenities || obj.features) score += 5;
                if (obj.user || obj.seller) score += 3;
                if (obj.phone || obj.phone_number) score += 3;
                if (Array.isArray(obj.images) && obj.images.length > 2) score += 3;
                if (obj.price) score += 1;
                adCandidates.push({ obj: obj, score: score });
              }
              for (var k in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
                findAdLike(obj[k], depth + 1);
              }
            })(pageProps, 0);
            // Pick highest-scoring candidate (the MAIN ad, not sidebar recommendations)
            adCandidates.sort(function(a, b) { return b.score - a.score; });
            if (adCandidates.length > 0) ad = adCandidates[0].obj;
          }

          if (ad && typeof ad === 'object') {
            // Seller name — only from ad.user (the LISTING's seller, not the page user)
            var user = ad.user || ad.seller || ad.owner || ad.agent || ad.advertiser || {};
            var candidateName = (user.name || user.display_name || user.full_name ||
                                 user.first_name || ad.user_name ||
                                 ad.advertiser_name || ad.seller_name ||
                                 ad.company_name || ad.listing_office_name ||
                                 ad.contact_name || ad.owner_name || '').trim() || null;
            if (candidateName && !isBlocked(candidateName, null)) {
              result.sellerName = candidateName;
            }

            // Price extraction — adaptive: any key containing "price/amount/value"
            // with a realistic number. Saved in result.price so fetchDetailsBatch
            // can merge it into the item if list-page extraction missed it.
            (function findPrice(obj, depth) {
              if (depth > 4 || !obj || typeof obj !== 'object' || result.price) return;
              for (var kk in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, kk)) continue;
                var vv = obj[kk];
                var keyLower = kk.toLowerCase();
                if (/price|amount/.test(keyLower) && (typeof vv === 'number' || typeof vv === 'string')) {
                  var num = parseInt(String(vv).replace(/[^\d]/g, ''), 10);
                  if (!isNaN(num) && num >= 1000 && num < 1e12) { result.price = num; return; }
                }
                if (vv && typeof vv === 'object' && depth < 3) findPrice(vv, depth + 1);
                if (result.price) return;
              }
            })(ad, 0);

            // Fallback: try to extract name from description text.
            // Egyptian sellers often write: "للتواصل / <name>", "الوكيل <name>",
            // "المهندس <name>", "أ/ <name>", "م/ <name>", "اتصل بـ <name>".
            if (!result.sellerName && ad.description) {
              var descForName = String(ad.description);
              var namePatterns = [
                /الوكيل\s*[\/:\-]\s*([^\n،,\d\+]{3,35})/,
                /للتواصل\s*(?:مع)?\s*[\/:\-]?\s*([^\n،,\d\+]{3,35})/,
                /(?:الأستاذ|الأستاذة|م\/|أ\/|د\/|المهندس|المهندسة|الدكتور)\s+([^\n،,\d\+]{3,30})/,
                /(?:اتصل|كلمني|تواصل معي)\s*(?:بـ|مع)?\s*([^\n،,\d\+01]{3,30})/,
              ];
              for (var npi = 0; npi < namePatterns.length; npi++) {
                var nm = descForName.match(namePatterns[npi]);
                if (nm && nm[1]) {
                  var candidate = nm[1].trim()
                    .replace(/\s+/g, ' ')
                    .replace(/^[•\-\.:]+|[•\-\.:]+$/g, '')
                    .trim();
                  if (candidate.length >= 3 && candidate.length <= 40 &&
                      !/^\d+$/.test(candidate) &&
                      !isBlocked(candidate, null) &&
                      candidate.split(/\s+/).length <= 4) {
                    result.sellerName = candidate;
                    break;
                  }
                }
              }
            }

            // Phone — ONLY from authoritative __NEXT_DATA__ fields on the ad
            // object. Never from description text, full HTML, wa.me links, or
            // tel: links — those sometimes carry ALTERNATIVE phones (old/extra
            // numbers the broker pasted) that disagree with what Dubizzle's
            // official "إظهار الرقم" button reveals. If ad.phone isn't set,
            // we leave phone null. Confirmed better null than wrong.
            var phoneCandidates = [ad.phone, ad.phone_number, ad.contact_phone,
                                   user.phone, user.mobile, ad.mobile];
            for (var pi = 0; pi < phoneCandidates.length; pi++) {
              if (phoneCandidates[pi]) {
                var pn = normalizeEgPhone(phoneCandidates[pi]);
                if (pn && !isBlocked(null, pn)) { result.phone = pn; break; }
              }
            }

            // Images — ad.images is usually an array of URLs or objects with .url
            var imgs = ad.images || ad.photos || ad.gallery || ad.media || [];
            if (Array.isArray(imgs)) {
              for (var ii = 0; ii < imgs.length; ii++) {
                var img = imgs[ii];
                var url = typeof img === 'string' ? img :
                          (img && (img.url || img.src || img.main || img.uri || img.href)) || null;
                if (url && result.allImages.indexOf(url) < 0 &&
                    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) {
                  result.allImages.push(url);
                }
              }
            }

            // Specs — Dubizzle uses `parameters` array: [{ label, value_label, value }, ...]
            var params = ad.parameters || ad.specifications || ad.details ||
                         ad.attributes || ad.props || [];
            if (Array.isArray(params)) {
              for (var pj = 0; pj < params.length; pj++) {
                var p = params[pj];
                var key = String(p.label || p.name || p.key || p.title || '').trim();
                var val = String(p.value_label || p.value || p.display_value || p.text || '').trim();
                if (key && val && key !== val && key.length < 40 && val.length < 100) {
                  result.specs[key] = val;
                }
              }
            } else if (params && typeof params === 'object') {
              for (var pk in params) {
                if (Object.prototype.hasOwnProperty.call(params, pk)) {
                  var pv = params[pk];
                  if ((typeof pv === 'string' || typeof pv === 'number') && String(pv).length < 100) {
                    result.specs[pk] = String(pv);
                  }
                }
              }
            }

            // Amenities — Dubizzle's "الكماليات" usually lives in `amenities` / `features`
            var feats = ad.amenities || ad.features || ad.facilities || ad.extras || [];
            if (Array.isArray(feats)) {
              for (var fi = 0; fi < feats.length; fi++) {
                var f = feats[fi];
                var featName = typeof f === 'string' ? f :
                               (f && (f.label || f.name || f.title || f.text)) || null;
                if (featName && String(featName).length > 0 && String(featName).length < 60
                    && result.amenities.indexOf(featName) < 0
                    && featName !== '[object Object]') {
                  result.amenities.push(String(featName).trim());
                }
              }
            }
          }
        } catch (e) { /* fall through to HTML regex */ }
      }

      // ═══ Strategy 2: HTML regex fallbacks — seller name only ═══
      // IMPORTANT: For Dubizzle we do NOT extract phones from description /
      // wa.me / tel: / full HTML. Reason discovered from real data:
      //   User reported listings in Maksab had 01004940449 while the "Show
      //   Phone" button on Dubizzle revealed +201278889229 — a completely
      //   different number. The phone we were extracting was a secondary
      //   contact the broker wrote in description text, not the official
      //   phone behind Dubizzle's phone-reveal API.
      // Dubizzle's authoritative phone is behind a POST /api/... call that
      // only fires when a user clicks "إظهار الرقم". Without implementing
      // that API call, ANY phone we extract from the raw HTML is unreliable.
      // Policy: leave phone NULL for Dubizzle unless __NEXT_DATA__ ad.phone
      // was explicitly exposed. Better null than wrong.

      // Seller name — class-based fallback, still checks blocked list
      if (!result.sellerName) {
        var sellerPats = [
          // Dubizzle's primary seller attribution: "تم النشر بواسطة <Name>"
          // Walk past any HTML tags between the label and the name.
          /تم\s*النشر\s*بواسطة[\s\S]{0,300}?<(?:h1|h2|h3|h4|strong|b|span|div)[^>]*>\s*([^<]{2,60})\s*</i,
          /تم\s*النشر\s*بواسطة[\s\S]{0,300}?>\s*([^<\n]{2,60})\s*</i,
          /class="[^"]*(?:seller|agent|advertiser)[\w-]*name[^"]*"[^>]*>\s*([^<]{2,60})\s*</i,
          /itemprop=["']name["'][^>]*>\s*([^<]{2,60})\s*</i,
          /"seller"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,60})"/i,
        ];
        for (var sp = 0; sp < sellerPats.length; sp++) {
          var sm = html.match(sellerPats[sp]);
          if (sm && sm[1]) {
            var sn = sm[1].trim().replace(/\s+/g, ' ').replace(/User\s*photo/gi, '').trim();
            if (sn.length >= 2 && sn.length <= 60 && !/^\d+$/.test(sn) && !isBlocked(sn, null)) {
              result.sellerName = sn;
              break;
            }
          }
        }
      }

      // Images — scrape <img src> from CDN if NEXT_DATA yielded nothing
      if (result.allImages.length === 0) {
        var imgMatches = html.match(/<img[^>]+src=["']([^"']+(?:images\.dubizzle|cdn\.dubizzle|classistatic)[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi) || [];
        var seenImg = {};
        for (var im = 0; im < imgMatches.length; im++) {
          var srcMatch = imgMatches[im].match(/src=["']([^"']+)["']/i);
          if (!srcMatch) continue;
          var src = srcMatch[1];
          if (/icon|logo|avatar|flag|emoji/i.test(src)) continue;
          if (!seenImg[src]) { seenImg[src] = 1; result.allImages.push(src); }
        }
      }
      result.allImages = result.allImages.slice(0, 12);

      // Specs — plain text scan for known Arabic labels (fallback when NEXT_DATA is partial)
      var plainText = html
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<(?:li|tr|td|th|div|p|br|h[1-6])\b[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/[ \t]+/g, ' ');

      var DUBIZZLE_SPEC_LABELS = [
        'غرض العقار', 'الطابق', 'غرف نوم', 'عدد الغرف', 'الحمامات', 'عدد الحمامات',
        'المساحة', 'مساحة البناء', 'مساحة الأرض', 'النوع', 'ملكية',
        'مفروش', 'طريقة الدفع', 'حالة العقار', 'تاريخ التسليم', 'شروط التسليم',
        'التشطيب', 'الإطلالة', 'الماركة', 'الموديل', 'سنة الصنع',
        'الكيلومترات', 'ناقل الحركة', 'نوع الوقود', 'حجم المحرك', 'اللون',
      ];
      for (var di = 0; di < DUBIZZLE_SPEC_LABELS.length; di++) {
        var dLabel = DUBIZZLE_SPEC_LABELS[di];
        if (result.specs[dLabel]) continue;
        var dLabelEsc = dLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var dRe = new RegExp('(?:^|[\\n\\r>])\\s*' + dLabelEsc + '\\s*[:：]?\\s*\\n?\\s*([^\\n\\r<]{1,80})', 'i');
        var dm = plainText.match(dRe);
        if (dm && dm[1]) {
          var dv = dm[1].trim().replace(/\s+/g, ' ');
          if (dv && dv.length < 80 && dv !== dLabel) {
            result.specs[dLabel] = dv;
          }
        }
      }

      // Amenities — plain-text scan for known features near "الكماليات" section
      if (result.amenities.length === 0) {
        var amenityMarkers = ['الكماليات', 'المميزات', 'الخدمات', 'المرافق'];
        var amenityText = '';
        for (var amMark = 0; amMark < amenityMarkers.length; amMark++) {
          var amIdx = plainText.indexOf(amenityMarkers[amMark]);
          if (amIdx >= 0) amenityText += ' ' + plainText.substring(amIdx, amIdx + 2500);
        }
        if (amenityText) {
          var DUBIZZLE_AMENITIES = [
            'شرفة', 'حديقة خاصة', 'حديقة', 'أمن', 'أمن وحراسة', 'غرفة خدم',
            'أجهزة المطبخ', 'تدفئة وتكييف مركزي', 'تكييف', 'تدفئة',
            'موقف سيارات مغطى', 'موقف سيارات', 'جراج', 'عداد كهرباء',
            'غاز طبيعي', 'غاز طبيعى', 'تليفون أرضي', 'تليفون أرضى',
            'أساسير', 'أسانسير', 'مصعد', 'حمام سباحة',
            'نادي رياضي', 'مناطق أطفال', 'كاميرات مراقبة', 'بلكونة',
            'إنترنت', 'مفروش', 'مكيف',
          ];
          for (var ami = 0; ami < DUBIZZLE_AMENITIES.length; ami++) {
            var amFeat = DUBIZZLE_AMENITIES[ami];
            if (amenityText.indexOf(amFeat) >= 0 && result.amenities.indexOf(amFeat) < 0) {
              result.amenities.push(amFeat);
            }
          }
        }
      }

      // Extract "الإعلانات النشطة" (active ads count) and "عضو منذ" (member-since year)
      // from the seller card. These tell us whether the seller is a professional
      // broker (10+ active ads = definitely a company even when the name doesn't
      // obviously look like one).
      var activeAdsMatch = html.match(/الإعلانات\s*النشطة[\s\S]{0,250}?>\s*(\d{1,4})\s*</i);
      if (activeAdsMatch && activeAdsMatch[1]) {
        var activeAds = parseInt(activeAdsMatch[1], 10);
        if (activeAds > 0 && activeAds < 10000) {
          result.specs = result.specs || {};
          result.specs['الإعلانات النشطة'] = String(activeAds);
          // Heuristic: 5+ active ads → broker/company, overrides name-based badge
          if (activeAds >= 5 && !result.sellerBadge) {
            result.sellerBadge = 'سمسار';
          }
        }
      }
      var memberSinceMatch = html.match(/عضو\s*منذ[\s\S]{0,200}?>\s*(\d{4})\s*</i);
      if (memberSinceMatch && memberSinceMatch[1]) {
        var memberYear = parseInt(memberSinceMatch[1], 10);
        if (memberYear > 2000 && memberYear <= new Date().getFullYear()) {
          result.specs = result.specs || {};
          result.specs['عضو منذ'] = String(memberYear);
        }
      }

      // Final step: infer seller badge from the extracted name if we don't
      // have an explicit one yet. This gives us "سمسار / مطور عقاري / شركة"
      // for Dubizzle listings that are posted by real estate businesses.
      if (!result.sellerBadge && result.sellerName) {
        result.sellerBadge = inferSellerBadge(result.sellerName);
      }

      // Price fallback — if __NEXT_DATA__ recursion didn't find it, scan the
      // rendered HTML text for the first realistic EGP price.
      if (!result.price) {
        var priceRegex = /([\d]{1,3}(?:,[\d]{3})+|[\d]{4,10})\s*(?:ج\.?\s*م|EGP|جنيه)/gi;
        var priceCandidates = [];
        var pm;
        while ((pm = priceRegex.exec(html)) !== null && priceCandidates.length < 10) {
          var p = parseInt(pm[1].replace(/,/g, ''), 10);
          if (!isNaN(p) && p >= 1000 && p <= 100000000) priceCandidates.push(p);
        }
        if (priceCandidates.length > 0) {
          // Pick the largest realistic value (main price > down payment)
          priceCandidates.sort(function(a, b) { return b - a; });
          result.price = priceCandidates[0];
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
        .then(function(r){
          if (!r.ok && r.status >= 400 && r.status < 500) {
            // 4xx is permanent (listing deleted/forbidden) — flag for caller
            // so the retry layer can skip further attempts.
            var err = new Error('HTTP ' + r.status);
            err.status = r.status;
            err.permanent = true;
            throw err;
          }
          return r.text();
        })
        .then(function(html){
          var doc = new DOMParser().parseFromString(html, 'text/html');
          return { html: html, doc: doc };
        });
    },

    parseList: function(html, doc, ctx) {
      var items = [];
      var BASE = 'https://eg.opensooq.com';

      console.info('[maksab/opensooq] parseList — html length:', html.length);

      // Strategy 1: __NEXT_DATA__
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      console.info('[maksab/opensooq] __NEXT_DATA__ found:', !!m);
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

          // Log pageProps keys to diagnose structure changes
          var pp = null;
          try {
            pp = (data && data.props && data.props.pageProps) || {};
            console.info('[maksab/opensooq] pageProps keys:', Object.keys(pp));
          } catch(e) {}

          // FAST PATH: pageProps.serpApiResponse.listings.items — the canonical
          // modern OpenSooq structure. Use these DIRECTLY, don't let the sort
          // below pick a larger noise array (e.g. cities list) over real listings.
          var serpItems = null;
          try {
            var serp = pp && pp.serpApiResponse;
            serpItems = (serp && serp.listings && serp.listings.items)
              || (serp && serp.items)
              || null;
            if (Array.isArray(serpItems) && serpItems.length > 0) {
              console.info('[maksab/opensooq] serpApiResponse.listings.items →',
                serpItems.length, 'items, ALL keys:', Object.keys(serpItems[0]));
            } else {
              console.info('[maksab/opensooq] serpApiResponse missing/empty');
              serpItems = null;
            }
          } catch(e) {
            console.warn('[maksab/opensooq] serpApiResponse access threw:', e && e.message);
            serpItems = null;
          }

          console.info('[maksab/opensooq] Strategy 1 — candidate arrays found:', arrays.length,
            'sizes:', arrays.map(function(a){return a.length;}).slice(0, 5));

          // Pick listings: prefer serpApiResponse (known correct shape), else
          // fall back to the biggest heuristic-matched array.
          var listings;
          if (serpItems) {
            listings = serpItems;
            console.info('[maksab/opensooq] using serpApiResponse items (', listings.length, ')');
            // DIAGNOSTIC: dump phone-related fields from first 3 items so we can
            // see if phone_number is masked (010XXXXXXXX**XX**), unmasked, or
            // absent. has_phone / phone_reveal_key tell us whether the seller
            // has exposed a phone and what reveal-key to use against the API.
            for (var di = 0; di < Math.min(3, listings.length); di++) {
              var di_it = listings[di];
              console.info('[maksab/opensooq] sample#' + di + ' phone fields:',
                'phone_number:', JSON.stringify(di_it.phone_number),
                '| has_phone:', di_it.has_phone,
                '| phone_reveal_key:', di_it.phone_reveal_key ? '(present, len=' + String(di_it.phone_reveal_key).length + ')' : 'absent',
                '| member_id:', di_it.member_id);
            }
          } else {
            arrays.sort(function(a, b){ return b.length - a.length; });
            listings = arrays[0] || [];
            if (listings.length > 0) {
              console.info('[maksab/opensooq] using fallback heuristic array, size:', listings.length,
                'first item keys:', Object.keys(listings[0] || {}).slice(0, 20));
            }
          }
          var seenUrls = {};

          // ─── Filter sponsored/cross-category noise ───
          // OpenSooq mixes promoted listings from OTHER categories
          // (electronics, services, jobs) and OTHER governorates (Cairo,
          // Giza) into property search results. Filter to keep only
          // listings whose category + governorate match what the user
          // is actually browsing.
          //
          // Derive category/governorate from current URL — ctx.maksabCat
          // is often null for OpenSooq's Arabic-encoded URLs, so trusting
          // ctx alone misses the filter entirely.
          //
          // location.href returns the URL-encoded form (Arabic chars become
          // %D8%XX...). Decode before regex matching, with a try/catch in
          // case it's already malformed.
          var rawStartUrl = String(ctx.startUrl || '');
          var startUrl = rawStartUrl;
          try { startUrl = decodeURIComponent(rawStartUrl); } catch (_) {}
          var urlIsProperty = /عقار|real.?estate|propert|شقق|فيلا|أراض/i.test(startUrl);
          var urlIsCar = /سيار|car|vehicle|موتو|دراج/i.test(startUrl);
          var urlIsAlex = /الإسكندرية|الاسكندرية|اسكندرية|alexandria/i.test(startUrl);
          var wantCategory = ctx.maksabCat
            || (urlIsProperty ? 'عقارات' : null)
            || (urlIsCar ? 'سيارات' : null);
          var wantAlex = urlIsAlex
            || /إسكندرية|اسكندرية|alexandria/i.test(String(ctx.governorate || ctx.governorateLabel || ''));

          console.info('[maksab/opensooq] decoded URL:', startUrl.substring(0, 120));
          console.info('[maksab/opensooq] derived — wantCategory:', wantCategory, 'wantAlex:', wantAlex);

          var preFilter = listings.length;
          listings = listings.filter(function(item) {
            // Category check via cat1_label / cat2_label / cat1_uri.
            if (wantCategory) {
              var catText = String((item.cat1_label || '') + ' ' + (item.cat2_label || '') + ' ' + (item.cat1_uri || '')).toLowerCase();
              if (wantCategory === 'عقارات') {
                if (!/عقار|real.?estate|property|شقق|فيلا|أراضي|دوبلكس|بنتهاوس|محل|مكتب|عمارة/i.test(catText)) return false;
              } else if (wantCategory === 'سيارات') {
                if (!/سيار|car|vehicle|موتو|دراج/i.test(catText)) return false;
              }
            }
            // Governorate check: city_label must match Alexandria or one of
            // its known neighborhoods. Drop everything else when on an Alex URL.
            if (wantAlex) {
              var loc = String(item.city_label || item.nhood_label || '');
              if (loc && !/إسكندرية|اسكندرية|alexandria/i.test(loc)) {
                if (!/ميامي|سموحة|سيدي بشر|العصافرة|المنتزه|العامرية|برج العرب|محرم بك|سيدي جابر|كفر عبد|الإبراهيمية|أبو قير|العجمي|السيوف|المندرة|سان ستيفانو|ستانلي|كليوباترا|لوران|رشدي|سبورتنج|فلمنج|بحري|الأنفوشي|اللبان|الدخيلة|المنشية|فيكتوريا|جناكليس|بولكلي|كامب شيزار|النخيل|جليم|المعمورة/.test(loc)) {
                  return false;
                }
              }
            }
            return true;
          });
          console.info('[maksab/opensooq] filter — wantCategory:', wantCategory,
            'wantAlex:', wantAlex, 'kept:', listings.length, '/', preFilter);

          for (var i = 0; i < listings.length; i++) {
            var it = listings[i];

            // Extract listing ID — modern OpenSooq uses `id` as the numeric
            // listing ID (confirmed from detail page URL /ar/search/<id>).
            var itemId = it.id || it.post_id || it.listing_id;
            // Also try nested member_user_name pattern: `/ar/post/<slug>`
            // Newer URL shape is actually /ar/search/<id> (verified from
            // browser), so try that first.
            var url = null;
            var urlKeys = ['post_url', 'uri', 'url', 'link', 'href', 'detail_url', 'canonical_url', 'seo_url'];
            for (var uk = 0; uk < urlKeys.length; uk++) {
              var v = it[urlKeys[uk]];
              if (v && typeof v === 'string') { url = v.charAt(0) === 'h' ? v : BASE + (v.charAt(0) === '/' ? v : '/' + v); break; }
            }
            if (!url && it.slug) url = BASE + (it.slug.charAt(0) === '/' ? it.slug : '/ar/' + it.slug);
            if (!url && itemId) url = BASE + '/ar/search/' + itemId;
            if (!url) continue;
            var cleanUrl = url.split('?')[0];
            if (seenUrls[cleanUrl]) continue;
            seenUrls[cleanUrl] = 1;

            var title = it.title || it.subject || it.post_title || it.highlights || it.name || '';
            if (!title || String(title).length < 4) continue;

            // Price — modern OpenSooq uses `price_amount`, legacy had `price`.
            var price = null;
            var rawPrice = it.price_amount != null ? it.price_amount : it.price;
            if (rawPrice != null) price = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || null;

            // Image — modern OpenSooq uses `image_uri` (no scheme, needs prefix).
            var img = null;
            if (it.image_uri) {
              img = String(it.image_uri);
              if (img.indexOf('//') < 0) img = 'https://opensooq-images.os-cdn.com/' + img.replace(/^\/+/, '');
              else if (img.indexOf('http') !== 0) img = 'https:' + (img.indexOf('//') === 0 ? img : '//' + img);
            }
            else if (it.image_url) img = it.image_url;
            else if (it.thumb) img = it.thumb;
            else if (it.images && it.images.length > 0) img = typeof it.images[0] === 'string' ? it.images[0] : (it.images[0].url || it.images[0].src);
            else if (it.cover_image) img = it.cover_image;

            var sellerName = it.member_display_name || it.member_name || it.seller_name
              || (it.member && (it.member.display_name || it.member.name))
              || (it.user && (it.user.display_name || it.user.name))
              || null;
            if (sellerName) sellerName = String(sellerName).trim();

            var sellerProfileUrl = null;
            if (it.member_user_name) sellerProfileUrl = BASE + '/ar/member/' + it.member_user_name;
            else if (it.member_id) sellerProfileUrl = BASE + '/ar/profile/' + it.member_id;
            else if (it.member && it.member.id) sellerProfileUrl = BASE + '/ar/profile/' + it.member.id;

            // Phone — read from list item ONLY if it's a complete, unmasked
            // Egyptian mobile (01[0125]XXXXXXXX). Reject masked variants
            // (010029285XX) per user policy: no partial phones. Also reject
            // the logged-in user's own phone — OpenSooq may echo it in
            // certain item shapes.
            var listPhone = null;
            var rawPh = it.phone_number || it.phone || it.mobile || null;
            if (rawPh) {
              var phStr = String(rawPh).replace(/[^\d]/g, '');
              if (/^01[0125]\d{8}$/.test(phStr)
                  && phStr !== (BLOCKED_USER && BLOCKED_USER.phone)) {
                listPhone = phStr;
              }
            }

            items.push({
              url: cleanUrl,
              external_id: String(itemId || ''),
              title: String(title),
              description: it.description || it.short_description || '',
              price: price,
              thumbnailUrl: img || null,
              location: it.city_label || it.city_name || it.location_name || it.neighborhood || ctx.governorateLabel || '',
              city: it.city_label || it.city_name || ctx.governorateLabel || '',
              area: it.neighborhood_name || it.area_name || '',
              sellerPhone: listPhone,
              sellerName: sellerName,
              sellerProfileUrl: sellerProfileUrl,
              dateText: it.posted_at || it.post_date || it.date || it.created_at || '',
              isVerified: !!(it.is_verified || (it.member && it.member.is_verified)),
              isBusiness: !!(it.is_business || (it.member && it.member.is_business)),
              isFeatured: !!(it.is_featured || it.featured || it.is_premium),
              supportsExchange: false,
              isNegotiable: !!(it.is_negotiable || it.negotiable),
              category: ctx.categoryLabel,
              // phone_reveal_key — OpenSooq's per-listing token used by the
              // /api/account/reveal/v3/member-phone endpoint. Stored here so
              // _revealPhonesViaApi can call the reveal API per item.
              phoneRevealKey: it.phone_reveal_key || null,
            });
          }
          console.info('[maksab/opensooq] Strategy 1 (__NEXT_DATA__) produced', items.length, 'items');
          if (items.length > 0) {
            PLATFORMS.opensooq._revealPhonesViaApi(items);
            return items;
          }
        } catch (e) {
          console.warn('[maksab/opensooq] Strategy 1 threw:', e && e.message);
        }
      }

      // Strategy 2: DOM fallback — log samples of /ar/ anchor hrefs so we can
      // see the real listing-URL shape OpenSooq uses today.
      var links = doc.querySelectorAll('a[href*="/ar/"]');
      console.info('[maksab/opensooq] Strategy 2 (DOM) — /ar/ anchors in doc:', links.length);
      // Print a few sample hrefs to help diagnose URL pattern
      var sampleHrefs = [];
      for (var s = 0; s < Math.min(links.length, 10); s++) {
        sampleHrefs.push(links[s].getAttribute('href'));
      }
      console.info('[maksab/opensooq] sample anchor hrefs:', sampleHrefs);
      var seen = {};
      for (var j = 0; j < links.length; j++) {
        var a = links[j];
        var href = a.getAttribute('href') || '';
        if (!href) continue;
        // Must contain a 4+ digit ID segment (listing ID) — not a filter/search/auth link
        if (!/\/\d{4,}(?:\/|$)/.test(href)) continue;
        if (/\/(search|filter|category|page|login|register|profile|about|help|member)\b/i.test(href)) continue;
        var full = href.charAt(0) === '/' ? BASE + href : href;
        var clean = full.split('?')[0];
        if (seen[clean]) continue;
        seen[clean] = 1;
        var ttl = (a.getAttribute('title') || a.getAttribute('aria-label') || a.textContent || '').trim();
        if (!ttl || ttl.length < 5) continue;
        // Try to grab price from nearest ancestor card
        var card = a.closest('article, li, div[class*="card"], div[class*="Post"]');
        var priceText = '';
        if (card) {
          var pEl = card.querySelector('[class*="price" i], [class*="Price" i]');
          if (pEl) priceText = (pEl.textContent || '').trim();
        }
        var priceNum = null;
        if (priceText) {
          var pm = priceText.match(/\d[\d,٬\s]*/);
          if (pm) priceNum = parseInt(pm[0].replace(/[^\d]/g, ''), 10) || null;
        }
        // Thumbnail
        var imgEl = card ? card.querySelector('img') : null;
        var imgSrc = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

        items.push({
          url: clean, title: ttl, description: '', price: priceNum,
          thumbnailUrl: imgSrc || null,
          location: ctx.governorateLabel || '', city: ctx.governorateLabel || '', area: '',
          sellerPhone: null, sellerName: null, sellerProfileUrl: null, dateText: '',
          isVerified: false, isBusiness: false, isFeatured: false,
          supportsExchange: false, isNegotiable: false,
          category: ctx.categoryLabel,
        });
      }
      console.info('[maksab/opensooq] Strategy 2 (DOM) produced', items.length, 'items');
      return items;
    },

    parseDetail: function(html) {
      var result = { phone: null, sellerName: null };

      // Identify the logged-in user's own phone — captured at run-start by
      // detectLoggedInUser (NEXT_DATA → DOM scan → frequency → localStorage
      // → prompt). Used to reject the user's own phone wherever it appears.
      var selfPhone = (BLOCKED_USER && BLOCKED_USER.phone) || null;
      function notSelf(p) { return p && p !== selfPhone ? p : null; }

      // Try several owner-card region patterns — OpenSooq's container ID
      // varies across page templates and over time. Use the FIRST match.
      var ownerHtml = null;
      var ownerSelectors = [
        /id=["']PostViewOwnerCard["']([\s\S]{0,8000})/i,
        /id=["']MemberInfo["']([\s\S]{0,8000})/i,
        /id=["']ContactSeller["']([\s\S]{0,8000})/i,
        /class=["'][^"']*PostViewOwnerCard[^"']*["']([\s\S]{0,8000})/i,
        /class=["'][^"']*ownerCard[^"']*["']([\s\S]{0,8000})/i,
        /class=["'][^"']*sellerCard[^"']*["']([\s\S]{0,8000})/i,
        /class=["'][^"']*memberInfo[^"']*["']([\s\S]{0,8000})/i,
      ];
      var matchedSelector = null;
      for (var os = 0; os < ownerSelectors.length; os++) {
        var ocm = html.match(ownerSelectors[os]);
        if (ocm) { ownerHtml = ocm[1]; matchedSelector = os; break; }
      }

      var hasNextData = /<script[^>]*id=["']__NEXT_DATA__["']/.test(html);
      var hasTelInHtml = /href=["']tel:\+?(20)?01[0-25]\d{8}["']/.test(html);
      var totalPhonesInHtml = (html.match(/01[0-25]\d{8}/g) || []).length;
      console.info('[maksab/opensooq/detail] html len:', html.length,
        '| ownerCard found:', ownerHtml ? 'selector#' + matchedSelector : 'NO',
        '| owner len:', ownerHtml ? ownerHtml.length : 0,
        '| __NEXT_DATA__:', hasNextData,
        '| tel: in html:', hasTelInHtml,
        '| total phone digits in html:', totalPhonesInHtml);

      // FAST PATH: <a href="tel:..."> INSIDE the owner card only.
      if (ownerHtml) {
        var telMatch = ownerHtml.match(/href=["']tel:\+?(20)?(01[0-25]\d{8})["']/);
        if (telMatch) {
          var telPhone = notSelf(normalizeEgPhone(telMatch[2]));
          if (telPhone) result.phone = telPhone;
        }
      }

      // __NEXT_DATA__ — structured seller data (most reliable when present).
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          var pp = (data && data.props && data.props.pageProps) || {};
          console.info('[maksab/opensooq/detail] pageProps keys:', Object.keys(pp).slice(0, 12));
          var item = pp.post || pp.listing || pp.item || pp.data || pp.ad || {};
          var user = item.user || item.member || item.seller || {};
          if (user.name || user.display_name) {
            result.sellerName = String(user.name || user.display_name).trim() || null;
          }
          if (!result.phone) {
            var phoneCandidates = [
              item.phone, item.mobile, item.contact_phone, item.phone_number,
              user.phone, user.mobile, user.phone_number,
            ];
            for (var k = 0; k < phoneCandidates.length; k++) {
              if (phoneCandidates[k]) {
                var p = notSelf(normalizeEgPhone(phoneCandidates[k]));
                if (p) { result.phone = p; break; }
              }
            }
          }
          // Deep-walk pageProps looking for ANY phone-shaped value associated
          // with a "user/member/seller/contact" parent — covers shape changes.
          if (!result.phone) {
            (function deepWalkPhone(obj, parentKey, depth) {
              if (depth > 6 || !obj || typeof obj !== 'object' || result.phone) return;
              if (Array.isArray(obj)) {
                for (var ai = 0; ai < Math.min(obj.length, 20); ai++) deepWalkPhone(obj[ai], parentKey, depth + 1);
                return;
              }
              var sellerCtx = /(member|seller|user|contact|owner|advertiser|profile)/i.test(parentKey || '');
              if (sellerCtx) {
                var phKeys = ['phone', 'mobile', 'phone_number', 'contact_phone', 'phoneNumber'];
                for (var pk = 0; pk < phKeys.length; pk++) {
                  if (obj[phKeys[pk]]) {
                    var pn = notSelf(normalizeEgPhone(obj[phKeys[pk]]));
                    if (pn) { result.phone = pn; return; }
                  }
                }
              }
              for (var k2 in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, k2)) deepWalkPhone(obj[k2], k2, depth + 1);
              }
            })(pp, 'pageProps', 0);
            if (result.phone) console.info('[maksab/opensooq/detail] phone found via deep-walk');
          }
        } catch (e) {
          console.warn('[maksab/opensooq/detail] __NEXT_DATA__ parse threw:', e && e.message);
        }
      }

      // Owner-card scoped text scan — last resort, but bounded.
      // Removed the previous whole-HTML "any phone wins" fallback: it was
      // picking footer/support/related-listing phones and reporting them
      // as the seller's phone. Better to return null than a wrong phone.
      if (!result.phone && ownerHtml) {
        var ownerPhone = findPhoneInText(ownerHtml);
        result.phone = notSelf(ownerPhone);
      }

      if (!result.sellerName && ownerHtml) {
        var own = ownerHtml.match(/<h3[^>]*>([^<]{2,60})<\/h3>/i);
        if (own && own[1]) {
          result.sellerName = own[1].trim().replace(/\s+/g, ' ') || null;
        }
      }

      console.info('[maksab/opensooq/detail] result — phone:', result.phone || 'none',
        '| name:', result.sellerName || 'none');

      return result;
    },

    // Reveal phones for all items via OpenSooq's authenticated API.
    // Runs in the BACKGROUND after parseList — doesn't block the runner.
    // The runner's launchOne(item) checks needsFetch = !sellerPhone || ...
    // If reveal completes for an item before launchOne reaches it, the
    // detail-page fetch is skipped entirely (faster + less server load).
    //
    // Requires OPENSOOQ_JWT to be captured by the global fetch hook
    // (set up at bookmarklet boot if running on opensooq.com).
    _revealPhonesViaApi: function(items) {
      if (!items || items.length === 0) return;
      var todo = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].phoneRevealKey && !items[i].sellerPhone) {
          todo.push(items[i]);
        }
      }
      if (todo.length === 0) {
        console.info('[maksab/opensooq] reveal — no items need phone reveal');
        return;
      }
      console.info('[maksab/opensooq] reveal — queue size:', todo.length);

      // OpenSooq's React app doesn't issue Bearer-authed requests in the
      // background — JWT is only sent when the user actively clicks a
      // reveal/contact button. So we wait briefly for natural capture,
      // and if nothing comes, prompt the user to click any phone-reveal
      // button on the page so the hook can grab the token.
      function waitForJwt(timeoutMs, promptUser) {
        return new Promise(function(resolve) {
          if (OPENSOOQ_JWT) return resolve(OPENSOOQ_JWT);
          var attempts = 0;
          var maxAttempts = Math.ceil(timeoutMs / 500);
          var prompted = false;
          var iv = setInterval(function() {
            attempts++;
            if (OPENSOOQ_JWT || attempts >= maxAttempts) {
              clearInterval(iv);
              resolve(OPENSOOQ_JWT);
              return;
            }
            // After 3 s with no capture, ask the user to click reveal.
            if (promptUser && !prompted && attempts === 6) {
              prompted = true;
              alert(
                'مكسب — لكشف أرقام البائعين على السوق المفتوح:\n\n' +
                '١. افتح أي إعلان في tab جديد\n' +
                '٢. اضغط زر "اضغط لإظهار رقم الهاتف"\n' +
                '٣. ارجع لـtab الحصاد — الأرقام هتتكشف تلقائياً\n\n' +
                'لو فضّلت تتجاهل، اضغط OK وكمّل بأسماء فقط.'
              );
            }
          }, 500);
        });
      }

      waitForJwt(60000, true).then(function(jwt) {
        if (!jwt) {
          console.warn('[maksab/opensooq] reveal — no JWT captured.',
            'Phones cannot be revealed. Tip: click any "اضغط لإظهار رقم الهاتف"',
            'button on OpenSooq before running the bookmarklet next time.');
          return;
        }
        console.info('[maksab/opensooq] reveal — using captured JWT, processing',
          todo.length, 'items');

        // Build the full header set OpenSooq's reveal API expects.
        // Verified via cURL capture: minimum Authorization + Content-Type
        // is NOT enough — the server returns 500 without session-id,
        // source, country, currency, abbucket, x-tracking-uuid, release-
        // version. Pull what we can from cookies/session, fall back to
        // sane defaults for the rest.
        function readCookie(name) {
          var pairs = (document.cookie || '').split('; ');
          for (var i = 0; i < pairs.length; i++) {
            var eq = pairs[i].indexOf('=');
            if (eq > 0 && pairs[i].substring(0, eq) === name) {
              return decodeURIComponent(pairs[i].substring(eq + 1));
            }
          }
          return null;
        }
        var sessionCookie = readCookie('session') || '';
        var sessionId = '';
        try {
          var parsed = JSON.parse(sessionCookie);
          sessionId = parsed.id || '';
        } catch (e) { /* ignore */ }
        var deviceUuid = readCookie('device_uuid') || '';
        var abBucket = readCookie('userABBucket') || '9';

        // Stagger requests 250 ms apart to avoid hammering the API.
        var revealedCount = 0;
        var doneCount = 0;
        todo.forEach(function(item, idx) {
          setTimeout(function() {
            fetch('https://eg.opensooq.com/api/account/reveal/v3/member-phone'
                + '?cMedium=none&cName=direct_web_open&cSource=opensooq'
                + '&abBucket=' + encodeURIComponent(abBucket),
              {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Authorization': jwt,
                  'Content-Type': 'application/json',
                  'Accept': '*/*',
                  'accept-language': 'ar',
                  'abbucket': abBucket,
                  'country': 'eg',
                  'currency': 'EGP',
                  'release-version': '9.4.02',
                  'session-id': sessionId,
                  'source': 'desktop',
                  'x-tracking-uuid': deviceUuid,
                },
                body: JSON.stringify({
                  reveal_key: item.phoneRevealKey,
                  type: 'post',
                }),
              }
            )
              .then(function(r) { return r.ok ? r.json() : null; })
              .then(function(data) {
                doneCount++;
                if (data && data.revealed_number) {
                  var ph = String(data.revealed_number).replace(/[^\d]/g, '');
                  if (/^01[0125]\d{8}$/.test(ph)
                      && ph !== (BLOCKED_USER && BLOCKED_USER.phone)) {
                    item.sellerPhone = ph;
                    revealedCount++;
                  }
                }
                if (doneCount === todo.length) {
                  console.info('[maksab/opensooq] reveal — done.',
                    revealedCount, '/', todo.length, 'phones revealed');
                }
              })
              .catch(function(e) {
                doneCount++;
                if (doneCount === todo.length) {
                  console.info('[maksab/opensooq] reveal — done.',
                    revealedCount, '/', todo.length, 'phones revealed');
                }
              });
          }, idx * 250);
        });
      });
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
      // For LIST pages, fetch the URL as-is (HTML).
      // For DETAIL pages (URL contains /ar/listing/<id>), fetch the public
      // XML API endpoint instead — /api/v2/listing/<id>. The API returns
      // the listing's <user> element with full_name + phone_number directly,
      // avoiding 1.3 MB of HTML and all the regex/DOM-scraping heuristics.
      // No login required; verified by user across multiple listings.
      var detailMatch = url.match(/\/ar\/listing\/(\d+)/);
      var fetchUrl = detailMatch
        ? 'https://aqarmap.com.eg/api/v2/listing/' + detailMatch[1]
        : url;
      var isApi = !!detailMatch;
      var fetchOpts = isApi
        ? { credentials: 'omit', headers: { 'Accept': 'application/xml' } }
        : { credentials: 'omit' };
      return fetch(fetchUrl, fetchOpts)
        .then(function(r){
          if (isApi) {
            console.info('[maksab/aqarmap/api] fetch', fetchUrl, '→ status:', r.status,
              '| content-type:', r.headers.get('content-type') || '?');
          }
          if (!r.ok && r.status >= 400 && r.status < 500) {
            // 4xx is permanent (listing deleted/forbidden) — flag for caller
            // so the retry layer can skip further attempts.
            var err = new Error('HTTP ' + r.status);
            err.status = r.status;
            err.permanent = true;
            throw err;
          }
          return r.text();
        })
        .then(function(body){
          // API returns XML, list pages return HTML — parse accordingly.
          var doc = new DOMParser().parseFromString(
            body,
            isApi ? 'text/xml' : 'text/html'
          );
          if (isApi) {
            var hasParseError = doc.querySelector('parsererror');
            console.info('[maksab/aqarmap/api] body length:', body.length,
              '| parse error:', !!hasParseError,
              '| body head:', body.substring(0, 200));
          }
          return { html: body, doc: doc };
        });
    },

    // Recursively find listings array in a deeply-nested JSON structure.
    // Aqarmap puts data under pageProps.listings OR pageProps.dehydratedState.queries[N].state.data
    _findListings: function(obj, depth) {
      if (depth > 8 || !obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        if (obj.length >= 3 && obj[0] && typeof obj[0] === 'object'
            && (obj[0].title || obj[0].name || obj[0].id || obj[0].slug || obj[0].url
                || obj[0].listing_id || obj[0].property_id || obj[0].unit_id
                || obj[0].space || obj[0].area_sqm || obj[0].rooms || obj[0].bedrooms)) {
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

      console.info('[maksab/aqarmap] parseList — html length:', html.length);

      // ─── Diagnostic: log all <script id="..."> tags found ───
      var scriptIds = [];
      var idPattern = /<script[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
      var idMatch;
      while ((idMatch = idPattern.exec(html)) !== null) {
        scriptIds.push(idMatch[1]);
        if (scriptIds.length >= 20) break;
      }
      console.info('[maksab/aqarmap] script tag IDs:', scriptIds);

      // ─── Diagnostic: detect common SSR data globals ───
      var ssrPatterns = [
        '__NEXT_DATA__', '__APOLLO_STATE__', '__INITIAL_STATE__',
        '__NUXT__', '__PRELOADED_STATE__', '__REACT_QUERY_STATE__',
        '__REDUX_STATE__',
      ];
      var ssrFound = ssrPatterns.filter(function(p) { return html.indexOf(p) >= 0; });
      console.info('[maksab/aqarmap] SSR markers in HTML:', ssrFound);

      // Strategy 1: __NEXT_DATA__ — match server-side aqarmap.ts strategy order
      var m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      console.info('[maksab/aqarmap] __NEXT_DATA__ found:', !!m);
      if (m) {
        try {
          var data = JSON.parse(m[1]);
          var pageProps = (data && data.props && data.props.pageProps) || {};
          console.info('[maksab/aqarmap] pageProps keys:', Object.keys(pageProps));

          // Strategy 1a: pageProps.listings | properties | units | results (direct arrays)
          var directListings = pageProps.listings || pageProps.properties || pageProps.units || pageProps.results;
          if (!Array.isArray(directListings) || directListings.length === 0) directListings = null;
          console.info('[maksab/aqarmap] Strategy 1a (pageProps direct) →',
            directListings ? directListings.length + ' items' : 'none');

          // Strategy 1b: dehydratedState.queries (React Query / TanStack Query)
          if (!directListings && pageProps.dehydratedState && Array.isArray(pageProps.dehydratedState.queries)) {
            console.info('[maksab/aqarmap] Strategy 1b — dehydratedState.queries count:', pageProps.dehydratedState.queries.length);
            for (var qi = 0; qi < pageProps.dehydratedState.queries.length; qi++) {
              var q = pageProps.dehydratedState.queries[qi];
              var qData = q && q.state && q.state.data;
              var qItems = Array.isArray(qData) ? qData
                : (qData && typeof qData === 'object' && Array.isArray(qData.data)) ? qData.data
                : (qData && typeof qData === 'object' && Array.isArray(qData.listings)) ? qData.listings
                : (qData && typeof qData === 'object' && Array.isArray(qData.properties)) ? qData.properties
                : null;
              if (qItems && qItems.length > 0) {
                console.info('[maksab/aqarmap] Strategy 1b hit — query[' + qi + '] →', qItems.length, 'items, keys:', qItems[0] ? Object.keys(qItems[0]).slice(0, 12) : []);
                directListings = qItems;
                break;
              }
            }
          }

          // Strategy 1c: recursive fallback (existing heuristic)
          var listings = directListings || PLATFORMS.aqarmap._findListings(data, 0);
          if (!directListings) {
            console.info('[maksab/aqarmap] Strategy 1c (recursive) →',
              listings ? listings.length + ' items' : 'none');
          }

          if (listings && listings.length > 0) {
            var seenUrls = {};
            for (var i = 0; i < listings.length; i++) {
              var it = listings[i];
              var title = String(it.title || it.name || it.heading || '').trim();
              var id = it.id || it.listing_id || it.property_id || it.unit_id;
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
            console.info('[maksab/aqarmap] __NEXT_DATA__ strategies produced', items.length, 'items');
            if (items.length > 0) return items;
          }
        } catch (e) {
          console.warn('[maksab/aqarmap] __NEXT_DATA__ parse threw:', e && e.message);
        }
      }

      // DIAGNOSTIC: Scan _R_ script for broker/agency/developer/company keys
      // BEFORE running JSON-LD strategy. AqarMap is a real-estate marketplace
      // dominated by agencies — their names should be in the SSR store. We
      // need to find the JSON path so parseList can extract them per listing.
      try {
        var rDiagMatch = html.match(/<script[^>]*\bid=["'](_R_|__R__)["'][^>]*>([\s\S]*?)<\/script>/i);
        console.info('[maksab/aqarmap] DIAG _R_ script matched:', !!rDiagMatch,
          '| body length:', rDiagMatch ? rDiagMatch[2].length : 0);
        if (rDiagMatch) {
          var rDiagBody = rDiagMatch[2].trim();
          // Log first/last 200 chars so we know the wrapper shape.
          console.info('[maksab/aqarmap] DIAG _R_ body head:',
            rDiagBody.substring(0, 200));
          console.info('[maksab/aqarmap] DIAG _R_ body tail:',
            rDiagBody.substring(Math.max(0, rDiagBody.length - 200)));
          var rDiagParsed = null;
          var rParseAttempt = null;
          try { rDiagParsed = JSON.parse(rDiagBody); rParseAttempt = 'direct'; } catch (_) {}
          if (!rDiagParsed) {
            var jpD = rDiagBody.match(/JSON\.parse\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/);
            if (jpD) {
              try {
                var innerD = JSON.parse(jpD[1] + jpD[2] + jpD[1]);
                rDiagParsed = JSON.parse(innerD);
                rParseAttempt = 'JSON.parse(escaped)';
              } catch (__) {}
            }
          }
          if (!rDiagParsed) {
            var assignMatch = rDiagBody.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
            if (assignMatch) {
              try { rDiagParsed = JSON.parse(assignMatch[1]); rParseAttempt = 'assignment'; } catch (___) {}
            }
          }
          if (!rDiagParsed) {
            var oD = rDiagBody.match(/(\{[\s\S]*\})/);
            if (oD) { try { rDiagParsed = JSON.parse(oD[1]); rParseAttempt = 'greedy-{}'; } catch (____) {} }
          }
          console.info('[maksab/aqarmap] DIAG _R_ parsed:', !!rDiagParsed,
            '| via:', rParseAttempt || 'NONE');

          if (rDiagParsed) {
            console.info('[maksab/aqarmap] DIAG _R_ top keys:',
              Object.keys(rDiagParsed).slice(0, 20));
            // Walk the tree, collect any object whose key matches a known
            // seller-shape pattern. Capture path + a sample of its content.
            var sellerKeys = /^(broker|brokers|agent|agents|developer|developers|company|agency|agencies|lister|realtor|owner|owners|user|users|seller|sellers|advertiser)$/i;
            var findings = [];
            (function walk(obj, path, depth) {
              if (depth > 8 || !obj || typeof obj !== 'object' || findings.length >= 8) return;
              if (Array.isArray(obj)) {
                for (var ai = 0; ai < Math.min(obj.length, 3); ai++) {
                  walk(obj[ai], path + '[' + ai + ']', depth + 1);
                }
                return;
              }
              for (var k in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
                if (sellerKeys.test(k) && obj[k] && typeof obj[k] === 'object') {
                  var v = obj[k];
                  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') v = v[0];
                  findings.push({
                    path: path + '.' + k,
                    keys: Object.keys(v || {}).slice(0, 8),
                    name: v && (v.name || v.displayName || v.title) || null,
                    id: v && (v.id || v._id) || null,
                  });
                  if (findings.length >= 8) return;
                }
                walk(obj[k], path + '.' + k, depth + 1);
                if (findings.length >= 8) return;
              }
            })(rDiagParsed, '', 0);
            console.info('[maksab/aqarmap] DIAG _R_ seller-shape findings:', JSON.stringify(findings));

            // Also: dump first listing item's full keys (so we know where
            // broker info is attached relative to the listing object).
            var allListings = PLATFORMS.aqarmap._findListings(rDiagParsed, 0);
            console.info('[maksab/aqarmap] DIAG _R_ _findListings count:',
              allListings ? allListings.length : 'null');
            if (allListings && allListings.length > 0) {
              var firstL = allListings[0];
              console.info('[maksab/aqarmap] DIAG _R_ FIRST LISTING all keys:',
                Object.keys(firstL).slice(0, 30));
              var brokerLikeKeys = Object.keys(firstL).filter(function(k){
                return /broker|agent|developer|company|agency|owner|user|seller|lister|realtor|advertiser|publisher|partner|account/i.test(k);
              });
              console.info('[maksab/aqarmap] DIAG _R_ FIRST LISTING broker-like keys:',
                brokerLikeKeys);
              for (var bk = 0; bk < brokerLikeKeys.length; bk++) {
                var bv = firstL[brokerLikeKeys[bk]];
                console.info('[maksab/aqarmap] DIAG _R_ FIRST LISTING.' + brokerLikeKeys[bk] + ':',
                  typeof bv === 'object' ? JSON.stringify(bv).substring(0, 300) : bv);
              }
            }
          }
        }
      } catch (eDiag) {
        console.warn('[maksab/aqarmap] DIAG _R_ diagnostic threw:', eDiag && eDiag.message);
      }

      // ALSO scan the raw HTML for broker/agent/developer JSON shapes that
      // might be in __next_f.push streaming chunks (not in _R_ at all).
      try {
        var streamFindings = [];
        var streamPats = [
          /\\?"developer\\?"\s*:\s*\{[\s\S]{0,400}?\\?"name\\?"\s*:\s*\\?"([^"\\]{2,80})\\?"/g,
          /\\?"broker\\?"\s*:\s*\{[\s\S]{0,400}?\\?"name\\?"\s*:\s*\\?"([^"\\]{2,80})\\?"/g,
          /\\?"agency\\?"\s*:\s*\{[\s\S]{0,400}?\\?"name\\?"\s*:\s*\\?"([^"\\]{2,80})\\?"/g,
          /\\?"company\\?"\s*:\s*\{[\s\S]{0,400}?\\?"name\\?"\s*:\s*\\?"([^"\\]{2,80})\\?"/g,
          /\\?"lister\\?"\s*:\s*\{[\s\S]{0,400}?\\?"name\\?"\s*:\s*\\?"([^"\\]{2,80})\\?"/g,
          /\\?"user\\?"\s*:\s*\{[\s\S]{0,400}?\\?"name\\?"\s*:\s*\\?"([^"\\]{2,80})\\?"/g,
          /\\?"contactInfo\\?"\s*:\s*\{[\s\S]{0,400}?\\?"name\\?"\s*:\s*\\?"([^"\\]{2,80})\\?"/g,
        ];
        for (var sp = 0; sp < streamPats.length; sp++) {
          var pm;
          var count = 0;
          while ((pm = streamPats[sp].exec(html)) !== null && count < 5) {
            streamFindings.push({ pattern: streamPats[sp].source.substring(0, 30), name: pm[1] });
            count++;
          }
        }
        console.info('[maksab/aqarmap] DIAG raw-html broker/agency name patterns:',
          JSON.stringify(streamFindings.slice(0, 12)));
      } catch (eStream) {
        console.warn('[maksab/aqarmap] DIAG stream-pattern scan threw:', eStream && eStream.message);
      }

      // DIAGNOSTIC: DOM scan — agency badges are typically rendered as
      // <img> with alt text containing the agency name, or as small
      // <span>/<div> elements with class names like "agency", "broker",
      // "developer", "publisher". Even if AqarMap hydrates these
      // client-side, the SSR HTML may include placeholder elements with
      // useful attributes.
      try {
        var domFindings = { agencyImages: [], agencyTextNodes: [] };
        if (doc) {
          // Images near listing cards with alt text
          var allImgs = doc.querySelectorAll('img[alt]');
          for (var di = 0; di < allImgs.length && domFindings.agencyImages.length < 30; di++) {
            var img = allImgs[di];
            var alt = (img.getAttribute('alt') || '').trim();
            // Lazy-load: real URL is in data-src/data-srcset until scrolled.
            var src = img.getAttribute('src') || '';
            var dataSrc = img.getAttribute('data-src') || '';
            var dataSrcset = img.getAttribute('data-srcset') || '';
            var combined = src + ' ' + dataSrc + ' ' + dataSrcset;
            // Only collect images that explicitly look like agency logos —
            // either /logo/ in any URL field, or alt mentions agency keywords.
            if (combined.indexOf('/logo/') >= 0
                || /(real\s*estate|development|brokers?|agency|builders?|investments?|للعقارات|تطوير)/i.test(alt)) {
              domFindings.agencyImages.push({
                alt: alt.substring(0, 80),
                src: (dataSrc || src).substring(0, 100),
              });
            }
          }

          // Elements with agency-related class names
          var agencyEls = doc.querySelectorAll(
            '[class*="agency" i], [class*="broker" i], [class*="developer" i], ' +
            '[class*="publisher" i], [class*="company-name" i], [class*="badge" i]'
          );
          for (var de = 0; de < agencyEls.length && domFindings.agencyTextNodes.length < 8; de++) {
            var el = agencyEls[de];
            var txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
            var cls = el.className || '';
            if (txt && txt.length >= 2 && txt.length <= 80) {
              domFindings.agencyTextNodes.push({
                cls: String(cls).substring(0, 60),
                text: txt.substring(0, 80),
              });
            }
          }
        }
        console.info('[maksab/aqarmap] DIAG DOM agency findings — images:',
          JSON.stringify(domFindings.agencyImages));
        console.info('[maksab/aqarmap] DIAG DOM agency findings — text nodes:',
          JSON.stringify(domFindings.agencyTextNodes));
      } catch (eDom) {
        console.warn('[maksab/aqarmap] DIAG DOM scan threw:', eDom && eDom.message);
      }

      // DIAGNOSTIC: Dump full JSON-LD node list with their full key sets.
      // Previous logs only showed the FIRST node's keys (Organization). The
      // RealEstateListing node may have seller/provider/offers fields we
      // haven't seen yet.
      try {
        var ldDiagAll = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
        for (var ldi2 = 0; ldi2 < ldDiagAll.length; ldi2++) {
          var ldI = ldDiagAll[ldi2].match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          if (!ldI) continue;
          try {
            var ldP = JSON.parse(ldI[1].trim());
            var ldNodes2 = Array.isArray(ldP) ? ldP : (ldP['@graph'] && Array.isArray(ldP['@graph']) ? ldP['@graph'] : [ldP]);
            for (var ln2 = 0; ln2 < ldNodes2.length; ln2++) {
              var nd2 = ldNodes2[ln2];
              if (!nd2 || typeof nd2 !== 'object') continue;
              console.info('[maksab/aqarmap] DIAG ld+json#' + ldi2 + ' node[' + ln2 + ']',
                'type:', nd2['@type'],
                '| ALL keys:', Object.keys(nd2));
              // For RealEstateListing or similar, also dump nested seller/provider
              if (/RealEstate|Product|Offer|ItemList/i.test(String(nd2['@type']))) {
                ['seller', 'provider', 'offers', 'author', 'itemListElement'].forEach(function(k) {
                  if (nd2[k]) {
                    var sample = nd2[k];
                    if (Array.isArray(sample) && sample.length > 0) sample = sample[0];
                    console.info('[maksab/aqarmap]   .' + k + ':',
                      typeof sample === 'object' ? JSON.stringify(sample).substring(0, 250) : sample);
                  }
                });
              }
            }
          } catch (e) { /* skip */ }
        }
      } catch (eLd) {
        console.warn('[maksab/aqarmap] DIAG full ld+json scan threw:', eLd && eLd.message);
      }

      // Strategy 2: JSON-LD ItemList — order-agnostic regex (matches
      // type="application/ld+json" wherever it appears in the script tag,
      // including AqarMap's `<script id="search-schema" type="...">`).
      var ldMatches = html.match(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
      console.info('[maksab/aqarmap] Strategy 2 (JSON-LD) — script tags found:', ldMatches.length);
      for (var li = 0; li < ldMatches.length; li++) {
        var innerMatch = ldMatches[li].match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (!innerMatch) continue;
        try {
          var ld = JSON.parse(innerMatch[1]);
          // ld may be an object OR an array of objects; flatten and look
          // for an ItemList (search results) or list of Place / Product.
          var ldList = Array.isArray(ld) ? ld : [ld];
          for (var lk = 0; lk < ldList.length; lk++) {
            var ldItem = ldList[lk];
            // Direct ItemList shape
            var elements = null;
            if (ldItem && ldItem['@type'] === 'ItemList' && Array.isArray(ldItem.itemListElement)) {
              elements = ldItem.itemListElement;
            }
            // Some schemas nest under @graph
            if (!elements && ldItem && Array.isArray(ldItem['@graph'])) {
              for (var gi = 0; gi < ldItem['@graph'].length; gi++) {
                var g = ldItem['@graph'][gi];
                if (g && g['@type'] === 'ItemList' && Array.isArray(g.itemListElement)) {
                  elements = g.itemListElement;
                  break;
                }
              }
            }
            if (!elements) continue;
            console.info('[maksab/aqarmap] Strategy 2 hit — script', li, '→', elements.length, 'items');
            for (var lj = 0; lj < elements.length; lj++) {
              var el = elements[lj];
              var item = el.item || el;
              if (!item || (!item.url && !item.name)) continue;
              var rawUrl = String(item.url || '');
              var cleanUrl = rawUrl ? rawUrl.split('?')[0].split('#')[0] : null;
              if (!cleanUrl) continue;
              if (cleanUrl.charAt(0) === '/') cleanUrl = BASE + cleanUrl;
              // Price: offers.price OR offers[0].price
              var ldPrice = null;
              if (item.offers) {
                var off = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                if (off && off.price != null) {
                  ldPrice = parseInt(String(off.price).replace(/[^\d]/g, ''), 10) || null;
                }
              }
              // Address: nested address object (PostalAddress) usually
              var addr = item.address || (item.location && item.location.address) || {};
              var locParts = [
                addr.streetAddress, addr.addressLocality, addr.addressRegion,
              ].filter(function(x) { return x; });
              var ldLocation = locParts.length > 0 ? locParts.join(', ') : (ctx.governorateLabel || '');
              // Image
              var ldImg = item.image;
              if (Array.isArray(ldImg)) ldImg = ldImg[0];
              if (ldImg && typeof ldImg === 'object') ldImg = ldImg.url || ldImg.contentUrl;
              items.push({
                url: cleanUrl,
                external_id: String(item.identifier || item.sku || (cleanUrl.match(/\/(\d+)/) || [])[1] || ''),
                title: String(item.name || ''),
                description: item.description || '',
                price: ldPrice,
                thumbnailUrl: ldImg ? String(ldImg) : null,
                location: ldLocation,
                city: addr.addressLocality || ctx.governorateLabel || '',
                area: addr.streetAddress || '',
                sellerPhone: null,
                sellerName: null,
                sellerProfileUrl: null,
                dateText: String(item.datePosted || item.dateModified || ''),
                isVerified: false,
                isBusiness: false,
                isFeatured: false,
                supportsExchange: false,
                isNegotiable: false,
                category: ctx.categoryLabel,
              });
            }
            if (items.length > 0) {
              PLATFORMS.aqarmap._enrichAgenciesFromDom(items, doc);
              return items;
            }
          }
        } catch (e) { /* skip */ }
      }
      // Strategy 2.5: AqarMap's SSR store — script id="_R_" (custom Next.js
      // build; real ID has single underscores, verified from script IDs log).
      // Content is usually JSON.parse("...") or a raw JSON object.
      var rMatch = html.match(/<script[^>]*\bid=["'](_R_|__R__)["'][^>]*>([\s\S]*?)<\/script>/i);
      console.info('[maksab/aqarmap] _R_ script found:', !!rMatch,
        'body length:', rMatch ? rMatch[2].length : 0);
      if (rMatch) {
        var rBody = rMatch[2].trim();
        // Log a preview so we can see the body shape if parsing fails
        console.info('[maksab/aqarmap] _R_ body preview (first 200 chars):',
          rBody.substring(0, 200));
        var rParsed = null;
        // Try direct JSON first
        try { rParsed = JSON.parse(rBody); } catch (_) {}
        // Try JSON.parse("<escaped>") pattern
        if (!rParsed) {
          var jpMatch = rBody.match(/JSON\.parse\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/);
          if (jpMatch) {
            try {
              // Unescape the string literal by letting JSON parse it as a string first
              var inner = JSON.parse(jpMatch[1] + jpMatch[2] + jpMatch[1]);
              rParsed = JSON.parse(inner);
            } catch (__) {}
          }
        }
        // Try `window.XYZ = {...}` assignment
        if (!rParsed) {
          var assignR = rBody.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
          if (assignR) { try { rParsed = JSON.parse(assignR[1]); } catch (___) {} }
        }
        // Try wrapped in self-invoking function or similar
        if (!rParsed) {
          var objMatch = rBody.match(/(\{[\s\S]*\})/);
          if (objMatch) { try { rParsed = JSON.parse(objMatch[1]); } catch (____) {} }
        }
        console.info('[maksab/aqarmap] _R_ parsed:', !!rParsed);
        if (rParsed) {
          console.info('[maksab/aqarmap] __R__ parsed. Top keys:', Object.keys(rParsed).slice(0, 15));
          var rListings = PLATFORMS.aqarmap._findListings(rParsed, 0);
          if (rListings && rListings.length > 0) {
            console.info('[maksab/aqarmap] __R__ listings found:', rListings.length,
              'first item keys:', Object.keys(rListings[0]).slice(0, 15));
            for (var ri = 0; ri < rListings.length; ri++) {
              var rit = rListings[ri];
              // Skip Schema.org / JSON-LD entries
              if (rit['@type'] || rit['@id']) continue;
              var rid = rit.id || rit.listing_id || rit.property_id || rit.unit_id;
              var rtitle = String(rit.title || rit.name || rit.heading || '').trim();
              if (!rtitle && !rid) continue;
              var rurl = rit.url || rit.link || (rit.slug ? BASE + '/ar/' + rit.slug : (rid ? BASE + '/ar/listing/' + rid : null));
              if (!rurl) continue;
              if (rurl.charAt(0) === '/') rurl = BASE + rurl;
              var rprice = null;
              var rawRPrice = rit.price != null ? rit.price : (rit.salePrice != null ? rit.salePrice : rit.rentPrice);
              if (rawRPrice != null) {
                if (typeof rawRPrice === 'number') rprice = rawRPrice;
                else if (typeof rawRPrice === 'object') rprice = parseInt(String(rawRPrice.value || rawRPrice.amount || '').replace(/[^\d]/g, ''), 10) || null;
                else rprice = parseInt(String(rawRPrice).replace(/[^\d]/g, ''), 10) || null;
              }
              items.push({
                url: String(rurl).split('?')[0],
                external_id: String(rid || ''),
                title: rtitle || ('عقار #' + (rid || '')),
                description: rit.description || '',
                price: rprice,
                thumbnailUrl: (rit.photos && rit.photos[0]) ? (typeof rit.photos[0] === 'string' ? rit.photos[0] : rit.photos[0].url || rit.photos[0].file) : (rit.mainPhoto || rit.image || rit.thumbnail || null),
                location: ((rit.area && rit.area.name) || rit.areaName || rit.neighborhood || '') + ', ' + ((rit.city && rit.city.name) || rit.cityName || ''),
                city: (rit.city && rit.city.name) || rit.cityName || ctx.governorateLabel || '',
                area: (rit.area && rit.area.name) || rit.areaName || rit.neighborhood || '',
                sellerPhone: null,
                sellerName: (rit.user && rit.user.name) || (rit.owner && rit.owner.name) || (rit.agent && rit.agent.name) || null,
                sellerProfileUrl: null,
                dateText: String(rit.createdAt || rit.created_at || rit.publishedAt || rit.date || ''),
                isVerified: !!(rit.isVerified || rit.verified || (rit.user && rit.user.isVerified)),
                isBusiness: !!(rit.is_broker || rit.isBroker || (rit.user && (rit.user.type === 'broker' || rit.user.type === 'agent'))),
                isFeatured: !!(rit.isFeatured || rit.featured || rit.isPremium),
                supportsExchange: false,
                isNegotiable: !!(rit.isNegotiable || rit.is_negotiable),
                category: ctx.categoryLabel,
              });
            }
            if (items.length > 0) {
              console.info('[maksab/aqarmap] Strategy 2.5 (__R__) produced', items.length, 'items');
              return items;
            }
          }
        }
      }

      // Strategy 3: Aggressive script scanner — find any <script> whose body
      // looks like JSON containing property listings (title + price/rooms).
      // AqarMap may use a non-standard script ID for SSR state.
      var scriptBlocks = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
      console.info('[maksab/aqarmap] Strategy 3 — total script blocks:', scriptBlocks.length);
      var jsonCandidates = 0;
      for (var sb = 0; sb < scriptBlocks.length; sb++) {
        var bodyMatch = scriptBlocks[sb].match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (!bodyMatch) continue;
        var body = bodyMatch[1].trim();
        if (body.length < 200) continue;
        // Quick heuristic: must mention listing-like fields
        if (!/("title"|"name"|"property")/i.test(body)) continue;
        if (!/("price"|"rooms"|"bedrooms"|"area")/i.test(body)) continue;
        jsonCandidates++;
        // Try to parse as JSON, or extract JSON from a `var x = {...}` assignment
        var parsedAny = null;
        try { parsedAny = JSON.parse(body); }
        catch (_) {
          var assign = body.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
          if (assign) { try { parsedAny = JSON.parse(assign[1]); } catch (__) {} }
        }
        if (!parsedAny) continue;
        var found3 = PLATFORMS.aqarmap._findListings(parsedAny, 0);
        if (found3 && found3.length > 0) {
          // Reject Schema.org / JSON-LD entries — those have @type/@id and
          // represent breadcrumbs / structured data, not real listings.
          var firstKeys = Object.keys(found3[0] || {});
          if (found3[0] && (found3[0]['@type'] || found3[0]['@id'] || firstKeys.indexOf('@type') >= 0)) {
            console.info('[maksab/aqarmap] Strategy 3 skipping script #' + sb + ' — Schema.org breadcrumbs, not listings');
            continue;
          }
          console.info('[maksab/aqarmap] Strategy 3 hit — script #' + sb + ' →',
            found3.length, 'items, first item keys:', firstKeys.slice(0, 12));
          for (var fi = 0; fi < found3.length; fi++) {
            var fit = found3[fi];
            if (fit['@type'] || fit['@id']) continue;
            var fid = fit.id || fit.listing_id || fit.property_id || fit.unit_id;
            var ftitle = String(fit.title || fit.name || fit.heading || ('عقار #' + (fid || ''))).trim();
            var furl = fit.url || fit.link || (fit.slug ? BASE + '/ar/' + fit.slug : (fid ? BASE + '/ar/listing/' + fid : null));
            if (!furl) continue;
            if (furl.charAt(0) === '/') furl = BASE + furl;
            items.push({
              url: String(furl).split('?')[0],
              external_id: String(fid || ''),
              title: ftitle,
              description: fit.description || '',
              price: fit.price ? (parseInt(String(fit.price).replace(/[^\d]/g, ''), 10) || null) : null,
              thumbnailUrl: (fit.photos && fit.photos[0]) ? (typeof fit.photos[0] === 'string' ? fit.photos[0] : fit.photos[0].url) : (fit.image || fit.thumbnail || null),
              location: ((fit.area && fit.area.name) || fit.areaName || '') + ', ' + ((fit.city && fit.city.name) || fit.cityName || ''),
              city: (fit.city && fit.city.name) || fit.cityName || '',
              area: (fit.area && fit.area.name) || fit.areaName || '',
              sellerPhone: null, sellerName: null, sellerProfileUrl: null, dateText: '',
              isVerified: false, isBusiness: false, isFeatured: false,
              supportsExchange: false, isNegotiable: false,
              category: ctx.categoryLabel,
            });
          }
          if (items.length > 0) break;
        }
      }
      console.info('[maksab/aqarmap] Strategy 3 — script JSON candidates:', jsonCandidates);

      // Strategy 4: DOM scan — AqarMap uses Next.js 14 App Router with
      // streaming (__next_f.push), no __NEXT_DATA__. Real listing URLs have
      // the shape /ar/listing/<digits>-<slug>, confirmed from browser address
      // bar. Target these directly and extract card data from the wrapper.
      var listingAnchors = doc.querySelectorAll('a[href*="/ar/listing/"]');
      console.info('[maksab/aqarmap] Strategy 4 (DOM) listing anchors:', listingAnchors.length);

      // Still log a sample of all /ar/ anchors for diagnostic if listingAnchors is 0
      var anchors = doc.querySelectorAll('a[href*="/listing/"], a[href*="/property/"], a[href*="/ar/"]');
      console.info('[maksab/aqarmap] Strategy 4 (DOM) anchors:', anchors.length);
      var anchorSamples = [];
      for (var as = 0; as < Math.min(anchors.length, 10); as++) {
        anchorSamples.push(anchors[as].getAttribute('href'));
      }
      console.info('[maksab/aqarmap] sample anchor hrefs:', anchorSamples);

      if (listingAnchors.length > 0) {
        var seenL = {};
        for (var la = 0; la < listingAnchors.length; la++) {
          var lAnchor = listingAnchors[la];
          var lHref = lAnchor.getAttribute('href') || '';
          if (!lHref) continue;
          var lFull = lHref.charAt(0) === '/' ? BASE + lHref : lHref;
          var lClean = lFull.split('?')[0].split('#')[0];
          if (seenL[lClean]) continue;
          seenL[lClean] = 1;

          // Extract numeric listing id from URL: /ar/listing/6902426-...
          var idMatch = lClean.match(/\/ar\/listing\/(\d+)/);
          var lId = idMatch ? idMatch[1] : '';

          // Walk up to find a card wrapper that includes price text. The
          // immediate `closest('article|li|card')` may be too tight (e.g.
          // wraps only the image+title), with the price living one parent
          // level up. Walk up to 5 ancestors and pick the first that has
          // a price token in its text.
          var lCard = lAnchor.closest('article, li, [class*="card" i], [class*="listing" i], [class*="property" i]') || lAnchor.parentElement;
          var widerCard = lCard;
          var probe = lCard;
          for (var up = 0; up < 5 && probe; up++) {
            var t = (probe.textContent || '');
            if (/(?:ج\.?م|جنيه|EGP)/.test(t)) { widerCard = probe; break; }
            probe = probe.parentElement;
          }

          // Title — card heading or anchor's own text
          var lTitle = '';
          if (lCard) {
            var hEl = lCard.querySelector('h1, h2, h3, h4, [class*="title" i], [class*="heading" i]');
            if (hEl) lTitle = (hEl.textContent || '').trim();
          }
          if (!lTitle) lTitle = (lAnchor.getAttribute('title') || lAnchor.getAttribute('aria-label') || lAnchor.textContent || '').trim();
          if (!lTitle || lTitle.length < 3) continue;

          // Price — search in widerCard (may be ancestor of lCard).
          var lPrice = null;
          if (widerCard) {
            var priceText = widerCard.textContent || '';
            // Match a number ≥ 4 digits followed by EGP currency. Excludes
            // small per-meter prices, area sqm (rejected by 4+ digit guard).
            var pm = priceText.match(/(\d[\d,٬]{3,})\s*(?:ج\.?م|جنيه|EGP)/);
            if (pm) lPrice = parseInt(pm[1].replace(/[^\d]/g, ''), 10) || null;
          }

          // Area (sqm)
          var lArea = '';
          if (widerCard) {
            var cardText = widerCard.textContent || '';
            var am = cardText.match(/(\d+)\s*(?:م²|م2|متر)/);
            if (am) lArea = am[1];
          }

          // Thumbnail
          var lImgEl = lCard ? lCard.querySelector('img') : null;
          var lImgSrc = lImgEl ? (lImgEl.getAttribute('src') || lImgEl.getAttribute('data-src') || '') : '';

          items.push({
            url: lClean,
            external_id: lId,
            title: lTitle + (lArea ? ' — ' + lArea + ' م²' : ''),
            description: '',
            price: lPrice,
            thumbnailUrl: lImgSrc || null,
            location: ctx.governorateLabel || '',
            city: ctx.governorateLabel || '',
            area: '',
            sellerPhone: null, sellerName: null, sellerProfileUrl: null, dateText: '',
            isVerified: false, isBusiness: false, isFeatured: false,
            supportsExchange: false, isNegotiable: false,
            category: ctx.categoryLabel,
          });
        }
        console.info('[maksab/aqarmap] Strategy 4 (DOM listing/) produced', items.length, 'items');
      }

      console.info('[maksab/aqarmap] Final items count:', items.length);
      PLATFORMS.aqarmap._enrichAgenciesFromDom(items, doc);
      return items;
    },

    // Walks the parsed DOM looking for <img> tags with src containing /logo/
    // (AqarMap's agency-logo URL pattern, distinct from /search-thumb-webp/
    // for listing photos). The img's alt attribute holds the agency name
    // (e.g., "Sira Real Estate Logo"). For each logo, walk up to the
    // enclosing listing card, find the listing URL, and write the agency
    // name onto the matching item's sellerName field.
    //
    // This is what fills 0/10 → ~10/10 names for AqarMap. The agency
    // names aren't in JSON-LD or _R_ (which is empty); they're rendered
    // as logo images in the listing cards.
    _enrichAgenciesFromDom: function(items, doc) {
      if (!doc || !items || items.length === 0) return;
      var enriched = 0;
      var unmatched = 0;
      // Build a lookup: listing ID → item index. The numeric ID is the
      // most stable key — URLs vary by trailing slash, encoding, etc.
      var byId = {};
      for (var ii = 0; ii < items.length; ii++) {
        var u = items[ii].url || '';
        var idM = u.match(/\/ar\/listing\/(\d+)/);
        if (idM) byId[idM[1]] = ii;
      }
      try {
        var allImgs = doc.querySelectorAll('img');
        var logoImgs = [];
        for (var qi = 0; qi < allImgs.length; qi++) {
          var qImg = allImgs[qi];
          var qSrc = qImg.getAttribute('src') || '';
          var qDataSrc = qImg.getAttribute('data-src') || '';
          var qDataSrcset = qImg.getAttribute('data-srcset') || '';
          var qSrcset = qImg.getAttribute('srcset') || '';
          var combined = qSrc + ' ' + qDataSrc + ' ' + qDataSrcset + ' ' + qSrcset;
          if (combined.indexOf('/logo/') >= 0) logoImgs.push(qImg);
        }
        console.info('[maksab/aqarmap] _enrichAgenciesFromDom — logo candidates found:', logoImgs.length);

        // Reject placeholder alts — AqarMap uses "company-img" / "company-name"
        // as a generic alt when the agency hasn't supplied real branding.
        var ALT_PLACEHOLDERS = /^(company-(?:img|name|logo)|agency-?(?:img|logo)|placeholder|no-?logo)$/i;

        for (var i = 0; i < logoImgs.length; i++) {
          var img = logoImgs[i];
          var alt = (img.getAttribute('alt') || '').trim();
          if (!alt || alt.length < 2) { unmatched++; continue; }
          if (ALT_PLACEHOLDERS.test(alt)) {
            // Don't log as unmatched — these are intentional "no real name"
            unmatched++;
            continue;
          }
          // Strip a trailing " Logo" / "logo" if present.
          var agencyName = alt.replace(/\s+logo\s*$/i, '').trim();
          if (!agencyName || agencyName.length < 2 || agencyName.length > 80) {
            unmatched++;
            continue;
          }
          // Walk up to find the listing card containing this logo, then
          // extract the listing ID from any /ar/listing/<id>... anchor.
          var card = img.closest('article, li, [class*="listing" i], [class*="card" i], [class*="property" i], [class*="result" i]');
          if (!card) {
            console.info('[maksab/aqarmap] _enrich — no card ancestor for logo:', agencyName);
            unmatched++;
            continue;
          }
          var anchor = card.querySelector('a[href*="/ar/listing/"]');
          if (!anchor) {
            console.info('[maksab/aqarmap] _enrich — no /ar/listing anchor in card for logo:', agencyName);
            unmatched++;
            continue;
          }
          var href = anchor.getAttribute('href') || '';
          var idMatch = href.match(/\/ar\/listing\/(\d+)/);
          if (!idMatch) { unmatched++; continue; }
          var idx = byId[idMatch[1]];
          if (idx === undefined) {
            console.info('[maksab/aqarmap] _enrich — listing id not in items:', idMatch[1], 'agency:', agencyName);
            unmatched++;
            continue;
          }
          if (!items[idx].sellerName) {
            items[idx].sellerName = agencyName;
            enriched++;
          }
        }
        console.info('[maksab/aqarmap] _enrichAgenciesFromDom — enriched',
          enriched, '/', items.length, 'items | unmatched logos:', unmatched);
      } catch (e) {
        console.warn('[maksab/aqarmap] _enrichAgenciesFromDom threw:', e && e.message);
      }
    },

    parseDetail: function(html, doc) {
      // fetchPage above redirects detail-page URLs to AqarMap's public XML
      // API at /api/v2/listing/<id>. The response contains a <user> element
      // with <full_name> and <phone_number> directly — no scraping, no
      // regex over HTML, no DOM heuristics. This is a deterministic
      // structural extraction.
      //
      // Smart, precise solution per user request: parse the API response,
      // not the rendered page.
      var result = { phone: null, sellerName: null };
      if (!doc) {
        console.info('[maksab/aqarmap/api] no doc — fetch likely failed');
        return result;
      }

      var selfPhone = (BLOCKED_USER && BLOCKED_USER.phone) || null;
      var selfName = (BLOCKED_USER && BLOCKED_USER.name) || null;
      var AQARMAP_BRAND_NAMES = /^(عقارات\s*مصر|عقار\s*ماب|aqarmap|aqar\s*map)$/i;
      var AQARMAP_BRAND_PHONES = ['01006674484'];

      // <user> is the seller container in the API XML response.
      var userEl = doc.querySelector('user');
      if (!userEl) {
        // Diagnostic: dump root element + first-level children to see what
        // the API actually returned.
        var rootEl = doc.documentElement;
        var rootName = rootEl ? rootEl.nodeName : 'null';
        var firstChildren = [];
        if (rootEl) {
          var kids = rootEl.children;
          for (var k = 0; k < Math.min(kids.length, 5); k++) {
            firstChildren.push(kids[k].nodeName);
          }
        }
        console.info('[maksab/aqarmap/api] no <user> element. root:', rootName,
          '| first children:', firstChildren);
        return result;
      }

      // Name: <full_name> is wrapped in CDATA — DOMParser strips the wrapper.
      var nameEl = userEl.querySelector('full_name');
      if (nameEl) {
        var rawName = (nameEl.textContent || '').trim();
        if (rawName && rawName.length >= 2 && rawName.length <= 80
            && !AQARMAP_BRAND_NAMES.test(rawName)
            && (!selfName || rawName.toLowerCase() !== selfName.toLowerCase())) {
          result.sellerName = rawName;
        }
      }

      // Phone: try multiple known paths in priority order.
      // 1. <user><phone_number>+201145878735</phone_number></user>
      // 2. <user><whatsApp_number><phone><number>...</number></phone></whatsApp_number></user>
      // 3. <user><phone><number>...</number></phone></user>
      var phoneNodes = [
        userEl.querySelector('phone_number'),
        userEl.querySelector('whatsApp_number > phone > number'),
        userEl.querySelector('phone > number'),
      ];
      for (var pn = 0; pn < phoneNodes.length; pn++) {
        if (!phoneNodes[pn]) continue;
        var rawPhone = (phoneNodes[pn].textContent || '').trim();
        var normalized = normalizeEgPhone(rawPhone);
        if (normalized
            && normalized !== selfPhone
            && AQARMAP_BRAND_PHONES.indexOf(normalized) < 0) {
          result.phone = normalized;
          break;
        }
      }

      console.info('[maksab/aqarmap/api] extracted — name:', result.sellerName || 'none',
        '| phone:', result.phone || 'none');

      return result;
    },

    maksabCategory: function() { return 'عقارات'; },
  };

  // Run after all stages are defined
  run();
})();
