-- ══════════════════════════════════════════════
-- Migration 00103: Pause blocked platforms + remove from Vercel delegation
-- Hatla2ee, ContactCars, SemsarMasr — both Vercel and Railway get 403
-- ══════════════════════════════════════════════

-- Pause the 8 blocked scopes (don't waste cron cycles)
UPDATE ahe_scopes
SET is_paused = true,
    server_fetch_blocked = true,
    updated_at = NOW()
WHERE code IN (
  'HAT-CAR-ALEX',
  'CC-CAR-ALEX',
  'SEM-PROP-ALEX',
  'SEM-RESORT-ALEX',
  'SEM-COMM-ALEX',
  'SEM-RES-RENT-ALEX',
  'SEM-RESORT-RENT-ALEX',
  'SEM-COMM-RENT-ALEX'
);
