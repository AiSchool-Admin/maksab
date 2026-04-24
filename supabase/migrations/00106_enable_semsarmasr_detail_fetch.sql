-- ══════════════════════════════════════════════
-- Migration 00106: Enable detail_fetch_enabled for SemsarMasr Alexandria scopes
--
-- Context:
-- • SemsarMasr scopes were seeded with detail_fetch_enabled=false (migration 00079)
--   because the parser was immature.
-- • Migration 00104 re-activated SemsarMasr harvesting on Railway with a
--   dedicated parser (src/lib/crm/harvester/parsers/semsarmasr.ts).
-- • enrich-vercel endpoint now lists semsarmasr in SUPPORTED_PLATFORMS.
-- • Required to unlock property specs + phone + seller-name extraction,
--   which drives the 10k Alexandria property target.
-- ══════════════════════════════════════════════

UPDATE ahe_scopes
SET detail_fetch_enabled = true,
    updated_at = NOW()
WHERE code IN (
  'SEM-PROP-ALEX',
  'SEM-RESORT-ALEX',
  'SEM-COMM-ALEX',
  'SEM-RES-RENT-ALEX',
  'SEM-RESORT-RENT-ALEX',
  'SEM-COMM-RENT-ALEX'
);
