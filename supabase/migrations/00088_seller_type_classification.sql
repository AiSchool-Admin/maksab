-- ══════════════════════════════════════════════
-- Migration 00088: Classify detected_account_type for existing sellers
-- Uses existing column (individual/broker/agency) — no new columns
-- ══════════════════════════════════════════════

-- 1. Classify agency by name keywords (cars)
UPDATE ahe_sellers SET detected_account_type = 'agency'
WHERE detected_account_type = 'individual'
  AND (
    name ILIKE '%وكالة%' OR name ILIKE '%معرض%' OR
    name ILIKE '%automotive%' OR name ILIKE '%motors%' OR
    name ILIKE '%auto %' OR name ILIKE '%group%' OR
    name ILIKE '%trading%' OR name ILIKE '%للسيارات%' OR
    name ILIKE '%cars%' OR name ILIKE '%company%'
  );

-- 2. Classify agency by name keywords (properties)
UPDATE ahe_sellers SET detected_account_type = 'agency'
WHERE detected_account_type = 'individual'
  AND (
    name ILIKE '%للعقارات%' OR name ILIKE '%عقارات%' OR
    name ILIKE '%للتطوير%' OR name ILIKE '%تطوير عقاري%' OR
    name ILIKE '%real estate%' OR name ILIKE '%realty%' OR
    name ILIKE '%properties%' OR name ILIKE '%للاستثمار%' OR
    name ILIKE '%مجموعة%' OR name ILIKE '%شركة%' OR
    name ILIKE '%للتسويق العقاري%' OR name ILIKE '%إدارة أملاك%'
  );

-- 3. Classify by listing count
UPDATE ahe_sellers SET detected_account_type = 'agency'
WHERE detected_account_type = 'individual' AND total_listings_seen > 10;

UPDATE ahe_sellers SET detected_account_type = 'broker'
WHERE detected_account_type = 'individual' AND total_listings_seen >= 2;

-- 4. Set is_business for agencies
UPDATE ahe_sellers SET is_business = true
WHERE detected_account_type = 'agency' AND is_business = false;
