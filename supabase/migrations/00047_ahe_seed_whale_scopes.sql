-- ═══════════════════════════════════════════════════════════════
-- المرحلة 3 — الخطوة 4: نطاقات بذرة صيد الحيتان
-- Phase 3 — Step 4: Seed Whale Hunting Scopes
-- ═══════════════════════════════════════════════════════════════

-- نطاقات صيد الحيتان — تجار كبار موثقين
INSERT INTO ahe_scopes
(code, name, source_platform, maksab_category, governorate, base_url,
 harvest_interval_minutes, max_pages_per_harvest, priority, is_active,
 subcategory, subcategory_ar, target_seller_type, target_listing_type, scope_group, description)
VALUES
-- 🐋 حيتان موبايلات — القاهرة
('dub_whales_phones_cairo',
 '🐋 حيتان موبايلات — القاهرة — دوبيزل',
 'dubizzle', 'phones', 'cairo',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/cairo/',
 120, 10, 10, false,
 NULL, NULL,
 'whales', 'featured_and_elite', 'whale_hunting',
 'استهداف تجار موبايلات كبار في القاهرة — إعلانات مميزة وإيليت فقط'),

-- 🐋 آيفونات فقط — القاهرة (فئة فرعية عالية القيمة)
('dub_iphone_cairo',
 '🐋 آيفونات — القاهرة — دوبيزل',
 'dubizzle', 'phones', 'cairo',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/cairo/',
 120, 8, 9, false,
 'iphone', 'آيفون',
 'business', 'all', 'high_value',
 'استهداف تجار آيفونات — فئة عالية القيمة'),

-- 🐋 حيتان سيارات — القاهرة
('dub_whales_vehicles_cairo',
 '🐋 حيتان سيارات — القاهرة — دوبيزل',
 'dubizzle', 'vehicles', 'cairo',
 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/cairo/',
 120, 10, 9, false,
 NULL, NULL,
 'whales', 'featured_and_elite', 'whale_hunting',
 'معارض سيارات موثقة في القاهرة — إعلانات مميزة'),

-- 🐋 حيتان عقارات — القاهرة
('dub_whales_properties_cairo',
 '🐋 حيتان عقارات — القاهرة — دوبيزل',
 'dubizzle', 'properties', 'cairo',
 'https://www.dubizzle.com.eg/properties/apartments-duplex-for-sale/cairo/',
 120, 10, 8, false,
 NULL, NULL,
 'whales', 'featured_and_elite', 'whale_hunting',
 'شركات عقارات ومكاتب موثقة في القاهرة'),

-- 🐋 حيتان موبايلات — الإسكندرية
('dub_whales_phones_alex',
 '🐋 حيتان موبايلات — الإسكندرية — دوبيزل',
 'dubizzle', 'phones', 'alexandria',
 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/',
 120, 8, 8, false,
 NULL, NULL,
 'whales', 'featured_and_elite', 'whale_hunting',
 'استهداف تجار موبايلات كبار في الإسكندرية'),

-- 🐋 سيارات مرسيدس — القاهرة (عالي القيمة)
('dub_mercedes_cairo',
 '🐋 مرسيدس — القاهرة — دوبيزل',
 'dubizzle', 'vehicles', 'cairo',
 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/cairo/',
 360, 5, 7, false,
 'mercedes', 'مرسيدس',
 'all', 'all', 'high_value',
 'سيارات مرسيدس في القاهرة — فئة فاخرة')

ON CONFLICT (code) DO NOTHING;
