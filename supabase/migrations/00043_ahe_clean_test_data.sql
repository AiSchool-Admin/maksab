-- ═══════════════════════════════════════════════════════════════
-- Migration 00043: Clean old test data from AHE tables
-- ═══════════════════════════════════════════════════════════════
-- The 1,740 listings from previous tests are mixed (offices,
-- Mercedes, furnished apartments) — not scoped properly.
-- Clean slate before real harvesting begins.
-- ═══════════════════════════════════════════════════════════════

-- Delete all harvested listings (cascade will handle references)
DELETE FROM ahe_listings;

-- Delete all harvested sellers (only those not yet linked to CRM)
-- For CRM-linked sellers, just unlink them
UPDATE ahe_sellers SET crm_customer_id = NULL WHERE crm_customer_id IS NOT NULL;
DELETE FROM ahe_sellers;

-- Reset hourly/daily metrics
DELETE FROM ahe_hourly_metrics;
DELETE FROM ahe_daily_metrics;

-- Reset scope counters so they start fresh
UPDATE ahe_scopes SET
  total_harvests = 0,
  total_listings_found = 0,
  total_sellers_found = 0,
  last_harvest_at = NULL,
  last_harvest_new_listings = 0,
  last_harvest_new_sellers = 0,
  consecutive_failures = 0,
  next_harvest_at = NULL,
  server_fetch_blocked = false,
  server_fetch_blocked_at = NULL,
  updated_at = NOW();
