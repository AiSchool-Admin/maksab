# مكسب — Automated Harvesting Engine (AHE) v2.0
## محرك الحصاد الآلي — المواصفات التقنية الشاملة والنهائية
### الإصدار: 2.0 Final | مارس 2026
### يحل محل: كل ملفات Pipeline السابقة
### يتكامل مع: maksab_crm_v3_complete.md
### للتنفيذ عبر Claude Code

---

## ⚠️ تعليمات إلزامية لـ Claude Code

### الفلسفة:
> لا يوجد موظف "صيّاد". النظام نفسه هو الصيّاد.
> النظام يعمل 24/7 بصمت — يجمع، يصنّف، يُثري، يُنظف.
> الموظف البشري يركّز فقط على: الإقناع وخدمة العملاء.

### السياق:
- Sprint 1 (DB + Customers + Scoring) ← **مكتمل**
- Sprint 2 (Discovery + Outreach + WhatsApp) ← **مكتمل**
- محرك الحصاد (هذا الملف) ← **المطلوب تنفيذه الآن**

### قبل أي كود:
```
1. اقرأ CRM v3 (maksab_crm_v3_complete.md) كاملاً
2. افحص الكود الفعلي في Sprint 1 & 2
3. تحقق من أسماء الجداول والدوال الموجودة
4. هذا الملف يضيف جداول ودوال جديدة — لا يستبدل الموجود
5. أي تعارض → الكود الفعلي هو المرجع
```

### Stack التقني:
```
Frontend:     Next.js 14+ (App Router) / React 18+ / Tailwind CSS
Backend:      Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
Deployment:   Vercel (Frontend) + Railway (Crons/Workers)
AI:           Claude API (claude-sonnet-4-20250514)
Messaging:    WhatsApp Business Cloud API
```

---

## 🧠 المفهوم الأساسي

### Harvest Scope = المصدر + الفئة + المحافظة + المدينة + التكرار

```
النظام يعرف مسبقاً "أين يبحث" عبر نطاقات محددة:

  Scope #1: دوبيزل + موبايلات + القاهرة + كل المدن + كل 60 دقيقة
  Scope #2: دوبيزل + إلكترونيات + الإسكندرية + سموحة + كل 60 دقيقة
  Scope #3: دوبيزل + سيارات + الجيزة + كل المدن + كل 120 دقيقة
  Scope #4: السوق المفتوح + موبايلات + الإسكندرية + كل 360 دقيقة

كل ساعة (أو حسب الـ interval):
  🕐 Scheduler يفحص: أي Scope حان وقته؟
      ↓
  📡 HARVEST: جلب إعلانات آخر [interval] دقيقة
      ↓
  🔍 DEDUPLICATE: استبعاد المكررات (3 طبقات)
      ↓
  📊 ENRICH: إثراء + Score + استخراج هاتف من الوصف
      ↓
  💾 STORE: حفظ الإعلانات + المعلنين
      ↓
  📨 AUTO-QUEUE: إضافة للتواصل تلقائياً (واتساب)
      ↓
  📈 METRICS: تحديث المقاييس

بعد 24 ساعة: ~1,680 إعلان جديد
بعد 7 أيام:  ~11,760 إعلان
بعد 30 يوم:  ~50,400 إعلان
= قاعدة بيانات السوق المصري — بدون تدخل بشري!
```

### التحكم ثلاثي المستويات:

```
المستوى 1 — المحرك ككل:
  [▶️ تشغيل] [⏸️ إيقاف مؤقت] [⏹️ إيقاف كامل]
  إيقاف مؤقت = الحصادات الجارية تكتمل، لا تبدأ جديدة
  إيقاف كامل = توقف فوري — للطوارئ (حظر IP مثلاً)

المستوى 2 — النطاق الواحد:
  [▶️ تشغيل] [⏸️ إيقاف] [🧪 تجريبي] [⚙️ إعدادات]
  يمكن إيقاف نطاق واحد بدون التأثير على الباقي

المستوى 3 — الإعدادات الدقيقة:
  تغيير التكرار (60→120 دقيقة)
  تغيير التأخير (5→10 ثواني)
  تغيير حد الصفحات (5→3)
  → للتحكم في معدل الجلب وفقاً للنتائج والأمان
```

---

## 📊 قاعدة البيانات الكاملة

### ═══ الجزء 1: جداول الترجمة (Mapping Tables) ═══

```
هذه الجداول تحل مشكلة التوافق بين أسماء الفئات والمحافظات والمدن
على المنصات المختلفة وتطبيق مكسب.

مثال المشكلة:
  دوبيزل يقول "الإسكندرية" في URL: /alexandria/
  مكسب يحفظ: governorate = 'alexandria'
  السوق المفتوح يقول "إسكندرية" في URL: /alexandria/

  دوبيزل يقول "موبايلات" في URL: /mobile-phones/
  مكسب يحفظ: category = 'phones'

الحل: جداول ترجمة مركزية تربط كل تسمية بالتسمية الموحدة.
```

