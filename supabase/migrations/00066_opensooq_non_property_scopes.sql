-- ═══════════════════════════════════════════════════════════════
-- OpenSooq Non-Property Category Scopes
-- نطاقات فئات غير العقارات على السوق المفتوح
-- URLs verified: 200 OK with content (electronics, cars, home-garden, fashion)
-- ═══════════════════════════════════════════════════════════════

-- ═══ Electronics (إلكترونيات) — Cairo, Alexandria, Giza ═══
INSERT INTO ahe_scopes
(code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority, is_active)
VALUES
('opensooq_electronics_cairo', 'إلكترونيات — القاهرة — OpenSooq', 'opensooq', 'electronics', 'cairo', 'https://eg.opensooq.com/ar/cairo/electronics', 120, 1, 7, true),
('opensooq_electronics_alexandria', 'إلكترونيات — الإسكندرية — OpenSooq', 'opensooq', 'electronics', 'alexandria', 'https://eg.opensooq.com/ar/alexandria/electronics', 120, 1, 5, true),
('opensooq_electronics_giza', 'إلكترونيات — الجيزة — OpenSooq', 'opensooq', 'electronics', 'giza', 'https://eg.opensooq.com/ar/giza/electronics', 120, 1, 5, true)
ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  is_active = true,
  updated_at = now();

-- ═══ Cars (سيارات) — Cairo, Alexandria, Giza ═══
INSERT INTO ahe_scopes
(code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority, is_active)
VALUES
('opensooq_vehicles_cairo', 'سيارات — القاهرة — OpenSooq', 'opensooq', 'vehicles', 'cairo', 'https://eg.opensooq.com/ar/cairo/cars', 120, 1, 8, true),
('opensooq_vehicles_alexandria', 'سيارات — الإسكندرية — OpenSooq', 'opensooq', 'vehicles', 'alexandria', 'https://eg.opensooq.com/ar/alexandria/cars', 120, 1, 6, true),
('opensooq_vehicles_giza', 'سيارات — الجيزة — OpenSooq', 'opensooq', 'vehicles', 'giza', 'https://eg.opensooq.com/ar/giza/cars', 120, 1, 6, true)
ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  is_active = true,
  updated_at = now();

-- ═══ Home & Garden / Furniture (أثاث ومنزل) — Cairo, Alexandria, Giza ═══
INSERT INTO ahe_scopes
(code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority, is_active)
VALUES
('opensooq_furniture_cairo', 'أثاث ومنزل — القاهرة — OpenSooq', 'opensooq', 'furniture', 'cairo', 'https://eg.opensooq.com/ar/cairo/home-garden', 120, 1, 5, true),
('opensooq_furniture_alexandria', 'أثاث ومنزل — الإسكندرية — OpenSooq', 'opensooq', 'furniture', 'alexandria', 'https://eg.opensooq.com/ar/alexandria/home-garden', 120, 1, 4, true),
('opensooq_furniture_giza', 'أثاث ومنزل — الجيزة — OpenSooq', 'opensooq', 'furniture', 'giza', 'https://eg.opensooq.com/ar/giza/home-garden', 120, 1, 4, true)
ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  is_active = true,
  updated_at = now();

-- ═══ Fashion (أزياء) — Cairo, Alexandria, Giza ═══
INSERT INTO ahe_scopes
(code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority, is_active)
VALUES
('opensooq_fashion_cairo', 'أزياء — القاهرة — OpenSooq', 'opensooq', 'fashion', 'cairo', 'https://eg.opensooq.com/ar/cairo/fashion', 120, 1, 4, true),
('opensooq_fashion_alexandria', 'أزياء — الإسكندرية — OpenSooq', 'opensooq', 'fashion', 'alexandria', 'https://eg.opensooq.com/ar/alexandria/fashion', 120, 1, 3, true),
('opensooq_fashion_giza', 'أزياء — الجيزة — OpenSooq', 'opensooq', 'fashion', 'giza', 'https://eg.opensooq.com/ar/giza/fashion', 120, 1, 3, true)
ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  is_active = true,
  updated_at = now();

-- ═══ Real Estate (عقارات) — ensure using correct URL ═══
-- The working URL is /real-estate, NOT /properties-for-sale
INSERT INTO ahe_scopes
(code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority, is_active)
VALUES
('opensooq_properties_cairo', 'عقارات — القاهرة — OpenSooq', 'opensooq', 'properties', 'cairo', 'https://eg.opensooq.com/ar/cairo/real-estate', 120, 1, 7, true),
('opensooq_properties_alexandria', 'عقارات — الإسكندرية — OpenSooq', 'opensooq', 'properties', 'alexandria', 'https://eg.opensooq.com/ar/alexandria/real-estate', 120, 1, 5, true),
('opensooq_properties_giza', 'عقارات — الجيزة — OpenSooq', 'opensooq', 'properties', 'giza', 'https://eg.opensooq.com/ar/giza/real-estate', 120, 1, 5, true)
ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  is_active = true,
  updated_at = now();
