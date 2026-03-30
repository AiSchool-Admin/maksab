-- ══════════════════════════════════════════════
-- Migration 00101: Test mode — short intervals for all scopes
-- Run this TEMPORARILY for testing, then revert to production intervals
-- ══════════════════════════════════════════════

-- Set all Alexandria scopes to 2-minute intervals for testing
UPDATE ahe_scopes
SET harvest_interval_minutes = 2,
    max_pages_per_harvest = 1,
    next_harvest_at = NOW(),
    is_paused = false,
    updated_at = NOW()
WHERE governorate = 'الإسكندرية'
  AND is_active = true;

-- Also ensure engine is running
UPDATE ahe_engine_status
SET status = 'running',
    global_max_concurrent_jobs = 5,
    global_max_requests_per_hour = 1000,
    updated_at = NOW()
WHERE id = 1;
