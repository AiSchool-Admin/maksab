-- ============================================================
-- Migration 00064: Activate Tested Platforms + Fix URLs + Create Scopes
-- تفعيل المنصات المُختَبَرة + إصلاح الروابط + إنشاء النطاقات
-- ============================================================

-- ═══ 1. Activate opensooq + aqarmap + dowwr ═══
UPDATE harvest_platforms SET is_active = true WHERE id = 'opensooq';
UPDATE harvest_platforms SET is_active = true WHERE id = 'aqarmap';
UPDATE harvest_platforms SET is_active = true WHERE id = 'dowwr';

-- Mark hatla2ee + contactcars as bookmarklet-only (blocked by 403)
UPDATE harvest_platforms SET
  fetch_method = 'bookmarklet',
  is_active = false,
  last_test_status = 'blocked'
WHERE id IN ('hatla2ee', 'contactcars');

-- ═══ 2. Fix OpenSooq URLs ═══
-- mobiles: old URL returns 410, use correct path
UPDATE ahe_category_mappings SET
  source_url_segment = 'mobiles-tablets',
  source_url_template = 'https://eg.opensooq.com/ar/{gov}/mobiles-tablets'
WHERE source_platform = 'opensooq' AND maksab_category = 'phones';

-- vehicles: URL works but parser needed update (done in code)
-- Keep existing URL template as-is

-- ═══ 3. Fix other platform URLs ═══
-- PropertyFinder: fix URL template
UPDATE ahe_category_mappings SET
  source_url_template = 'https://www.propertyfinder.eg/en/search?c=1&l={gov}'
WHERE source_platform = 'propertyfinder' AND maksab_category = 'properties';

-- CarSemsar: fix URL template
UPDATE ahe_category_mappings SET
  source_url_template = 'https://carsemsar.com/en/cars?location={gov}'
WHERE source_platform = 'carsemsar' AND maksab_category = 'vehicles';

-- CairoLink: fix URL template
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('vehicles', 'سيارات', 'cairolink', 'Cars', 'cars', 'https://cairolink.com/category/cars', true),
('properties', 'عقارات', 'cairolink', 'Properties', 'properties', 'https://cairolink.com/category/properties', true)
ON CONFLICT DO NOTHING;

-- Soq24: fix URL template
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('phones', 'موبايلات', 'soq24', 'Phones', 'phones', 'https://soq24.com/adsCountry/2?category=phones', true),
('vehicles', 'سيارات', 'soq24', 'Cars', 'cars', 'https://soq24.com/adsCountry/2?category=cars', true),
('properties', 'عقارات', 'soq24', 'Properties', 'properties', 'https://soq24.com/adsCountry/2?category=properties', true),
('electronics', 'إلكترونيات', 'soq24', 'Electronics', 'electronics', 'https://soq24.com/adsCountry/2?category=electronics', true)
ON CONFLICT DO NOTHING;

-- ═══ 4. Add Dowwr category mappings ═══
INSERT INTO ahe_category_mappings (maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template, is_active) VALUES
('phones', 'موبايلات', 'dowwr', 'Phones', 'phones', 'https://eg.dowwr.com/ar/phones', true),
('vehicles', 'سيارات', 'dowwr', 'Cars', 'cars', 'https://eg.dowwr.com/ar/cars', true),
('properties', 'عقارات', 'dowwr', 'Properties', 'properties', 'https://eg.dowwr.com/ar/properties', true),
('electronics', 'إلكترونيات', 'dowwr', 'Electronics', 'electronics', 'https://eg.dowwr.com/ar/electronics', true)
ON CONFLICT DO NOTHING;

-- ═══ 5. Add Dowwr governorate mappings ═══
INSERT INTO ahe_governorate_mappings (maksab_governorate, maksab_governorate_ar, source_platform, source_governorate_name, source_url_segment, estimated_daily_listings, suggested_interval_minutes, is_active, gov_tier) VALUES
('cairo', 'القاهرة', 'dowwr', 'Cairo', 'cairo', 50, 120, true, 'A'),
('giza', 'الجيزة', 'dowwr', 'Giza', 'giza', 30, 180, true, 'A'),
('alexandria', 'الإسكندرية', 'dowwr', 'Alexandria', 'alexandria', 20, 180, true, 'A'),
('qalyubia', 'القليوبية', 'dowwr', 'Qalyubia', 'qalyubia', 10, 360, true, 'B'),
('sharqia', 'الشرقية', 'dowwr', 'Sharqia', 'sharqia', 10, 360, true, 'B')
ON CONFLICT DO NOTHING;

-- ═══ 6. Create scopes for opensooq properties (Cairo) ═══
INSERT INTO ahe_scopes (code, name, source_platform, maksab_category, governorate, base_url,
  pagination_pattern, harvest_interval_minutes, max_pages_per_harvest,
  delay_between_requests_ms, detail_fetch_enabled, detail_delay_between_requests_ms,
  is_active, priority, scope_group)
VALUES
('osq_properties_cairo', 'عقارات — القاهرة — السوق المفتوح', 'opensooq', 'properties', 'cairo',
  'https://eg.opensooq.com/ar/cairo/properties',
  '?page={page}', 60, 3, 3000, true, 3000, true, 8, 'general')
ON CONFLICT (code) DO NOTHING;

-- ═══ 7. Create scopes for aqarmap (Cairo sale + rent) ═══
INSERT INTO ahe_scopes (code, name, source_platform, maksab_category, governorate, base_url,
  pagination_pattern, harvest_interval_minutes, max_pages_per_harvest,
  delay_between_requests_ms, detail_fetch_enabled, detail_delay_between_requests_ms,
  is_active, priority, scope_group)
VALUES
('aqr_sale_cairo', 'عقارات بيع — القاهرة — عقارماب', 'aqarmap', 'properties', 'cairo',
  'https://aqarmap.com.eg/en/for-sale/apartment/cairo/',
  '?page={page}', 60, 3, 3000, true, 3000, true, 8, 'general'),

('aqr_rent_cairo', 'عقارات إيجار — القاهرة — عقارماب', 'aqarmap', 'properties', 'cairo',
  'https://aqarmap.com.eg/en/for-rent/apartment/cairo/',
  '?page={page}', 120, 2, 3000, true, 3000, true, 6, 'general')
ON CONFLICT (code) DO NOTHING;

-- ═══ 8. Create scopes for dowwr (phones + electronics) ═══
INSERT INTO ahe_scopes (code, name, source_platform, maksab_category, governorate, base_url,
  pagination_pattern, harvest_interval_minutes, max_pages_per_harvest,
  delay_between_requests_ms, detail_fetch_enabled, detail_delay_between_requests_ms,
  is_active, priority, scope_group)
VALUES
('dwwr_phones', 'موبايلات — دوّر', 'dowwr', 'phones', 'cairo',
  'https://eg.dowwr.com/ar/phones',
  '?page={page}', 120, 2, 3000, true, 3000, true, 5, 'general'),

('dwwr_electronics', 'إلكترونيات — دوّر', 'dowwr', 'electronics', 'cairo',
  'https://eg.dowwr.com/ar/electronics',
  '?page={page}', 180, 2, 3000, true, 3000, true, 4, 'general')
ON CONFLICT (code) DO NOTHING;
