# مكسب — توجيه شامل: توسيع محركات الحصاد لتغطية كل المنصات المنافسة
## وثيقة تنفيذية لـ Claude Code
## مارس 2026

---

## 🎯 الهدف

> **حصاد كل بائع وكل مشتري من كل منصة تجارة إلكترونية في مصر.**
> حالياً: نحصد من دوبيزل فقط.
> المطلوب: نحصد من 15+ منصة بالتوازي.

---

## 📊 خريطة المنافسين في مصر — 15 منصة

### Tier 1 — المنصات الكبرى (أولوية قصوى):

```
1. Dubizzle Egypt (OLX سابقاً) — dubizzle.com.eg
   النوع: إعلانات مبوبة شاملة (الأكبر في مصر)
   الفئات: كل شيء — موبايلات + سيارات + عقارات + إلكترونيات + أثاث + ...
   الحالة: ✅ نحصد منها حالياً (327 نطاق)
   
2. Facebook Marketplace — facebook.com/marketplace
   النوع: سوق مدمج في فيسبوك
   الفئات: كل شيء
   التقنية: مش قابل للحصاد الآلي (JavaScript heavy + auth required)
   الحل: Bookmarklet + Paste&Parse ✅
   
3. OpenSooq (السوق المفتوح) — eg.opensooq.com
   النوع: إعلانات مبوبة (60 مليون مستخدم في المنطقة)
   الفئات: كل شيء — سيارات + عقارات + موبايلات + وظائف
   الحالة: ❌ لم نحصد منها بعد — أولوية عالية!
   
4. Facebook Groups — facebook.com/groups
   النوع: جروبات بيع وشراء (آلاف الجروبات في مصر)
   الفئات: كل شيء — خصوصاً موبايلات + سيارات
   الحالة: Paste&Parse ✅ + Bookmarklet ✅
```

### Tier 2 — منصات متخصصة (أولوية عالية):

```
5. Hatla2ee (هتلاقي) — eg.hatla2ee.com
   النوع: سوق سيارات متخصص (الأكبر في مصر للسيارات)
   الفئات: سيارات فقط
   الحالة: ❌ لم نحصد — مهم جداً لفئة السيارات!
   
6. ContactCars — contactcars.com
   النوع: سوق سيارات
   الفئات: سيارات فقط
   الحالة: ❌

7. CarSemsar (كارسمسار) — carsemsar.com
   النوع: سوق سيارات
   الفئات: سيارات فقط
   الحالة: ❌

8. Aqarmap (عقارماب) — aqarmap.com.eg
   النوع: سوق عقارات متخصص (الأكبر في مصر للعقارات)
   الفئات: عقارات فقط (2 مليون+ مستخدم)
   الحالة: ❌ لم نحصد — مهم جداً لفئة العقارات!

9. Property Finder Egypt — propertyfinder.eg
   النوع: سوق عقارات
   الفئات: عقارات فقط
   الحالة: ❌

10. Yallamotor — yallamotor.com
    النوع: سوق سيارات + أخبار سيارات
    الفئات: سيارات
    الحالة: ❌
```

### Tier 3 — منصات صغيرة/محلية (أولوية متوسطة):

```
11. Bezaat (بيزات) — bezaat.com/egypt
    النوع: إعلانات مبوبة
    الفئات: كل شيء
    الحالة: ❌

12. Soq24 (سوق24) — soq24.com
    النوع: إعلانات مبوبة
    الفئات: كل شيء
    الحالة: ❌

13. CairoLink (كايرو لينك) — cairolink.com
    النوع: إعلانات مبوبة محلية
    الفئات: عقارات + سيارات + خدمات
    الحالة: ❌

14. SooqMsr (سوق مصر) — sooqmsr.com
    النوع: إعلانات مبوبة
    الفئات: كل شيء
    الحالة: ❌

15. Dowwr (دوّر) — eg.dowwr.com
    النوع: إعلانات مبوبة
    الفئات: كل شيء
    الحالة: ❌
```

---

## 🏗️ التنفيذ التقني — Multi-Platform Harvesting Architecture

