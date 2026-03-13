# مكسب — محرك حصاد المشترين (Buyer Harvesting Engine - BHE)
## المواصفات التقنية الشاملة
## الإصدار: 1.0 | مارس 2026
## وثيقة تنفيذية لـ Claude Code
## يتكامل مع: maksab_ahe_v3_complete.md (محرك حصاد البائعين)

---

## 🎯 الرؤية

> **محرك حصاد البائعين (AHE) يجلب جانب العرض.**
> **محرك حصاد المشترين (BHE) يجلب جانب الطلب.**
> **الاتنين يشتغلوا 24/7 بالتوازي على Railway.**
> **النتيجة: سوق مكتمل — بائعين ومشترين — بدون تسويق تقليدي.**

```
AHE (موجود ✅):
  دوبيزل → 225 إعلان/حصادة → أسماء + أرقام بائعين
  = 1,800 رقم بائع/يوم

BHE (المطلوب بناؤه):
  Facebook Groups + دوبيزل تعليقات + Marketplace + OLX
  → "مطلوب" posts + تعليقات مشترين → أسماء + أرقام مشترين
  = هدف 1,000+ رقم مشتري/يوم
```

---

## 🧠 أين يترك المشتري بصمته؟

```
═══ بصمة واضحة (اسم + رقم + ماذا يريد) ═══

📘 Facebook Groups:
  "مطلوب آيفون 15 برو — ميزانيتي 40K — الإسكندرية — 01012345678"
  ← اسم + رقم + المنتج + الميزانية + الموقع = بصمة كاملة!
  
  الحجم: آلاف البوستات "مطلوب" يومياً في 500+ جروب مصري
  
📘 Facebook Marketplace:
  "هل ده متاح؟ ممكن تبعتلي الرقم؟"
  ← مشتري مهتم بمنتج محدد

💬 تعليقات دوبيزل:
  "كام آخر سعر؟" | "لسه متاح؟" | "ممكن أشوفه فين؟"
  ← مشتري مهتم بإعلان محدد (نعرف الفئة + الموقع + السعر)

═══ بصمة جزئية (بدون رقم — يحتاج جذب) ═══

🔍 Google Search:
  "آيفون 15 سعر مصر" | "سيارة مستعملة القاهرة"
  ← مشتري يبحث — نجذبه بصفحات SEO

📱 واتساب Groups:
  "حد عنده آيفون؟" | "مطلوب لابتوب مستعمل"
  ← مشتري في مجتمع مغلق
```

---

## 🏗️ المسار 1: حصاد Facebook Groups — "مطلوب" (الأقوى)

### لماذا هو الأقوى:

```
المشتري المصري لما عايز يشتري حاجة:
  خطوة 1: يروح جروب "بيع وشراء موبايلات إسكندرية"
  خطوة 2: يكتب بوست: "مطلوب آيفون 15 برو 256 — ميزانيتي 40K"
  خطوة 3: يستنى عروض البائعين

البوست ده فيه كل اللي محتاجينه:
  ✅ اسم المشتري (من بروفايل فيسبوك)
  ✅ ماذا يريد (من نص البوست)
  ✅ الميزانية (كتير بيذكروها)
  ✅ الموقع (من الجروب أو البوست)
  ✅ الرقم (كتير بيكتبوه في البوست أو التعليقات)

الحجم: 500+ جروب × 50-200 بوست "مطلوب"/يوم = 25,000-100,000 بوست!
```

### التقنية: Bookmarklet + Paste-and-Parse (زي AHE)

```
═══ الطريقة أ: Bookmarklet لـ Facebook Groups ═══

المستخدم (ممدوح أو موظف):
  1. يفتح جروب "بيع وشراء موبايلات إسكندرية"
  2. يعمل scroll لتحميل 50-100 بوست
  3. يضغط Bookmarklet "🛒 حصاد مشترين"
  4. الـ Bookmarklet يستخرج:
     - كل البوستات اللي فيها "مطلوب" أو "عايز أشتري" أو "wanted"
     - اسم الكاتب
     - نص البوست
     - التعليقات (لو فيها أرقام)
     - تاريخ البوست
  5. يبعتهم لـ Popup → API مكسب → DB

═══ الطريقة ب: Paste-and-Parse (أبسط) ═══

المستخدم:
  1. يفتح الجروب
  2. يعمل Select All → Copy
  3. يفتح /admin/sales/buyer-harvest → يلصق النص
  4. Claude API يحلل النص ويستخرج:
     - البوستات "مطلوب"
     - الأسماء + الأرقام + المنتجات + الميزانيات
  5. يُحفظ في bhe_buyers

═══ الطريقة ج: Chrome Extension (الأقوى) ═══

Extension يعمل في الخلفية:
  1. يراقب كل جروبات الفيسبوك اللي أنت عضو فيها
  2. لما يلاقي بوست فيه "مطلوب" → يستخرج البيانات تلقائياً
  3. يبعتها لـ مكسب API بهدوء
  = حصاد مشترين 24/7 بدون أي تدخل!
```

