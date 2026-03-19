-- ═══════════════════════════════════════════════════════
-- Migration 00076: Outreach Priority + Visitor Tier
-- ═══════════════════════════════════════════════════════
-- Adds outreach_priority column for sorting sellers by contact priority
-- Priority 1: medium + phone (highest ROI)
-- Priority 2: big + phone
-- Priority 3: small + phone
-- Priority 4: whale + phone (already high-touch)
-- Priority 5: visitor + phone
-- Priority 9: no phone (lowest)
-- Also adds 'visitor' as valid seller_tier value

-- 1. Add outreach_priority column
ALTER TABLE ahe_sellers
  ADD COLUMN IF NOT EXISTS outreach_priority INTEGER DEFAULT 9;

COMMENT ON COLUMN ahe_sellers.outreach_priority IS 'Outreach contact priority: 1=medium+phone, 2=big+phone, 3=small+phone, 4=whale+phone, 5=visitor+phone, 9=no phone';

-- 2. Update outreach_priority based on tier + phone availability
UPDATE ahe_sellers SET outreach_priority = CASE
  WHEN phone IS NOT NULL AND seller_tier = 'medium' THEN 1
  WHEN phone IS NOT NULL AND seller_tier = 'big'    THEN 2
  WHEN phone IS NOT NULL AND seller_tier = 'small'  THEN 3
  WHEN phone IS NOT NULL AND seller_tier = 'whale'  THEN 4
  WHEN phone IS NOT NULL AND seller_tier = 'visitor' THEN 5
  WHEN phone IS NOT NULL THEN 6
  ELSE 9
END;

-- 3. Index for fast priority-based sorting
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_outreach_priority
  ON ahe_sellers(outreach_priority ASC, whale_score DESC);

-- 4. Trigger to auto-update outreach_priority when tier or phone changes
CREATE OR REPLACE FUNCTION update_outreach_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.outreach_priority := CASE
    WHEN NEW.phone IS NOT NULL AND NEW.seller_tier = 'medium' THEN 1
    WHEN NEW.phone IS NOT NULL AND NEW.seller_tier = 'big'    THEN 2
    WHEN NEW.phone IS NOT NULL AND NEW.seller_tier = 'small'  THEN 3
    WHEN NEW.phone IS NOT NULL AND NEW.seller_tier = 'whale'  THEN 4
    WHEN NEW.phone IS NOT NULL AND NEW.seller_tier = 'visitor' THEN 5
    WHEN NEW.phone IS NOT NULL THEN 6
    ELSE 9
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_outreach_priority ON ahe_sellers;
CREATE TRIGGER trg_update_outreach_priority
  BEFORE INSERT OR UPDATE OF seller_tier, phone ON ahe_sellers
  FOR EACH ROW
  EXECUTE FUNCTION update_outreach_priority();
