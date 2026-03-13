-- ═══════════════════════════════════════════════════════════════
-- نظام تصنيف الشرائح — Seller Tier Classification
-- إضافة seller_tier + estimated_monthly_value لـ ahe_sellers و crm_customers
-- ═══════════════════════════════════════════════════════════════

-- ═══ ahe_sellers ═══
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS seller_tier TEXT DEFAULT 'unknown';
  -- 'whale'            — 🐋 حوت
  -- 'premium_merchant'  — 🏪 تاجر مميز
  -- 'regular_merchant'  — 🏬 تاجر عادي
  -- 'verified_seller'   — ✅ بائع موثق
  -- 'active_seller'     — 👤 بائع نشط
  -- 'new_seller'        — 👤 بائع جديد
  -- 'no_phone'          — 👻 بدون رقم
  -- 'unknown'           — لم يُصنّف بعد

ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS seller_tier_updated_at TIMESTAMPTZ;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS estimated_monthly_value INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ahe_sellers_tier ON ahe_sellers(seller_tier);
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_tier_value ON ahe_sellers(estimated_monthly_value DESC);

-- ═══ crm_customers ═══
ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS seller_tier TEXT;
ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS estimated_monthly_value INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_crm_customers_tier ON crm_customers(seller_tier);

-- ═══ RPC: Classify all sellers (batch) ═══
CREATE OR REPLACE FUNCTION classify_all_sellers()
RETURNS TABLE(total_classified INTEGER, tier_counts JSONB) AS $$
DECLARE
  v_total INTEGER := 0;
  v_counts JSONB;
BEGIN
  -- تصنيف بدون رقم
  UPDATE ahe_sellers SET
    seller_tier = 'no_phone',
    estimated_monthly_value = 0,
    seller_tier_updated_at = now()
  WHERE phone IS NULL AND (seller_tier IS NULL OR seller_tier = 'unknown');

  -- حيتان
  UPDATE ahe_sellers SET
    seller_tier = 'whale',
    estimated_monthly_value = 999,
    seller_tier_updated_at = now()
  WHERE phone IS NOT NULL AND whale_score >= 60;

  -- تاجر مميز
  UPDATE ahe_sellers SET
    seller_tier = 'premium_merchant',
    estimated_monthly_value = 499,
    seller_tier_updated_at = now()
  WHERE phone IS NOT NULL
    AND whale_score < 60
    AND is_business = true
    AND (is_verified = true OR has_featured_listings = true)
    AND total_listings_seen >= 5;

  -- تاجر عادي
  UPDATE ahe_sellers SET
    seller_tier = 'regular_merchant',
    estimated_monthly_value = 199,
    seller_tier_updated_at = now()
  WHERE phone IS NOT NULL
    AND whale_score < 60
    AND is_business = true
    AND total_listings_seen >= 2
    AND seller_tier NOT IN ('whale', 'premium_merchant');

  -- بائع موثق
  UPDATE ahe_sellers SET
    seller_tier = 'verified_seller',
    estimated_monthly_value = 20,
    seller_tier_updated_at = now()
  WHERE phone IS NOT NULL
    AND is_verified = true
    AND is_business = false
    AND total_listings_seen >= 2
    AND seller_tier NOT IN ('whale', 'premium_merchant', 'regular_merchant');

  -- بائع نشط
  UPDATE ahe_sellers SET
    seller_tier = 'active_seller',
    estimated_monthly_value = 12,
    seller_tier_updated_at = now()
  WHERE phone IS NOT NULL
    AND total_listings_seen >= 2
    AND seller_tier NOT IN ('whale', 'premium_merchant', 'regular_merchant', 'verified_seller');

  -- بائع جديد
  UPDATE ahe_sellers SET
    seller_tier = 'new_seller',
    estimated_monthly_value = 5,
    seller_tier_updated_at = now()
  WHERE phone IS NOT NULL
    AND seller_tier NOT IN ('whale', 'premium_merchant', 'regular_merchant', 'verified_seller', 'active_seller');

  -- إحصائيات
  SELECT jsonb_object_agg(seller_tier, cnt)
  INTO v_counts
  FROM (
    SELECT seller_tier, COUNT(*) as cnt
    FROM ahe_sellers
    WHERE seller_tier IS NOT NULL AND seller_tier != 'unknown'
    GROUP BY seller_tier
  ) sub;

  GET DIAGNOSTICS v_total = ROW_COUNT;

  RETURN QUERY SELECT v_total, COALESCE(v_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ Sync tier to crm_customers ═══
CREATE OR REPLACE FUNCTION sync_seller_tier_to_crm()
RETURNS void AS $$
BEGIN
  UPDATE crm_customers c SET
    seller_tier = s.seller_tier,
    estimated_monthly_value = s.estimated_monthly_value
  FROM ahe_sellers s
  WHERE c.id = s.crm_customer_id
    AND s.seller_tier IS NOT NULL
    AND s.seller_tier != 'unknown';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