### Parser بوستات "مطلوب":

```javascript
// ═══ استخراج بيانات المشتري من بوست فيسبوك ═══

function parseBuyerPost(post) {
  const text = post.text || '';
  
  // 1. هل هو بوست "مطلوب"؟
  const isBuyRequest = /مطلوب|عايز اشتر|عاوز اشتر|محتاج|ابحث عن|بدور على|wanted|looking for|wtb/i.test(text);
  if (!isBuyRequest) return null;
  
  // 2. ماذا يريد (المنتج)
  let product = null;
  const productPatterns = [
    /مطلوب\s+(.{5,50}?)(?:\n|$|—|–|-|\.|،)/i,
    /عايز\s+(?:اشتري?\s+)?(.{5,50}?)(?:\n|$|—)/i,
    /محتاج\s+(.{5,50}?)(?:\n|$)/i,
    /looking for\s+(.{5,50}?)(?:\n|$)/i,
  ];
  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match) { product = match[1].trim(); break; }
  }
  
  // 3. الميزانية
  let budgetMin = null, budgetMax = null;
  const budgetPatterns = [
    /ميزاني[ته]ي?\s*[:=]?\s*([\d,]+)/i,
    /budget\s*[:=]?\s*([\d,]+)/i,
    /بـ?\s*([\d,]+)\s*(?:ج\.?م|جنيه|egp|الف|ألف)/i,
    /من\s*([\d,]+)\s*(?:ل|لـ|لحد)\s*([\d,]+)/i,
    /([\d,]+)\s*[-–]\s*([\d,]+)\s*(?:ج|جنيه)?/,
  ];
  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match) {
      budgetMin = parseInt(match[1].replace(/,/g, ''));
      budgetMax = match[2] ? parseInt(match[2].replace(/,/g, '')) : budgetMin;
      break;
    }
  }
  
  // 4. الرقم
  let phone = null;
  const phoneMatch = text.match(/01[0-2,5][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/[\s.\-]/g, '');
  }
  
  // 5. الموقع
  let location = null;
  const govs = ['القاهرة','الإسكندرية','الجيزة','القليوبية','الشرقية',
    'الدقهلية','الغربية','المنوفية','البحيرة','المنيا','أسيوط','سوهاج',
    'الفيوم','بورسعيد','الإسماعيلية','السويس','دمياط','الأقصر','أسوان',
    'مدينة نصر','المعادي','مصر الجديدة','6 أكتوبر','الشيخ زايد',
    'التجمع','الرحاب','العبور','العاشر من رمضان','سموحة','سيدي جابر',
    'المنصورة','طنطا','الزقازيق'];
  for (const gov of govs) {
    if (text.includes(gov)) { location = gov; break; }
  }
  
  // 6. الفئة (auto-detect)
  let category = detectCategory(text);
  
  // 7. الحالة المطلوبة
  let condition = null;
  if (/جديد|new|زيرو|zero/i.test(text)) condition = 'new';
  if (/مستعمل|used|مستخدم|second/i.test(text)) condition = 'used';
  
  return {
    type: 'buy_request',
    source: 'facebook_group',
    source_group: post.groupName,
    source_url: post.url,
    
    buyer_name: post.authorName,
    buyer_profile_url: post.authorProfileUrl,
    buyer_phone: phone,
    
    product_wanted: product,
    category: category,
    condition: condition,
    budget_min: budgetMin,
    budget_max: budgetMax,
    location: location,
    
    original_text: text,
    posted_at: post.timestamp,
    harvested_at: new Date().toISOString()
  };
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (/آيفون|ايفون|iphone|سامسونج|samsung|موبايل|هاتف|phone|شاومي|xiaomi|هواوي|أوبو|ريلمي/.test(text)) return 'phones';
  if (/سيارة|عربية|car|bmw|مرسيدس|تويوتا|هيونداي|كيا/.test(text)) return 'vehicles';
  if (/شقة|فيلا|أرض|محل|إيجار|apartment|villa/.test(text)) return 'properties';
  if (/لابتوب|laptop|تابلت|tablet|بلايستيشن|playstation|تلفزيون/.test(text)) return 'electronics';
  if (/أثاث|غرفة|سرير|كنبة|furniture/.test(text)) return 'furniture';
  return 'general';
}
```