```sql
-- ════════════════════════════════════════════
-- ربط الفئات: مكسب ↔ المنصات المنافسة
-- ════════════════════════════════════════════
CREATE TABLE ahe_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- فئة مكسب (المعيار الموحد)
  maksab_category TEXT NOT NULL,      -- 'phones' | 'electronics' | 'vehicles' | ...
  maksab_category_ar TEXT NOT NULL,   -- 'موبايلات' | 'إلكترونيات' | 'سيارات'
  
  -- المقابل على المنصة المنافسة
  source_platform TEXT NOT NULL,       -- 'dubizzle' | 'opensooq' | 'hatla2ee'
  source_category_name TEXT NOT NULL,  -- الاسم كما يظهر على المنصة: "موبايلات"
  source_url_segment TEXT NOT NULL,    -- الجزء في الـ URL: "mobile-phones-tablets-accessories-numbers/mobile-phones"
  
  -- قالب الرابط الكامل ({gov} يُستبدل بالمحافظة)
  source_url_template TEXT NOT NULL,
    -- "https://www.dubizzle.com.eg/mobile-phones-.../mobile-phones/{gov}/"
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(maksab_category, source_platform)
);

-- ═══ Seed: فئات دوبيزل ═══
INSERT INTO ahe_category_mappings 
(maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template) VALUES
('phones', 'موبايلات', 'dubizzle', 'موبايلات',
 'mobile-phones-tablets-accessories-numbers/mobile-phones',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/{gov}/'),
('electronics', 'إلكترونيات', 'dubizzle', 'أجهزة إلكترونية',
 'electronics-home-appliances',
 'https://www.dubizzle.com.eg/electronics-home-appliances/{gov}/'),
('vehicles', 'سيارات', 'dubizzle', 'سيارات للبيع',
 'vehicles/cars-for-sale',
 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/{gov}/'),
('properties', 'عقارات', 'dubizzle', 'شقق للبيع',
 'properties/apartments-duplex-for-sale',
 'https://www.dubizzle.com.eg/properties/apartments-duplex-for-sale/{gov}/'),
('furniture', 'أثاث', 'dubizzle', 'أثاث المنزل والمكتب',
 'home-furniture-decor',
 'https://www.dubizzle.com.eg/home-furniture-decor/{gov}/'),
('fashion', 'ملابس', 'dubizzle', 'الموضة والجمال',
 'fashion-beauty',
 'https://www.dubizzle.com.eg/fashion-beauty/{gov}/'),
('kids', 'أطفال', 'dubizzle', 'مستلزمات أطفال',
 'kids-babies',
 'https://www.dubizzle.com.eg/kids-babies/{gov}/'),
('sports', 'رياضة', 'dubizzle', 'هوايات',
 'books-sports-hobbies',
 'https://www.dubizzle.com.eg/books-sports-hobbies/{gov}/'),
('pets', 'حيوانات', 'dubizzle', 'حيوانات أليفة',
 'pets',
 'https://www.dubizzle.com.eg/pets/{gov}/'),
('jobs', 'وظائف', 'dubizzle', 'وظائف',
 'jobs',
 'https://www.dubizzle.com.eg/jobs/{gov}/'),
('services', 'خدمات', 'dubizzle', 'خدمات',
 'services',
 'https://www.dubizzle.com.eg/services/{gov}/'),
('other', 'أخرى', 'dubizzle', 'تجارة و صناعة',
 'business-industrial-agriculture',
 'https://www.dubizzle.com.eg/business-industrial-agriculture/{gov}/');


-- ════════════════════════════════════════════
-- ربط المحافظات: مكسب ↔ المنصات المنافسة
-- ════════════════════════════════════════════
CREATE TABLE ahe_governorate_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  maksab_governorate TEXT NOT NULL,     -- 'cairo' | 'alexandria'
  maksab_governorate_ar TEXT NOT NULL,  -- 'القاهرة' | 'الإسكندرية'
  
  source_platform TEXT NOT NULL,
  source_governorate_name TEXT NOT NULL, -- كما يظهر على المنصة: "الإسكندرية"
  source_url_segment TEXT NOT NULL,      -- في الـ URL: "alexandria"
  
  -- تقدير حجم البيانات (لاقتراح الـ interval المناسب)
  estimated_daily_listings INTEGER DEFAULT 100,
  suggested_interval_minutes INTEGER DEFAULT 60,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(maksab_governorate, source_platform)
);

-- ═══ Seed: كل المحافظات المصرية على دوبيزل (27 محافظة) ═══
INSERT INTO ahe_governorate_mappings 
(maksab_governorate, maksab_governorate_ar, source_platform, source_governorate_name, source_url_segment, estimated_daily_listings, suggested_interval_minutes) VALUES
-- محافظات نشطة جداً (كل ساعة)
('cairo', 'القاهرة', 'dubizzle', 'القاهرة', 'cairo', 500, 60),
('alexandria', 'الإسكندرية', 'dubizzle', 'الإسكندرية', 'alexandria', 300, 60),
('giza', 'الجيزة', 'dubizzle', 'الجيزة', 'giza', 200, 60),
-- محافظات متوسطة (كل ساعتين)
('qalyubia', 'القليوبية', 'dubizzle', 'القليوبية', 'qalyubia', 80, 120),
('sharqia', 'الشرقية', 'dubizzle', 'الشرقية', 'sharqia', 60, 120),
('dakahlia', 'الدقهلية', 'dubizzle', 'الدقهلية', 'dakahlia', 50, 120),
-- محافظات أقل نشاطاً (كل 6 ساعات)
('gharbia', 'الغربية', 'dubizzle', 'الغربية', 'gharbia', 30, 360),
('monufia', 'المنوفية', 'dubizzle', 'المنوفية', 'monufia', 25, 360),
('beheira', 'البحيرة', 'dubizzle', 'البحيرة', 'beheira', 25, 360),
('kafr_el_sheikh', 'كفر الشيخ', 'dubizzle', 'كفر الشيخ', 'kafr-el-sheikh', 15, 360),
('damietta', 'دمياط', 'dubizzle', 'دمياط', 'damietta', 20, 360),
('port_said', 'بورسعيد', 'dubizzle', 'بورسعيد', 'port-said', 20, 360),
('ismailia', 'الإسماعيلية', 'dubizzle', 'الإسماعيلية', 'ismailia', 20, 360),
('suez', 'السويس', 'dubizzle', 'السويس', 'suez', 15, 360),
-- محافظات محدودة البيانات (يومياً)
('fayoum', 'الفيوم', 'dubizzle', 'الفيوم', 'fayoum', 10, 1440),
('beni_suef', 'بني سويف', 'dubizzle', 'بني سويف', 'beni-suef', 10, 1440),
('minya', 'المنيا', 'dubizzle', 'المنيا', 'minya', 15, 1440),
('assiut', 'أسيوط', 'dubizzle', 'أسيوط', 'assiut', 15, 1440),
('sohag', 'سوهاج', 'dubizzle', 'سوهاج', 'sohag', 10, 1440),
('qena', 'قنا', 'dubizzle', 'قنا', 'qena', 8, 1440),
('luxor', 'الأقصر', 'dubizzle', 'الأقصر', 'luxor', 10, 1440),
('aswan', 'أسوان', 'dubizzle', 'أسوان', 'aswan', 8, 1440),
('red_sea', 'البحر الأحمر', 'dubizzle', 'البحر الأحمر', 'red-sea', 15, 1440),
('matrouh', 'مطروح', 'dubizzle', 'مطروح', 'matrouh', 8, 1440),
('north_sinai', 'شمال سيناء', 'dubizzle', 'شمال سيناء', 'north-sinai', 5, 1440),
('south_sinai', 'جنوب سيناء', 'dubizzle', 'جنوب سيناء', 'south-sinai', 10, 1440),
('new_valley', 'الوادي الجديد', 'dubizzle', 'الوادي الجديد', 'new-valley', 3, 1440);


-- ════════════════════════════════════════════
-- ربط المدن (اختياري — للتحديد الأدق)
-- ════════════════════════════════════════════
CREATE TABLE ahe_city_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  maksab_governorate TEXT NOT NULL,
  maksab_city TEXT NOT NULL,         -- 'smoha' | 'nasr_city'
  maksab_city_ar TEXT NOT NULL,      -- 'سموحة' | 'مدينة نصر'
  
  source_platform TEXT NOT NULL,
  source_city_name TEXT NOT NULL,    -- كما يظهر على المنصة: "سموحة"
  source_url_segment TEXT NOT NULL,  -- في الـ URL: "smoha"
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(maksab_city, maksab_governorate, source_platform)
);

-- ═══ Seed: مدن الإسكندرية (مثال — أهم المدن) ═══
INSERT INTO ahe_city_mappings 
(maksab_governorate, maksab_city, maksab_city_ar, source_platform, source_city_name, source_url_segment) VALUES
('alexandria', 'agami', 'العجمي', 'dubizzle', 'عجمي', 'agami'),
('alexandria', 'sidi_beshr', 'سيدي بشر', 'dubizzle', 'سيدي بشر', 'sidi-beshr'),
('alexandria', 'smoha', 'سموحة', 'dubizzle', 'سموحة', 'smoha'),
('alexandria', 'seyouf', 'السيوف', 'dubizzle', 'السيوف', 'seyouf'),
('alexandria', 'awayed', 'العوايد', 'dubizzle', 'العوايد', 'awayed'),
('alexandria', 'asafra', 'العصافرة', 'dubizzle', 'العصافرة', 'asafra'),
('alexandria', 'moharam_bik', 'محرم بيك', 'dubizzle', 'محرّم بيك', 'moharam-bik'),
('alexandria', 'mandara', 'المندرة', 'dubizzle', 'المندرة', 'mandara'),
('alexandria', 'miami', 'ميامي', 'dubizzle', 'ميامي', 'miami'),
('alexandria', 'glim', 'جليم', 'dubizzle', 'جليم', 'glim'),
('alexandria', 'sidi_gaber', 'سيدي جابر', 'dubizzle', 'سيدي جابر', 'sidi-gaber'),
('alexandria', 'san_stefano', 'سان ستيفانو', 'dubizzle', 'سان ستيفانو', 'san-stefano'),
('alexandria', 'victoria', 'فيكتوريا', 'dubizzle', 'فيكتوريا', 'victoria'),
-- ═══ مدن القاهرة ═══
('cairo', 'nasr_city', 'مدينة نصر', 'dubizzle', 'مدينة نصر', 'nasr-city'),
('cairo', 'maadi', 'المعادي', 'dubizzle', 'المعادي', 'maadi'),
('cairo', 'heliopolis', 'مصر الجديدة', 'dubizzle', 'مصر الجديدة', 'heliopolis'),
('cairo', 'new_cairo', 'القاهرة الجديدة', 'dubizzle', 'القاهرة الجديدة', 'new-cairo'),
('cairo', 'downtown', 'وسط البلد', 'dubizzle', 'وسط البلد', 'downtown-cairo'),
('cairo', 'shubra', 'شبرا', 'dubizzle', 'شبرا', 'shubra');
-- ... (يُضاف المزيد تدريجياً)
```

