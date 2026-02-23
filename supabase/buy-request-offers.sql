-- ============================================
-- مكسب — Buy Request Offers Table
-- Sellers can make offers on buy requests
-- ✅ IDEMPOTENT — safe to run multiple times
-- ============================================

CREATE TABLE IF NOT EXISTS buy_request_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_request_id UUID REFERENCES buy_requests(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Offer type: cash offer, exchange offer, or auction invite
  offer_type VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (offer_type IN ('cash', 'exchange', 'auction')),

  -- For cash offers
  price DECIMAL(12,2),

  -- Link to seller's ad (for exchange offers or showing what they're selling)
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,

  -- Seller's message
  message TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),

  -- Buyer response
  buyer_response_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_br_offers_request ON buy_request_offers(buy_request_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_br_offers_seller ON buy_request_offers(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_br_offers_ad ON buy_request_offers(ad_id) WHERE ad_id IS NOT NULL;

-- RLS
ALTER TABLE buy_request_offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_request_offers' AND policyname = 'Buy request offers viewable by participants') THEN
    CREATE POLICY "Buy request offers viewable by participants" ON buy_request_offers
      FOR SELECT USING (
        seller_id = auth.uid()
        OR buy_request_id IN (SELECT id FROM buy_requests WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_request_offers' AND policyname = 'Sellers can create offers') THEN
    CREATE POLICY "Sellers can create offers" ON buy_request_offers
      FOR INSERT WITH CHECK (auth.uid() = seller_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_request_offers' AND policyname = 'Participants can update offers') THEN
    CREATE POLICY "Participants can update offers" ON buy_request_offers
      FOR UPDATE USING (
        seller_id = auth.uid()
        OR buy_request_id IN (SELECT id FROM buy_requests WHERE user_id = auth.uid())
      );
  END IF;
END $$;


-- ============================================
-- Enhanced matching function (smarter scoring)
-- ============================================

CREATE OR REPLACE FUNCTION find_matches_for_buy_request(
  p_request_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
  ad_id UUID,
  match_score DECIMAL,
  match_type VARCHAR
) AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM buy_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  WITH scored_ads AS (
    SELECT
      a.id AS ad_id,
      (
        -- Base: category match = 30 points
        CASE WHEN a.category_id = v_request.category_id THEN 30.0 ELSE 0 END
        -- Subcategory match = +20 points
        + CASE WHEN v_request.subcategory_id IS NOT NULL AND a.subcategory_id = v_request.subcategory_id THEN 20.0 ELSE 0 END
        -- Full-text title match = +25 points
        + CASE WHEN to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
            @@ plainto_tsquery('arabic', v_request.title) THEN 25.0 ELSE 0 END
        -- Fuzzy title similarity = +15 points * similarity
        + (similarity(lower(a.title), lower(v_request.title)) * 15.0)
        -- Price in budget = +15 points
        + CASE
            WHEN v_request.budget_max IS NOT NULL AND v_request.budget_min IS NOT NULL
              AND a.price BETWEEN v_request.budget_min AND v_request.budget_max THEN 15.0
            WHEN v_request.budget_max IS NOT NULL AND a.price <= v_request.budget_max THEN 12.0
            WHEN v_request.budget_min IS NOT NULL AND a.price >= v_request.budget_min THEN 8.0
            ELSE 0 END
        -- Same governorate = +5 points
        + CASE WHEN v_request.governorate IS NOT NULL AND a.governorate = v_request.governorate THEN 5.0 ELSE 0 END
        -- Exchange type match = +10 points
        + CASE WHEN v_request.purchase_type IN ('exchange', 'both') AND a.sale_type = 'exchange' THEN 10.0 ELSE 0 END
        -- Recent ad bonus (last 7 days) = +5 points
        + CASE WHEN a.created_at > NOW() - INTERVAL '7 days' THEN 5.0 ELSE 0 END
      ) AS match_score,
      CASE
        WHEN to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
          @@ plainto_tsquery('arabic', v_request.title)
        THEN 'exact'
        WHEN v_request.purchase_type IN ('exchange', 'both') AND a.sale_type = 'exchange'
          AND (v_request.exchange_category_id IS NULL OR a.category_id = v_request.exchange_category_id)
        THEN 'exchange'
        WHEN v_request.budget_max IS NOT NULL AND a.price <= v_request.budget_max
        THEN 'price'
        ELSE 'category'
      END AS match_type
    FROM ads a
    WHERE a.status = 'active'
      AND a.user_id != v_request.user_id
      AND (
        a.category_id = v_request.category_id
        OR (v_request.exchange_category_id IS NOT NULL AND a.category_id = v_request.exchange_category_id)
      )
  )
  SELECT sa.ad_id, sa.match_score, sa.match_type
  FROM scored_ads sa
  WHERE sa.match_score >= 30  -- Minimum meaningful match
  ORDER BY sa.match_score DESC, sa.ad_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- Function: Find buy requests matching a new ad
-- (Called when a seller creates a new ad)
-- ============================================

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
      THEN 'exact'
      WHEN br.purchase_type IN ('exchange', 'both') AND v_ad.sale_type = 'exchange'
      THEN 'exchange'
      ELSE 'category'
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
$$ LANGUAGE plpgsql;


-- ✅ Done
DO $$ BEGIN
  RAISE NOTICE '✅ buy_request_offers table created';
  RAISE NOTICE '✅ find_matches_for_buy_request() enhanced';
  RAISE NOTICE '✅ find_buy_requests_for_ad() created';
END $$;
