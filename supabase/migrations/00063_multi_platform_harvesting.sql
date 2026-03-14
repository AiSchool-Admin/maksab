-- ============================================================
-- Migration 00063: Multi-Platform Harvesting Infrastructure
-- دعم الحصاد من 15+ منصة بالتوازي
-- ============================================================

-- أضف source_platform لتمييز المنصة في كل الجداول
ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'dubizzle';
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'dubizzle';
ALTER TABLE bhe_buyers ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'dubizzle';

-- جدول المنصات
CREATE TABLE IF NOT EXISTS harvest_platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  base_url TEXT NOT NULL,

  -- الحالة
  is_active BOOLEAN DEFAULT false,
  is_testable BOOLEAN DEFAULT false,

  -- التقنية
  fetch_method TEXT DEFAULT 'server_fetch',
  parser_type TEXT,
  needs_javascript BOOLEAN DEFAULT false,
  rate_limit_per_hour INTEGER DEFAULT 100,

  -- الفئات المدعومة
  supported_categories TEXT[] DEFAULT '{}',

  -- الإحصائيات
  total_listings_harvested INTEGER DEFAULT 0,
  total_sellers_found INTEGER DEFAULT 0,
  total_buyers_found INTEGER DEFAULT 0,
  last_harvest_at TIMESTAMPTZ,
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed المنصات
INSERT INTO harvest_platforms (id, name, name_ar, base_url, is_active, is_testable, fetch_method, parser_type, needs_javascript, supported_categories) VALUES
('dubizzle', 'Dubizzle Egypt', 'دوبيزل مصر', 'https://www.dubizzle.com.eg', true, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion','home_appliances','hobbies','services','gold_jewelry','scrap','luxury']),

('opensooq', 'OpenSooq Egypt', 'السوق المفتوح مصر', 'https://eg.opensooq.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion']),

('hatla2ee', 'Hatla2ee Egypt', 'هتلاقي مصر', 'https://eg.hatla2ee.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('contactcars', 'ContactCars', 'كونتاكت كارز', 'https://contactcars.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('carsemsar', 'CarSemsar', 'كارسمسار', 'https://carsemsar.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('aqarmap', 'Aqarmap', 'عقارماب', 'https://aqarmap.com.eg', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['properties']),

('propertyfinder', 'Property Finder Egypt', 'بروبرتي فايندر مصر', 'https://www.propertyfinder.eg', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['properties']),

('yallamotor', 'Yallamotor', 'يلا موتور', 'https://yallamotor.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles']),