### بناء الرابط تلقائياً:

```javascript
// ═══ هذه الدالة تُستخدم عند إنشاء Scope جديد ═══
function buildScopeUrl(categoryMapping, governorateMapping, cityMapping = null) {
  let url;
  
  if (cityMapping) {
    // لو فيه مدينة محددة — نستبدل {gov} بالمدينة
    url = categoryMapping.source_url_template
      .replace('{gov}/', `${cityMapping.source_url_segment}/`);
  } else {
    // كل المدن في المحافظة
    url = categoryMapping.source_url_template
      .replace('{gov}', governorateMapping.source_url_segment);
  }
  
  return url;
}

// ═══ هذه الدالة تُستخدم عند جلب إعلان لتحديد الموقع ═══
function mapLocation(sourceLocationText, sourcePlatform) {
  // المدخل: "سموحة، الإسكندرية" (من دوبيزل)
  
  const parts = sourceLocationText.split('،').map(s => s.trim());
  // parts = ["سموحة", "الإسكندرية"]
  
  // 1. البحث عن المحافظة
  const govMapping = db.query(
    `SELECT * FROM ahe_governorate_mappings 
     WHERE source_platform = $1 
     AND (source_governorate_name = $2 OR source_governorate_name = $3)`,
    [sourcePlatform, parts[1], parts[0]] // ممكن الترتيب يختلف
  );
  
  // 2. البحث عن المدينة
  let cityMapping = null;
  if (govMapping) {
    cityMapping = db.query(
      `SELECT * FROM ahe_city_mappings 
       WHERE source_platform = $1 
       AND maksab_governorate = $2
       AND source_city_name = $3`,
      [sourcePlatform, govMapping.maksab_governorate, parts[0]]
    );
  }
  
  return {
    governorate: govMapping?.maksab_governorate || null,  // 'alexandria'
    city: cityMapping?.maksab_city || null,                // 'smoha'
    source_location: sourceLocationText                    // النص الأصلي
  };
}
```

---

### ═══ الجزء 2: جداول التحكم والتشغيل ═══

```sql
-- ════════════════════════════════════════════
-- حالة المحرك (سجل واحد فقط)
-- ════════════════════════════════════════════
CREATE TABLE ahe_engine_status (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- سجل واحد فقط
  
  status TEXT NOT NULL DEFAULT 'stopped',
    -- 'running'  — يعمل بشكل طبيعي
    -- 'paused'   — متوقف مؤقتاً (الحصادات الجارية تكتمل)
    -- 'stopped'  — متوقف كاملاً (للطوارئ)
  
  -- آخر تغيير
  status_changed_at TIMESTAMPTZ DEFAULT now(),
  status_changed_by UUID,  -- الموظف/المدير اللي غيّر
  status_reason TEXT,       -- "بداية التشغيل" | "صيانة" | "مشكلة أمنية — حظر IP"
  
  -- إحصائيات مباشرة
  active_scopes_count INTEGER DEFAULT 0,
  running_jobs_count INTEGER DEFAULT 0,
  
  -- حدود الأمان العامة
  global_max_concurrent_jobs INTEGER DEFAULT 3,
  global_max_requests_per_hour INTEGER DEFAULT 500,
  current_requests_this_hour INTEGER DEFAULT 0,
  hour_started_at TIMESTAMPTZ DEFAULT now(),
  
  -- Auto-safety: لو عدد الأخطاء تجاوز الحد → auto-pause
  consecutive_errors INTEGER DEFAULT 0,
  auto_pause_threshold INTEGER DEFAULT 10, -- 10 أخطاء متتالية → إيقاف تلقائي
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ Seed: الحالة الأولية ═══
INSERT INTO ahe_engine_status (status, status_reason) 
VALUES ('stopped', 'في انتظار التفعيل الأول');
```

```sql
-- ════════════════════════════════════════════
-- نطاقات الحصاد (المُعرّفة مسبقاً)
-- ════════════════════════════════════════════
CREATE TABLE ahe_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ═══ التعريف ═══
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,  -- 'dub_phones_cairo'
  
  -- ═══ الربط بجداول الترجمة ═══
  source_platform TEXT NOT NULL,  -- 'dubizzle' | 'opensooq' | ...
  maksab_category TEXT NOT NULL,  -- يجب أن يطابق ahe_category_mappings.maksab_category
  governorate TEXT NOT NULL,      -- يجب أن يطابق ahe_governorate_mappings.maksab_governorate
  city TEXT,                      -- NULL = كل المدن | أو يطابق ahe_city_mappings.maksab_city
  
  -- ═══ الرابط (يُبنى تلقائياً من جداول الترجمة) ═══
  base_url TEXT NOT NULL,
  pagination_pattern TEXT DEFAULT '?page={page}',
  
  -- ═══ الجدولة ═══
  harvest_interval_minutes INTEGER NOT NULL DEFAULT 60,
  fetch_depth_minutes INTEGER, -- NULL = نفس الـ interval
  
  -- ═══ حدود الأمان ═══
  max_pages_per_harvest INTEGER DEFAULT 5,
  delay_between_requests_ms INTEGER DEFAULT 5000,
  detail_fetch_enabled BOOLEAN DEFAULT true,
  detail_delay_between_requests_ms INTEGER DEFAULT 5000,
  
  -- ═══ الحالة ═══
  is_active BOOLEAN DEFAULT false, -- يبدأ متوقف — المدير يفعّله
  is_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  
  -- ═══ آخر تنفيذ ═══
  last_harvest_at TIMESTAMPTZ,
  last_harvest_job_id UUID,
  last_harvest_new_listings INTEGER DEFAULT 0,
  last_harvest_new_sellers INTEGER DEFAULT 0,
  next_harvest_at TIMESTAMPTZ,
  
  -- ═══ الإحصائيات التراكمية ═══
  total_harvests INTEGER DEFAULT 0,
  total_listings_found INTEGER DEFAULT 0,
  total_sellers_found INTEGER DEFAULT 0,
  total_phones_extracted INTEGER DEFAULT 0,
  avg_new_listings_per_harvest NUMERIC(6,1) DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  
  -- ═══ صلاحية الإعلانات (قابلة للتخصيص لكل Scope) ═══
  listing_max_age_days INTEGER DEFAULT 30,
  listing_not_seen_hours INTEGER DEFAULT 48,
  seller_inactive_days INTEGER DEFAULT 14,
  renewal_wait_hours INTEGER DEFAULT 72,
  auto_renew_active_sellers BOOLEAN DEFAULT true,
  
  -- ═══ الأولوية ═══
  priority INTEGER DEFAULT 5, -- 1 = أدنى | 10 = أعلى
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ahe_scopes_active ON ahe_scopes(is_active, next_harvest_at)
  WHERE is_active = true AND is_paused = false;
CREATE INDEX idx_ahe_scopes_code ON ahe_scopes(code);

-- ═══ Seed: النطاقات الأولية (14 نطاق — كلها تبدأ متوقفة) ═══
-- المدير يفعّلها تدريجياً بعد الاختبار

INSERT INTO ahe_scopes (code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority) VALUES
-- موبايلات (الأولوية القصوى)
('dub_phones_cairo', 'موبايلات — القاهرة — دوبيزل', 'dubizzle', 'phones', 'cairo',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/cairo/', 60, 5, 10),
('dub_phones_alex', 'موبايلات — الإسكندرية — دوبيزل', 'dubizzle', 'phones', 'alexandria',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/', 60, 5, 10),
('dub_phones_giza', 'موبايلات — الجيزة — دوبيزل', 'dubizzle', 'phones', 'giza',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/giza/', 60, 3, 8),
-- إلكترونيات
('dub_electronics_cairo', 'إلكترونيات — القاهرة — دوبيزل', 'dubizzle', 'electronics', 'cairo',
 'https://www.dubizzle.com.eg/electronics-home-appliances/cairo/', 60, 4, 8),
('dub_electronics_alex', 'إلكترونيات — الإسكندرية — دوبيزل', 'dubizzle', 'electronics', 'alexandria',
 'https://www.dubizzle.com.eg/electronics-home-appliances/alexandria/', 60, 3, 7),
-- سيارات
('dub_vehicles_cairo', 'سيارات — القاهرة — دوبيزل', 'dubizzle', 'vehicles', 'cairo',
 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/cairo/', 120, 5, 7),
('dub_vehicles_alex', 'سيارات — الإسكندرية — دوبيزل', 'dubizzle', 'vehicles', 'alexandria',
 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/alexandria/', 120, 3, 6),
-- عقارات
('dub_properties_cairo', 'عقارات — القاهرة — دوبيزل', 'dubizzle', 'properties', 'cairo',
 'https://www.dubizzle.com.eg/properties/apartments-duplex-for-sale/cairo/', 120, 5, 6),
-- أثاث
('dub_furniture_cairo', 'أثاث — القاهرة — دوبيزل', 'dubizzle', 'furniture', 'cairo',
 'https://www.dubizzle.com.eg/home-furniture-decor/cairo/', 360, 3, 5),
-- محافظات أقل
('dub_phones_qalyubia', 'موبايلات — القليوبية — دوبيزل', 'dubizzle', 'phones', 'qalyubia',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/qalyubia/', 120, 3, 5),
('dub_phones_sharqia', 'موبايلات — الشرقية — دوبيزل', 'dubizzle', 'phones', 'sharqia',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/sharqia/', 360, 3, 3),
('dub_phones_dakahlia', 'موبايلات — الدقهلية — دوبيزل', 'dubizzle', 'phones', 'dakahlia',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/dakahlia/', 360, 3, 3),
('dub_phones_gharbia', 'موبايلات — الغربية — دوبيزل', 'dubizzle', 'phones', 'gharbia',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/gharbia/', 1440, 3, 1),
('dub_phones_fayoum', 'موبايلات — الفيوم — دوبيزل', 'dubizzle', 'phones', 'fayoum',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/fayoum/', 1440, 2, 1);
```

