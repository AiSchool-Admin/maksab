-- ══════════════════════════════════════════════
-- Migration 00092: Add user_id to ahe_sellers for account linking
-- ══════════════════════════════════════════════

ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_user ON ahe_sellers(user_id) WHERE user_id IS NOT NULL;
