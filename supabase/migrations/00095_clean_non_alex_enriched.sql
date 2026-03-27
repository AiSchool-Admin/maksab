-- ══════════════════════════════════════════════
-- Migration 00095: Clean non-Alexandria enriched listings
-- Remove listings that were wrongly enriched from other governorates
-- ══════════════════════════════════════════════

-- Delete non-Alexandria listings that got enriched (have specs)
DELETE FROM ahe_listings
WHERE governorate NOT ILIKE '%اسكندري%'
  AND governorate NOT ILIKE '%alexandria%'
  AND specifications IS NOT NULL
  AND specifications != '{}'::jsonb;

-- Also clean non-Alexandria listings without specs
DELETE FROM ahe_listings
WHERE governorate NOT ILIKE '%اسكندري%'
  AND governorate NOT ILIKE '%alexandria%';