```sql
-- ════════════════════════════════════════════
-- عمليات الحصاد
-- ════════════════════════════════════════════
CREATE TABLE ahe_harvest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID REFERENCES ahe_scopes(id) NOT NULL,
  
  target_from TIMESTAMPTZ NOT NULL,
  target_to TIMESTAMPTZ NOT NULL,
  
  status TEXT DEFAULT 'pending',
    -- 'pending' | 'fetching_list' | 'fetching_details' | 'deduplicating' |
    -- 'enriching' | 'storing' | 'queuing' | 'completed' | 'failed' | 'partial'
  
  pages_fetched INTEGER DEFAULT 0,
  pages_total INTEGER,
  listings_fetched INTEGER DEFAULT 0,
  details_fetched INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  current_step TEXT,
  
  -- النتائج
  listings_total INTEGER DEFAULT 0,
  listings_new INTEGER DEFAULT 0,
  listings_duplicate INTEGER DEFAULT 0,
  listings_expired INTEGER DEFAULT 0,
  sellers_total INTEGER DEFAULT 0,
  sellers_new INTEGER DEFAULT 0,
  sellers_existing INTEGER DEFAULT 0,
  phones_extracted INTEGER DEFAULT 0,
  phones_new INTEGER DEFAULT 0,
  auto_queued INTEGER DEFAULT 0,
  
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ahe_jobs_scope ON ahe_harvest_jobs(scope_id, created_at DESC);
CREATE INDEX idx_ahe_jobs_running ON ahe_harvest_jobs(status) 
  WHERE status IN ('pending', 'fetching_list', 'fetching_details', 'enriching');
```

```sql
-- ════════════════════════════════════════════
-- الإعلانات المحصودة (الجدول المركزي)
-- ════════════════════════════════════════════
CREATE TABLE ahe_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID REFERENCES ahe_scopes(id) NOT NULL,
  harvest_job_id UUID REFERENCES ahe_harvest_jobs(id),
  
  -- هوية الإعلان
  source_platform TEXT NOT NULL,
  source_listing_url TEXT NOT NULL, -- مفتاح التكرار الأساسي
  source_listing_id TEXT,
  
  -- بيانات الإعلان
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'EGP',
  is_negotiable BOOLEAN DEFAULT false,
  supports_exchange BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  condition TEXT,
  payment_method TEXT,
  has_warranty BOOLEAN,
  
  -- الصور
  thumbnail_url TEXT,
  main_image_url TEXT,
  all_image_urls TEXT[] DEFAULT '{}',
  images_downloaded BOOLEAN DEFAULT false,
  local_image_urls TEXT[] DEFAULT '{}',
  
  -- التصنيف (باستخدام Mapping Tables)
  source_category TEXT,
  maksab_category TEXT,
  detected_brand TEXT,
  detected_model TEXT,
  specifications JSONB DEFAULT '{}',
  
  -- الموقع (باستخدام Mapping Tables)
  source_location TEXT,    -- النص الأصلي: "سموحة، الإسكندرية"
  governorate TEXT,        -- بمعيار مكسب: 'alexandria'
  city TEXT,               -- بمعيار مكسب: 'smoha'
  area TEXT,
  
  -- التاريخ
  source_date_text TEXT,
  estimated_posted_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  
  -- المعلن
  seller_name TEXT,
  seller_profile_url TEXT,
  seller_is_verified BOOLEAN DEFAULT false,
  seller_is_business BOOLEAN DEFAULT false,
  seller_badge TEXT,
  ahe_seller_id UUID,
  
  -- الهاتف المستخرج
  extracted_phone TEXT,
  phone_source TEXT,
  
  -- Mapping لمكسب
  mapped_title TEXT,
  mapped_description TEXT,
  mapped_condition TEXT,
  mapped_sale_types TEXT[] DEFAULT '{direct_sale}',
  ai_enhanced BOOLEAN DEFAULT false,
  ai_quality_score INTEGER,
  
  -- حالة النقل
  migration_status TEXT DEFAULT 'harvested',
    -- 'harvested' | 'ready' | 'migrated' | 'skipped'
  maksab_listing_id UUID,
  migrated_at TIMESTAMPTZ,
  
  -- الصلاحية
  is_expired BOOLEAN DEFAULT false,
  expired_at TIMESTAMPTZ,
  expiry_reason TEXT,
  renewal_offered BOOLEAN DEFAULT false,
  renewal_accepted BOOLEAN,
  renewal_offered_at TIMESTAMPTZ,
  
  -- Dedup
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_ahe_listings_url ON ahe_listings(source_listing_url) WHERE is_duplicate = false;
CREATE INDEX idx_ahe_listings_scope ON ahe_listings(scope_id, estimated_posted_at DESC);
CREATE INDEX idx_ahe_listings_seller ON ahe_listings(ahe_seller_id);
CREATE INDEX idx_ahe_listings_phone ON ahe_listings(extracted_phone) WHERE extracted_phone IS NOT NULL;
CREATE INDEX idx_ahe_listings_category ON ahe_listings(maksab_category, governorate);
CREATE INDEX idx_ahe_listings_status ON ahe_listings(migration_status);
CREATE INDEX idx_ahe_listings_expired ON ahe_listings(is_expired) WHERE is_expired = false;
CREATE INDEX idx_ahe_listings_seen ON ahe_listings(last_seen_at);
```

