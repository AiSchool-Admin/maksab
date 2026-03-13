-- ════════════════════════════════════════════════════════════
-- Migration 00059 — آلية التوازن الأمثل + توسيع النطاقات
-- Market Balance + Scope Expansion
-- ════════════════════════════════════════════════════════════

-- ═══ 1. أعمدة جديدة لـ ahe_scopes ═══
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS target_supply_demand_ratio NUMERIC(4,2) DEFAULT 0.33;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS gov_tier TEXT DEFAULT 'B';
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS cat_demand_level TEXT DEFAULT 'med';
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS auto_adjusted BOOLEAN DEFAULT false;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS last_balance_check_at TIMESTAMPTZ;

-- ═══ 2. عمود gov_tier لـ ahe_governorate_mappings ═══
ALTER TABLE ahe_governorate_mappings ADD COLUMN IF NOT EXISTS gov_tier TEXT DEFAULT 'B';

-- Update existing governorate tiers
UPDATE ahe_governorate_mappings SET gov_tier = 'A' WHERE maksab_governorate IN ('cairo', 'alexandria', 'giza');
UPDATE ahe_governorate_mappings SET gov_tier = 'B' WHERE maksab_governorate IN ('qalyubia', 'sharqia', 'dakahlia', 'gharbia', 'monufia', 'beheira', 'port_said', 'ismailia', 'suez', 'fayoum', 'minya');
UPDATE ahe_governorate_mappings SET gov_tier = 'C' WHERE maksab_governorate IN ('assiut', 'sohag', 'qena', 'luxor', 'aswan', 'damietta', 'beni_suef', 'kafr_el_sheikh');
UPDATE ahe_governorate_mappings SET gov_tier = 'D' WHERE maksab_governorate IN ('red_sea', 'matrouh', 'north_sinai', 'south_sinai', 'new_valley');

-- ═══ 3. إضافة فئات جديدة (home_appliances, gold_jewelry, scrap, luxury, hobbies) ═══
INSERT INTO ahe_category_mappings
(maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template) VALUES
('home_appliances', 'أجهزة منزلية', 'dubizzle', 'Home Appliances', 'electronics-home-appliances/home-appliances', 'https://www.dubizzle.com.eg/electronics-home-appliances/home-appliances/{gov}/'),
('hobbies', 'هوايات ورياضة', 'dubizzle', 'Hobbies', 'hobbies-sports-leisure', 'https://www.dubizzle.com.eg/hobbies-sports-leisure/{gov}/'),
('gold_jewelry', 'ذهب ومجوهرات', 'dubizzle', 'Jewelry', 'fashion-beauty/jewelry-accessories', 'https://www.dubizzle.com.eg/fashion-beauty/jewelry-accessories/{gov}/'),
('scrap', 'خُردة وسكراب', 'dubizzle', 'Scrap', 'industrial-equipment', 'https://www.dubizzle.com.eg/industrial-equipment/{gov}/'),
('luxury', 'سلع فاخرة', 'dubizzle', 'Luxury', 'fashion-beauty/luxury', 'https://www.dubizzle.com.eg/fashion-beauty/luxury/{gov}/')
ON CONFLICT (maksab_category, source_platform) DO UPDATE SET
  source_url_template = EXCLUDED.source_url_template,
  maksab_category_ar = EXCLUDED.maksab_category_ar;

-- Update existing categories source_url_template to match directive
UPDATE ahe_category_mappings SET source_url_template = 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/{gov}/' WHERE maksab_category = 'phones' AND source_platform = 'dubizzle';
UPDATE ahe_category_mappings SET source_url_template = 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/{gov}/' WHERE maksab_category = 'vehicles' AND source_platform = 'dubizzle';
UPDATE ahe_category_mappings SET source_url_template = 'https://www.dubizzle.com.eg/properties/apartments-duplex-for-sale/{gov}/' WHERE maksab_category = 'properties' AND source_platform = 'dubizzle';
UPDATE ahe_category_mappings SET source_url_template = 'https://www.dubizzle.com.eg/electronics-home-appliances/{gov}/' WHERE maksab_category = 'electronics' AND source_platform = 'dubizzle';
UPDATE ahe_category_mappings SET source_url_template = 'https://www.dubizzle.com.eg/home-furniture-decor/{gov}/' WHERE maksab_category = 'furniture' AND source_platform = 'dubizzle';
UPDATE ahe_category_mappings SET source_url_template = 'https://www.dubizzle.com.eg/fashion-beauty/{gov}/' WHERE maksab_category = 'fashion' AND source_platform = 'dubizzle';
UPDATE ahe_category_mappings SET source_url_template = 'https://www.dubizzle.com.eg/services/{gov}/' WHERE maksab_category = 'services' AND source_platform = 'dubizzle';