### البنية الجديدة:

```
حالياً:
  AHE → دوبيزل فقط → ahe_listings + ahe_sellers

المطلوب:
  AHE → دوبيزل + OpenSooq + Hatla2ee + Aqarmap + ... → ahe_listings + ahe_sellers
  BHE → نفس المنصات (إعلانات "مطلوب") → bhe_buyers
  
  كل منصة = parser مختلف (HTML مختلف)
  لكن نفس pipeline: fetch → parse → store → enrich
```

### Migration: دعم Multi-Platform

```sql
-- أضف source_platform لتمييز المنصة
-- (موجود بالفعل في ahe_scopes — تأكد إنه في كل الجداول)

ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'dubizzle';
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'dubizzle';
ALTER TABLE bhe_buyers ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'dubizzle';

-- جدول المنصات
CREATE TABLE IF NOT EXISTS harvest_platforms (
  id TEXT PRIMARY KEY, -- 'dubizzle' | 'opensooq' | 'hatla2ee' | ...
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  base_url TEXT NOT NULL,
  
  -- الحالة
  is_active BOOLEAN DEFAULT false,
  is_testable BOOLEAN DEFAULT false, -- يمكن اختباره
  
  -- التقنية
  fetch_method TEXT DEFAULT 'server_fetch', -- 'server_fetch' | 'bookmarklet' | 'paste_parse'
  parser_type TEXT, -- 'cheerio_html' | 'cheerio_json' | 'api' | 'manual'
  needs_javascript BOOLEAN DEFAULT false, -- يحتاج browser rendering
  rate_limit_per_hour INTEGER DEFAULT 100,
  
  -- الفئات المدعومة
  supported_categories TEXT[] DEFAULT '{}',
  
  -- الإحصائيات
  total_listings_harvested INTEGER DEFAULT 0,
  total_sellers_found INTEGER DEFAULT 0,
  total_buyers_found INTEGER DEFAULT 0,
  last_harvest_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed المنصات
INSERT INTO harvest_platforms (id, name, name_ar, base_url, is_active, fetch_method, parser_type, needs_javascript, supported_categories) VALUES
('dubizzle', 'Dubizzle Egypt', 'دوبيزل مصر', 'https://www.dubizzle.com.eg', true, 'server_fetch', 'cheerio_html', false, 
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion','home_appliances','hobbies','services','gold_jewelry','scrap','luxury']),

('opensooq', 'OpenSooq Egypt', 'السوق المفتوح مصر', 'https://eg.opensooq.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion']),

('hatla2ee', 'Hatla2ee Egypt', 'هتلاقي مصر', 'https://eg.hatla2ee.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('contactcars', 'ContactCars', 'كونتاكت كارز', 'https://contactcars.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('carsemsar', 'CarSemsar', 'كارسمسار', 'https://carsemsar.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('aqarmap', 'Aqarmap', 'عقارماب', 'https://aqarmap.com.eg', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['properties']),

('propertyfinder', 'Property Finder Egypt', 'بروبرتي فايندر مصر', 'https://www.propertyfinder.eg', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['properties']),

('yallamotor', 'Yallamotor', 'يلا موتور', 'https://yallamotor.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('facebook_marketplace', 'Facebook Marketplace', 'فيسبوك ماركتبلس', 'https://www.facebook.com/marketplace', false, 'bookmarklet', 'manual', true,
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion']),

('facebook_groups', 'Facebook Groups', 'جروبات فيسبوك', 'https://www.facebook.com/groups', true, 'paste_parse', 'manual', true,
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion']),

('bezaat', 'Bezaat', 'بيزات', 'https://www.bezaat.com/egypt', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics','furniture']),

('soq24', 'Soq24', 'سوق24', 'http://soq24.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics']),

('cairolink', 'CairoLink', 'كايرو لينك', 'https://cairolink.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles','properties','services']),

('sooqmsr', 'SooqMsr', 'سوق مصر', 'https://sooqmsr.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics']),

('dowwr', 'Dowwr', 'دوّر', 'https://eg.dowwr.com', false, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics'])

ON CONFLICT (id) DO NOTHING;
```