```sql
-- ════════════════════════════════════════════
-- المعلنين المحصودين
-- ════════════════════════════════════════════
CREATE TABLE ahe_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  phone TEXT,
  profile_url TEXT,
  name TEXT,
  avatar_url TEXT,
  source_platform TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_business BOOLEAN DEFAULT false,
  badge TEXT,
  member_since TEXT,
  
  detected_account_type TEXT DEFAULT 'individual',
  primary_category TEXT,
  primary_governorate TEXT,
  operating_areas TEXT[] DEFAULT '{}',
  
  total_listings_seen INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_new_listing_at TIMESTAMPTZ,
  
  priority_score INTEGER DEFAULT 0,
  
  pipeline_status TEXT DEFAULT 'discovered',
    -- 'discovered' | 'phone_found' | 'auto_queued' | 'contacted' | 
    -- 'responded' | 'interested' | 'signed_up' | 'activated' | 'lost'
  
  crm_customer_id UUID,
  assigned_agent_id UUID,
  campaign_id UUID,
  first_outreach_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_ahe_sellers_phone ON ahe_sellers(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_ahe_sellers_url ON ahe_sellers(profile_url) WHERE profile_url IS NOT NULL;
CREATE INDEX idx_ahe_sellers_status ON ahe_sellers(pipeline_status);
CREATE INDEX idx_ahe_sellers_score ON ahe_sellers(priority_score DESC);
```

```sql
-- ════════════════════════════════════════════
-- المقاييس
-- ════════════════════════════════════════════
CREATE TABLE ahe_hourly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID REFERENCES ahe_scopes(id) NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  
  listings_fetched INTEGER DEFAULT 0,
  listings_new INTEGER DEFAULT 0,
  listings_duplicate INTEGER DEFAULT 0,
  sellers_new INTEGER DEFAULT 0,
  phones_extracted INTEGER DEFAULT 0,
  auto_queued INTEGER DEFAULT 0,
  fetch_duration_seconds INTEGER,
  pages_fetched INTEGER,
  errors_count INTEGER DEFAULT 0,
  
  UNIQUE(scope_id, hour_start),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ahe_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  
  total_harvests INTEGER DEFAULT 0,
  total_listings_new INTEGER DEFAULT 0,
  total_sellers_new INTEGER DEFAULT 0,
  total_phones_extracted INTEGER DEFAULT 0,
  total_auto_queued INTEGER DEFAULT 0,
  
  contacted INTEGER DEFAULT 0,
  responded INTEGER DEFAULT 0,
  signed_up INTEGER DEFAULT 0,
  activated INTEGER DEFAULT 0,
  
  listings_expired INTEGER DEFAULT 0,
  listings_renewed INTEGER DEFAULT 0,
  listings_deleted INTEGER DEFAULT 0,
  
  by_platform JSONB DEFAULT '{}',
  by_category JSONB DEFAULT '{}',
  by_governorate JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## ⚙️ محرك الحصاد (Engine Logic)

### Cron: ahe-scheduler (كل دقيقة)

```
1. SELECT status FROM ahe_engine_status WHERE id = 1
   IF status != 'running' → EXIT (المحرك متوقف)

2. فحص حدود الأمان:
   IF current_requests_this_hour >= global_max_requests_per_hour → EXIT
   IF running_jobs_count >= global_max_concurrent_jobs → EXIT

3. SELECT * FROM ahe_scopes 
   WHERE is_active = true AND is_paused = false
   AND (next_harvest_at IS NULL OR next_harvest_at <= now())
   ORDER BY priority DESC, next_harvest_at ASC
   LIMIT (global_max_concurrent_jobs - running_jobs_count)

4. لكل Scope جاهز:
   INSERT INTO ahe_harvest_jobs (scope_id, target_from, target_to, status='pending')
     target_from = COALESCE(scope.last_harvest_at, now() - interval * '1 minute')
     target_to = now()
   UPDATE ahe_scopes SET next_harvest_at = now() + interval * '1 minute'
   INVOKE Edge Function: ahe-harvest(job_id) ASYNC
```

### Edge Function: ahe-harvest (المحرك الرئيسي — تفصيل كامل)

```
Input: harvest_job_id

═══ المرحلة 1: FETCH LIST ═══

  UPDATE job SET status = 'fetching_list', started_at = now()
  
  page = 1; allListings = []; shouldStop = false
  
  WHILE page <= scope.max_pages_per_harvest AND !shouldStop:
    
    url = scope.base_url + scope.pagination_pattern.replace('{page}', page)
    
    TRY:
      html = await fetch(url, { timeout: 15000 })
      UPDATE ahe_engine_status SET current_requests_this_hour += 1
      await delay(scope.delay_between_requests_ms)
    CATCH (error):
      log error in job.errors
      UPDATE ahe_engine_status SET consecutive_errors += 1
      IF consecutive_errors >= auto_pause_threshold:
        UPDATE ahe_engine_status SET status = 'paused', status_reason = 'أخطاء متتالية'
        UPDATE job SET status = 'failed'
        RETURN
      IF retry < 3: retry after 10s
      ELSE: break (أكمل بالصفحات المتاحة)
    
    listings = dubizzleParser.parseListPage(html)
    
    FOR EACH listing:
      estimatedDate = dateParser.parse(listing.dateText, now())
      
      IF estimatedDate < job.target_from:
        shouldStop = true  // وصلنا لإعلانات أقدم من النطاق
        break
      
      allListings.push({ ...listing, estimatedDate })
    
    page++; UPDATE job SET pages_fetched = page, progress = ...
  
  // Reset consecutive errors on success
  UPDATE ahe_engine_status SET consecutive_errors = 0


═══ المرحلة 2: DEDUPLICATE ═══

  UPDATE job SET status = 'deduplicating'
  newListings = []; duplicateCount = 0
  
  FOR EACH listing IN allListings:
    
    // الطبقة 1: URL مكرر بالظبط
    existing = SELECT id FROM ahe_listings 
               WHERE source_listing_url = listing.url AND is_duplicate = false
    IF existing:
      UPDATE ahe_listings SET last_seen_at = now() WHERE id = existing.id
      duplicateCount++; CONTINUE
    
    newListings.push(listing)
  
  UPDATE job SET listings_new = newListings.length, listings_duplicate = duplicateCount


═══ المرحلة 3: FETCH DETAILS ═══

  IF NOT scope.detail_fetch_enabled: SKIP
  UPDATE job SET status = 'fetching_details'
  
  FOR EACH listing IN newListings:
    TRY:
      detailHtml = await fetch(listing.url, { timeout: 15000 })
      UPDATE ahe_engine_status SET current_requests_this_hour += 1
      await delay(scope.detail_delay_between_requests_ms)
      
      details = dubizzleParser.parseDetailPage(detailHtml)
      listing.description = details.description
      listing.mainImageUrl = details.mainImageUrl
      listing.specifications = details.specifications
      
      // استخراج الهاتف من الوصف
      listing.extractedPhone = phoneExtractor.extract(details.description)
      // Regex: /01[0-2,5][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g
      
    CATCH: log error, continue (لا نوقف العملية كلها لو إعلان واحد فشل)
    
    UPDATE job SET details_fetched += 1


