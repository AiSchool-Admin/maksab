-- ═══════════════════════════════════════════════════════════════
-- مكسب — إضافة نطاقات حصاد الإسكندرية (سيارات + عقارات)
-- ═══════════════════════════════════════════════════════════════

-- أولاً: امسح أي نطاقات إسكندرية موجودة سابقاً
DELETE FROM ahe_scopes
WHERE governorate = 'الإسكندرية'
  AND maksab_category IN ('سيارات', 'عقارات');

-- ═══ سيارات الإسكندرية ═══
INSERT INTO ahe_scopes (
  name, code, source_platform, maksab_category,
  governorate, city, base_url,
  pagination_pattern, max_pages_per_harvest,
  harvest_interval_minutes, is_active, priority,
  detail_fetch_enabled, description, scope_group
) VALUES
-- Dubizzle سيارات
('dubizzle-cars-alex', 'DUB-CAR-ALEX', 'dubizzle', 'سيارات',
 'الإسكندرية', 'الإسكندرية',
 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/?location=alexandria',
 'page={page}', 20, 120, true, 1,
 true, 'سيارات الإسكندرية من دوبيزل — المصدر الأساسي', 'general'),

-- هتلاقي سيارات
('hatla2ee-cars-alex', 'HAT-CAR-ALEX', 'hatla2ee', 'سيارات',
 'الإسكندرية', 'الإسكندرية',
 'https://eg.hatla2ee.com/ar/car/city/alexandria',
 'page/{page}', 15, 180, true, 1,
 true, 'سيارات الإسكندرية من هتلاقي — أكبر منصة سيارات', 'general'),

-- OpenSooq سيارات
('opensooq-cars-alex', 'OPS-CAR-ALEX', 'opensooq', 'سيارات',
 'الإسكندرية', 'الإسكندرية',
 'https://eg.opensooq.com/ar/الإسكندرية/سيارات-ومركبات/سيارات-للبيع',
 '?page={page}', 15, 180, true, 2,
 true, 'سيارات الإسكندرية من أوبن سوق', 'general'),

-- ContactCars
('contactcars-alex', 'CC-CAR-ALEX', 'contactcars', 'سيارات',
 'الإسكندرية', 'الإسكندرية',
 'https://www.contactcars.com/en/used-cars?city=alexandria',
 '&page={page}', 10, 240, true, 2,
 true, 'سيارات الإسكندرية من كونتاكت كارز', 'general'),

-- OLX سيارات
('olx-cars-alex', 'OLX-CAR-ALEX', 'olx', 'سيارات',
 'الإسكندرية', 'الإسكندرية',
 'https://www.olx.com.eg/en/cars/alexandria/',
 '?page={page}', 10, 240, true, 3,
 false, 'سيارات الإسكندرية من OLX — بدون تفاصيل', 'general');

-- ═══ عقارات الإسكندرية ═══
INSERT INTO ahe_scopes (
  name, code, source_platform, maksab_category,
  governorate, city, base_url,
  pagination_pattern, max_pages_per_harvest,
  harvest_interval_minutes, is_active, priority,
  detail_fetch_enabled, description, scope_group
) VALUES
-- Dubizzle عقارات
('dubizzle-props-alex', 'DUB-PROP-ALEX', 'dubizzle', 'عقارات',
 'الإسكندرية', 'الإسكندرية',
 'https://www.dubizzle.com.eg/properties/?location=alexandria',
 'page={page}', 20, 120, true, 1,
 true, 'عقارات الإسكندرية من دوبيزل — المصدر الأساسي', 'general'),

-- AqarMap عقارات
('aqarmap-alex', 'AQR-PROP-ALEX', 'aqarmap', 'عقارات',
 'الإسكندرية', 'الإسكندرية',
 'https://aqarmap.com.eg/ar/for-sale/property-type/alexandria/',
 '?page={page}', 20, 120, true, 1,
 true, 'عقارات الإسكندرية من عقار ماب — أكبر منصة عقارات', 'general'),

-- OpenSooq عقارات
('opensooq-props-alex', 'OPS-PROP-ALEX', 'opensooq', 'عقارات',
 'الإسكندرية', 'الإسكندرية',
 'https://eg.opensooq.com/ar/الإسكندرية/عقارات',
 '?page={page}', 15, 180, true, 2,
 true, 'عقارات الإسكندرية من أوبن سوق', 'general'),

-- PropertyFinder عقارات
('propertyfinder-alex', 'PF-PROP-ALEX', 'propertyfinder', 'عقارات',
 'الإسكندرية', 'الإسكندرية',
 'https://www.propertyfinder.eg/en/buy/alexandria/properties-for-sale.html',
 '?page={page}', 15, 180, true, 2,
 true, 'عقارات الإسكندرية من بروبرتي فايندر', 'general'),

-- سمسار مصر عقارات
('semsarmasr-alex', 'SEM-PROP-ALEX', 'semsarmasr', 'عقارات',
 'الإسكندرية', 'الإسكندرية',
 'https://www.semsarmasr.com/search?city=alexandria&type=sale',
 '&page={page}', 10, 240, true, 3,
 false, 'عقارات الإسكندرية من سمسار مصر — بدون تفاصيل', 'general');

-- تفعيل المنصات الجديدة في harvest_platforms إن لم تكن مفعّلة
UPDATE harvest_platforms SET is_active = true WHERE platform_id IN ('hatla2ee', 'aqarmap', 'propertyfinder', 'contactcars', 'opensooq');

-- إضافة سمسار مصر كمنصة جديدة إن لم تكن موجودة
INSERT INTO harvest_platforms (platform_id, display_name, website_url, is_active, fetch_method, parser_type, supported_categories, notes)
VALUES ('semsarmasr', 'سمسار مصر', 'https://www.semsarmasr.com', true, 'server_fetch', 'cheerio_html', ARRAY['properties'], 'منصة عقارات مصرية')
ON CONFLICT (platform_id) DO UPDATE SET is_active = true;

-- إضافة OLX كمنصة إن لم تكن موجودة
INSERT INTO harvest_platforms (platform_id, display_name, website_url, is_active, fetch_method, parser_type, supported_categories, notes)
VALUES ('olx', 'OLX مصر', 'https://www.olx.com.eg', true, 'server_fetch', 'cheerio_html', ARRAY['vehicles', 'properties', 'phones', 'electronics'], 'منصة إعلانات عامة')
ON CONFLICT (platform_id) DO UPDATE SET is_active = true;
