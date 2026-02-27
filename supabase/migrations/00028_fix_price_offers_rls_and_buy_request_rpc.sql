-- ============================================
-- Migration 028: Fix price_offers RLS & add find_buy_requests_for_ad RPC
--
-- Fixes:
-- 1. price_offers SELECT returns 403 for ad viewers (offer summary/count)
--    because migration 019 dropped the public policy without replacement.
--    Solution: Add a policy that lets ad owners see offers on their ads,
--    and let authenticated users see aggregate info (count/highest) via
--    a secure database function instead of direct SELECT.
--
-- 2. find_buy_requests_for_ad RPC returns 400 because the function was
--    never added to migrations (only in a standalone SQL file).
-- ============================================


-- ─── 1. Fix price_offers table permissions & RLS policies ─────────

-- Ensure table-level grants exist (missing grants cause 403 errors)
GRANT SELECT, INSERT, UPDATE ON price_offers TO authenticated;
GRANT SELECT ON price_offers TO anon;

-- Add policy: Ad owners (sellers) can always see all offers on their ads
-- This covers the case where a seller views their ad detail page
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'price_offers' AND policyname = 'Ad owners can view all offers on their ads'
  ) THEN
    CREATE POLICY "Ad owners can view all offers on their ads" ON price_offers
      FOR SELECT USING (
        auth.uid() = seller_id
        OR auth.uid() = buyer_id
        OR ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid())
      );
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop the old restrictive-only policy since the new one covers participants too
DO $$ BEGIN
  DROP POLICY IF EXISTS "Offer participants can view offers" ON price_offers;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Create a secure function for getting offer summary (count + highest)
-- This can be called by anyone viewing an ad, without exposing individual offer details
CREATE OR REPLACE FUNCTION get_ad_offer_summary(p_ad_id UUID)
RETURNS TABLE(
  total_offers BIGINT,
  highest_offer DECIMAL,
  pending_offers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_offers,
    MAX(po.amount) AS highest_offer,
    COUNT(*) FILTER (WHERE po.status = 'pending')::BIGINT AS pending_offers
  FROM price_offers po
  WHERE po.ad_id = p_ad_id
    AND po.status IN ('pending', 'accepted', 'countered');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow both anon and authenticated to call the summary function
GRANT EXECUTE ON FUNCTION get_ad_offer_summary(UUID) TO anon, authenticated;


-- ─── 2. Add find_buy_requests_for_ad RPC function ─────────────────

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
BEGIN
  SELECT * INTO v_ad FROM ads WHERE id = p_ad_id;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    br.id AS buy_request_id,
    (
      CASE WHEN br.category_id = v_ad.category_id THEN 30.0 ELSE 0 END
      + CASE WHEN br.subcategory_id IS NOT NULL AND br.subcategory_id = v_ad.subcategory_id THEN 20.0 ELSE 0 END
      + CASE WHEN to_tsvector('arabic', coalesce(v_ad.title,'') || ' ' || coalesce(v_ad.description,''))
          @@ plainto_tsquery('arabic', br.title) THEN 25.0 ELSE 0 END
      + (similarity(lower(v_ad.title), lower(br.title)) * 15.0)
      + CASE
          WHEN br.budget_max IS NOT NULL AND v_ad.price <= br.budget_max THEN 12.0
          WHEN br.budget_min IS NOT NULL AND v_ad.price >= br.budget_min THEN 5.0
          ELSE 0 END
      + CASE WHEN br.governorate IS NOT NULL AND v_ad.governorate = br.governorate THEN 5.0 ELSE 0 END
      + CASE WHEN br.purchase_type IN ('exchange', 'both') AND v_ad.sale_type = 'exchange' THEN 10.0 ELSE 0 END
    ) AS match_score,
    CASE
      WHEN to_tsvector('arabic', coalesce(v_ad.title,'') || ' ' || coalesce(v_ad.description,''))
        @@ plainto_tsquery('arabic', br.title)
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
    AND (
      CASE WHEN to_tsvector('arabic', coalesce(v_ad.title,'') || ' ' || coalesce(v_ad.description,''))
        @@ plainto_tsquery('arabic', br.title) THEN 25.0 ELSE 0 END
      + CASE WHEN br.category_id = v_ad.category_id THEN 30.0 ELSE 0 END
    ) >= 30
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow both anon and authenticated to call the matching function
GRANT EXECUTE ON FUNCTION find_buy_requests_for_ad(UUID, INTEGER) TO anon, authenticated;