### أضف Platform Test Endpoint

```
GET /test/platform?url=XXX

لكل منصة جديدة — قبل ما نبني parser:
  1. افتح URL المنصة
  2. هل status 200؟
  3. هل فيه articles/listings في HTML؟
  4. هل الـ HTML قابل للـ parse بـ cheerio؟
  5. ارجع: { status, bodyLength, articlesFound, sampleTitles, htmlStructure }

GET /test/platform-all

يختبر كل المنصات مرة واحدة:
  لكل platform في harvest_platforms:
    fetch base_url → status + articles
  ارجع: ملخص أي منصة شغالة وأيها محتاجة JavaScript
```

### بنية الـ Parsers:

```
/lib/crm/harvester/parsers/
  dubizzle.ts        ← موجود ✅
  opensooq.ts        ← جديد (أولوية 1)
  hatla2ee.ts        ← جديد (أولوية 2)
  contactcars.ts     ← جديد
  aqarmap.ts         ← جديد (أولوية 3)
  propertyfinder.ts  ← جديد
  generic.ts         ← parser عام للمنصات الصغيرة

كل parser يصدّر:
  parseListPage(html): ListPageListing[]
  parseDetailPage(html): DetailPageData
  getListPageUrl(category, governorate, page): string
```

---

## 🚀 ترتيب التنفيذ — أولوية حسب القيمة

### المرحلة 1: OpenSooq (الأولوية القصوى بعد دوبيزل)

```
لماذا أولاً:
  60 مليون مستخدم في المنطقة
  HTML بسيط — قابل للحصاد
  فئات متعددة (مش متخصص)
  
المطلوب:
  1. GET /test/platform?url=https://eg.opensooq.com/ar/cairo/mobiles
     → تأكد إن الـ HTML قابل للـ parse
  
  2. أنشئ parsers/opensooq.ts:
     parseListPage: استخرج الإعلانات من صفحة القائمة
     parseDetailPage: استخرج اسم + رقم + وصف من صفحة التفاصيل
     getListPageUrl: بناء URL حسب الفئة والمحافظة

  3. أنشئ نطاقات opensooq في ahe_scopes:
     opensooq_phones_cairo, opensooq_vehicles_cairo, ...
     (نفس منطق generateAllScopes لكن لـ opensooq)

  4. في engine.ts: لما scope.source_platform === 'opensooq'
     → استخدم parsers/opensooq.ts بدل parsers/dubizzle.ts
```

### المرحلة 2: Hatla2ee (سيارات — الأهم للسيارات)

```
لماذا ثانياً:
  أكبر منصة سيارات في مصر
  تفاصيل غنية (موديل + سنة + كيلومتر + لون)
  
المطلوب:
  1. GET /test/platform?url=https://eg.hatla2ee.com/en/car
  2. parsers/hatla2ee.ts
  3. نطاقات: hatla2ee_vehicles_cairo, hatla2ee_vehicles_alex, ...
```

### المرحلة 3: Aqarmap (عقارات — الأهم للعقارات)

```
لماذا ثالثاً:
  أكبر منصة عقارات في مصر
  2 مليون+ مستخدم
  بيانات غنية (مساحة + تشطيب + طابق + ...)
  
المطلوب:
  1. GET /test/platform?url=https://aqarmap.com.eg/en/for-sale/apartment/cairo
  2. parsers/aqarmap.ts
  3. نطاقات: aqarmap_properties_cairo, ...
```

### المرحلة 4: ContactCars + CarSemsar + Yallamotor (سيارات إضافية)

```
المطلوب: نفس النمط — test → parser → scopes
```

### المرحلة 5: Property Finder (عقارات إضافية)

```
المطلوب: نفس النمط
```

### المرحلة 6: Bezaat + Soq24 + CairoLink + SooqMsr + Dowwr (مبوبة صغيرة)

```
المطلوب: generic.ts parser يتعامل مع HTML بسيط
أو: اختبر كل واحد — لو HTML بسيط → أنشئ parser سريع
```

