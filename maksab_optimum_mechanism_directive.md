# مكسب — التوجيه الشامل: آلية التوازن الأمثل + توسيع النطاقات
## وثيقة تنفيذية لـ Claude Code
## مارس 2026

---

## ⚠️ القاعدة الحرجة — اقرأ قبل أي كود

```
محركات حصاد البائعين (AHE) لا تتوقف ولا تبطئ أبداً!
حتى لو فيه عرض زائد — البائعين دائماً مطلوبين.
لا تعدّل ahe_scopes.harvest_interval_minutes تلقائياً أبداً.

التوازن يتحقق فقط بـ:
  1. زيادة نشاط حصاد المشترين (BHE)
  2. إرسال تنبيهات للمدير
  3. أولوية أعلى للتواصل مع المشترين

AHE = دائماً أقصى سرعة ✅
BHE = يتكثّف عند الحاجة ✅
AHE يبطئ = ممنوع ❌
```

---

## 🎯 المطلوب — 4 مراحل

```
المرحلة 1: توسيع النطاقات لتشمل كل السوق المصري
المرحلة 2: جدول التوازن + Balance Calculator
المرحلة 3: Dashboard التوازن + التنبيهات
المرحلة 4: Cron ذكي يختار أي scope يحصد
```

---

## ═══ المرحلة 1: توسيع النطاقات ═══

### 1.1 أضف كل الفئات في ahe_category_mappings

```sql
-- الفئات الـ 12 لمكسب — كل واحدة مع URL template لدوبيزل
INSERT INTO ahe_category_mappings 
(maksab_category, category_name_ar, source_platform, source_category_name, source_url_segment, source_url_template)
VALUES
('phones', 'موبايلات', 'dubizzle', 'Mobile Phones', 'mobile-phones-tablets-accessories-numbers/mobile-phones', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/{gov}/'),
('vehicles', 'سيارات', 'dubizzle', 'Cars', 'vehicles/cars-for-sale', 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/{gov}/'),
('properties', 'عقارات', 'dubizzle', 'Properties', 'properties/apartments-duplex-for-sale', 'https://www.dubizzle.com.eg/properties/apartments-duplex-for-sale/{gov}/'),
('electronics', 'إلكترونيات', 'dubizzle', 'Electronics', 'electronics-home-appliances', 'https://www.dubizzle.com.eg/electronics-home-appliances/{gov}/'),
('furniture', 'أثاث', 'dubizzle', 'Furniture', 'home-furniture-decor', 'https://www.dubizzle.com.eg/home-furniture-decor/{gov}/'),
('fashion', 'أزياء وملابس', 'dubizzle', 'Fashion', 'fashion-beauty', 'https://www.dubizzle.com.eg/fashion-beauty/{gov}/'),
('home_appliances', 'أجهزة منزلية', 'dubizzle', 'Home Appliances', 'electronics-home-appliances/home-appliances', 'https://www.dubizzle.com.eg/electronics-home-appliances/home-appliances/{gov}/'),
('hobbies', 'هوايات ورياضة', 'dubizzle', 'Hobbies', 'hobbies-sports-leisure', 'https://www.dubizzle.com.eg/hobbies-sports-leisure/{gov}/'),
('services', 'خدمات', 'dubizzle', 'Services', 'services', 'https://www.dubizzle.com.eg/services/{gov}/'),
('gold_jewelry', 'ذهب ومجوهرات', 'dubizzle', 'Jewelry', 'fashion-beauty/jewelry-accessories', 'https://www.dubizzle.com.eg/fashion-beauty/jewelry-accessories/{gov}/'),
('scrap', 'خُردة وسكراب', 'dubizzle', 'Scrap', 'industrial-equipment', 'https://www.dubizzle.com.eg/industrial-equipment/{gov}/'),
('luxury', 'سلع فاخرة', 'dubizzle', 'Luxury', 'fashion-beauty/luxury', 'https://www.dubizzle.com.eg/fashion-beauty/luxury/{gov}/')
ON CONFLICT (maksab_category, source_platform) DO UPDATE SET
  source_url_template = EXCLUDED.source_url_template,
  category_name_ar = EXCLUDED.category_name_ar;
```

### 1.2 أضف كل المحافظات في ahe_governorate_mappings

