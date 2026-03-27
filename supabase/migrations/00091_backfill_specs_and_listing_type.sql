-- ══════════════════════════════════════════════
-- Migration 00091: Backfill data from specs JSONB + add listing_type
-- ══════════════════════════════════════════════

-- 1. Add listing_type column (بيع / إيجار)
ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'sale';

-- 2. Backfill area from specs for properties
UPDATE ahe_listings
SET area = specifications->>'area'
WHERE area IS NULL
  AND specifications->>'area' IS NOT NULL
  AND maksab_category IN ('properties', 'عقارات');

-- 3. Backfill condition from specs
UPDATE ahe_listings
SET condition = COALESCE(specifications->>'condition', specifications->>'الحالة')
WHERE condition IS NULL
  AND (specifications->>'condition' IS NOT NULL OR specifications->>'الحالة' IS NOT NULL);

-- 4. Backfill detected_brand from specs for vehicles
UPDATE ahe_listings
SET detected_brand = COALESCE(specifications->>'brand', specifications->>'الماركة')
WHERE detected_brand IS NULL
  AND (specifications->>'brand' IS NOT NULL OR specifications->>'الماركة' IS NOT NULL)
  AND maksab_category IN ('vehicles', 'سيارات', 'cars');

-- 5. Backfill detected_model from specs for vehicles
UPDATE ahe_listings
SET detected_model = COALESCE(specifications->>'model', specifications->>'الموديل')
WHERE detected_model IS NULL
  AND (specifications->>'model' IS NOT NULL OR specifications->>'الموديل' IS NOT NULL)
  AND maksab_category IN ('vehicles', 'سيارات', 'cars');

-- 6. Detect listing_type from title keywords
UPDATE ahe_listings SET listing_type = 'rent'
WHERE listing_type = 'sale'
  AND (
    title ILIKE '%للإيجار%' OR title ILIKE '%للايجار%' OR
    title ILIKE '%إيجار%' OR title ILIKE '%ايجار%' OR
    title ILIKE '%for rent%' OR title ILIKE '%مفروش%'
  );

-- 7. Detect listing_type from URL
UPDATE ahe_listings SET listing_type = 'rent'
WHERE listing_type = 'sale'
  AND (
    source_listing_url ILIKE '%for-rent%' OR
    source_listing_url ILIKE '%rent%' OR
    source_listing_url ILIKE '%إيجار%'
  );

-- 8. Detect listing_type from source_category
UPDATE ahe_listings SET listing_type = 'rent'
WHERE listing_type = 'sale'
  AND (
    source_category ILIKE '%إيجار%' OR
    source_category ILIKE '%rent%' OR
    source_category ILIKE '%للإيجار%'
  );

-- 9. Extract detected_brand from title for vehicles (regex on common brands)
UPDATE ahe_listings SET detected_brand = 'تويوتا'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%تويوتا%' OR title ILIKE '%toyota%');

UPDATE ahe_listings SET detected_brand = 'هيونداي'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%هيونداي%' OR title ILIKE '%hyundai%');

UPDATE ahe_listings SET detected_brand = 'شيفروليه'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%شيفروليه%' OR title ILIKE '%chevrolet%');

UPDATE ahe_listings SET detected_brand = 'نيسان'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%نيسان%' OR title ILIKE '%nissan%');

UPDATE ahe_listings SET detected_brand = 'كيا'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%كيا%' OR title ILIKE '%kia%');

UPDATE ahe_listings SET detected_brand = 'BMW'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%بي إم%' OR title ILIKE '%bmw%');

UPDATE ahe_listings SET detected_brand = 'مرسيدس'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%مرسيدس%' OR title ILIKE '%mercedes%' OR title ILIKE '%بنز%');

UPDATE ahe_listings SET detected_brand = 'فيات'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%فيات%' OR title ILIKE '%fiat%');

UPDATE ahe_listings SET detected_brand = 'MG'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND title ILIKE '%mg %';

UPDATE ahe_listings SET detected_brand = 'سوزوكي'
WHERE detected_brand IS NULL AND maksab_category IN ('vehicles', 'سيارات', 'cars')
  AND (title ILIKE '%سوزوكي%' OR title ILIKE '%suzuki%');

-- 10. Index on listing_type
CREATE INDEX IF NOT EXISTS idx_ahe_listings_type ON ahe_listings(listing_type);
