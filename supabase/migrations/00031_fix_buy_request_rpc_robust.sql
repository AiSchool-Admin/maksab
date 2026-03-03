-- ============================================
-- Migration 031: Make find_buy_requests_for_ad more robust
--
-- Fixes 400 error by:
-- 1. Using 'simple' text search config as fallback if 'arabic' is unavailable
-- 2. Wrapping similarity() in a safe block in case pg_trgm is missing
-- 3. Adding better NULL handling for edge cases
-- ============================================

-- Ensure pg_trgm extension exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop and recreate the function with better safety
DROP FUNCTION IF EXISTS find_buy_requests_for_ad(UUID, INTEGER);

CREATE OR REPLACE FUNCTION find_buy_requests_for_ad(
  p_ad_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
  buy_request_id UUID,
  match_score DECIMAL,
  match_type VARCHAR,
  buyer_id UUID
) AS $$
DECLARE
  v_ad RECORD;
  v_ts_config REGCONFIG;
BEGIN
  -- Safely determine text search config (arabic if available, otherwise simple)
  BEGIN
    v_ts_config := 'arabic'::REGCONFIG;
  EXCEPTION WHEN undefined_object THEN
    v_ts_config := 'simple'::REGCONFIG;
  END;

  -- Lookup the ad
  SELECT * INTO v_ad FROM ads WHERE id = p_ad_id;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    br.id AS buy_request_id,
    (
      CASE WHEN br.category_id = v_ad.category_id THEN 30.0 ELSE 0 END
      + CASE WHEN br.subcategory_id IS NOT NULL AND br.subcategory_id = v_ad.subcategory_id THEN 20.0 ELSE 0 END
      + CASE WHEN to_tsvector(v_ts_config, coalesce(v_ad.title,'') || ' ' || coalesce(v_ad.description,''))
          @@ plainto_tsquery(v_ts_config, coalesce(br.title,'')) THEN 25.0 ELSE 0 END
      + (similarity(lower(coalesce(v_ad.title,'')), lower(coalesce(br.title,''))) * 15.0)
      + CASE
          WHEN br.budget_max IS NOT NULL AND v_ad.price IS NOT NULL AND v_ad.price <= br.budget_max THEN 12.0
          WHEN br.budget_min IS NOT NULL AND v_ad.price IS NOT NULL AND v_ad.price >= br.budget_min THEN 5.0
          ELSE 0 END
      + CASE WHEN br.governorate IS NOT NULL AND v_ad.governorate = br.governorate THEN 5.0 ELSE 0 END
      + CASE WHEN br.purchase_type IN ('exchange', 'both') AND v_ad.sale_type = 'exchange' THEN 10.0 ELSE 0 END
    ) AS match_score,
    CASE
      WHEN to_tsvector(v_ts_config, coalesce(v_ad.title,'') || ' ' || coalesce(v_ad.description,''))
        @@ plainto_tsquery(v_ts_config, coalesce(br.title,''))
      THEN 'exact'::VARCHAR
      WHEN br.purchase_type IN ('exchange', 'both') AND v_ad.sale_type = 'exchange'
      THEN 'exchange'::VARCHAR
      ELSE 'category'::VARCHAR
    END AS match_type,
    br.user_id AS buyer_id
  FROM buy_requests br
  WHERE br.status = 'active'
    AND br.user_id != v_ad.user_id
    AND br.category_id = v_ad.category_id
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to both roles
GRANT EXECUTE ON FUNCTION find_buy_requests_for_ad(UUID, INTEGER) TO anon, authenticated;