---

## 🏗️ المسار 2: حصاد تعليقات دوبيزل (الأذكى)

### لماذا هو ذكي:

```
كل إعلان على دوبيزل عليه 5-20 تعليق:
  "كام آخر سعر؟"
  "لسه متاح؟"
  "ممكن أشوفه فين؟"
  "01012345678 كلمني"

هؤلاء مشترين مهتمين بمنتج محدد!
ونعرف بالظبط:
  ✅ ماذا يريدون (من الإعلان نفسه)
  ✅ ميزانيتهم (السعر المعروض = ميزانيتهم التقريبية)
  ✅ موقعهم (من الإعلان)
  ✅ أحياناً أرقامهم (في التعليقات)
  ✅ أسماؤهم (من حساب دوبيزل)
```

### التقنية: Detail Fetch Extension

```
═══ إضافة على محرك الحصاد الحالي (AHE) ═══

حالياً AHE بيجلب صفحة تفاصيل الإعلان لاستخراج:
  - رقم البائع
  - اسم البائع

المطلوب: في نفس الـ detail fetch — استخرج التعليقات أيضاً!

في fetchAndExtractDetail():

  // بعد استخراج بيانات البائع...
  
  // ═══ استخراج تعليقات المشترين ═══
  const comments = [];
  
  // التعليقات على دوبيزل في section معين
  $detail('[class*="comment"], [class*="Comment"], [data-testid*="comment"]').each(function() {
    const commentText = $(this).text().trim();
    const authorEl = $(this).find('[class*="author"], [class*="user"], a[href*="/member/"]');
    const authorName = authorEl.text().trim();
    const authorUrl = authorEl.attr('href');
    
    // استخرج الرقم من التعليق
    const phoneMatch = commentText.match(/01[0-2,5][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g);
    const phone = phoneMatch ? phoneMatch[0].replace(/[\s.\-]/g, '') : null;
    
    // صنّف: هل هو مشتري مهتم؟
    const isBuyerIntent = /كام|سعر|متاح|أشوف|فين|للبيع|مهتم|عايز|price|available/i.test(commentText);
    
    if (isBuyerIntent || phone) {
      comments.push({
        author_name: authorName,
        author_profile_url: authorUrl,
        comment_text: commentText,
        phone: phone,
        is_buyer_intent: isBuyerIntent
      });
    }
  });
  
  // حفظ التعليقات
  if (comments.length > 0) {
    for (const comment of comments) {
      await supabase.from('bhe_buyers').upsert({
        source: 'dubizzle_comment',
        source_url: listing.source_listing_url,
        buyer_name: comment.author_name,
        buyer_profile_url: comment.author_profile_url,
        buyer_phone: comment.phone,
        product_interested_in: listing.title,
        category: listing.category,
        estimated_budget: listing.price,
        governorate: listing.governorate,
        original_text: comment.comment_text,
      }, { onConflict: 'source_url,buyer_profile_url' });
    }
  }

الحجم المتوقع:
  225 إعلان/حصادة × 50 detail fetch × 3 تعليقات = 150 مشتري/حصادة
  4 حصادات/ساعة × 150 = 600 مشتري/ساعة
  = ~14,000 مشتري/يوم!
```

---

## 🏗️ المسار 3: Facebook Marketplace — "هل ده متاح؟"

### التقنية: Chrome Extension أو Bookmarklet