```sql
-- المحافظات الـ 27 مع URL segment لدوبيزل
INSERT INTO ahe_governorate_mappings
(maksab_governorate, governorate_name_ar, source_platform, source_governorate_name, source_url_segment, gov_tier)
VALUES
-- Tier A — كبرى
('cairo', 'القاهرة', 'dubizzle', 'Cairo', 'cairo', 'A'),
('alexandria', 'الإسكندرية', 'dubizzle', 'Alexandria', 'alexandria', 'A'),
('giza', 'الجيزة', 'dubizzle', 'Giza', 'giza', 'A'),
-- Tier B — متوسطة
('qalyubia', 'القليوبية', 'dubizzle', 'Qalyubia', 'qalyubia', 'B'),
('sharqia', 'الشرقية', 'dubizzle', 'Sharqia', 'sharqia', 'B'),
('dakahlia', 'الدقهلية', 'dubizzle', 'Dakahlia', 'dakahlia', 'B'),
('gharbia', 'الغربية', 'dubizzle', 'Gharbia', 'gharbia', 'B'),
('monufia', 'المنوفية', 'dubizzle', 'Monufia', 'monufia', 'B'),
('beheira', 'البحيرة', 'dubizzle', 'Beheira', 'beheira', 'B'),
('port_said', 'بورسعيد', 'dubizzle', 'Port Said', 'port-said', 'B'),
('ismailia', 'الإسماعيلية', 'dubizzle', 'Ismailia', 'ismailia', 'B'),
('suez', 'السويس', 'dubizzle', 'Suez', 'suez', 'B'),
('fayoum', 'الفيوم', 'dubizzle', 'Fayoum', 'fayoum', 'B'),
('minya', 'المنيا', 'dubizzle', 'Minya', 'minya', 'B'),
-- Tier C — صغيرة
('asyut', 'أسيوط', 'dubizzle', 'Asyut', 'asyut', 'C'),
('sohag', 'سوهاج', 'dubizzle', 'Sohag', 'sohag', 'C'),
('qena', 'قنا', 'dubizzle', 'Qena', 'qena', 'C'),
('luxor', 'الأقصر', 'dubizzle', 'Luxor', 'luxor', 'C'),
('aswan', 'أسوان', 'dubizzle', 'Aswan', 'aswan', 'C'),
('damietta', 'دمياط', 'dubizzle', 'Damietta', 'damietta', 'C'),
('beni_suef', 'بني سويف', 'dubizzle', 'Beni Suef', 'beni-suef', 'C'),
('kafr_el_sheikh', 'كفر الشيخ', 'dubizzle', 'Kafr El Sheikh', 'kafr-el-sheikh', 'C'),
-- Tier D — نائية
('red_sea', 'البحر الأحمر', 'dubizzle', 'Red Sea', 'red-sea', 'D'),
('matrouh', 'مطروح', 'dubizzle', 'Matrouh', 'matrouh', 'D'),
('north_sinai', 'شمال سيناء', 'dubizzle', 'North Sinai', 'north-sinai', 'D'),
('south_sinai', 'جنوب سيناء', 'dubizzle', 'South Sinai', 'south-sinai', 'D'),
('new_valley', 'الوادي الجديد', 'dubizzle', 'New Valley', 'new-valley', 'D')
ON CONFLICT (maksab_governorate, source_platform) DO UPDATE SET
  gov_tier = EXCLUDED.gov_tier,
  source_url_segment = EXCLUDED.source_url_segment;
```

### 1.3 أضف المدن الرئيسية