-- ═══ 4. إضافة مدن رئيسية جديدة ═══
INSERT INTO ahe_city_mappings
(maksab_governorate, maksab_city, maksab_city_ar, source_platform, source_city_name, source_url_segment) VALUES
-- القاهرة (إضافات جديدة)
('cairo', 'tagamoa', 'التجمع الخامس', 'dubizzle', 'التجمع الخامس', 'new-cairo-fifth-settlement'),
('cairo', 'october', '6 أكتوبر', 'dubizzle', '6 أكتوبر', '6th-of-october'),
('cairo', 'sheikh_zayed', 'الشيخ زايد', 'dubizzle', 'الشيخ زايد', 'sheikh-zayed'),
('cairo', 'obour', 'العبور', 'dubizzle', 'العبور', 'al-obour-city'),
('cairo', 'rehab', 'الرحاب', 'dubizzle', 'الرحاب', 'al-rehab-city'),
('cairo', 'shorouk', 'الشروق', 'dubizzle', 'الشروق', 'al-shorouk-city'),
('cairo', 'helwan', 'حلوان', 'dubizzle', 'حلوان', 'helwan'),
('cairo', 'ain_shams', 'عين شمس', 'dubizzle', 'عين شمس', 'ain-shams'),
-- الإسكندرية (إضافات جديدة)
('alexandria', 'montazah', 'المنتزه', 'dubizzle', 'المنتزه', 'el-montazah'),
('alexandria', 'borg_arab', 'برج العرب', 'dubizzle', 'برج العرب', 'borg-el-arab'),
-- الجيزة
('giza', 'haram', 'الهرم', 'dubizzle', 'الهرم', 'al-haram'),
('giza', 'faisal', 'فيصل', 'dubizzle', 'فيصل', 'faisal'),
('giza', 'dokki', 'الدقي', 'dubizzle', 'الدقي', 'dokki'),
('giza', 'mohandessin', 'المهندسين', 'dubizzle', 'المهندسين', 'mohandessin'),
-- محافظات أخرى
('dakahlia', 'mansura', 'المنصورة', 'dubizzle', 'المنصورة', 'mansoura'),
('gharbia', 'tanta', 'طنطا', 'dubizzle', 'طنطا', 'tanta'),
('sharqia', 'zagazig', 'الزقازيق', 'dubizzle', 'الزقازيق', 'zagazig'),
('sharqia', '10th_ramadan', 'العاشر من رمضان', 'dubizzle', 'العاشر من رمضان', '10th-of-ramadan')
ON CONFLICT (maksab_city, maksab_governorate, source_platform) DO NOTHING;

-- ═══ 5. جدول market_balance ═══
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
  -- 'balanced' | 'needs_buyers' | 'critical_buyers' | 'needs_sellers' | 'no_data'

  -- التوصية — فقط لـ BHE — لا تلمس AHE!
  recommended_action TEXT,
  -- 'increase_bhe_priority' | 'urgent_bhe_needed' | 'maintain'

  -- تنبيه
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(category, governorate)
);

-- RLS
ALTER TABLE market_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_balance_admin" ON market_balance FOR ALL USING (false);

-- ═══ 6. جدول التنبيهات ═══
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  type TEXT NOT NULL,
  -- 'balance_alert' | 'whale_detected' | 'escalation' | 'system_error' | 'daily_report'

  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'

  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON admin_notifications(is_read, created_at DESC)
  WHERE is_read = false;

-- RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_notifications_admin" ON admin_notifications FOR ALL USING (false);