```
═══ نفس فكرة AHE Bookmarklet ═══

على صفحة Facebook Marketplace listing:
  المشترين بيسألوا: "Is this still available?" / "هل ده لسه متاح؟"
  
Chrome Extension:
  1. يراقب صفحات Marketplace اللي بتتصفحها
  2. يستخرج: اسم السائل + سؤاله + المنتج + السعر
  3. يبعتهم لـ مكسب API

أو Bookmarklet:
  1. افتح صفحة منتج على Marketplace
  2. اضغط Bookmarklet
  3. يستخرج كل الأسئلة (inquiries)
  4. يبعتهم لمكسب

الحجم: يعتمد على كمية التصفح
  50 منتج/يوم × 5 أسئلة = 250 مشتري/يوم
```

---

## 🏗️ المسار 4: حصاد "مطلوب" من منصات أخرى

### OLX/السوق المفتوح/هتلاقي

```
نفس تقنية AHE بالظبط!

بعض المنصات عندها قسم "مطلوب":
  opensooq.com/ar/مصر/مطلوب-موبايلات
  
المحرك:
  1. Fetch صفحة "مطلوب" على المنصة
  2. Parse: اسم + رقم + المنتج + الميزانية + الموقع
  3. حفظ في bhe_buyers
  4. تكرار كل ساعة

═══ Scope مثال ═══
{
  code: 'opensooq_wanted_phones_cairo',
  name: 'مطلوب موبايلات — القاهرة — السوق المفتوح',
  source_platform: 'opensooq',
  type: 'buyer_harvest',
  url: 'https://opensooq.com/ar/مصر/القاهرة/مطلوب-موبايلات',
  interval_minutes: 120
}
```

---

## 🏗️ المسار 5: Reverse Matching (الربط العكسي)

### كل إعلان محصود = فرصة لجذب مشتري

```
═══ الفكرة ═══

عندنا 15,000 إعلان محصود.
كل إعلان = صفحة على مكسب = مفهرسة في جوجل.

مشتري يبحث في جوجل: "آيفون 15 سعر مصر"
  → يلاقي صفحة مكسب
  → يسجّل
  → نعرف: هو مشتري + عايز آيفون 15

═══ التقنية ═══

1. SSR Pages لكل إعلان محصود:
   /browse/phones/alexandria/iphone-15-pro-ID207414207
   
   الصفحة تعرض:
     صورة + عنوان + سعر + موقع
     + "سجّل لتشوف رقم البائع"
     + "شوف 200 إعلان مشابه"
   
   Schema.org:
   {
     "@type": "Product",
     "name": "آيفون 15 برو 256GB",
     "offers": {
       "@type": "Offer",
       "price": "35000",
       "priceCurrency": "EGP"
     }
   }

2. Category Landing Pages:
   /browse/phones/alexandria
   "200 موبايل للبيع في الإسكندرية"
   
   12 فئة × 27 محافظة = 324 صفحة
   + Schema.org ItemList

3. Sitemap تلقائي:
   /sitemap.xml — يتحدث يومياً
   Google Search Console ping

4. User Tracking:
   لما زائر يفتح صفحة إعلان:
     → نسجل: ماذا بحث عنه + أي فئة + أي محافظة
     → لو سجّل → نعرف: هو مشتري مهتم بـ [المنتج]
     → نضيفه في bhe_buyers (source: 'seo_organic')
```

---

## 📊 قاعدة البيانات

