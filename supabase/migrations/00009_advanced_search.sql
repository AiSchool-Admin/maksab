-- ============================================
-- Migration 009: Advanced Search Functions
-- Full-text Arabic search + Fuzzy matching + Trending + Autocomplete
-- ============================================

-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. Advanced search function combining full-text + fuzzy + filters
-- ============================================
CREATE OR REPLACE FUNCTION search_ads_advanced(
  p_query TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_subcategory TEXT DEFAULT NULL,
  p_sale_type TEXT DEFAULT NULL,
  p_price_min NUMERIC DEFAULT NULL,
  p_price_max NUMERIC DEFAULT NULL,
  p_governorate TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_category_filters JSONB DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  title VARCHAR(200),
  description TEXT,
  price DECIMAL(12,2),
  sale_type VARCHAR(10),
  is_negotiable BOOLEAN,
  images TEXT[],
  governorate VARCHAR(50),
  city VARCHAR(100),
  category_id VARCHAR(50),
  subcategory_id VARCHAR(50),
  category_fields JSONB,
  auction_start_price DECIMAL(12,2),
  auction_buy_now_price DECIMAL(12,2),
  auction_ends_at TIMESTAMPTZ,
  auction_status VARCHAR(20),
  exchange_description TEXT,
  exchange_accepts_price_diff BOOLEAN,
  exchange_price_diff DECIMAL(12,2),
  user_id UUID,
  status VARCHAR(20),
  views_count INTEGER,
  favorites_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Search ranking fields
  relevance_score REAL,
  match_type TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_tsquery tsquery;
  v_has_query BOOLEAN := (p_query IS NOT NULL AND trim(p_query) != '');
BEGIN
  -- Build tsquery for full-text search
  IF v_has_query THEN
    -- Try plainto_tsquery for Arabic text
    v_tsquery := plainto_tsquery('arabic', p_query);
  END IF;

  RETURN QUERY
  WITH scored_ads AS (
    SELECT
      a.*,
      CASE
        WHEN NOT v_has_query THEN 0.5
        -- Full-text match on title+description (highest weight)
        WHEN to_tsvector('arabic', coalesce(a.title, '') || ' ' || coalesce(a.description, ''))
             @@ v_tsquery
        THEN (
          ts_rank_cd(
            to_tsvector('arabic', coalesce(a.title, '') || ' ' || coalesce(a.description, '')),
            v_tsquery,
            32 -- normalize by document length
          ) * 100
        )
        -- Fuzzy trigram match on title (medium weight)
        WHEN similarity(a.title, p_query) > 0.15
        THEN similarity(a.title, p_query) * 60
        -- Fuzzy trigram on description
        WHEN similarity(coalesce(a.description, ''), p_query) > 0.1
        THEN similarity(coalesce(a.description, ''), p_query) * 30
        -- ILIKE fallback (lowest weight)
        WHEN a.title ILIKE '%' || p_query || '%'
        THEN 20
        WHEN a.description ILIKE '%' || p_query || '%'
        THEN 10
        ELSE 0
      END::REAL AS calc_relevance,
      CASE
        WHEN NOT v_has_query THEN 'none'
        WHEN v_tsquery IS NOT NULL
             AND to_tsvector('arabic', coalesce(a.title, '') || ' ' || coalesce(a.description, ''))
             @@ v_tsquery
        THEN 'fulltext'
        WHEN similarity(a.title, p_query) > 0.15 THEN 'fuzzy'
        WHEN a.title ILIKE '%' || p_query || '%' THEN 'partial'
        WHEN a.description ILIKE '%' || p_query || '%' THEN 'partial_desc'
        ELSE 'none'
      END AS calc_match_type
    FROM ads a
    WHERE a.status != 'deleted'
      -- Category filter
      AND (p_category IS NULL OR a.category_id = p_category)
      -- Subcategory filter
      AND (p_subcategory IS NULL OR a.subcategory_id = p_subcategory)
      -- Sale type filter
      AND (p_sale_type IS NULL OR a.sale_type = p_sale_type)
      -- Price range
      AND (p_price_min IS NULL OR a.price >= p_price_min)
      AND (p_price_max IS NULL OR a.price <= p_price_max)
      -- Location
      AND (p_governorate IS NULL OR a.governorate = p_governorate)
      AND (p_city IS NULL OR a.city = p_city)
      -- Category-specific field filters (JSONB containment)
      AND (p_category_filters IS NULL OR a.category_fields @> p_category_filters)
      -- Text search: must match at least one method
      AND (
        NOT v_has_query
        OR (
          -- Full-text search
          (v_tsquery IS NOT NULL AND
           to_tsvector('arabic', coalesce(a.title, '') || ' ' || coalesce(a.description, ''))
           @@ v_tsquery)
          -- Fuzzy match
          OR similarity(a.title, p_query) > 0.15
          OR similarity(coalesce(a.description, ''), p_query) > 0.1
          -- ILIKE fallback
          OR a.title ILIKE '%' || p_query || '%'
          OR a.description ILIKE '%' || p_query || '%'
        )
      )
  ),
  total AS (
    SELECT count(*) AS cnt FROM scored_ads WHERE scored_ads.calc_relevance > 0 OR NOT v_has_query
  )
  SELECT
    sa.id, sa.title, sa.description, sa.price, sa.sale_type,
    sa.is_negotiable, sa.images, sa.governorate, sa.city,
    sa.category_id, sa.subcategory_id, sa.category_fields,
    sa.auction_start_price, sa.auction_buy_now_price,
    sa.auction_ends_at, sa.auction_status,
    sa.exchange_description, sa.exchange_accepts_price_diff,
    sa.exchange_price_diff,
    sa.user_id, sa.status, sa.views_count, sa.favorites_count,
    sa.created_at, sa.updated_at,
    sa.calc_relevance AS relevance_score,
    sa.calc_match_type AS match_type,
    t.cnt AS total_count
  FROM scored_ads sa
  CROSS JOIN total t
  WHERE sa.calc_relevance > 0 OR NOT v_has_query
  ORDER BY
    CASE p_sort_by
      WHEN 'relevance' THEN NULL  -- handled below
      WHEN 'price_asc' THEN sa.price
    END ASC NULLS LAST,
    CASE p_sort_by
      WHEN 'price_desc' THEN sa.price
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'relevance' AND v_has_query THEN sa.calc_relevance
      ELSE 0
    END DESC,
    sa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 2. Autocomplete function — fast prefix + fuzzy suggestions
-- ============================================
CREATE OR REPLACE FUNCTION search_autocomplete(
  p_query TEXT,
  p_limit INTEGER DEFAULT 8
) RETURNS TABLE (
  suggestion TEXT,
  category_id VARCHAR(50),
  match_count BIGINT,
  suggestion_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Combine title prefix matches + category matches
  (
    -- Title-based suggestions (most common titles matching query)
    SELECT
      a.title AS suggestion,
      a.category_id,
      count(*)::BIGINT AS match_count,
      'title'::TEXT AS suggestion_type
    FROM ads a
    WHERE a.status = 'active'
      AND (
        a.title ILIKE p_query || '%'
        OR a.title ILIKE '%' || p_query || '%'
        OR similarity(a.title, p_query) > 0.2
      )
    GROUP BY a.title, a.category_id
    ORDER BY
      -- Prefer prefix matches
      CASE WHEN a.title ILIKE p_query || '%' THEN 0 ELSE 1 END,
      count(*) DESC,
      similarity(max(a.title), p_query) DESC
    LIMIT p_limit
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 3. Trending searches table + functions
-- ============================================
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category_id VARCHAR(50),
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for trending aggregation
CREATE INDEX IF NOT EXISTS idx_search_queries_recent
  ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_normalized
  ON search_queries(normalized_query, created_at DESC);

-- Function to log a search and get trending
CREATE OR REPLACE FUNCTION log_search_query(
  p_query TEXT,
  p_user_id UUID DEFAULT NULL,
  p_category_id TEXT DEFAULT NULL,
  p_results_count INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO search_queries (query, normalized_query, user_id, category_id, results_count)
  VALUES (
    p_query,
    lower(trim(regexp_replace(p_query, '\s+', ' ', 'g'))),
    p_user_id,
    p_category_id,
    p_results_count
  );
END;
$$ LANGUAGE plpgsql;

-- Get trending searches (last 7 days, grouped)
CREATE OR REPLACE FUNCTION get_trending_searches(
  p_limit INTEGER DEFAULT 10,
  p_hours INTEGER DEFAULT 168  -- 7 days default
) RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  avg_results NUMERIC,
  last_searched TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.normalized_query AS query,
    count(*)::BIGINT AS search_count,
    avg(sq.results_count)::NUMERIC AS avg_results,
    max(sq.created_at) AS last_searched
  FROM search_queries sq
  WHERE sq.created_at > NOW() - (p_hours || ' hours')::INTERVAL
    AND sq.results_count > 0  -- only show searches that had results
    AND length(sq.normalized_query) > 2
  GROUP BY sq.normalized_query
  HAVING count(*) >= 2  -- at least 2 searches
  ORDER BY count(*) DESC, max(sq.created_at) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 4. Image search: store image embeddings for similarity
-- (Simple version using category_fields + title matching)
-- ============================================
CREATE OR REPLACE FUNCTION search_by_visual_tags(
  p_tags TEXT[],
  p_limit INTEGER DEFAULT 12
) RETURNS TABLE (
  id UUID,
  title VARCHAR(200),
  price DECIMAL(12,2),
  sale_type VARCHAR(10),
  images TEXT[],
  governorate VARCHAR(50),
  city VARCHAR(100),
  category_id VARCHAR(50),
  created_at TIMESTAMPTZ,
  tag_match_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.title, a.price, a.sale_type, a.images,
    a.governorate, a.city, a.category_id, a.created_at,
    (
      SELECT count(*)::INTEGER
      FROM unnest(p_tags) t
      WHERE a.title ILIKE '%' || t || '%'
        OR a.description ILIKE '%' || t || '%'
        OR a.category_fields::text ILIKE '%' || t || '%'
    ) AS tag_match_count
  FROM ads a
  WHERE a.status = 'active'
    AND EXISTS (
      SELECT 1 FROM unnest(p_tags) t
      WHERE a.title ILIKE '%' || t || '%'
        OR a.description ILIKE '%' || t || '%'
        OR a.category_fields::text ILIKE '%' || t || '%'
    )
  ORDER BY tag_match_count DESC, a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Cleanup old search queries (keep 30 days)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_search_queries()
RETURNS void AS $$
BEGIN
  DELETE FROM search_queries WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