═══ المرحلة 4: ENRICH + STORE ═══

  UPDATE job SET status = 'enriching'
  
  FOR EACH listing IN newListings:
    
    // 1. ترجمة الموقع (Mapping)
    location = mapLocation(listing.sourceLocation, scope.source_platform)
    // "سموحة، الإسكندرية" → { governorate: 'alexandria', city: 'smoha' }
    
    // 2. إيجاد أو إنشاء المعلن
    seller = findOrCreateSeller({
      phone: listing.extractedPhone,
      profileUrl: listing.sellerProfileUrl,
      name: listing.sellerName,
      platform: scope.source_platform,
      isVerified: listing.isVerified,
      isBusiness: listing.isBusiness,
      category: scope.maksab_category,
      governorate: location.governorate
    })
    
    // البحث بالأولوية: phone → profile_url → (name + governorate)
    // إذا موجود: تحديث last_seen_at + total_listings_seen
    // إذا جديد: إنشاء ahe_sellers + حساب priority_score
    
    // 3. حفظ الإعلان
    INSERT INTO ahe_listings (
      scope_id, harvest_job_id, source_platform, source_listing_url,
      title, description, price, is_negotiable, supports_exchange,
      thumbnail_url, main_image_url, source_category, maksab_category,
      source_location, governorate, city,
      source_date_text, estimated_posted_at,
      seller_name, seller_profile_url, seller_is_verified,
      ahe_seller_id, extracted_phone, phone_source,
      specifications, detected_brand, detected_model,
      mapped_sale_types  -- إذا supports_exchange → '{direct_sale,exchange}'
    )


═══ المرحلة 5: AUTO-QUEUE ═══

  UPDATE job SET status = 'queuing'
  
  // المعلنين الجدد + عندهم رقم + لم يتم التواصل معهم
  newSellersWithPhone = SELECT * FROM ahe_sellers
    WHERE pipeline_status = 'discovered' AND phone IS NOT NULL AND crm_customer_id IS NULL
    AND id IN (SELECT DISTINCT ahe_seller_id FROM ahe_listings WHERE harvest_job_id = job.id)
  
  FOR EACH seller:
    // ⚠️ استخدم نفس طريقة Sprint 2 لإضافة عملاء
    customer = INSERT INTO crm_customers (
      full_name, phone, lifecycle_stage: 'lead',
      source: 'competitor_migration', source_platform,
      primary_category, governorate,
      acquisition_score: seller.priority_score,
      estimated_competitor_listings: seller.total_listings_seen
    )
    
    UPDATE ahe_sellers SET crm_customer_id = customer.id, pipeline_status = 'auto_queued'
    
    // ⚠️ استخدم نفس Smart Assignment من Sprint 2
    assignAgent(customer)
    
    // ⚠️ استخدم نفس Campaign system من Sprint 2
    scheduleOutreach(customer, 'acq_welcome_{category}_v1')
  
  UPDATE job SET auto_queued = newSellersWithPhone.length


═══ المرحلة 6: METRICS ═══

  INSERT INTO ahe_hourly_metrics (scope_id, hour_start, ...)
  
  UPDATE ahe_scopes SET
    last_harvest_at = now(),
    last_harvest_job_id = job.id,
    last_harvest_new_listings = job.listings_new,
    total_harvests += 1, total_listings_found += job.listings_new,
    consecutive_failures = 0 -- reset on success
  
  UPDATE job SET status = 'completed', completed_at = now(),
    duration_seconds = EXTRACT(EPOCH FROM now() - started_at)
```

---

## 🔧 Parsers

### Parser Interface:

```typescript
interface PlatformParser {
  parseListPage(html: string): ListPageListing[];
  parseDetailPage(html: string): ListingDetails;
}

interface ListPageListing {
  url: string; title: string; price: number | null;
  thumbnailUrl: string | null; location: string; dateText: string;
  sellerName: string | null; isVerified: boolean; isBusiness: boolean;
  isFeatured: boolean; supportsExchange: boolean; isNegotiable: boolean;
  sellerProfileUrl: string | null; sellerAvatarUrl: string | null;
}

interface ListingDetails {
  description: string; mainImageUrl: string; allImageUrls: string[];
  specifications: Record<string, string>; condition: string | null;
  paymentMethod: string | null; hasWarranty: boolean | null;
}
```

### Date Parser (تحويل "منذ X" → تاريخ فعلي):

```typescript
function parseRelativeDate(text: string, referenceDate: Date): Date | null {
  if (text.match(/دقيقة|دقائق|minute/))
    return sub(referenceDate, { minutes: parseInt(text.match(/\d+/)?.[0] || '1') });
  if (text.match(/ساعة|ساعات|hour/))
    return sub(referenceDate, { hours: parseInt(text.match(/\d+/)?.[0] || '1') });
  if (text.match(/يوم|أيام|day/))
    return sub(referenceDate, { days: parseInt(text.match(/\d+/)?.[0] || '1') });
  if (text.match(/أسبوع|أسابيع|week/))
    return sub(referenceDate, { weeks: parseInt(text.match(/\d+/)?.[0] || '1') });
  if (text.match(/شهر|أشهر|month/))
    return sub(referenceDate, { months: parseInt(text.match(/\d+/)?.[0] || '1') });
  return null;
}
```

### Phone Extractor:

```typescript
function extractPhone(text: string): string | null {
  if (!text) return null;
  
  // أنماط الأرقام المصرية
  const patterns = [
    /01[0-2,5]\d{8}/g,                    // 01012345678
    /01[0-2,5][\s.\-]\d{3,4}[\s.\-]\d{4,5}/g, // 010-1234-5678
    /\+?20\s?1[0-2,5]\d{8}/g,            // +201012345678
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      // تنظيف: إزالة مسافات ونقط وشرطات
      let phone = matches[0].replace(/[\s.\-\+]/g, '');
      // إزالة كود الدولة لو موجود
      if (phone.startsWith('20')) phone = '0' + phone.slice(2);
      if (phone.startsWith('2')) phone = '0' + phone.slice(1);
      // التحقق: 11 رقم يبدأ بـ 01
      if (/^01[0-2,5]\d{8}$/.test(phone)) return phone;
    }
  }
  return null;
}
```

### Dubizzle Parser — ملاحظات من الفحص الفعلي:

```
صفحة القائمة (HTML ثابت — مؤكد من الاختبار):
  ✅ عنوان: النص داخل ## أو <h2>
  ✅ سعر: النص اللي يحتوي "ج.م" + "قابل للتفاوض"
  ✅ صورة: images.dubizzle.com.eg/thumbnails/{ID}-400x300.jpeg
  ✅ موقع: النص تحت السعر (المنطقة، المحافظة)
  ✅ تاريخ: "منذ X دقائق/ساعات/أيام"
  ✅ معلن: الاسم + الصورة + "صاحب عمل موثق"/"مستخدم موثق"
  ✅ "متوفر التبادل" — ظاهر كنص
  ✅ Pagination: ?page=N (حتى ?page=199 في بعض الفئات)

صفحة التفاصيل (HTML ثابت — مؤكد من الاختبار):
  ✅ وصف كامل — نص عادي (كثير من المعلنين يكتبون رقم الهاتف فيه)
  ✅ صورة كبيرة: {ID}-800x600.jpeg
  ✅ مواصفات: (ماركة، رام، ذاكرة، حالة، طريقة دفع...)
  ✅ رقم الإعلان (Ad ID)

صور CDN:
  ✅ images.dubizzle.com.eg مفتوح — لا يحتاج authentication
  ✅ نفس الـ ID بأحجام مختلفة: -400x300 | -800x600 | -120x90
```

---

## ♻️ نظام صلاحية الإعلانات

### Cron: ahe-expiry-checker (يومياً الساعة 3 فجراً)

```
═══ تعريف انتهاء الصلاحية ═══

1. العمر: estimated_posted_at < now() - scope.listing_max_age_days
2. عدم الظهور: last_seen_at < now() - scope.listing_not_seen_hours
3. المعلن خامل: seller.last_new_listing_at < now() - scope.seller_inactive_days

═══ التعامل ═══

حالة أ — المعلن لم يسجل على مكسب:
  → is_expired = true (بيانات فقط — لا إجراء إضافي)

