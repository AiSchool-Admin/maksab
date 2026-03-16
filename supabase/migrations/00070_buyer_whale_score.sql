-- Buyer Whale Score System — 4 عوامل × نقاط
-- purchase_readiness: ready_now | actively_searching | interested | long_term | unknown
-- buyer_tier: whale_buyer | big_buyer | regular_buyer | small_buyer | cold_buyer

ALTER TABLE bhe_buyers ADD COLUMN IF NOT EXISTS buyer_whale_score INTEGER DEFAULT 0;
ALTER TABLE bhe_buyers ADD COLUMN IF NOT EXISTS purchase_readiness TEXT DEFAULT 'unknown';
ALTER TABLE bhe_buyers ADD COLUMN IF NOT EXISTS estimated_purchase_value INTEGER DEFAULT 0;

-- buyer_tier might already exist, safe add
DO $$ BEGIN
  ALTER TABLE bhe_buyers ADD COLUMN buyer_tier TEXT DEFAULT 'cold_buyer';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for score-based sorting
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_whale_score ON bhe_buyers(buyer_whale_score DESC);
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_tier ON bhe_buyers(buyer_tier, buyer_whale_score DESC);

-- ═══ دالة حساب Buyer Whale Score ═══
CREATE OR REPLACE FUNCTION calculate_buyer_whale_scores()
RETURNS INTEGER AS $$
DECLARE
  updated INTEGER;
BEGIN
  UPDATE bhe_buyers SET
    buyer_whale_score = (
      -- 1. القوة الشرائية (0-40)
      CASE
        WHEN budget_max > 500000 THEN 40
        WHEN budget_max > 100000 THEN 30
        WHEN budget_max > 50000 THEN 20
        WHEN budget_max > 10000 THEN 15
        WHEN budget_max > 1000 THEN 10
        ELSE 5
      END
      +
      -- 2. جاهزية الشراء (0-30)
      CASE source
        WHEN 'dubizzle_wanted' THEN 30
        WHEN 'facebook_group' THEN 30
        WHEN 'opensooq_title_match' THEN 25
        WHEN 'dubizzle_comment' THEN 20
        WHEN 'seller_is_buyer' THEN 15
        WHEN 'reverse_seller' THEN 10
        ELSE 5
      END
      +
      -- 3. جودة البيانات (0-20)
      CASE
        WHEN buyer_phone IS NOT NULL AND buyer_name IS NOT NULL AND product_wanted IS NOT NULL AND budget_max IS NOT NULL AND governorate IS NOT NULL THEN 20
        WHEN buyer_phone IS NOT NULL AND buyer_name IS NOT NULL AND product_wanted IS NOT NULL THEN 15
        WHEN buyer_phone IS NOT NULL AND product_wanted IS NOT NULL THEN 10
        WHEN buyer_phone IS NOT NULL THEN 5
        ELSE 0
      END
      +
      -- 4. الفئة (0-10)
      CASE category
        WHEN 'properties' THEN 10
        WHEN 'vehicles' THEN 8
        WHEN 'phones' THEN 5
        WHEN 'electronics' THEN 4
        WHEN 'furniture' THEN 4
        ELSE 2
      END
    ),
    purchase_readiness = CASE source
      WHEN 'dubizzle_wanted' THEN 'ready_now'
      WHEN 'facebook_group' THEN 'ready_now'
      WHEN 'opensooq_title_match' THEN 'ready_now'
      WHEN 'dubizzle_comment' THEN 'interested'
      WHEN 'seller_is_buyer' THEN 'actively_searching'
      WHEN 'reverse_seller' THEN 'long_term'
      ELSE 'unknown'
    END,
    buyer_tier = CASE
      WHEN buyer_whale_score >= 80 THEN 'whale_buyer'
      WHEN buyer_whale_score >= 60 THEN 'big_buyer'
      WHEN buyer_whale_score >= 40 THEN 'regular_buyer'
      WHEN buyer_whale_score >= 20 THEN 'small_buyer'
      ELSE 'cold_buyer'
    END,
    estimated_purchase_value = COALESCE(budget_max,
      CASE category
        WHEN 'properties' THEN 2000000
        WHEN 'vehicles' THEN 300000
        WHEN 'phones' THEN 15000
        WHEN 'electronics' THEN 10000
        WHEN 'furniture' THEN 20000
        ELSE 5000
      END
    );

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$ LANGUAGE plpgsql;

-- تشغيل أول مرة لتصنيف المشترين الحاليين
SELECT calculate_buyer_whale_scores();