('facebook_marketplace', 'Facebook Marketplace', 'فيسبوك ماركتبلس', 'https://www.facebook.com/marketplace', false, false, 'bookmarklet', 'manual', true,
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion']),

('facebook_groups', 'Facebook Groups', 'جروبات فيسبوك', 'https://www.facebook.com/groups', true, false, 'paste_parse', 'manual', true,
 ARRAY['phones','vehicles','properties','electronics','furniture','fashion']),

('bezaat', 'Bezaat', 'بيزات', 'https://www.bezaat.com/egypt', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics','furniture']),

('soq24', 'Soq24', 'سوق24', 'http://soq24.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics']),

('cairolink', 'CairoLink', 'كايرو لينك', 'https://cairolink.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['vehicles','properties','services']),

('sooqmsr', 'SooqMsr', 'سوق مصر', 'https://sooqmsr.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics']),

('dowwr', 'Dowwr', 'دوّر', 'https://eg.dowwr.com', false, true, 'server_fetch', 'cheerio_html', false,
 ARRAY['phones','vehicles','properties','electronics'])

ON CONFLICT (id) DO NOTHING;

-- Category mappings for OpenSooq
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('phones', 'موبايلات', 'opensooq', 'Mobiles', 'mobiles', 'https://eg.opensooq.com/ar/{gov}/mobiles', true),
('vehicles', 'سيارات', 'opensooq', 'Cars', 'cars', 'https://eg.opensooq.com/ar/{gov}/cars', true),
('properties', 'عقارات', 'opensooq', 'Properties', 'properties', 'https://eg.opensooq.com/ar/{gov}/properties', true),
('electronics', 'إلكترونيات', 'opensooq', 'Electronics', 'electronics-and-mobiles', 'https://eg.opensooq.com/ar/{gov}/electronics-and-mobiles', true),
('furniture', 'أثاث', 'opensooq', 'Furniture', 'furniture-and-garden', 'https://eg.opensooq.com/ar/{gov}/furniture-and-garden', true),
('fashion', 'موضة', 'opensooq', 'Fashion', 'clothing-and-accessories', 'https://eg.opensooq.com/ar/{gov}/clothing-and-accessories', true)
ON CONFLICT DO NOTHING;

-- Category mappings for Hatla2ee (vehicles only)
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('vehicles', 'سيارات', 'hatla2ee', 'Cars', 'car', 'https://eg.hatla2ee.com/en/car/used-cars-for-sale/{gov}', true)
ON CONFLICT DO NOTHING;

-- Category mappings for Aqarmap (properties only)
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('properties', 'عقارات', 'aqarmap', 'Properties', 'apartment', 'https://aqarmap.com.eg/en/for-sale/apartment/{gov}/', true)
ON CONFLICT DO NOTHING;

-- Category mappings for ContactCars (vehicles only)
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('vehicles', 'سيارات', 'contactcars', 'Cars', 'cars', 'https://contactcars.com/en/cars-for-sale/{gov}', true)
ON CONFLICT DO NOTHING;

-- Category mappings for CarSemsar (vehicles only)
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('vehicles', 'سيارات', 'carsemsar', 'Cars', 'cars', 'https://carsemsar.com/cars/{gov}', true)
ON CONFLICT DO NOTHING;

-- Category mappings for PropertyFinder (properties only)
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('properties', 'عقارات', 'propertyfinder', 'Properties', 'properties', 'https://www.propertyfinder.eg/en/search?l={gov}&c=1', true)
ON CONFLICT DO NOTHING;

-- Category mappings for Yallamotor (vehicles only)
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('vehicles', 'سيارات', 'yallamotor', 'Cars', 'cars', 'https://yallamotor.com/used-cars/{gov}', true)
ON CONFLICT DO NOTHING;

-- Governorate mappings for OpenSooq
INSERT INTO ahe_governorate_mappings (maksab_governorate, maksab_governorate_ar, source_platform, source_governorate_name, source_url_segment, estimated_daily_listings, suggested_interval_minutes, is_active, gov_tier) VALUES
('cairo', 'القاهرة', 'opensooq', 'Cairo', 'cairo', 500, 30, true, 'A'),
('giza', 'الجيزة', 'opensooq', 'Giza', 'giza', 300, 30, true, 'A'),
('alexandria', 'الإسكندرية', 'opensooq', 'Alexandria', 'alexandria', 250, 60, true, 'A'),
('qalyubia', 'القليوبية', 'opensooq', 'Qalyubia', 'qalyubia', 100, 120, true, 'B'),
('sharqia', 'الشرقية', 'opensooq', 'Sharqia', 'sharqia', 80, 120, true, 'B'),
('dakahlia', 'الدقهلية', 'opensooq', 'Dakahlia', 'dakahlia', 70, 120, true, 'B'),
('gharbia', 'الغربية', 'opensooq', 'Gharbia', 'gharbia', 50, 180, true, 'B'),
('monufia', 'المنوفية', 'opensooq', 'Monufia', 'monufia', 40, 180, true, 'C'),
('beheira', 'البحيرة', 'opensooq', 'Beheira', 'beheira', 40, 180, true, 'C'),
('kafr_el_sheikh', 'كفر الشيخ', 'opensooq', 'Kafr El Sheikh', 'kafr-el-sheikh', 30, 360, true, 'C'),
('damietta', 'دمياط', 'opensooq', 'Damietta', 'damietta', 30, 360, true, 'C'),
('port_said', 'بورسعيد', 'opensooq', 'Port Said', 'port-said', 40, 180, true, 'B'),
('suez', 'السويس', 'opensooq', 'Suez', 'suez', 30, 360, true, 'C'),
('ismailia', 'الإسماعيلية', 'opensooq', 'Ismailia', 'ismailia', 30, 360, true, 'C'),
('fayoum', 'الفيوم', 'opensooq', 'Fayoum', 'fayoum', 25, 360, true, 'C'),
('beni_suef', 'بني سويف', 'opensooq', 'Beni Suef', 'beni-suef', 20, 360, true, 'C'),
('minya', 'المنيا', 'opensooq', 'Minya', 'minya', 25, 360, true, 'C'),
('asyut', 'أسيوط', 'opensooq', 'Asyut', 'asyut', 20, 360, true, 'C'),
('sohag', 'سوهاج', 'opensooq', 'Sohag', 'sohag', 15, 720, true, 'D'),
('qena', 'قنا', 'opensooq', 'Qena', 'qena', 10, 720, true, 'D'),
('luxor', 'الأقصر', 'opensooq', 'Luxor', 'luxor', 15, 720, true, 'D'),
('aswan', 'أسوان', 'opensooq', 'Aswan', 'aswan', 10, 720, true, 'D'),
('red_sea', 'البحر الأحمر', 'opensooq', 'Red Sea', 'red-sea', 20, 360, true, 'C'),
('matruh', 'مرسى مطروح', 'opensooq', 'Matruh', 'matruh', 10, 720, true, 'D'),
('north_sinai', 'شمال سيناء', 'opensooq', 'North Sinai', 'north-sinai', 5, 1440, true, 'D'),
('south_sinai', 'جنوب سيناء', 'opensooq', 'South Sinai', 'south-sinai', 10, 720, true, 'D'),
('new_valley', 'الوادي الجديد', 'opensooq', 'New Valley', 'new-valley', 5, 1440, true, 'D')
ON CONFLICT DO NOTHING;

-- Governorate mappings for Hatla2ee (vehicles only — major cities)
INSERT INTO ahe_governorate_mappings (maksab_governorate, maksab_governorate_ar, source_platform, source_governorate_name, source_url_segment, estimated_daily_listings, suggested_interval_minutes, is_active, gov_tier) VALUES
('cairo', 'القاهرة', 'hatla2ee', 'Cairo', 'cairo', 300, 30, true, 'A'),
('giza', 'الجيزة', 'hatla2ee', 'Giza', 'giza', 150, 60, true, 'A'),
('alexandria', 'الإسكندرية', 'hatla2ee', 'Alexandria', 'alexandria', 100, 60, true, 'A'),
('qalyubia', 'القليوبية', 'hatla2ee', 'Qalyubia', 'qalyubia', 50, 120, true, 'B'),
('sharqia', 'الشرقية', 'hatla2ee', 'Sharqia', 'sharqia', 40, 120, true, 'B'),
('dakahlia', 'الدقهلية', 'hatla2ee', 'Dakahlia', 'dakahlia', 30, 120, true, 'B')
ON CONFLICT DO NOTHING;

-- Governorate mappings for Aqarmap (properties only — major cities)
INSERT INTO ahe_governorate_mappings (maksab_governorate, maksab_governorate_ar, source_platform, source_governorate_name, source_url_segment, estimated_daily_listings, suggested_interval_minutes, is_active, gov_tier) VALUES
('cairo', 'القاهرة', 'aqarmap', 'Cairo', 'cairo', 400, 30, true, 'A'),
('giza', 'الجيزة', 'aqarmap', 'Giza', 'giza', 200, 60, true, 'A'),
('alexandria', 'الإسكندرية', 'aqarmap', 'Alexandria', 'alexandria', 150, 60, true, 'A'),
('red_sea', 'البحر الأحمر', 'aqarmap', 'Red Sea', 'red-sea', 100, 120, true, 'B'),
('north_coast', 'الساحل الشمالي', 'aqarmap', 'North Coast', 'north-coast', 80, 120, true, 'B'),
('sharqia', 'الشرقية', 'aqarmap', 'Sharqia', 'sharqia', 50, 180, true, 'C')
ON CONFLICT DO NOTHING;

-- Indexes for multi-platform queries
CREATE INDEX IF NOT EXISTS idx_ahe_listings_platform ON ahe_listings(source_platform);
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_platform ON ahe_sellers(source_platform);
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_platform ON bhe_buyers(source_platform);
CREATE INDEX IF NOT EXISTS idx_harvest_platforms_active ON harvest_platforms(is_active);