حالة ب — المعلن نشط على مكسب (active/power_user) + auto_renew_active_sellers:
  → تجديد تلقائي بدون سؤال
  → رسالة إعلامية: "جددنا إعلاناتك تلقائياً 🔄"

حالة ج — المعلن مسجل لكن غير نشط:
  → رسالة واتساب: "إعلانك قارب على الانتهاء — تحب تجدده؟"
  → renewal_offered = true
  → انتظار scope.renewal_wait_hours (72 ساعة افتراضي)
  → إذا وافق: تجديد ✅
  → إذا رفض أو لم يرد: is_expired = true

═══ التنظيف ═══

Cron أسبوعي: ahe-cleanup
  حذف نهائي لإعلانات منتهية منذ 30+ يوم
  لتنظيف مساحة الـ Database
```

---

## 📱 واجهات الإدارة

### /admin/crm/harvester — لوحة التحكم الرئيسية

```
┌══════════════════════════════════════════════════════════════════════╗
║ 🌾 محرك الحصاد الآلي                                                ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌─ التحكم الرئيسي ─────────────────────────────────────────────┐  ║
║  │                                                                 │  ║
║  │  حالة المحرك: 🟢 يعمل                    منذ: 3 أيام         │  ║
║  │  نطاقات نشطة: 14 | عمليات جارية: 2 | طلبات/ساعة: 180/500    │  ║
║  │                                                                 │  ║
║  │  [⏸️ إيقاف مؤقت]  [⏹️ إيقاف كامل]                           │  ║
║  │                                                                 │  ║
║  │  ⓘ إيقاف مؤقت: العمليات الجارية تكتمل. لا تبدأ جديدة.      │  ║
║  │  ⓘ إيقاف كامل: توقف فوري — للطوارئ فقط.                     │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌─ إحصائيات اليوم ──────────────────────────────────────────────┐ ║
║  │ 🌾 حصادات: 156 | 📋 جديد: 2,340 | 👤 معلنين: 780            │ ║
║  │ 📞 أرقام: 328 | 📨 تواصل آلي: 310 | ✅ سجّلوا: 42            │ ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌─ النطاقات ────────────────────────────────────────────────────┐  ║
║  │                                                                  │  ║
║  │ النطاق               │ تكرار │ آخر   │ جديد │ تحكم            │  ║
║  │ ═════════════════════╪═══════╪═══════╪══════╪════════════════ │  ║
║  │ 📱 موبايلات/قاهرة    │ 60 د │ 12 د │  23  │ 🟢 [⏸️] [⚙️]  │  ║
║  │ 📱 موبايلات/إسكندرية │ 60 د │ 45 د │  18  │ 🟢 [⏸️] [⚙️]  │  ║
║  │ 💻 إلكترونيات/قاهرة  │ 60 د │ 30 د │  15  │ 🟢 [⏸️] [⚙️]  │  ║
║  │ 🚗 سيارات/قاهرة      │ 120د │ 80 د │   8  │ 🟡 [▶️] [⚙️]   │  ║
║  │ 📱 موبايلات/شرقية    │ 360د │ 4 سا │   5  │ 🟢 [⏸️] [⚙️]  │  ║
║  │ 📱 موبايلات/فيوم     │1440د │ 18سا │   2  │ 🟢 [⏸️] [⚙️]  │  ║
║  │                                                                  │  ║
║  │ [➕ إضافة نطاق] [⏸️ إيقاف الكل] [▶️ تشغيل الكل]              │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌─ آخر 5 عمليات حصاد ──────────────────────────────────────────┐  ║
║  │ 9:12ص  dub_phones_cairo    ✅ 23 جديد│ 8 📞│ 45 ثانية       │  ║
║  │ 9:05ص  dub_electronics_alex ✅ 15 جديد│ 5 📞│ 38 ثانية       │  ║
║  │ 8:45ص  dub_phones_alex     ✅ 18 جديد│ 7 📞│ 52 ثانية       │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌─ الصلاحية ────────────────────────────────────────────────────┐  ║
║  │ نشطة: 42,580 | تنتهي خلال 7 أيام: 3,200 | تجديد اليوم: 95   │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝

حالة المحرك المتوقف مؤقتاً:
  حالة المحرك: 🟡 متوقف مؤقتاً    منذ: 15 دقيقة
  السبب: "اختبار إعدادات جديدة"
  [▶️ استئناف]  [⏹️ إيقاف كامل]

حالة المحرك المتوقف كاملاً:
  حالة المحرك: 🔴 متوقف           منذ: ساعة
  السبب: "حظر IP — تم زيادة التأخير"
  [▶️ تشغيل المحرك]
```

### /admin/crm/harvester/scopes/new — معالج إضافة نطاق (Wizard)

```
4 خطوات بسيطة:

الخطوة 1: اختر المصدر
  [دوبيزل 🟢] [السوق المفتوح ⚪] [هتلاقي ⚪] [فيسبوك ⚪]
  (يعرض فقط المنصات اللي عندها Parsers جاهزة)

الخطوة 2: اختر الفئة
  يعرض فئات مكسب الـ 12 مع المقابل التلقائي على المنصة المختارة
  (من ahe_category_mappings)
  ⓘ الربط تلقائي — لا يحتاج إدخال يدوي

الخطوة 3: اختر الموقع
  المحافظة: dropdown من ahe_governorate_mappings (المنصة المختارة)
  المدينة: dropdown من ahe_city_mappings (اختياري)
  
  ⓘ الرابط يُبنى تلقائياً:
  source_url_template.replace('{gov}', governorate.source_url_segment)
  ✅ تم التحقق — الرابط صالح (يمكن عمل test fetch)

الخطوة 4: الجدولة
  التكرار: [كل ساعة ▼] (يقترح حسب suggested_interval_minutes)
  حدود: صفحات [5] | تأخير [5 ثواني] | تفاصيل [☑️]
  
  [💾 حفظ وتفعيل] [💾 حفظ متوقف] [🧪 تشغيل تجريبي]
  
  🧪 التجريبي: يشغل حصادة واحدة فوراً ويعرض النتائج
  بدون حفظ في CRM أو إرسال رسائل — للتحقق فقط
```

### /admin/crm/harvester/scopes/{id} — إعدادات نطاق واحد

```
┌──────────────────────────────────────────────────────────┐
│ ⚙️ موبايلات — الإسكندرية — دوبيزل                       │
│ الكود: dub_phones_alex | الحالة: 🟢 نشط                 │
│                                                            │
│ [⏸️ إيقاف] [🧪 تشغيل يدوي] [🗑️ حذف]                   │
│                                                            │
│ ═══ الجدولة ═══                                          │
│ التكرار: [60 ▼] دقيقة                                    │
│ حد الصفحات: [5 ▼]                                        │
│ تأخير الطلبات: [5 ▼] ثواني                               │
│ جلب التفاصيل: [☑️]                                       │
│ الأولوية: [10 ▼]                                          │
│                                                            │
│ ═══ الصلاحية ═══                                         │
│ عمر أقصى: [30] يوم                                       │
│ عدم ظهور: [48] ساعة                                      │
│ تجديد تلقائي للنشطين: [☑️]                                │
│                                                            │
│ ═══ الأداء (آخر 24 ساعة) ═══                            │
│ حصادات: 24 | إعلانات جديدة: 432 | أرقام: 180             │
│ متوسط/ساعة: 18 إعلان | أخطاء: 0                          │
│                                                            │
│ ═══ الأداء (آخر 7 أيام) ═══                              │
│ [رسم بياني: إعلانات جديدة بالساعة]                       │
│                                                            │
│ [💾 حفظ التعديلات]                                       │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 ملفات الكود