```sql
INSERT INTO ahe_city_mappings
(maksab_city, city_name_ar, maksab_governorate, source_platform, source_url_segment)
VALUES
-- القاهرة
('nasr_city', 'مدينة نصر', 'cairo', 'dubizzle', 'nasr-city'),
('maadi', 'المعادي', 'cairo', 'dubizzle', 'maadi'),
('heliopolis', 'مصر الجديدة', 'cairo', 'dubizzle', 'heliopolis'),
('tagamoa', 'التجمع الخامس', 'cairo', 'dubizzle', 'new-cairo-fifth-settlement'),
('october', '6 أكتوبر', 'cairo', 'dubizzle', '6th-of-october'),
('sheikh_zayed', 'الشيخ زايد', 'cairo', 'dubizzle', 'sheikh-zayed'),
('obour', 'العبور', 'cairo', 'dubizzle', 'al-obour-city'),
('rehab', 'الرحاب', 'cairo', 'dubizzle', 'al-rehab-city'),
('shorouk', 'الشروق', 'cairo', 'dubizzle', 'al-shorouk-city'),
('helwan', 'حلوان', 'cairo', 'dubizzle', 'helwan'),
('downtown', 'وسط البلد', 'cairo', 'dubizzle', 'downtown-cairo'),
('ain_shams', 'عين شمس', 'cairo', 'dubizzle', 'ain-shams'),
-- الإسكندرية
('sidi_gaber', 'سيدي جابر', 'alexandria', 'dubizzle', 'sidi-gaber'),
('smouha', 'سموحة', 'alexandria', 'dubizzle', 'smouha'),
('montazah', 'المنتزه', 'alexandria', 'dubizzle', 'el-montazah'),
('agami', 'العجمي', 'alexandria', 'dubizzle', 'agami'),
('borg_arab', 'برج العرب', 'alexandria', 'dubizzle', 'borg-el-arab'),
('sidi_bishr', 'سيدي بشر', 'alexandria', 'dubizzle', 'sidi-bishr'),
('gleem', 'جليم', 'alexandria', 'dubizzle', 'gleem'),
('victoria', 'فيكتوريا', 'alexandria', 'dubizzle', 'victoria'),
-- الجيزة
('haram', 'الهرم', 'giza', 'dubizzle', 'al-haram'),
('faisal', 'فيصل', 'giza', 'dubizzle', 'faisal'),
('dokki', 'الدقي', 'giza', 'dubizzle', 'dokki'),
('mohandessin', 'المهندسين', 'giza', 'dubizzle', 'mohandessin'),
-- محافظات أخرى
('mansura', 'المنصورة', 'dakahlia', 'dubizzle', 'mansoura'),
('tanta', 'طنطا', 'gharbia', 'dubizzle', 'tanta'),
('zagazig', 'الزقازيق', 'sharqia', 'dubizzle', 'zagazig'),
('10th_ramadan', 'العاشر من رمضان', 'sharqia', 'dubizzle', '10th-of-ramadan')
ON CONFLICT DO NOTHING;
```

### 1.4 Migration: أعمدة جديدة لـ ahe_scopes

```sql
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS target_supply_demand_ratio NUMERIC(4,2) DEFAULT 0.33;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS gov_tier TEXT DEFAULT 'B';
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS cat_demand_level TEXT DEFAULT 'med';
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS auto_adjusted BOOLEAN DEFAULT false;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS last_balance_check_at TIMESTAMPTZ;

-- أضف gov_tier في governorate mappings لو مش موجود
ALTER TABLE ahe_governorate_mappings ADD COLUMN IF NOT EXISTS gov_tier TEXT DEFAULT 'B';
```

### 1.5 دالة generateAllScopes()

