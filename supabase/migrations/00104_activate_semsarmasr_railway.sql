-- ══════════════════════════════════════════════
-- Migration 00104: Activate SemsarMasr scopes for Railway cron
-- Railway worker now has a dedicated SemsarMasr parser
-- that extracts listings + phones from inline JSON
-- ══════════════════════════════════════════════

-- Unblock and unpause all SemsarMasr scopes
UPDATE ahe_scopes
SET is_paused = false,
    server_fetch_blocked = false,
    server_fetch_blocked_at = NULL,
    is_active = true,
    consecutive_failures = 0,
    -- Set next_harvest_at to now so they get picked up immediately
    next_harvest_at = NOW(),
    updated_at = NOW()
WHERE code IN (
  'SEM-PROP-ALEX',
  'SEM-RESORT-ALEX',
  'SEM-COMM-ALEX',
  'SEM-RES-RENT-ALEX',
  'SEM-RESORT-RENT-ALEX',
  'SEM-COMM-RENT-ALEX'
);

-- Ensure pagination_pattern is correct for SemsarMasr
-- SemsarMasr uses &p=N for pagination
UPDATE ahe_scopes
SET pagination_pattern = '&p={page}'
WHERE source_platform = 'semsarmasr'
  AND (pagination_pattern IS NULL OR pagination_pattern != '&p={page}');