```
/supabase/functions
  ahe-scheduler/index.ts              — Cron كل دقيقة
  ahe-harvest/index.ts                — المحرك الرئيسي
  ahe-expiry-checker/index.ts         — Cron يومي: صلاحية
  ahe-expiry-renew/index.ts           — عروض التجديد
  ahe-cleanup/index.ts                — Cron أسبوعي: تنظيف
  ahe-daily-metrics/index.ts          — Cron يومي: مقاييس
  ahe-engine-control/index.ts         — API: تشغيل/إيقاف المحرك والنطاقات

/lib/parsers
  types.ts                            — Interfaces
  dubizzle.ts                         — Dubizzle parser (مؤكد ومختبر)
  opensooq.ts                         — OpenSooq parser (مرحلة 3)
  hatla2ee.ts                         — Hatla2ee parser (مرحلة 3)
  date-parser.ts                      — "منذ X" → تاريخ
  phone-extractor.ts                  — Regex أرقام مصرية

/lib/harvester
  engine.ts                           — المحرك (يجمع كل المراحل)
  deduplicator.ts                     — 3 طبقات Dedup
  enricher.ts                         — Score + تصنيف
  auto-queuer.ts                      — نقل لـ CRM + جدولة تواصل
  expiry-manager.ts                   — صلاحية + تجديد
  url-builder.ts                      — بناء الروابط من Mapping Tables
  location-mapper.ts                  — ترجمة الموقع من نص المنصة لمعيار مكسب

/app/admin/crm/harvester
  page.tsx                            — Dashboard + أزرار تحكم المحرك
  scopes/page.tsx                     — قائمة النطاقات + تحكم فردي
  scopes/new/page.tsx                 — Wizard إضافة نطاق (4 خطوات)
  scopes/[id]/page.tsx                — إعدادات + أداء نطاق
  jobs/[id]/page.tsx                  — تفاصيل عملية حصاد
  listings/page.tsx                   — تصفح الإعلانات المحصودة
  sellers/page.tsx                    — تصفح المعلنين المكتشفين
  expiry/page.tsx                     — إدارة الصلاحية
  metrics/page.tsx                    — مقاييس تفصيلية

/migrations
  ahe_001_mapping_tables.sql          — جداول الترجمة + Seed
  ahe_002_engine_tables.sql           — engine_status + scopes + jobs + listings + sellers
  ahe_003_metrics_tables.sql          — hourly + daily metrics
  ahe_004_seed_scopes.sql             — 14 نطاق أولي
```

---

## 🚀 ترتيب التنفيذ — 3 مراحل

### ═══ المرحلة 1: المحرك الأساسي ═══
**شرط الانتقال:** المحرك يعمل + يجلب من دوبيزل + يستبعد المكررات + يعرض النتائج

```
☐ جداول الترجمة: ahe_category_mappings + ahe_governorate_mappings + ahe_city_mappings
☐ Seed: كل الـ Mappings (12 فئة + 27 محافظة + أهم المدن)
☐ جداول التشغيل: ahe_engine_status + ahe_scopes + ahe_harvest_jobs
☐ جداول البيانات: ahe_listings + ahe_sellers
☐ Seed: 14 نطاق أولي (كلها تبدأ متوقفة)
☐ lib/parsers/dubizzle.ts + date-parser.ts + phone-extractor.ts
☐ lib/harvester/url-builder.ts + location-mapper.ts
☐ lib/harvester/deduplicator.ts
☐ lib/harvester/engine.ts
☐ Edge Function: ahe-harvest (المحرك)
☐ Edge Function: ahe-scheduler (Cron)
☐ Edge Function: ahe-engine-control (تشغيل/إيقاف API)
☐ /admin/crm/harvester — Dashboard مبسط + أزرار تشغيل/إيقاف المحرك
☐ اختبار: تفعيل dub_phones_alex ← تشغيل يدوي ← تحقق من النتائج
```

### ═══ المرحلة 2: التكامل + الواجهات ═══
**شرط الانتقال:** المحرك يعمل 24+ ساعة + يرسل واتساب تلقائياً + Dashboard كامل

```
☐ lib/harvester/enricher.ts (Score + تصنيف فرد/تاجر)
☐ lib/harvester/auto-queuer.ts (CRM + حملات + Smart Assignment)
☐ /admin/crm/harvester/scopes — قائمة + إضافة (Wizard 4 خطوات) + تعديل + تحكم
☐ /admin/crm/harvester/listings — تصفح الإعلانات
☐ /admin/crm/harvester/sellers — تصفح المعلنين
☐ تعديل /onboarding/import: "لقينا إعلاناتك!" auto-detect
☐ جداول المقاييس: ahe_hourly_metrics + ahe_daily_metrics
☐ /admin/crm/harvester/metrics — مقاييس
☐ اختبار: تفعيل 5 نطاقات + 24 ساعة + تحقق من التواصل الآلي + المقاييس
```

### ═══ المرحلة 3: الصلاحية + التوسع ═══
**شرط الانتقال:** النظام مستقر + كل 14 نطاق نشطين + مقاييس واضحة

```
☐ lib/harvester/expiry-manager.ts
☐ Edge Function: ahe-expiry-checker + ahe-expiry-renew + ahe-cleanup
☐ /admin/crm/harvester/expiry — إدارة الصلاحية
☐ Parsers إضافية: opensooq.ts + hatla2ee.ts (+ Mappings لهم)
☐ اختبار: أسبوع كامل + تقرير أداء شامل + صلاحية
```

---

## 📈 التوقعات

```
بـ 14 نطاق نشط (بعد المرحلة 2):

الساعة:   14 حصادة × ~20 إعلان = ~280 إعلان جديد
24 ساعة:  ~6,720 إعلان → ~1,000 رقم → ~270 عميل نشط
7 أيام:   ~47,000 إعلان → ~3,400 رقم → ~920 عميل نشط
30 يوم:   ~200,000 إعلان → ~8,400 رقم → ~2,270 عميل نشط

Rate Limiting:
  14 نطاق × 25 request/حصادة = ~350 request/ساعة
  = ~6 requests/دقيقة (آمن — أقل من مستخدم عادي)

Failsafe:
  ← 10 أخطاء متتالية → auto-pause + إنذار
  ← 3 فشل متتالي لنفس Scope → auto-pause للـ Scope
  ← rate limit 80% → تلقائياً يزود التأخير
  ← حظر IP → إيقاف كامل + إنذار

التوسع:
  المرحلة 1: دوبيزل فقط (80% من السوق)
  المرحلة 3: + السوق المفتوح + هتلاقي
  مستقبلاً: + Facebook Marketplace (يحتاج نهج خاص)
```

---

## ⚠️ ملاحظات حرجة

### التكامل مع Sprint 1 & 2:
```
- auto-queuer يستخدم نفس طريقة Sprint 2 لإضافة عملاء
- الحملات تُربط بالموجود في crm_campaigns
- Smart Assignment يستخدم نفس الكود من Sprint 2
- Scoring يستخدم نفس الدالة من Sprint 1
- أي تعارض → الكود الفعلي هو المرجع
```

### ماذا لو دوبيزل غيّر شيء:
```
تغيير في URL:
  → الحصادة تفشل → auto-pause → إنذار
  → المدير يعدّل source_url_segment في Mapping Table
  → الرابط يتحدث تلقائياً ← يستأنف
  → لا يحتاج تعديل كود!

تغيير في هيكل HTML:
  → Parser يفشل → أخطاء → auto-pause
  → يحتاج تعديل dubizzle.ts (Parser)
  → تعديل كود ← لكن في ملف واحد فقط
```

### أمان:
```
- RLS على كل الجداول (admin only)
- Engine control يحتاج صلاحية manager
- Scope creation/edit يحتاج صلاحية senior+
- كل عملية تُسجل في audit log
- لا يوجد مسح تلقائي عشوائي — كل Scope مُعرّف مسبقاً ومعتمد
```

---

ابدأ بالمرحلة 1. اقرأ CRM v3 وكود Sprint 1 & 2 أولاً. يلا! 🟢🌾
