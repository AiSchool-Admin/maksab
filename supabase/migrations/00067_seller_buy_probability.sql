-- ════════════════════════════════════════════════════════════
-- Strategy 3: تصنيف المعلنين حسب احتمالية الشراء
-- Migration 00067
-- ════════════════════════════════════════════════════════════

-- حقول جديدة في ahe_sellers
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS buy_probability TEXT DEFAULT 'unknown';
-- 'very_high' = فرد + 1-3 إعلانات (90%)
-- 'high' = فرد + 4-10 إعلانات (70%)
-- 'medium' = فرد نشط أو تاجر صغير (50%)
-- 'low' = تاجر كبير (20%)
-- 'unknown' = لم يُصنّف

ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS buy_probability_score INTEGER DEFAULT 0;

-- Index for sorting by buy probability
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_buy_probability
  ON ahe_sellers(buy_probability, buy_probability_score DESC)
  WHERE phone IS NOT NULL;

-- ════════════════════════════════════════════════════════════
-- تحديث البائعين الحاليين بناءً على بياناتهم
-- ════════════════════════════════════════════════════════════
UPDATE ahe_sellers SET
  buy_probability = CASE
    WHEN is_business = false AND (total_listings_seen IS NULL OR total_listings_seen <= 3) THEN 'very_high'
    WHEN is_business = false AND total_listings_seen <= 10 THEN 'high'
    WHEN is_business = false AND total_listings_seen > 10 THEN 'medium'
    WHEN is_business = true AND is_verified = false THEN 'medium'
    WHEN is_business = true AND is_verified = true THEN 'low'
    ELSE 'unknown'
  END,
  buy_probability_score = CASE
    WHEN is_business = false AND (total_listings_seen IS NULL OR total_listings_seen = 1) THEN 90
    WHEN is_business = false AND total_listings_seen <= 3 THEN 85
    WHEN is_business = false AND total_listings_seen <= 10 THEN 70
    WHEN is_business = false AND total_listings_seen > 10 THEN 50
    WHEN is_business = true AND is_verified = false THEN 40
    WHEN is_business = true AND is_verified = true THEN 20
    ELSE 30
  END
WHERE buy_probability = 'unknown' OR buy_probability IS NULL;