```sql
-- ════════════════════════════════════════════
-- المشترين المكتشفين (مقابل ahe_sellers)
-- ════════════════════════════════════════════
CREATE TABLE bhe_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ═══ مصدر الاكتشاف ═══
  source TEXT NOT NULL,
    -- 'facebook_group'      — بوست "مطلوب" في جروب
    -- 'dubizzle_comment'    — تعليق على إعلان دوبيزل
    -- 'facebook_marketplace'— سؤال في Marketplace
    -- 'opensooq_wanted'     — "مطلوب" على السوق المفتوح
    -- 'seo_organic'         — زائر من جوجل سجّل
    -- 'whatsapp_group'      — جروب واتساب
    -- 'manual'              — إدخال يدوي
  
  source_url TEXT,              -- رابط البوست/التعليق الأصلي
  source_group_name TEXT,       -- اسم الجروب (لو فيسبوك)
  source_platform TEXT,         -- 'facebook' | 'dubizzle' | 'opensooq'
  
  -- ═══ بيانات المشتري ═══
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  buyer_profile_url TEXT,       -- رابط بروفايل فيسبوك/دوبيزل
  
  -- ═══ ماذا يريد ═══
  product_wanted TEXT,          -- "آيفون 15 برو 256GB"
  category TEXT,                -- 'phones' | 'vehicles' | ...
  subcategory TEXT,             -- 'iphone' | 'samsung' | ...
  condition_wanted TEXT,        -- 'new' | 'used' | null
  budget_min INTEGER,
  budget_max INTEGER,
  governorate TEXT,
  city TEXT,
  
  -- ═══ النص الأصلي ═══
  original_text TEXT,           -- البوست/التعليق كما هو
  
  -- ═══ التصنيف ═══
  buyer_tier TEXT DEFAULT 'unknown',
    -- 'hot_buyer'      — 🔥 مشتري جاهز (عنده رقم + ميزانية + منتج محدد)
    -- 'warm_buyer'     — 🟡 مشتري مهتم (يسأل أسئلة محددة)
    -- 'cold_buyer'     — 🔵 مشتري يتصفح (بدون تفاصيل واضحة)
    -- 'unknown'        — لم يُصنّف
  
  buyer_score INTEGER DEFAULT 0,  -- 0-100
  estimated_purchase_value INTEGER DEFAULT 0,
  
  -- ═══ Pipeline ═══
  pipeline_status TEXT DEFAULT 'discovered',
    -- 'discovered'    — تم اكتشافه
    -- 'phone_found'   — عنده رقم
    -- 'matched'       — تم مطابقته مع إعلان/بائع
    -- 'contacted'     — تم التواصل معه
    -- 'responded'     — ردّ
    -- 'signed_up'     — سجّل على مكسب
    -- 'purchased'     — اشترى
    -- 'lost'          — لم يرد
  
  -- ═══ المطابقة ═══
  matched_listings JSONB DEFAULT '[]',  -- إعلانات مطابقة من ahe_listings
  matched_sellers JSONB DEFAULT '[]',   -- بائعين مطابقين من ahe_sellers
  matches_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  
  -- ═══ التواصل ═══
  crm_customer_id UUID,
  wa_conversation_id UUID,
  contacted_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  
  -- ═══ Dedup ═══
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID,
  
  -- ═══ Timestamps ═══
  posted_at TIMESTAMPTZ,        -- تاريخ البوست الأصلي
  harvested_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_bhe_buyers_dedup ON bhe_buyers(source, source_url, buyer_profile_url) 
  WHERE is_duplicate = false;
CREATE INDEX idx_bhe_buyers_phone ON bhe_buyers(buyer_phone) WHERE buyer_phone IS NOT NULL;
CREATE INDEX idx_bhe_buyers_category ON bhe_buyers(category, governorate);
CREATE INDEX idx_bhe_buyers_tier ON bhe_buyers(buyer_tier);
CREATE INDEX idx_bhe_buyers_pipeline ON bhe_buyers(pipeline_status);
CREATE INDEX idx_bhe_buyers_score ON bhe_buyers(buyer_score DESC);

-- ════════════════════════════════════════════
-- جروبات فيسبوك المراقبة
-- ════════════════════════════════════════════
CREATE TABLE bhe_facebook_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  group_name TEXT NOT NULL,
  group_url TEXT NOT NULL UNIQUE,
  group_id TEXT,
  
  category TEXT,              -- الفئة الغالبة في الجروب
  governorate TEXT,           -- المحافظة (لو جروب محلي)
  members_count INTEGER,
  
  -- الأداء
  total_harvests INTEGER DEFAULT 0,
  total_buyers_found INTEGER DEFAULT 0,
  total_phones_found INTEGER DEFAULT 0,
  avg_buyers_per_harvest NUMERIC(6,1) DEFAULT 0,
  last_harvest_at TIMESTAMPTZ,
  
  -- التصنيف
  quality_score INTEGER DEFAULT 50, -- 0-100
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════════
-- المقاييس اليومية
-- ════════════════════════════════════════════
CREATE TABLE bhe_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- حسب المصدر
  source TEXT NOT NULL, -- 'facebook_group' | 'dubizzle_comment' | ...
  
  buyers_discovered INTEGER DEFAULT 0,
  phones_found INTEGER DEFAULT 0,
  matches_made INTEGER DEFAULT 0,
  contacts_sent INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  
  UNIQUE(date, source)
);
```