```javascript
// lib/harvester/scope-generator.ts

async function generateAllScopes(supabase) {
  const { data: categories } = await supabase
    .from('ahe_category_mappings')
    .select('*')
    .eq('source_platform', 'dubizzle');
  
  const { data: governorates } = await supabase
    .from('ahe_governorate_mappings')
    .select('*')
    .eq('source_platform', 'dubizzle');
  
  const highDemand = ['phones', 'vehicles', 'properties', 'electronics'];
  const medDemand = ['furniture', 'fashion', 'home_appliances'];
  const lowDemand = ['gold_jewelry', 'scrap', 'luxury', 'hobbies', 'services'];
  
  const targetRatios = {
    phones: 0.33, vehicles: 0.20, properties: 0.10,
    electronics: 0.33, furniture: 0.25, fashion: 0.33,
    home_appliances: 0.33, hobbies: 0.33, services: 0.50,
    gold_jewelry: 0.25, scrap: 0.50, luxury: 0.20
  };
  
  const scopes = [];
  let skipped = 0;
  
  for (const cat of categories || []) {
    for (const gov of governorates || []) {
      const govTier = gov.gov_tier || 'B';
      const catDemand = highDemand.includes(cat.maksab_category) ? 'high' :
                        medDemand.includes(cat.maksab_category) ? 'med' : 'low';
      
      // شروط التخطي — فئات ضعيفة في محافظات نائية
      if (catDemand === 'low' && (govTier === 'D' || govTier === 'C')) { skipped++; continue; }
      if (catDemand === 'med' && govTier === 'D') { skipped++; continue; }
      
      // حساب interval و maxPages و priority
      let interval, maxPages, priority;
      
      if (govTier === 'A' && catDemand === 'high')      { interval = 30;   maxPages = 5; priority = 10; }
      else if (govTier === 'A' && catDemand === 'med')   { interval = 60;   maxPages = 3; priority = 8; }
      else if (govTier === 'A' && catDemand === 'low')   { interval = 120;  maxPages = 2; priority = 6; }
      else if (govTier === 'B' && catDemand === 'high')  { interval = 60;   maxPages = 3; priority = 7; }
      else if (govTier === 'B' && catDemand === 'med')   { interval = 120;  maxPages = 2; priority = 5; }
      else if (govTier === 'B' && catDemand === 'low')   { interval = 360;  maxPages = 2; priority = 3; }
      else if (govTier === 'C' && catDemand === 'high')  { interval = 120;  maxPages = 2; priority = 4; }
      else if (govTier === 'C' && catDemand === 'med')   { interval = 360;  maxPages = 2; priority = 2; }
      else                                                { interval = 1440; maxPages = 1; priority = 1; }
      
      // بناء URL
      const baseUrl = (cat.source_url_template || '')
        .replace('{gov}', gov.source_url_segment || '');
      
      if (!baseUrl || baseUrl.includes('{gov}')) { skipped++; continue; }
      
      const code = `dub_${cat.maksab_category}_${gov.maksab_governorate}`;
      
      scopes.push({
        code,
        name: `${cat.category_name_ar} — ${gov.governorate_name_ar} — دوبيزل`,
        source_platform: 'dubizzle',
        maksab_category: cat.maksab_category,
        governorate: gov.maksab_governorate,
        base_url: baseUrl,
        harvest_interval_minutes: interval,
        max_pages_per_harvest: maxPages,
        priority,
        is_active: govTier !== 'D', // المحافظات النائية تبدأ متوقفة
        target_supply_demand_ratio: targetRatios[cat.maksab_category] || 0.33,
        gov_tier: govTier,
        cat_demand_level: catDemand,
      });
    }
  }
  
  // Upsert — لا يحذف الموجود
  let created = 0, updated = 0;
  for (const scope of scopes) {
    const { data, error } = await supabase
      .from('ahe_scopes')
      .upsert(scope, { onConflict: 'code' })
      .select();
    
    if (data?.length) {
      if (data[0].created_at === data[0].updated_at) created++;
      else updated++;
    }
  }
  
  return { created, updated, skipped, total: scopes.length };
}
```

### 1.6 API Endpoint

```
POST /api/admin/sales/scopes/generate-all
  → يشغّل generateAllScopes()
  → يرجع: { created, updated, skipped, total }
  
في Dashboard: زر [🔄 إنشاء كل النطاقات]
  + confirmation: "سيتم إنشاء ~200 نطاق — متأكد؟"
```

---

## ═══ المرحلة 2: جدول التوازن + Balance Calculator ═══

### 2.1 جدول market_balance

```sql
CREATE TABLE IF NOT EXISTS market_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  category TEXT NOT NULL,
  governorate TEXT, -- NULL = كل المحافظات (إجمالي الفئة)
  
  -- العرض (من AHE)
  active_listings INTEGER DEFAULT 0,
  new_listings_today INTEGER DEFAULT 0,
  sellers_with_phone INTEGER DEFAULT 0,
  
  -- الطلب (من BHE)
  active_buyers INTEGER DEFAULT 0,
  new_buyers_today INTEGER DEFAULT 0,
  buy_requests_active INTEGER DEFAULT 0,
  
  -- النسبة والحالة
  supply_demand_ratio NUMERIC(6,2),
  target_ratio NUMERIC(6,2),
  balance_status TEXT DEFAULT 'no_data',
    -- 'balanced'        — متوازن ✅
    -- 'needs_buyers'    — محتاج مشترين أكتر 🟡
    -- 'critical_buyers' — محتاج مشترين عاجل 🔴
    -- 'needs_sellers'   — محتاج بائعين أكتر (نادر)
    -- 'no_data'         — لا بيانات كافية
  
  -- التوصية — ⚠️ فقط لـ BHE — لا تلمس AHE!
  recommended_action TEXT,
    -- 'increase_bhe_priority'   — كثّف حصاد المشترين
    -- 'urgent_bhe_needed'       — حصاد مشترين عاجل!
    -- 'maintain'                — حافظ على الوتيرة الحالية
  
  -- تنبيه
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(category, governorate)
);
```

