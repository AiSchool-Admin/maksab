-- ══════════════════════════════════════════════
-- Migration 00090: Clean non-Alexandria listings
-- Whitelist approach: keep الإسكندرية only, delete everything else
-- ══════════════════════════════════════════════

-- Delete all listings that are NOT Alexandria
DELETE FROM ahe_listings
WHERE governorate NOT ILIKE '%اسكندري%'
  AND governorate NOT ILIKE '%alexandria%';
