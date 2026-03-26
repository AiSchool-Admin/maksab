-- ══════════════════════════════════════════════
-- Migration 00088: seller_type classification for ahe_sellers
-- فرد / سمسار / وكيل — based on name keywords + listing count
-- ══════════════════════════════════════════════

-- 1. Add seller_type column
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'فرد';

CREATE INDEX IF NOT EXISTS idx_ahe_sellers_type ON ahe_sellers(seller_type);

-- 2. Classify وكيل by name keywords (cars)
UPDATE ahe_sellers SET seller_type = 'وكيل'
WHERE seller_type = 'فرد'
  AND (
    name ILIKE '%وكالة%' OR
    name ILIKE '%معرض%' OR
    name ILIKE '%automotive%' OR
    name ILIKE '%motors%' OR
    name ILIKE '%auto %' OR
    name ILIKE '%group%' OR
    name ILIKE '%trading%' OR
    name ILIKE '%للسيارات%' OR
    name ILIKE '%cars%' OR
    name ILIKE '%company%'
  );

-- 3. Classify وكيل by name keywords (properties)
UPDATE ahe_sellers SET seller_type = 'وكيل'
WHERE seller_type = 'فرد'
  AND (
    name ILIKE '%للعقارات%' OR
    name ILIKE '%عقارات%' OR
    name ILIKE '%للتطوير%' OR
    name ILIKE '%تطوير عقاري%' OR
    name ILIKE '%real estate%' OR
    name ILIKE '%realty%' OR
    name ILIKE '%properties%' OR
    name ILIKE '%للاستثمار%' OR
    name ILIKE '%مجموعة%' OR
    name ILIKE '%شركة%' OR
    name ILIKE '%للتسويق العقاري%' OR
    name ILIKE '%إدارة أملاك%'
  );

-- 4. Classify by listing count (only if still فرد)
UPDATE ahe_sellers SET seller_type = 'وكيل'
WHERE seller_type = 'فرد' AND total_listings_seen > 10;

UPDATE ahe_sellers SET seller_type = 'سمسار'
WHERE seller_type = 'فرد' AND total_listings_seen >= 2;

-- 5. Also set is_business for agencies
UPDATE ahe_sellers SET is_business = true
WHERE seller_type = 'وكيل' AND is_business = false;
