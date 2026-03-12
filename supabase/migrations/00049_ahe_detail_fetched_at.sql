-- Add detail_fetched_at to track which listings have been detail-fetched
-- Prevents re-fetching the same listing in enrichment cycles
ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS detail_fetched_at TIMESTAMPTZ;

-- Ensure phone_source column exists
ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS phone_source TEXT;

-- Index for enrichment worker queries (listings without detail fetch)
CREATE INDEX IF NOT EXISTS idx_ahe_listings_no_detail
  ON ahe_listings (created_at DESC)
  WHERE extracted_phone IS NULL AND detail_fetched_at IS NULL AND is_duplicate = false;
