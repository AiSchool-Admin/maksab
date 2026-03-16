-- Whale Score System — 5 عوامل × نقاط
-- seller_tier: whale | big_fish | regular | small_fish | visitor

ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS seller_tier TEXT DEFAULT 'visitor';
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS estimated_monthly_value INTEGER DEFAULT 0;

-- إضافة whale_score لو مش موجود (ممكن يكون اتضاف قبل كده)
DO $$ BEGIN
  ALTER TABLE ahe_sellers ADD COLUMN whale_score INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for tier-based sorting
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_tier ON ahe_sellers(seller_tier, whale_score DESC);

-- ═══ دالة حساب Whale Score ═══
CREATE OR REPLACE FUNCTION calculate_whale_scores()
RETURNS INTEGER AS $$
DECLARE
  updated INTEGER;
BEGIN
  -- أولاً: حساب whale_score
  UPDATE ahe_sellers SET
    whale_score = (
      -- 1. الفئة (0-30)
      CASE primary_category
        WHEN 'vehicles' THEN 30
        WHEN 'properties' THEN 25
        WHEN 'phones' THEN 15
        WHEN 'electronics' THEN 10
        WHEN 'furniture' THEN 10
        ELSE 5
      END
      +
      -- 2. عدد الإعلانات (0-20)
      CASE
        WHEN total_listings_seen >= 10 THEN 20
        WHEN total_listings_seen >= 5 THEN 15
        WHEN total_listings_seen >= 2 THEN 10
        ELSE 5
      END
      +
      -- 3. نوع الحساب (0-15)
      CASE
        WHEN is_business AND is_verified THEN 15
        WHEN is_business THEN 10
        WHEN is_verified THEN 5
        ELSE 0
      END
      +
      -- 4. الرقم (0-10)
      CASE WHEN phone IS NOT NULL THEN 10 ELSE 0 END
    )
  WHERE TRUE;

  -- ثانياً: تحديث seller_tier بناءً على whale_score المحسوب
  UPDATE ahe_sellers SET
    seller_tier = CASE
      WHEN whale_score >= 60 THEN 'whale'
      WHEN whale_score >= 45 THEN 'big_fish'
      WHEN whale_score >= 30 THEN 'regular'
      WHEN whale_score >= 15 THEN 'small_fish'
      ELSE 'visitor'
    END,
    estimated_monthly_value = CASE
      WHEN whale_score >= 60 THEN 999
      WHEN whale_score >= 45 THEN 499
      WHEN whale_score >= 30 THEN 199
      WHEN whale_score >= 15 THEN 15
      ELSE 0
    END
  WHERE TRUE;

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$ LANGUAGE plpgsql;

-- تشغيل أول مرة لتصنيف البائعين الحاليين
SELECT calculate_whale_scores();