---

## 🎯 تصنيف المشترين (Buyer Scoring)

```javascript
function classifyBuyer(buyer) {
  let score = 0;
  
  // عنده رقم = +30
  if (buyer.buyer_phone) score += 30;
  
  // حدد المنتج = +20
  if (buyer.product_wanted && buyer.product_wanted.length > 5) score += 20;
  
  // حدد الميزانية = +15
  if (buyer.budget_min || buyer.budget_max) score += 15;
  
  // حدد الموقع = +10
  if (buyer.governorate) score += 10;
  
  // حدد الحالة (جديد/مستعمل) = +5
  if (buyer.condition_wanted) score += 5;
  
  // المصدر:
  if (buyer.source === 'dubizzle_comment') score += 10; // مهتم بمنتج محدد
  if (buyer.source === 'facebook_group') score += 5;
  
  // الميزانية عالية = +10
  if (buyer.budget_max >= 20000) score += 10;
  
  // التصنيف
  let tier = 'cold_buyer';
  if (score >= 70) tier = 'hot_buyer';   // 🔥
  else if (score >= 40) tier = 'warm_buyer'; // 🟡
  
  // القيمة المتوقعة
  const value = buyer.budget_max || buyer.budget_min || 
    (buyer.category === 'vehicles' ? 500000 :
     buyer.category === 'properties' ? 1000000 :
     buyer.category === 'phones' ? 20000 : 10000);
  
  return { tier, score, estimated_purchase_value: value };
}
```

---

## 🔄 محرك المطابقة (Matching Engine)

```
═══ المطابقة: مشتري ↔ إعلان/بائع ═══

كل مشتري جديد → ابحث عن إعلانات مطابقة في ahe_listings:

SELECT * FROM ahe_listings
WHERE category = buyer.category
AND (governorate = buyer.governorate OR buyer.governorate IS NULL)
AND (price >= buyer.budget_min OR buyer.budget_min IS NULL)
AND (price <= buyer.budget_max OR buyer.budget_max IS NULL)
AND is_duplicate = false
ORDER BY 
  CASE WHEN price BETWEEN buyer.budget_min AND buyer.budget_max THEN 0 ELSE 1 END,
  created_at DESC
LIMIT 20;

═══ المطابقة العكسية: إعلان جديد ← مشترين مسجلين ═══

كل إعلان جديد (من AHE) → ابحث عن مشترين مطابقين:

SELECT * FROM bhe_buyers
WHERE category = listing.category
AND (governorate = listing.governorate OR governorate IS NULL)
AND (budget_max >= listing.price OR budget_max IS NULL)
AND pipeline_status IN ('discovered', 'phone_found', 'matched')
AND buyer_phone IS NOT NULL
ORDER BY buyer_score DESC
LIMIT 10;

→ لكل مشتري مطابق:
  أرسل إشعار: "لقينا اللي بتدور عليه! [رابط الإعلان]"
```

---

## 📨 التواصل مع المشترين

```
═══ الرسالة للمشتري (تختلف عن رسالة البائع) ═══

القالب: buy_match_notification_v1
───────────────────────────────────────
السلام عليكم {{buyer_name}} 👋

شفنا إنك بتدوّر على {{product_wanted}}.

لقينا {{matches_count}} إعلان مطابق على مكسب:

📱 {{match_1_title}} — {{match_1_price}} ج.م
📱 {{match_2_title}} — {{match_2_price}} ج.م
📱 {{match_3_title}} — {{match_3_price}} ج.م

شوفهم كلهم: {{browse_url}}

+ على مكسب عندك:
🔔 تنبيه لما ينزل اللي بتدوّر عليه
🔨 مزادات — اشتري بأقل سعر
🔄 تبادل — بدّل اللي عندك

سجّل مجاناً: {{join_url}}
───────────────────────────────────────

═══ التواصل الهجين (زي البائعين) ═══

في /admin/sales/buyer-outreach:
  قائمة المشترين المطابقين مع أزرار:
  [📋 نسخ الرسالة] [📱 واتساب] [✅ تم الإرسال] [⏭️ تخطي]
```

---

## 📱 واجهات الإدارة

### صفحة حصاد المشترين: /admin/sales/buyer-harvest

