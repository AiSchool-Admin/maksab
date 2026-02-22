-- Buy Requests: Allows buyers to post what they want to buy
-- Smart matching connects buy requests with existing sell ads

CREATE TABLE buy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

  -- What they want
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory_id VARCHAR(50),
  title VARCHAR(200) NOT NULL,          -- e.g. "عايز آيفون 15 برو"
  description TEXT,                      -- More details about what they want

  -- Purchase method
  purchase_type VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (purchase_type IN ('cash', 'exchange', 'both')),

  -- Budget (for cash / both)
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),

  -- Exchange details (for exchange / both)
  exchange_offer TEXT,                   -- What they can offer in exchange
  exchange_category_id VARCHAR(50),      -- Category of exchange item
  exchange_description TEXT,             -- Description of exchange item

  -- Location preference
  governorate VARCHAR(50),
  city VARCHAR(100),

  -- Category-specific filters (JSONB)
  desired_specs JSONB DEFAULT '{}',      -- e.g. {"brand": "apple", "storage": "256GB"}

  -- Status
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'fulfilled', 'expired', 'deleted')),

  -- Matching
  matches_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes
CREATE INDEX idx_buy_requests_user ON buy_requests(user_id, status);
CREATE INDEX idx_buy_requests_category ON buy_requests(category_id, status, created_at DESC);
CREATE INDEX idx_buy_requests_active ON buy_requests(status, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_buy_requests_search ON buy_requests USING GIN (
  to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Buy request matches: links buy requests to matching sell ads
CREATE TABLE buy_request_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_request_id UUID REFERENCES buy_requests(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) DEFAULT 0,    -- 0-100 match quality
  match_type VARCHAR(20) NOT NULL
    CHECK (match_type IN ('exact', 'category', 'exchange', 'price')),
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buy_request_id, ad_id)
);

CREATE INDEX idx_matches_request ON buy_request_matches(buy_request_id, match_score DESC);
CREATE INDEX idx_matches_ad ON buy_request_matches(ad_id);

-- RLS Policies
ALTER TABLE buy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buy requests viewable by everyone" ON buy_requests
  FOR SELECT USING (status != 'deleted');

CREATE POLICY "Users can create own buy requests" ON buy_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buy requests" ON buy_requests
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE buy_request_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable by request owner and ad owner" ON buy_request_matches
  FOR SELECT USING (
    buy_request_id IN (SELECT id FROM buy_requests WHERE user_id = auth.uid())
    OR ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid())
  );

-- Function: Find matching ads for a buy request
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
      -- Score calculation
      CASE
        -- Same category + text match = highest score
        WHEN a.category_id = v_request.category_id
          AND to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
            @@ plainto_tsquery('arabic', v_request.title)
        THEN 90.0
        -- Same category + price in range
        WHEN a.category_id = v_request.category_id
          AND (v_request.budget_max IS NULL OR a.price <= v_request.budget_max)
          AND (v_request.budget_min IS NULL OR a.price >= v_request.budget_min)
        THEN 70.0
        -- Same category only
        WHEN a.category_id = v_request.category_id
        THEN 50.0
        -- Exchange match: buyer offers what seller category wants
        WHEN v_request.purchase_type IN ('exchange', 'both')
          AND a.sale_type IN ('exchange')
          AND a.category_id = v_request.exchange_category_id
        THEN 80.0
        ELSE 0
      END AS match_score,
      CASE
        WHEN a.category_id = v_request.category_id
          AND to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
            @@ plainto_tsquery('arabic', v_request.title)
        THEN 'exact'
        WHEN v_request.purchase_type IN ('exchange', 'both')
          AND a.sale_type = 'exchange'
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
  WHERE sa.match_score > 0
  ORDER BY sa.match_score DESC, sa.ad_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
