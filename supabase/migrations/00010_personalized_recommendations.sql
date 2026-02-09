-- ============================================
-- Migration 010: Personalized Recommendations RPCs
-- Real AI-powered recommendations using user_signals
-- ============================================

-- ============================================
-- 1. get_personalized_recommendations
-- Analyzes user_signals to build interest profile,
-- then returns ads matching those interests, scored by relevance.
-- ============================================
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_user_id UUID,
  p_user_governorate TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  price NUMERIC,
  sale_type TEXT,
  images TEXT[],
  governorate TEXT,
  city TEXT,
  category_id TEXT,
  subcategory_id TEXT,
  category_fields JSONB,
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
    -- Aggregate user signals from last 30 days into interest clusters
    SELECT
      us.category_id AS interest_category,
      us.subcategory_id AS interest_subcategory,
      -- Extract brand from signal_data
      us.signal_data->>'brand' AS interest_brand,
      -- Price signals
      AVG(CASE WHEN (us.signal_data->>'price')::numeric > 0
           THEN (us.signal_data->>'price')::numeric END) AS avg_price,
      MIN(CASE WHEN (us.signal_data->>'price')::numeric > 0
           THEN (us.signal_data->>'price')::numeric END) AS min_price,
      MAX(CASE WHEN (us.signal_data->>'price')::numeric > 0
           THEN (us.signal_data->>'price')::numeric END) AS max_price,
      -- Location preference
      MODE() WITHIN GROUP (ORDER BY us.governorate) AS preferred_governorate,
      -- Total interest weight
      SUM(us.weight) AS total_weight,
      -- Signal count
      COUNT(*) AS signal_count,
      -- Collect keywords from search queries
      array_agg(DISTINCT us.signal_data->>'query')
        FILTER (WHERE us.signal_data->>'query' IS NOT NULL) AS search_queries
    FROM user_signals us
    WHERE us.user_id = p_user_id
      AND us.created_at > NOW() - INTERVAL '30 days'
      AND us.category_id IS NOT NULL
    GROUP BY us.category_id, us.subcategory_id, us.signal_data->>'brand'
    ORDER BY total_weight DESC
    LIMIT 8  -- Top 8 interest clusters
  ),
  -- Get ad IDs the user has already viewed in detail
  viewed_ads AS (
    SELECT DISTINCT us2.ad_id
    FROM user_signals us2
    WHERE us2.user_id = p_user_id
      AND us2.signal_type = 'view'
      AND us2.ad_id IS NOT NULL
      AND us2.created_at > NOW() - INTERVAL '7 days'
  ),
  -- Score each active ad against user interests
  scored_ads AS (
    SELECT
      a.id,
      a.title::TEXT,
      a.price,
      a.sale_type::TEXT,
      a.images,
      a.governorate::TEXT,
      a.city::TEXT,
      a.category_id::TEXT,
      a.subcategory_id::TEXT,
      a.category_fields,
      a.created_at,
      a.is_negotiable,
      a.auction_start_price,
      a.auction_buy_now_price,
      a.auction_ends_at,
      a.auction_status::TEXT,
      a.exchange_description::TEXT,
      a.views_count,
      a.favorites_count,
      -- Calculate relevance score
      (
        -- Category match (base 30 points * weight factor)
        COALESCE(MAX(
          CASE WHEN a.category_id::TEXT = ui.interest_category
               THEN 30.0 * (ui.total_weight::numeric / GREATEST(
                 (SELECT MAX(total_weight) FROM user_interests), 1
               ))
               ELSE 0 END
        ), 0) +
        -- Subcategory match bonus (15 points)
        COALESCE(MAX(
          CASE WHEN a.subcategory_id::TEXT = ui.interest_subcategory
                AND ui.interest_subcategory IS NOT NULL
               THEN 15.0
               ELSE 0 END
        ), 0) +
        -- Brand match (20 points)
        COALESCE(MAX(
          CASE WHEN ui.interest_brand IS NOT NULL
                AND a.category_fields->>'brand' = ui.interest_brand
               THEN 20.0
               ELSE 0 END
        ), 0) +
        -- Price range match (15 points — within 30% flexibility)
        COALESCE(MAX(
          CASE WHEN ui.avg_price IS NOT NULL
                AND a.price IS NOT NULL
                AND a.price BETWEEN ui.min_price * 0.7 AND ui.max_price * 1.3
               THEN 15.0
               ELSE 0 END
        ), 0) +
        -- Location match (10 points)
        COALESCE(MAX(
          CASE WHEN a.governorate::TEXT = COALESCE(ui.preferred_governorate, p_user_governorate)
               THEN 10.0
               ELSE 0 END
        ), 0) +
        -- Freshness bonus (up to 10 points for ads < 3 days old)
        CASE WHEN a.created_at > NOW() - INTERVAL '3 days'
             THEN 10.0
             WHEN a.created_at > NOW() - INTERVAL '7 days'
             THEN 5.0
             ELSE 0 END +
        -- Auction urgency bonus (5 points for auctions ending within 6 hours)
        CASE WHEN a.sale_type = 'auction'
              AND a.auction_ends_at IS NOT NULL
              AND a.auction_ends_at BETWEEN NOW() AND NOW() + INTERVAL '6 hours'
             THEN 5.0
             ELSE 0 END +
        -- Has images bonus (3 points)
        CASE WHEN array_length(a.images, 1) > 0 THEN 3.0 ELSE 0 END
      ) AS relevance_score,
      -- Determine match reason
      COALESCE(
        MAX(
          CASE
            WHEN ui.interest_brand IS NOT NULL
              AND a.category_fields->>'brand' = ui.interest_brand
              THEN 'بناءً على اهتمامك بـ ' || ui.interest_brand
            WHEN a.subcategory_id::TEXT = ui.interest_subcategory
              AND ui.interest_subcategory IS NOT NULL
              THEN 'بناءً على بحثك في نفس القسم'
            WHEN a.category_id::TEXT = ui.interest_category
              THEN 'بناءً على اهتماماتك'
            ELSE NULL
          END
        ),
        CASE
          WHEN a.governorate::TEXT = p_user_governorate
            THEN 'قريب من موقعك'
          ELSE 'إعلان جديد'
        END
      ) AS match_reason
    FROM ads a
    LEFT JOIN user_interests ui ON a.category_id::TEXT = ui.interest_category
    WHERE a.status = 'active'
      AND a.user_id != p_user_id
      AND a.id NOT IN (SELECT va.ad_id FROM viewed_ads va WHERE va.ad_id IS NOT NULL)
      AND array_length(a.images, 1) > 0  -- Only ads with images
    GROUP BY a.id
    HAVING (
      -- Must have SOME relevance from interests
      MAX(CASE WHEN a.category_id::TEXT = ui.interest_category THEN 1 ELSE 0 END) > 0
      -- OR if no signals, include recent ads from user's governorate
      OR (
        NOT EXISTS (SELECT 1 FROM user_interests)
        AND (a.governorate::TEXT = p_user_governorate OR p_user_governorate IS NULL)
      )
    )
  )
  SELECT
    sa.id, sa.title, sa.price, sa.sale_type, sa.images,
    sa.governorate, sa.city, sa.category_id, sa.subcategory_id,
    sa.category_fields, sa.created_at, sa.is_negotiable,
    sa.auction_start_price, sa.auction_buy_now_price,
    sa.auction_ends_at, sa.auction_status, sa.exchange_description,
    sa.views_count, sa.favorites_count,
    sa.relevance_score, sa.match_reason
  FROM scored_ads sa
  WHERE sa.relevance_score > 0
  ORDER BY sa.relevance_score DESC, sa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 2. get_matching_auctions