```
┌══════════════════════════════════════════════════════════════════════╗
║ 🛒 محرك حصاد المشترين                                               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║ ┌─ إحصائيات اليوم ──────────────────────────────────────────────┐ ║
║ │ 🛒 مشترين اكتشفوا: 450 | 📞 بأرقام: 180 | 🔥 hot: 45        │ ║
║ │ 🔄 مطابقات: 120 | 📨 تواصل: 50 | ✅ سجّلوا: 12              │ ║
║ └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║ ┌─ التبويبات ─────────────────────────────────────────────────────┐║
║ │ [المشترين] [الجروبات] [المطابقات] [التواصل] [Paste & Parse]   │║
║ └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║ ┌─ جدول المشترين ─────────────────────────────────────────────────┐║
║ │ | الشريحة | المشتري | الرقم | عايز إيه | الميزانية | مطابقات | │║
║ │ |─────────|─────────|───────|──────────|──────────|─────────| │║
║ │ | 🔥 hot  | أحمد    | 0101x | آيفون 15 | 40,000   | 15      | │║
║ │ | 🟡 warm | محمد    | 0111x | سامسونج  | 25,000   | 8       | │║
║ │ | 🔵 cold | سارة    | —     | موبايل   | —        | 0       | │║
║ └────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Paste & Parse: /admin/sales/buyer-harvest/paste

```
┌══════════════════════════════════════════════════════════════════════╗
║ 📋 Paste & Parse — استخراج مشترين من نصوص                           ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║ المصدر: [جروب فيسبوك ▼]                                            ║
║ اسم الجروب: [بيع وشراء موبايلات إسكندرية __________]               ║
║                                                                      ║
║ الصق النصوص هنا:                                                    ║
║ ┌────────────────────────────────────────────────────────────────┐  ║
║ │ (الصق نصوص البوستات من الجروب هنا)                           │  ║
║ │                                                                │  ║
║ │ مطلوب آيفون 15 برو ميزانيتي 40 ألف                          │  ║
║ │ 01012345678 سيدي جابر                                         │  ║
║ │ ─────────────────                                              │  ║
║ │ عايز أشتري سامسونج S24 مستعمل                                │  ║
║ │ المعادي — كلمني 01112345678                                   │  ║
║ │                                                                │  ║
║ └────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║ [🤖 حلل واستخرج]                                                   ║
║                                                                      ║
║ ┌─ النتائج ───────────────────────────────────────────────────────┐║
║ │ ✅ تم استخراج 2 مشتري:                                         │║
║ │                                                                  │║
║ │ 1. 🔥 مطلوب: آيفون 15 برو | 40,000 ج.م | سيدي جابر          │║
║ │    📞 01012345678 | 15 إعلان مطابق                              │║
║ │                                                                  │║
║ │ 2. 🟡 مطلوب: سامسونج S24 | مستعمل | المعادي                   │║
║ │    📞 01112345678 | 8 إعلانات مطابقة                            │║
║ │                                                                  │║
║ │ [💾 حفظ الكل] [📨 حفظ وأرسل رسائل]                            │║
║ └────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════╝

═══ الزر "🤖 حلل واستخرج" ═══

يستخدم Claude API لتحليل النص:
  System: "استخرج كل طلبات الشراء من النص التالي. لكل طلب استخرج:
           الاسم، الرقم، المنتج المطلوب، الميزانية، الموقع، الحالة (جديد/مستعمل).
           ارجع JSON array."
  
  User: [النص الملصوق]
  
  Response: [
    { "name": "أحمد", "phone": "01012345678", "product": "آيفون 15 برو", 
      "budget": 40000, "location": "سيدي جابر", "condition": null },
    { "name": null, "phone": "01112345678", "product": "سامسونج S24",
      "budget": null, "location": "المعادي", "condition": "used" }
  ]

لو ANTHROPIC_API_KEY مش موجود → استخدم regex parsing (أبسط لكن أقل دقة)
```

---

## ⚙️ Railway Worker — Buyer Harvester

```javascript
// ═══ في server.ts — أضف endpoints ═══

// 1. حصاد تعليقات المشترين (يشتغل مع AHE)
//    يُضاف في fetchAndExtractDetail() — مسار 2

