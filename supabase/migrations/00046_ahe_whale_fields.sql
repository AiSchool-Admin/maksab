-- ═══════════════════════════════════════════════════════════════
-- المرحلة 3 — الخطوة 3: حقول تصنيف الحيتان
-- Phase 3 — Step 3: Whale Detection Fields on ahe_sellers
-- ═══════════════════════════════════════════════════════════════

-- حقول الحيتان على ahe_sellers
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS whale_score INTEGER DEFAULT 0;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS is_whale BOOLEAN DEFAULT false;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS whale_detected_at TIMESTAMPTZ;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS has_featured_listings BOOLEAN DEFAULT false;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS has_elite_listings BOOLEAN DEFAULT false;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS featured_listings_count INTEGER DEFAULT 0;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS elite_listings_count INTEGER DEFAULT 0;

-- Index for whale queries
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_whale ON ahe_sellers(is_whale) WHERE is_whale = true;
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_whale_score ON ahe_sellers(whale_score DESC);

-- حقل إضافي على ahe_listings لتسجيل هل الإعلان elite
ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS is_elite BOOLEAN DEFAULT false;
ALTER TABLE ahe_listings ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'regular';  -- 'regular' | 'featured' | 'elite'

-- RPC: حساب وتحديث whale_score
CREATE OR REPLACE FUNCTION recalculate_whale_score(p_seller_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_seller RECORD;
  v_score INTEGER := 0;
  v_featured_count INTEGER;
  v_was_whale BOOLEAN;
BEGIN
  SELECT * INTO v_seller FROM ahe_sellers WHERE id = p_seller_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_was_whale := v_seller.is_whale;

  -- حساب النقاط
  IF v_seller.is_business THEN v_score := v_score + 30; END IF;
  IF v_seller.is_verified THEN v_score := v_score + 20; END IF;

  -- عدد الإعلانات المميزة
  SELECT COUNT(*) INTO v_featured_count
  FROM ahe_listings
  WHERE ahe_seller_id = p_seller_id AND (is_featured = true OR is_elite = true);

  IF v_featured_count > 0 THEN v_score := v_score + 20; END IF;

  -- عدد الإعلانات الكلي
  IF v_seller.total_listings_seen > 5 THEN v_score := v_score + 10; END IF;
  IF v_seller.total_listings_seen > 10 THEN v_score := v_score + 10; END IF;
  IF v_seller.total_listings_seen > 20 THEN v_score := v_score + 10; END IF;

  -- تحديث
  UPDATE ahe_sellers SET
    whale_score = v_score,
    is_whale = (v_score >= 60),
    whale_detected_at = CASE
      WHEN v_score >= 60 AND NOT v_was_whale THEN now()
      ELSE whale_detected_at
    END,
    has_featured_listings = (v_featured_count > 0),
    featured_listings_count = v_featured_count,
    updated_at = now()
  WHERE id = p_seller_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