### 2.2 جدول التنبيهات

```sql
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  type TEXT NOT NULL,
    -- 'balance_alert'     — تنبيه توازن
    -- 'whale_detected'    — حوت جديد
    -- 'escalation'        — تصعيد CS
    -- 'system_error'      — خطأ تقني
    -- 'daily_report'      — تقرير يومي
  
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,     -- رابط الإجراء المطلوب
  priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_unread ON admin_notifications(is_read, created_at DESC)
  WHERE is_read = false;
```

### 2.3 calculateMarketBalance()

```javascript
// ⚠️ هذه الدالة لا تعدّل AHE أبداً — فقط تحسب وتنبّه

async function calculateMarketBalance(supabase) {
  const categories = ['phones', 'vehicles', 'properties', 'electronics', 
    'furniture', 'fashion', 'home_appliances', 'hobbies', 'services',
    'gold_jewelry', 'scrap', 'luxury'];
  
  const targetRatios = {
    phones: 0.33, vehicles: 0.20, properties: 0.10,
    electronics: 0.33, furniture: 0.25, fashion: 0.33,
    home_appliances: 0.33, hobbies: 0.33, services: 0.50,
    gold_jewelry: 0.25, scrap: 0.50, luxury: 0.20
  };
  
  const results = [];
  
  for (const cat of categories) {
    // عدد الإعلانات النشطة
    const { count: supply } = await supabase
      .from('ahe_listings')
      .select('id', { count: 'exact', head: true })
      .eq('maksab_category', cat)
      .eq('is_duplicate', false);
    
    // عدد المشترين النشطين
    const { count: demand } = await supabase
      .from('bhe_buyers')
      .select('id', { count: 'exact', head: true })
      .eq('category', cat)
      .eq('is_duplicate', false)
      .in('pipeline_status', ['discovered', 'phone_found', 'matched']);
    
    const target = targetRatios[cat] || 0.33;
    const ratio = demand > 0 ? (supply || 0) / demand : (supply > 0 ? 999 : 0);
    
    // ⚠️ التقييم — فقط لتوجيه BHE + تنبيهات
    let status, action;
    
    if (!supply && !demand) {
      status = 'no_data';
      action = 'maintain';
    } else if (ratio > target * 5) {
      // عرض أكتر 5 مرات من المطلوب → عاجل!
      status = 'critical_buyers';
      action = 'urgent_bhe_needed';
    } else if (ratio > target * 2) {
      // عرض أكتر مرتين
      status = 'needs_buyers';
      action = 'increase_bhe_priority';
    } else if (ratio < target * 0.3 && demand > 10) {
      // طلب أكتر بكتير (نادر)
      status = 'needs_sellers';
      action = 'maintain'; // AHE شغال بالفعل بأقصى سرعة
    } else {
      status = 'balanced';
      action = 'maintain';
    }
    
    // حفظ
    await supabase.from('market_balance').upsert({
      category: cat,
      governorate: null, // إجمالي الفئة
      active_listings: supply || 0,
      active_buyers: demand || 0,
      supply_demand_ratio: ratio,
      target_ratio: target,
      balance_status: status,
      recommended_action: action,
      updated_at: new Date().toISOString()
    }, { onConflict: 'category,governorate' });
    
    // ⚠️ تنبيه لو محتاج مشترين عاجل
    if (status === 'critical_buyers') {
      await supabase.from('admin_notifications').insert({
        type: 'balance_alert',
        title: `🔴 ${getCategoryAr(cat)} — محتاجة مشترين عاجل!`,
        body: `عدد الإعلانات: ${supply} | عدد المشترين: ${demand} | النسبة: ${ratio.toFixed(1)}:1 | المطلوب: ${(1/target).toFixed(0)}:1\n\nالإجراء: افتح Paste&Parse وحصّد مشترين من جروبات فيسبوك لفئة ${getCategoryAr(cat)}`,
        action_url: '/admin/sales/buyer-harvest/paste',
        priority: 'urgent'
      });
    } else if (status === 'needs_buyers') {
      // تنبيه مرة/يوم فقط (مش كل ساعة)
      const { data: existing } = await supabase
        .from('admin_notifications')
        .select('id')
        .eq('type', 'balance_alert')
        .ilike('title', `%${getCategoryAr(cat)}%`)
        .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
        .limit(1);
      
      if (!existing?.length) {
        await supabase.from('admin_notifications').insert({
          type: 'balance_alert',
          title: `🟡 ${getCategoryAr(cat)} — محتاجة مشترين أكتر`,
          body: `عدد الإعلانات: ${supply} | عدد المشترين: ${demand}\n\nكثّف حصاد المشترين من جروبات فيسبوك`,
          action_url: '/admin/sales/buyer-harvest/paste',
          priority: 'high'
        });
      }
    }
    
    results.push({ category: cat, supply, demand, ratio, status, action });
  }
  
  return results;
}

function getCategoryAr(cat) {
  const map = {
    phones: 'موبايلات', vehicles: 'سيارات', properties: 'عقارات',
    electronics: 'إلكترونيات', furniture: 'أثاث', fashion: 'أزياء',
    home_appliances: 'أجهزة منزلية', hobbies: 'هوايات', services: 'خدمات',
    gold_jewelry: 'ذهب ومجوهرات', scrap: 'خُردة', luxury: 'سلع فاخرة'
  };
  return map[cat] || cat;
}
```