// 2. مطابقة مشترين ↔ إعلانات
app.get('/cron/buyer-match', async (req, res) => {
  // لكل مشتري جديد بدون مطابقة:
  //   ابحث عن إعلانات مطابقة في ahe_listings
  //   حدّث matched_listings + matches_count
});

// 3. مطابقة عكسية: إعلان جديد ← مشترين
//    يُضاف في نهاية كل حصادة AHE:
//    لكل إعلان جديد → ابحث في bhe_buyers عن مطابقة

// 4. Paste & Parse API
app.post('/api/admin/sales/buyer-harvest/parse', async (req, res) => {
  const { text, source, groupName } = req.body;
  // استخدم Claude API أو regex لتحليل النص
  // ارجع: buyers[]
});

// 5. Auto-run بعد harvest + enrich + outreach:
setTimeout(async () => {
  await cronHarvest();           // حصاد بائعين
  await enrichListings();        // إثراء (أرقام + أسماء)
  await processOutreach();       // تواصل مع بائعين
  await matchBuyersToListings(); // مطابقة مشترين ← إعلانات (جديد!)
  await processLifecycle();      // دورة حياة
}, 10000);
```

---

## 📁 ملفات الكود

```
/lib/buyer-harvester
  parser.ts                     — parseBuyerPost() + detectCategory()
  classifier.ts                 — classifyBuyer() + scoring
  matcher.ts                    — matchBuyerToListings() + reverseMatch()

/app/admin/sales
  buyer-harvest/page.tsx        — لوحة حصاد المشترين
  buyer-harvest/paste/page.tsx  — Paste & Parse
  buyer-outreach/page.tsx       — التواصل مع المشترين

/api/admin/sales
  buyer-harvest/parse/route.ts  — Claude API parsing
  buyer-harvest/route.ts        — CRUD مشترين
  buyer-match/route.ts          — مطابقة

/app/browse (SSR — SEO)
  [category]/[governorate]/page.tsx — صفحة فئة/محافظة
  [category]/[governorate]/[slug]/page.tsx — صفحة إعلان واحد

/migrations
  bhe_001_buyers.sql
  bhe_002_facebook_groups.sql
  bhe_003_daily_metrics.sql
```

---

## 🚀 ترتيب التنفيذ — مراحل بدون إطار زمني

```
═══ المرحلة 1: قاعدة البيانات + التصنيف ═══
  ☐ جداول: bhe_buyers + bhe_facebook_groups + bhe_daily_metrics
  ☐ دالة classifyBuyer() + scoring
  ☐ دالة parseBuyerPost() + detectCategory()

═══ المرحلة 2: المسار 2 — تعليقات دوبيزل (مع AHE) ═══
  ☐ إضافة استخراج تعليقات في fetchAndExtractDetail()
  ☐ حفظ المشترين في bhe_buyers
  ☐ تشغيل تلقائي مع كل حصادة

═══ المرحلة 3: Matching Engine ═══
  ☐ matchBuyerToListings() — مشتري → إعلانات
  ☐ reverseMatchListingToBuyers() — إعلان جديد → مشترين
  ☐ Cron: /cron/buyer-match
  ☐ تشغيل تلقائي بعد كل حصادة

═══ المرحلة 4: Paste & Parse ═══
  ☐ /admin/sales/buyer-harvest/paste — واجهة اللصق
  ☐ Claude API parsing أو regex fallback
  ☐ عرض النتائج + حفظ + مطابقة فورية

═══ المرحلة 5: Dashboard + التواصل ═══
  ☐ /admin/sales/buyer-harvest — لوحة المشترين
  ☐ /admin/sales/buyer-outreach — التواصل (wa.me + نسخ)
  ☐ قوالب رسائل المشترين (3 قوالب)

═══ المرحلة 6: SEO Pages (Reverse Matching) ═══
  ☐ /browse/[category]/[governorate] — صفحات SSR
  ☐ Schema.org markup
  ☐ sitemap.xml تلقائي
  ☐ Open Graph tags

═══ المرحلة 7: Bookmarklet Facebook Groups ═══
  ☐ Bookmarklet يستخرج بوستات "مطلوب" من أي جروب
  ☐ نفس بنية AHE Bookmarklet (popup approach)

نفذ كل المراحل بالترتيب وبأسرع وقت ممكن.
لا تنتظر تأكيد بين المراحل.
```
