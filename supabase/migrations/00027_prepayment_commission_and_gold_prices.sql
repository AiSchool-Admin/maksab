-- Migration 27: Pre-payment commission system + Gold price cache + Notification preferences
--
-- Features:
-- 1. Pre-payment commission (0.5%) with ad boosting and trusted badge
-- 2. Gold price cache table for live pricing
-- 3. Notification preferences enhancement

-- ═══════════════════════════════════════════════════════════════════════
-- 1. PRE-PAYMENT COMMISSION — Ad boost columns
-- ═══════════════════════════════════════════════════════════════════════

-- Add boost & trust columns to ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT FALSE;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS boosted_at TIMESTAMPTZ;

-- Index for boosted ads (priority in search results)
CREATE INDEX IF NOT EXISTS idx_ads_boosted
  ON ads(is_boosted, created_at DESC)
  WHERE is_boosted = TRUE AND status = 'active';

-- Add commission_type to commissions table
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) DEFAULT 'post_transaction';

-- ═══════════════════════════════════════════════════════════════════════
-- 2. GOLD PRICE CACHE — Live gold/silver prices
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gold_price_cache (
  id SERIAL PRIMARY KEY,
  karat VARCHAR(20) NOT NULL,          -- '24', '21', '18', '14', 'silver_925', 'silver_900'
  price_per_gram DECIMAL(10,2) NOT NULL, -- Price in EGP
  source VARCHAR(100),                  -- Data source (e.g., 'goldprice.org', 'manual')
  fetched_at TIMESTAMPTZ DEFAULT NOW(), -- When the price was fetched
  UNIQUE(karat)                         -- One row per karat type
);

-- Seed with approximate initial prices (will be updated by API)
INSERT INTO gold_price_cache (karat, price_per_gram, source) VALUES
  ('24', 4500, 'seed'),
  ('21', 3940, 'seed'),
  ('18', 3375, 'seed'),
  ('14', 2625, 'seed'),
  ('silver_925', 55, 'seed'),
  ('silver_900', 53, 'seed')
ON CONFLICT (karat) DO NOTHING;

-- RLS: Everyone can read gold prices, only service role can write
ALTER TABLE gold_price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gold prices are readable by everyone"
  ON gold_price_cache FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. NOTIFICATION PREFERENCES — Push notification settings
-- ═══════════════════════════════════════════════════════════════════════

-- Add push notification preference columns if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN push_enabled BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'push_new_message'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN push_new_message BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'push_price_offer'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN push_price_offer BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'push_auction_updates'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN push_auction_updates BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'push_price_drops'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN push_price_drops BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'push_new_match'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN push_new_match BOOLEAN DEFAULT TRUE;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- notification_preferences table doesn't exist, create it
  CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT TRUE,
    push_new_message BOOLEAN DEFAULT TRUE,
    push_price_offer BOOLEAN DEFAULT TRUE,
    push_auction_updates BOOLEAN DEFAULT TRUE,
    push_price_drops BOOLEAN DEFAULT TRUE,
    push_new_match BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can read own preferences"
    ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users can update own preferences"
    ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "Users can insert own preferences"
    ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
END;
$$;