---

## ═══ المرحلة 3: Dashboard التوازن + التنبيهات ═══

### 3.1 بطاقة التوازن في /admin/dashboard

```
أضف بطاقة جديدة في لوحة القيادة:

┌─ ⚖️ توازن السوق ──────────────────────────────────────────┐
│                                                              │
│ الفئة         │ عرض    │ طلب    │ النسبة │ الحالة           │
│───────────────┼────────┼────────┼────────┼─────────────────│
│ 📱 موبايلات   │ 4,000  │ 2,000  │ 2.0:1  │ 🟡 محتاج مشترين│
│ 🚗 سيارات     │ 1,800  │   500  │ 3.6:1  │ 🟡 محتاج مشترين│
│ 🏠 عقارات     │ 1,200  │   400  │ 3.0:1  │ 🟢 متوازن      │
│ 💻 إلكترونيات │   900  │   350  │ 2.6:1  │ 🟢 متوازن      │
│ 🛋️ أثاث      │   400  │   150  │ 2.7:1  │ 🟢 متوازن      │
│                                                              │
│ 💡 الفئات اللي محتاجة مشترين بتظهر مع رابط Paste&Parse    │
└──────────────────────────────────────────────────────────────┘

API: GET /api/admin/dashboard/balance
  → SELECT * FROM market_balance ORDER BY 
    CASE balance_status 
      WHEN 'critical_buyers' THEN 0 
      WHEN 'needs_buyers' THEN 1 
      ELSE 2 END
```

### 3.2 تنبيهات في Header (🔔)

```
الجرس في Header يعرض عدد التنبيهات غير المقروءة.
لما يضغط عليه → dropdown:

┌─ 🔔 التنبيهات (3 جديدة) ──────────────────────────────────┐
│                                                              │
│ 🔴 موبايلات — محتاجة مشترين عاجل!                          │
│    عرض: 4,000 | طلب: 200 — [حصّد مشترين]                   │
│    منذ 30 دقيقة                                             │
│                                                              │
│ 🟡 سيارات — محتاجة مشترين أكتر                             │
│    عرض: 1,800 | طلب: 500 — [حصّد مشترين]                   │
│    منذ ساعة                                                  │
│                                                              │
│ 🐋 حوت جديد: هونج كونج موبايل (Score: 92)                  │
│    [تواصل VIP]                                               │
│    منذ 2 ساعة                                                │
│                                                              │
│ [✅ تعليم الكل كمقروء]                                      │
└──────────────────────────────────────────────────────────────┘

API: 
  GET /api/admin/notifications — التنبيهات غير المقروءة
  POST /api/admin/notifications/read — تعليم كمقروء
```

### 3.3 صفحة النطاقات المحسّنة /admin/sales/scopes

