-- ══════════════════════════════════════════════
-- Migration 00100: Add rent scopes for all property platforms
-- + update SemsarMasr to 6 scopes (3 types × sale/rent)
-- ══════════════════════════════════════════════

-- ═══ AqarMap — add rent scope ═══
INSERT INTO ahe_scopes (
  name, code, source_platform, maksab_category,
  governorate, city, base_url,
  pagination_pattern, max_pages_per_harvest,
  harvest_interval_minutes, is_active, priority,
  detail_fetch_enabled, description, scope_group
) VALUES (
  'aqarmap-rent-alex', 'AQR-RENT-ALEX', 'aqarmap', 'عقارات',
  'الإسكندرية', 'الإسكندرية',
  'https://aqarmap.com.eg/ar/for-rent/property-type/alexandria/',
  '?page={page}', 20, 120, true, 1,
  true, 'عقارات للإيجار في الإسكندرية — عقار ماب', 'general'
) ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url, updated_at = NOW();

-- ═══ PropertyFinder — update sale URL + add rent scope ═══

-- Update sale scope with verified URL
UPDATE ahe_scopes
SET base_url = 'https://www.propertyfinder.eg/en/search?l=30754&c=1&fu=0&ob=mr',
    updated_at = NOW()
WHERE code = 'PF-PROP-ALEX';

-- Add rent scope
INSERT INTO ahe_scopes (
  name, code, source_platform, maksab_category,
  governorate, city, base_url,
  pagination_pattern, max_pages_per_harvest,
  harvest_interval_minutes, is_active, priority,
  detail_fetch_enabled, description, scope_group
) VALUES (
  'propertyfinder-rent-alex', 'PF-RENT-ALEX', 'propertyfinder', 'عقارات',
  'الإسكندرية', 'الإسكندرية',
  'https://www.propertyfinder.eg/en/search?l=30754&c=2&fu=0&rp=m&ob=mr',
  '&page={page}', 15, 180, true, 2,
  true, 'عقارات للإيجار في الإسكندرية — بروبرتي فايندر', 'general'
) ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url, updated_at = NOW();

-- ═══ SemsarMasr — add rent scopes (3 types) ═══

-- Residential rent
INSERT INTO ahe_scopes (
  name, code, source_platform, maksab_category,
  governorate, city, base_url,
  pagination_pattern, max_pages_per_harvest,
  harvest_interval_minutes, is_active, priority,
  detail_fetch_enabled, description, scope_group
) VALUES (
  'semsarmasr-residential-rent-alex', 'SEM-RES-RENT-ALEX', 'semsarmasr', 'عقارات',
  'الإسكندرية', 'الإسكندرية',
  'https://www.semsarmasr.com/3akarat?r=70&purpose=rent&cid=952&s=1&g=979&a=0&pf=0&pt=0&af=0&at=0&ismortgage=-1&pm=any&furniture=-1&finishing=-1&rooms=0&q=',
  '&p={page}', 10, 240, true, 3,
  false, 'عقارات سكنية للإيجار في الإسكندرية — سمسار مصر', 'general'
) ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url, updated_at = NOW();

-- Resort rent
INSERT INTO ahe_scopes (
  name, code, source_platform, maksab_category,
  governorate, city, base_url,
  pagination_pattern, max_pages_per_harvest,
  harvest_interval_minutes, is_active, priority,
  detail_fetch_enabled, description, scope_group
) VALUES (
  'semsarmasr-resort-rent-alex', 'SEM-RESORT-RENT-ALEX', 'semsarmasr', 'عقارات',
  'الإسكندرية', 'الإسكندرية',
  'https://www.semsarmasr.com/3akarat?r=70&purpose=rent&cid=953&s=1&g=979&a=0&pf=0&pt=0&af=0&at=0&ismortgage=-1&pm=any&furniture=-1&finishing=-1&rooms=0&q=',
  '&p={page}', 10, 240, true, 3,
  false, 'عقارات مصيفية للإيجار في الإسكندرية — سمسار مصر', 'general'
) ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url, updated_at = NOW();

-- Commercial rent
INSERT INTO ahe_scopes (
  name, code, source_platform, maksab_category,
  governorate, city, base_url,
  pagination_pattern, max_pages_per_harvest,
  harvest_interval_minutes, is_active, priority,
  detail_fetch_enabled, description, scope_group
) VALUES (
  'semsarmasr-commercial-rent-alex', 'SEM-COMM-RENT-ALEX', 'semsarmasr', 'عقارات',
  'الإسكندرية', 'الإسكندرية',
  'https://www.semsarmasr.com/3akarat?r=70&purpose=rent&cid=954&s=1&g=979&a=0&pf=0&pt=0&af=0&at=0&ismortgage=-1&pm=any&furniture=-1&finishing=-1&rooms=0&q=',
  '&p={page}', 10, 240, true, 3,
  false, 'عقارات تجارية للإيجار في الإسكندرية — سمسار مصر', 'general'
) ON CONFLICT (code) DO UPDATE SET
  base_url = EXCLUDED.base_url, updated_at = NOW();
