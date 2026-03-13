-- ============================================
-- Migration 054: Recommendation Engine RPCs
-- get_personalized_recommendations, get_matching_auctions, get_seller_insights
-- ✅ IDEMPOTENT — safe to run multiple times
-- ============================================

-- ============================================
-- RPC: get_personalized_recommendations
-- Returns ads matching user's interest signals from last 30 days
-- ============================================
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_user_id UUID,
  p_governorate TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  sale_type TEXT,
  images TEXT[],
  governorate TEXT,
  city TEXT,
  category_id TEXT,
  subcategory_id TEXT,
  created_at TIMESTAMPTZ,
  is_negotiable BOOLEAN,
  auction_start_price NUMERIC,
  auction_buy_now_price NUMERIC,
  auction_ends_at TIMESTAMPTZ,
  auction_status TEXT,
  exchange_description TEXT,
  views_count INTEGER,
  favorites_count INTEGER,
  relevance_score NUMERIC,
  match_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_interests AS (
    -- Aggregate signals from last 30 days into interest clusters
    SELECT
      us.category_id AS cat_id,
      us.subcategory_id AS subcat_id,
      us.signal_data->>'brand' AS brand,
      AVG(CASE WHEN (us.signal_data->>'price')::numeric IS NOT NULL
           THEN (us.signal_data->>'price')::numeric END) AS avg_price,
      us.governorate AS gov,
      SUM(us.weight) AS total_weight,
      COUNT(*) AS signal_count
    FROM user_signals us
    WHERE us.user_id = p_user_id
      AND us.created_at > NOW() - INTERVAL '30 days'
      AND us.category_id IS NOT NULL
    GROUP BY us.category_id, us.subcategory_id, us.signal_data->>'brand', us.governorate
    ORDER BY total_weight DESC
    LIMIT 10
  ),
  scored_ads AS (
    SELECT
      a.id, a.title::TEXT, a.price, a.sale_type::TEXT, a.images,
      a.governorate::TEXT, a.city::TEXT,
      a.category_id::TEXT, a.subcategory_id::TEXT,
      a.created_at, a.is_negotiable,
      a.auction_start_price, a.auction_buy_now_price,
      a.auction_ends_at, a.auction_status::TEXT,
      a.exchange_description::TEXT,
      a.views_count, a.favorites_count,
      -- Relevance scoring
      (
        -- Category match (base score)
        CASE WHEN ui.cat_id IS NOT NULL THEN ui.total_weight * 2 ELSE 0 END
        -- Subcategory match (bonus)
        + CASE WHEN ui.subcat_id IS NOT NULL AND a.subcategory_id = ui.subcat_id THEN 15 ELSE 0 END
        -- Brand match (bonus)
        + CASE WHEN ui.brand IS NOT NULL AND a.category_fields->>'brand' = ui.brand THEN 20 ELSE 0 END
        -- Price proximity (bonus, within 30% of user's avg interest)
        + CASE WHEN ui.avg_price IS NOT NULL AND a.price IS NOT NULL
               AND a.price BETWEEN ui.avg_price * 0.7 AND ui.avg_price * 1.3
               THEN 10 ELSE 0 END
        -- Location match (bonus)
        + CASE WHEN p_governorate IS NOT NULL AND a.governorate = p_governorate THEN 8 ELSE 0 END
        -- Freshness bonus (newer ads score higher)
        + CASE WHEN a.created_at > NOW() - INTERVAL '3 days' THEN 5
               WHEN a.created_at > NOW() - INTERVAL '7 days' THEN 3
               ELSE 0 END
        -- Has images bonus
        + CASE WHEN array_length(a.images, 1) > 0 THEN 3 ELSE 0 END
      )::NUMERIC AS relevance_score,
      CASE
        WHEN ui.brand IS NOT NULL AND a.category_fields->>'brand' = ui.brand
          THEN 'بتدور على ' || ui.brand
        WHEN ui.subcat_id IS NOT NULL AND a.subcategory_id = ui.subcat_id
          THEN 'مهتم بالقسم ده'
        WHEN p_governorate IS NOT NULL AND a.governorate = p_governorate
          THEN 'قريب منك'
        ELSE 'على حسب اهتماماتك'
      END AS match_reason
    FROM ads a
    INNER JOIN user_interests ui ON a.category_id = ui.cat_id
    WHERE a.status = 'active'
      AND a.user_id != p_user_id
      AND a.created_at > NOW() - INTERVAL '30 days'
  )
  SELECT DISTINCT ON (sa.id)
    sa.id, sa.title, sa.price, sa.sale_type, sa.images,
    sa.governorate, sa.city, sa.category_id, sa.subcategory_id,
    sa.created_at, sa.is_negotiable,
    sa.auction_start_price, sa.auction_buy_now_price,
    sa.auction_ends_at, sa.auction_status,
    sa.exchange_description, sa.views_count, sa.favorites_count,
    sa.relevance_score, sa.match_reason
  FROM scored_ads sa
  ORDER BY sa.id, sa.relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC: get_matching_auctions
-- Returns active auctions matching user interests
-- ============================================
CREATE OR REPLACE FUNCTION get_matching_auctions(
  p_user_id UUID,
  p_governorate TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  sale_type TEXT,
  images TEXT[],
  governorate TEXT,
  city TEXT,
  category_id TEXT,
  subcategory_id TEXT,
  created_at TIMESTAMPTZ,
  is_negotiable BOOLEAN,
  auction_start_price NUMERIC,
  auction_buy_now_price NUMERIC,
  auction_ends_at TIMESTAMPTZ,
  auction_status TEXT,
  exchange_description TEXT,
  views_count INTEGER,
  favorites_count INTEGER,
  relevance_score NUMERIC,
  match_reason TEXT,
  time_remaining_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_cats AS (
    -- Get user's top interested categories
    SELECT
      us.category_id AS cat_id,
      SUM(us.weight) AS total_weight
    FROM user_signals us
    WHERE us.user_id = p_user_id
      AND us.created_at > NOW() - INTERVAL '30 days'
      AND us.category_id IS NOT NULL
    GROUP BY us.category_id
    ORDER BY total_weight DESC
    LIMIT 5
  )
  SELECT
    a.id, a.title::TEXT, a.price, a.sale_type::TEXT, a.images,
    a.governorate::TEXT, a.city::TEXT,
    a.category_id::TEXT, a.subcategory_id::TEXT,
    a.created_at, a.is_negotiable,
    a.auction_start_price, a.auction_buy_now_price,
    a.auction_ends_at, a.auction_status::TEXT,
    a.exchange_description::TEXT,
    a.views_count, a.favorites_count,
    -- Score: urgency + interest match
    (
      CASE WHEN uc.cat_id IS NOT NULL THEN uc.total_weight ELSE 0 END
      + CASE WHEN a.auction_ends_at < NOW() + INTERVAL '6 hours' THEN 20 ELSE 0 END
      + CASE WHEN p_governorate IS NOT NULL AND a.governorate = p_governorate THEN 5 ELSE 0 END
    )::NUMERIC AS relevance_score,
    CASE
      WHEN a.auction_ends_at < NOW() + INTERVAL '6 hours' THEN '🔥 ينتهي قريباً'
      WHEN uc.cat_id IS NOT NULL THEN 'من اهتماماتك'
      ELSE 'مزاد نشط'
    END AS match_reason,
    EXTRACT(EPOCH FROM (a.auction_ends_at - NOW())) / 3600 AS time_remaining_hours
  FROM ads a
  LEFT JOIN user_cats uc ON a.category_id = uc.cat_id
  WHERE a.status = 'active'
    AND a.sale_type = 'auction'
    AND a.auction_status = 'active'
    AND a.auction_ends_at > NOW()
    AND a.user_id != p_user_id
  ORDER BY relevance_score DESC, a.auction_ends_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC: get_seller_insights
-- Returns potential buyer count for a given category/brand/location
-- ============================================
CREATE OR REPLACE FUNCTION get_seller_insights(
  p_category_id TEXT,
  p_subcategory_id TEXT DEFAULT NULL,
  p_governorate TEXT DEFAULT NULL,
  p_brand TEXT DEFAULT NULL
)
RETURNS TABLE (
  category_searchers BIGINT,
  specific_searchers BIGINT,
  location_interested BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- People searching in this category (last 30 days)
    (SELECT COUNT(DISTINCT us.user_id)
     FROM user_signals us
     WHERE us.category_id = p_category_id
       AND us.created_at > NOW() - INTERVAL '30 days'
    ) AS category_searchers,
    -- People searching for specific brand/subcategory
    (SELECT COUNT(DISTINCT us.user_id)
     FROM user_signals us
     WHERE us.category_id = p_category_id
       AND us.created_at > NOW() - INTERVAL '30 days'
       AND (
         (p_brand IS NOT NULL AND us.signal_data->>'brand' = p_brand)
         OR (p_subcategory_id IS NOT NULL AND us.subcategory_id = p_subcategory_id)
         OR (p_brand IS NULL AND p_subcategory_id IS NULL)
       )
    ) AS specific_searchers,
    -- People interested in this governorate
    (SELECT COUNT(DISTINCT us.user_id)
     FROM user_signals us
     WHERE us.category_id = p_category_id
       AND us.created_at > NOW() - INTERVAL '30 days'
       AND (p_governorate IS NULL OR us.governorate = p_governorate)
    ) AS location_interested;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC: build_user_interest_profile
-- Aggregates signals into a precomputed profile (called by background worker)
-- ============================================
CREATE OR REPLACE FUNCTION build_user_interest_profile(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_interests JSONB;
BEGIN
  SELECT jsonb_agg(interest_row)
  INTO v_interests
  FROM (
    SELECT jsonb_build_object(
      'category', us.category_id,
      'subcategory', us.subcategory_id,
      'brand', us.signal_data->>'brand',
      'price_range', jsonb_build_array(
        COALESCE(MIN((us.signal_data->>'price')::numeric), 0),
        COALESCE(MAX((us.signal_data->>'price')::numeric), 0)
      ),
      'governorate', us.governorate,
      'score', SUM(us.weight)
    ) AS interest_row
    FROM user_signals us
    WHERE us.user_id = p_user_id
      AND us.created_at > NOW() - INTERVAL '30 days'
      AND us.category_id IS NOT NULL
    GROUP BY us.category_id, us.subcategory_id, us.signal_data->>'brand', us.governorate
    ORDER BY SUM(us.weight) DESC
    LIMIT 10
  ) sub;

  INSERT INTO user_interest_profiles (user_id, interests, updated_at)
  VALUES (p_user_id, COALESCE(v_interests, '[]'::jsonb), NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET interests = COALESCE(v_interests, '[]'::jsonb),
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC: get_similar_ads
-- Returns ads similar to given search query/results for "شبيه اللي بتدور عليه"
-- ============================================
CREATE OR REPLACE FUNCTION get_similar_ads(
  p_query TEXT,
  p_category_id TEXT DEFAULT NULL,
  p_exclude_ids UUID[] DEFAULT '{}',
  p_limit INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  sale_type TEXT,
  images TEXT[],
  governorate TEXT,
  city TEXT,
  category_id TEXT,
  created_at TIMESTAMPTZ,
  is_negotiable BOOLEAN,
  auction_start_price NUMERIC,
  auction_ends_at TIMESTAMPTZ,
  exchange_description TEXT,
  similarity_score REAL,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.title::TEXT, a.price, a.sale_type::TEXT, a.images,
    a.governorate::TEXT, a.city::TEXT, a.category_id::TEXT,
    a.created_at, a.is_negotiable,
    a.auction_start_price, a.auction_ends_at,
    a.exchange_description::TEXT,
    -- Trigram similarity score
    similarity(a.title, p_query) AS similarity_score,
    -- Classify match type
    CASE
      WHEN a.sale_type = 'exchange' THEN 'exchange_wants_yours'
      WHEN a.sale_type = 'auction' THEN 'auction_similar'
      ELSE 'similar_item'
    END AS match_type
  FROM ads a
  WHERE a.status = 'active'
    AND a.id != ALL(p_exclude_ids)
    AND (
      -- Trigram similarity on title
      similarity(a.title, p_query) > 0.15
      -- Or FTS match
      OR to_tsvector('arabic', COALESCE(a.title, '') || ' ' || COALESCE(a.description, ''))
         @@ plainto_tsquery('arabic', p_query)
      -- Or exchange description mentions query
      OR (a.sale_type = 'exchange' AND a.exchange_description ILIKE '%' || p_query || '%')
    )
    AND (p_category_id IS NULL OR a.category_id = p_category_id OR a.category_id != p_category_id)
  ORDER BY
    -- Diversity: mix sale types
    CASE WHEN a.sale_type = 'exchange' THEN 0.3 ELSE 0 END
    + similarity(a.title, p_query)
    DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