---

## 🔧 Platform Router (أهم تغيير)

```javascript
// في engine.ts أو server.ts:

import { parseDubizzleList, parseDubizzleDetail } from './parsers/dubizzle';
import { parseOpenSooqList, parseOpenSooqDetail } from './parsers/opensooq';
import { parseHatla2eeList, parseHatla2eeDetail } from './parsers/hatla2ee';
import { parseAqarmapList, parseAqarmapDetail } from './parsers/aqarmap';

function getParser(platform: string) {
  switch (platform) {
    case 'dubizzle':
      return { parseList: parseDubizzleList, parseDetail: parseDubizzleDetail };
    case 'opensooq':
      return { parseList: parseOpenSooqList, parseDetail: parseOpenSooqDetail };
    case 'hatla2ee':
      return { parseList: parseHatla2eeList, parseDetail: parseHatla2eeDetail };
    case 'aqarmap':
      return { parseList: parseAqarmapList, parseDetail: parseAqarmapDetail };
    default:
      return { parseList: parseDubizzleList, parseDetail: parseDubizzleDetail };
  }
}

// في harvestScope():
const { parseList, parseDetail } = getParser(scope.source_platform);
const listings = parseList(html);
// ... الباقي نفسه
```

---

## 📊 Dashboard — إضافات

```
في /admin/sales/scopes:
  فلتر جديد: [المنصة ▼] dubizzle | opensooq | hatla2ee | ...
  
في /admin/tech/dashboard:
  بطاقة لكل منصة: اسم + حالة + إعلانات + آخر حصاد

في /admin/dashboard:
  KPI: "15 منصة مراقبة | 5 نشطة"
```

---

## ⚠️ ملاحظات مهمة

```
1. كل منصة جديدة — اختبر أولاً:
   GET /test/platform?url=XXX
   لو 403 → IP محظور (زي ما كان دوبيزل على Vercel)
   لو 200 + articles → ابنِ parser

2. Rate limiting مختلف لكل منصة:
   dubizzle: 500 req/hour
   opensooq: ابدأ بـ 100 req/hour وزوّد
   hatla2ee: ابدأ بـ 50 req/hour

3. Deduplication عبر المنصات:
   نفس الإعلان ممكن يكون على دوبيزل + opensooq
   لازم dedup بالعنوان + السعر + الموقع

4. ابدأ بـ test endpoint أولاً لكل منصة
   لا تبني parser لمنصة ما اتأكدتش إنها قابلة للحصاد

5. BHE يستفيد تلقائياً:
   كل منصة جديدة → إعلانات "مطلوب" تتكشف
   + reverse_seller يتوسع
```

---

## 🚀 ابدأ التنفيذ:

```
المرحلة 1: البنية
  ☐ Migration: harvest_platforms + source_platform columns
  ☐ GET /test/platform?url=XXX
  ☐ GET /test/platform-all
  ☐ Platform Router في engine.ts

المرحلة 2: OpenSooq
  ☐ اختبار: /test/platform?url=https://eg.opensooq.com/ar/cairo/mobiles
  ☐ parsers/opensooq.ts
  ☐ نطاقات opensooq (generateOpenSooqScopes)

المرحلة 3: Hatla2ee
  ☐ اختبار: /test/platform?url=https://eg.hatla2ee.com/en/car
  ☐ parsers/hatla2ee.ts
  ☐ نطاقات hatla2ee

المرحلة 4: Aqarmap
  ☐ اختبار: /test/platform?url=https://aqarmap.com.eg/en/for-sale/apartment/cairo
  ☐ parsers/aqarmap.ts
  ☐ نطاقات aqarmap

المرحلة 5: باقي المنصات (ContactCars + CarSemsar + PropertyFinder + ...)
  ☐ اختبار + parser لكل منصة

المرحلة 6: Dashboard + فلاتر المنصات

نفذ كل المراحل بالترتيب وبأسرع وقت ممكن.
لا تنتظر تأكيد بين المراحل.
ابدأ الآن.
```
