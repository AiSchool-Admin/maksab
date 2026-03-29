-- ══════════════════════════════════════════════
-- Migration 00097: Final cleanup of non-Alexandria data
-- Delete all listings and sellers not in Alexandria
-- ══════════════════════════════════════════════

-- 1. Delete non-Alexandria listings
DELETE FROM ahe_listings
WHERE governorate NOT ILIKE '%اسكندري%'
  AND governorate NOT ILIKE '%alexandria%'
  AND governorate IS NOT NULL
  AND governorate != '';

-- 2. Delete non-Alexandria sellers
DELETE FROM ahe_sellers
WHERE primary_governorate NOT ILIKE '%اسكندري%'
  AND primary_governorate NOT ILIKE '%alexandria%'
  AND primary_governorate IS NOT NULL
  AND primary_governorate != '';

-- 3. Delete listings with NULL governorate (unknown origin)
DELETE FROM ahe_listings
WHERE governorate IS NULL OR governorate = '';

-- 4. Delete sellers with NULL governorate
DELETE FROM ahe_sellers
WHERE primary_governorate IS NULL OR primary_governorate = '';
