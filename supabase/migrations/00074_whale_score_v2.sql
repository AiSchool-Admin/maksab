-- ═══════════════════════════════════════════════════════════════
-- Whale Score V2 — خوارزمية محدّثة (4 عوامل × نقاط أعلى)
-- Max Score = 40 + 30 + 20 + 10 = 100
-- Tiers: whale (>=70), big (>=40), medium (>=20), small (<20)
-- ═══════════════════════════════════════════════════════════════

-- ═══ دالة حساب Whale Score V2 ═══
CREATE OR REPLACE FUNCTION calculate_whale_scores_v2()
RETURNS TABLE(
  total_updated INTEGER,
  whales INTEGER,
  big INTEGER,
  medium INTEGER,
  small INTEGER
) AS $$
DECLARE
  v_total INTEGER;
  v_whales INTEGER;
  v_big INTEGER;
  v_medium INTEGER;
  v_small INTEGER;
BEGIN
  -- أولاً: حساب whale_score بالخوارزمية الجديدة
  UPDATE ahe_sellers SET
    whale_score = (
      -- 1. عدد الإعلانات الإجمالي (0-40)
      CASE
        WHEN total_listings_seen >= 50 THEN 40
        WHEN total_listings_seen >= 20 THEN 25
        WHEN total_listings_seen >= 10 THEN 15
        ELSE 5
      END
      +
      -- 2. الإعلانات النشطة (0-30)
      CASE
        WHEN active_listings >= 20 THEN 30
        WHEN active_listings >= 10 THEN 20
        WHEN active_listings >= 5 THEN 10
        ELSE 3
      END
      +
      -- 3. حساب تجاري (0-20)
      CASE
        WHEN is_business = true THEN 20
        ELSE 0
      END
      +
      -- 4. موثّق (0-10)
      CASE
        WHEN is_verified = true THEN 10
        ELSE 0
      END
    );

  -- ثانياً: تحديث seller_tier بناءً على whale_score
  UPDATE ahe_sellers SET
    seller_tier = CASE
      WHEN whale_score >= 70 THEN 'whale'
      WHEN whale_score >= 40 THEN 'big'
      WHEN whale_score >= 20 THEN 'medium'
      ELSE 'small'
    END,
    seller_tier_updated_at = NOW();

  GET DIAGNOSTICS v_total = ROW_COUNT;

  -- إحصائيات
  SELECT COUNT(*) INTO v_whales FROM ahe_sellers WHERE seller_tier = 'whale';
  SELECT COUNT(*) INTO v_big FROM ahe_sellers WHERE seller_tier = 'big';
  SELECT COUNT(*) INTO v_medium FROM ahe_sellers WHERE seller_tier = 'medium';
  SELECT COUNT(*) INTO v_small FROM ahe_sellers WHERE seller_tier = 'small';

  RETURN QUERY SELECT v_total, v_whales, v_big, v_medium, v_small;
END;
$$ LANGUAGE plpgsql;
