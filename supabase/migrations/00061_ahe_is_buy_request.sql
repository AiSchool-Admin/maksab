-- Add is_buy_request column to ahe_listings
-- Marks listings that are "مطلوب للشراء" (wanted to buy) ads on Dubizzle
-- These are buyers, not sellers — detected automatically during detail fetch

ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS is_buy_request BOOLEAN DEFAULT false;

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_ahe_listings_buy_request ON ahe_listings(is_buy_request) WHERE is_buy_request = true;
