-- 00107_merchant_admin_phone.sql
-- Adds merchant_key + merchant_admin_phone for the whales/Pareto page.
--
-- Context: A real-estate brokerage (e.g. "Remax Avalon") posts listings
-- under MULTIPLE phone numbers (one per agent). The harvester aggregates
-- ahe_sellers by phone, so the same brokerage shows up as several
-- separate seller rows — fragmenting the Pareto analysis.
--
-- Two new columns:
--
-- 1. merchant_key TEXT  (computed: normalized name + governorate + platform)
--    Stable identity for the brokerage, computed once at insert/update.
--    NULL when the name is too generic to safely merge (single-token
--    short names like "Ahmed" / "أحمد").
--
-- 2. merchant_admin_phone TEXT  (manual override)
--    Lets the admin pin a specific phone as the brokerage's primary
--    contact. NULL = auto-pick the phone with the most listings.
--
-- All sellers in the same merchant share the same merchant_admin_phone
-- value (enforced at the application layer when the override is applied).

ALTER TABLE ahe_sellers
  ADD COLUMN IF NOT EXISTS merchant_key TEXT,
  ADD COLUMN IF NOT EXISTS merchant_admin_phone TEXT;

-- Index for fast GROUP BY merchant_key on the whales page
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_merchant_key
  ON ahe_sellers(merchant_key)
  WHERE merchant_key IS NOT NULL;

COMMENT ON COLUMN ahe_sellers.merchant_key IS
  'Stable brokerage identity = normalized(name)|governorate|platform. NULL for un-mergeable rows (generic single-name sellers). Computed at insert by the receive endpoint and self-healed by the whales API.';

COMMENT ON COLUMN ahe_sellers.merchant_admin_phone IS
  'Admin override of the primary contact phone for this merchant. NULL = auto-pick the phone with the most listings. All rows sharing a merchant_key share the same override value.';