```
أضف:
  عداد: "إجمالي النطاقات: 200 | نشط: 180 | متوقف: 20"
  زر: [🔄 إنشاء كل النطاقات]
  فلاتر: [الفئة ▼] [المحافظة ▼] [المستوى ▼] [الحالة ▼]
  
  لكل scope يعرض:
    حالة التوازن: 🟢🟡🔴 (من market_balance)
```

---

## ═══ المرحلة 4: Cron ذكي ═══

### 4.1 تعديل cronHarvest() — اختيار ذكي

```javascript
// في Railway worker — تعديل الـ query اللي يختار الـ scope

// بدل:
//   ORDER BY priority DESC, last_harvest_at ASC
// 
// استخدم:

const { data: readyScopes } = await supabase
  .from('ahe_scopes')
  .select('*, market_balance!inner(balance_status)')
  .or('server_fetch_blocked.eq.false,server_fetch_blocked.is.null')
  .eq('is_active', true)
  .eq('is_paused', false)
  .lte('next_harvest_at', new Date().toISOString())
  .order('priority', { ascending: false })
  .limit(5); // خد أعلى 5 ثم اختر الأنسب

// لو مفيش market_balance (أول مرة) — fallback للقديم
if (!readyScopes?.length) {
  // الـ query القديم بدون join
}

// اختر الأنسب: الأولوية + أي فئة محتاجة عرض
const selected = readyScopes?.sort((a, b) => {
  // needs_sellers أولاً (نادر — لكن لو حصل)
  const aNeeds = a.market_balance?.balance_status === 'needs_sellers' ? 0 : 1;
  const bNeeds = b.market_balance?.balance_status === 'needs_sellers' ? 0 : 1;
  if (aNeeds !== bNeeds) return aNeeds - bNeeds;
  
  // ثم الأولوية
  return (b.priority || 0) - (a.priority || 0);
})?.[0];

// ⚠️ لا تتخطى أي scope بسبب oversupply!
// AHE يحصد دائماً — بغض النظر عن التوازن
```

### 4.2 تشغيل Balance Calculator بعد كل حصادة

```javascript
// في setTimeout startup:

setTimeout(async () => {
  // 1. حصاد بائعين (AHE)
  const harvestResult = await cronHarvest();
  console.log('[Auto] Harvest:', JSON.stringify(harvestResult));
  
  // 2. إثراء (أرقام + أسماء)
  for (let i = 0; i < 5; i++) {
    await delay(5000);
    await enrichListings();
  }
  
  // 3. مطابقة مشترين ← إعلانات (BHE)
  await matchBuyersToListings();
  
  // 4. تواصل مع بائعين
  await processOutreach();
  
  // 5. حساب التوازن + إرسال تنبيهات (جديد!)
  const balanceResults = await calculateMarketBalance(supabase);
  console.log('[Auto] Balance:', JSON.stringify(balanceResults.map(r => 
    `${r.category}: ${r.supply}/${r.demand} = ${r.status}`
  )));
  
  // 6. Lifecycle
  await processLifecycle();
  
}, 10000);
```

---

## ═══ ملاحظات حرجة ═══

```
1. ⚠️ AHE لا يتأثر بالتوازن:
   calculateMarketBalance() لا تعدّل ahe_scopes أبداً
   لا تغيّر interval ولا max_pages ولا priority
   فقط تحسب + تنبّه + توجّه BHE

2. النطاقات الـ 15 الحالية لا تُحذف:
   generateAllScopes() يعمل upsert — يضيف الجديد ويحدّث الموجود

3. المحافظات النائية (Tier D) تبدأ is_active = false:
   المدير يفعّلها يدوياً لو محتاج

4. التنبيهات:
   critical_buyers → تنبيه فوري كل مرة
   needs_buyers → تنبيه مرة/يوم (مش كل ساعة)
   balanced → لا تنبيه

5. النسب المثالية:
   phones: 1:3 | vehicles: 1:5 | properties: 1:10
   electronics: 1:3 | furniture: 1:4 | fashion: 1:3
   يمكن تعديلها من market_balance يدوياً

6. لو BHE لسه ما اشتغلش:
   demand = 0 → status = 'critical_buyers' → تنبيه
   لكن AHE يفضل شغال بأقصى سرعة
```

---

## 🚀 نفذ كل المراحل الأربعة بالترتيب وبأسرع وقت ممكن.
## لا تنتظر تأكيد بين المراحل.
## ابدأ الآن.