-- Returns active auctions that match user interests.
-- Prioritizes: auctions ending soon, user's categories, location.
-- ============================================
CREATE OR REPLACE FUNCTION get_matching_auctions(
  p_user_id UUID,
  p_user_governorate TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  price NUMERIC,
  sale_type TEXT,
  images TEXT[],
  governorate TEXT,
  city TEXT,
  category_id TEXT,
  subcategory_id TEXT,
  category_fields JSONB,
  created_at TIMESTAMPTZ,
  is_negotiable BOOLEAN,
  auction_start_price NUMERIC,
  auction_buy_now_price NUMERIC,
  auction_ends_at TIMESTAMPTZ,
  auction_status TEXT,
  views_count INTEGER,
  favorites_count INTEGER,
  relevance_score NUMERIC,
  match_reason TEXT,
  time_remaining_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_interests AS (
    SELECT
      us.category_id AS interest_category,
      us.signal_data->>'brand' AS interest_brand,
      SUM(us.weight) AS total_weight
    FROM user_signals us
    WHERE us.user_id = p_user_id
      AND us.created_at > NOW() - INTERVAL '30 days'
      AND us.category_id IS NOT NULL
    GROUP BY us.category_id, us.signal_data->>'brand'
    ORDER BY total_weight DESC
    LIMIT 5
  )
  SELECT
    a.id,
    a.title::TEXT,
    a.price,
    a.sale_type::TEXT,
    a.images,
    a.governorate::TEXT,
    a.city::TEXT,
    a.category_id::TEXT,
    a.subcategory_id::TEXT,
    a.category_fields,
    a.created_at,
    a.is_negotiable,
    a.auction_start_price,
    a.auction_buy_now_price,
    a.auction_ends_at,
    a.auction_status::TEXT,
    a.views_count,
    a.favorites_count,
    -- Score
    (
      -- Category interest match (40 pts)
      COALESCE(MAX(
        CASE WHEN a.category_id::TEXT = ui.interest_category
             THEN 40.0 * (ui.total_weight::numeric / GREATEST(
               (SELECT MAX(total_weight) FROM user_interests), 1
             ))
             ELSE 0 END
      ), 0) +
      -- Brand match (20 pts)
      COALESCE(MAX(
        CASE WHEN ui.interest_brand IS NOT NULL
              AND a.category_fields->>'brand' = ui.interest_brand
             THEN 20.0
             ELSE 0 END
      ), 0) +
      -- Location match (10 pts)
      CASE WHEN a.governorate::TEXT = p_user_governorate THEN 10.0 ELSE 0 END +
      -- Urgency: ending soon gets higher score
      CASE
        WHEN a.auction_ends_at BETWEEN NOW() AND NOW() + INTERVAL '2 hours' THEN 30.0
        WHEN a.auction_ends_at BETWEEN NOW() AND NOW() + INTERVAL '6 hours' THEN 20.0
        WHEN a.auction_ends_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours' THEN 10.0
        ELSE 0
      END
    ) AS relevance_score,
    -- Match reason
    COALESCE(
      MAX(
        CASE
          WHEN ui.interest_brand IS NOT NULL
            AND a.category_fields->>'brand' = ui.interest_brand
            THEN 'بناءً على اهتمامك بـ ' || ui.interest_brand
          WHEN a.category_id::TEXT = ui.interest_category
            THEN 'بناءً على اهتماماتك'
          ELSE NULL
        END
      ),
      CASE
        WHEN a.auction_ends_at BETWEEN NOW() AND NOW() + INTERVAL '6 hours'
          THEN '🔥 ينتهي قريباً!'
        ELSE 'مزاد نشط'
      END
    ) AS match_reason,
    -- Time remaining
    EXTRACT(EPOCH FROM (a.auction_ends_at - NOW())) / 3600.0 AS time_remaining_hours
  FROM ads a
  LEFT JOIN user_interests ui ON a.category_id::TEXT = ui.interest_category
  WHERE a.status = 'active'
    AND a.sale_type = 'auction'
    AND a.user_id != p_user_id
    AND (a.auction_ends_at IS NULL OR a.auction_ends_at > NOW())
    AND array_length(a.images, 1) > 0
  GROUP BY a.id
  ORDER BY relevance_score DESC, a.auction_ends_at ASC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 3. get_seller_insights
-- Real data: how many people are interested in this type of ad
-- ============================================
CREATE OR REPLACE FUNCTION get_seller_insights(
  p_category_id TEXT,
  p_subcategory_id TEXT DEFAULT NULL,
  p_governorate TEXT DEFAULT NULL,
  p_brand TEXT DEFAULT NULL
)
RETURNS TABLE(
  category_searchers BIGINT,
  specific_searchers BIGINT,
  location_interested BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- People who searched this category in last 30 days
    (SELECT COUNT(DISTINCT us1.user_id)
     FROM user_signals us1
     WHERE us1.category_id = p_category_id
       AND us1.created_at > NOW() - INTERVAL '30 days'
    ) AS category_searchers,
    -- People who searched this specific item (brand + subcategory)
    (SELECT COUNT(DISTINCT us2.user_id)
     FROM user_signals us2
     WHERE us2.category_id = p_category_id
       AND us2.created_at > NOW() - INTERVAL '30 days'
       AND (
         (p_brand IS NOT NULL AND us2.signal_data->>'brand' = p_brand)
         OR
         (p_subcategory_id IS NOT NULL AND us2.subcategory_id = p_subcategory_id)
       )
    ) AS specific_searchers,
    -- People interested in this governorate + category
    (SELECT COUNT(DISTINCT us3.user_id)
     FROM user_signals us3
     WHERE us3.category_id = p_category_id
       AND us3.governorate = p_governorate
       AND us3.created_at > NOW() - INTERVAL '30 days'
       AND p_governorate IS NOT NULL
    ) AS location_interested;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 4. Ensure sale_type diversity in recommendations
-- Helper: tag ads with row numbers per sale_type
-- (Used client-side to enforce diversity rules)
-- ============================================

-- ============================================
-- 5. Update user_interest_profiles (called periodically)
-- Builds precomputed interest profile from signals
-- ============================================
CREATE OR REPLACE FUNCTION update_user_interest_profile(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_interests JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(interest_row ORDER BY total_weight DESC), '[]'::jsonb)
  INTO v_interests
  FROM (
    SELECT jsonb_build_object(
      'category', us.category_id,
      'subcategory', us.subcategory_id,
      'brand', us.signal_data->>'brand',
      'price_min', MIN(CASE WHEN (us.signal_data->>'price')::numeric > 0
                        THEN (us.signal_data->>'price')::numeric END) * 0.7,
      'price_max', MAX(CASE WHEN (us.signal_data->>'price')::numeric > 0
                        THEN (us.signal_data->>'price')::numeric END) * 1.3,
      'governorate', MODE() WITHIN GROUP (ORDER BY us.governorate),
      'score', SUM(us.weight)
    ) AS interest_row,
    SUM(us.weight) AS total_weight
    FROM user_signals us
    WHERE us.user_id = p_user_id
      AND us.created_at > NOW() - INTERVAL '30 days'
      AND us.category_id IS NOT NULL
    GROUP BY us.category_id, us.subcategory_id, us.signal_data->>'brand'
    LIMIT 10
  ) sub;

  INSERT INTO user_interest_profiles (user_id, interests, updated_at)
  VALUES (p_user_id, v_interests, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET interests = v_interests, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
