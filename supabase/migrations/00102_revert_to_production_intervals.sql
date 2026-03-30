-- ══════════════════════════════════════════════
-- Migration 00102: Revert to production intervals
-- Run AFTER testing is complete
-- ══════════════════════════════════════════════

-- Dubizzle + AqarMap: priority 1, 2 hours
UPDATE ahe_scopes SET harvest_interval_minutes = 120, max_pages_per_harvest = 20
WHERE code IN ('DUB-CAR-ALEX', 'DUB-PROP-ALEX', 'AQR-PROP-ALEX', 'AQR-RENT-ALEX');

-- Hatla2ee + OpenSooq + PropertyFinder: priority 2, 3 hours
UPDATE ahe_scopes SET harvest_interval_minutes = 180, max_pages_per_harvest = 15
WHERE code IN ('HAT-CAR-ALEX', 'OPS-CAR-ALEX', 'OPS-PROP-ALEX', 'PF-PROP-ALEX', 'PF-RENT-ALEX');

-- OLX + ContactCars + SemsarMasr: priority 3, 4 hours
UPDATE ahe_scopes SET harvest_interval_minutes = 240, max_pages_per_harvest = 10
WHERE code IN ('OLX-CAR-ALEX', 'CC-CAR-ALEX', 'SEM-PROP-ALEX', 'SEM-RESORT-ALEX', 'SEM-COMM-ALEX',
  'SEM-RES-RENT-ALEX', 'SEM-RESORT-RENT-ALEX', 'SEM-COMM-RENT-ALEX');

-- Engine: production settings
UPDATE ahe_engine_status
SET global_max_concurrent_jobs = 3,
    global_max_requests_per_hour = 500,
    updated_at = NOW()
WHERE id = 1;
