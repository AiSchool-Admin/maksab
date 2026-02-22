/**
 * GET /api/admin/complete-setup-sql
 *
 * Returns the SQL needed to create missing tables.
 * Used by the /setup page to copy SQL to clipboard.
 */

import { NextResponse } from "next/server";

const MISSING_TABLES_SQL = `-- ============================================
-- مكسب — Apply Missing Tables
-- Run this in Supabase SQL Editor
-- ✅ IDEMPOTENT — safe to run multiple times
-- ============================================

-- 1. Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR(100) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  event_data JSONB DEFAULT '{}',
  page VARCHAR(500),
  referrer VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at DESC);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Anyone can insert analytics events') THEN
    CREATE POLICY "Anyone can insert analytics events" ON analytics_events FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Only admins can read analytics') THEN
    CREATE POLICY "Only admins can read analytics" ON analytics_events FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
  END IF;
END $$;

-- 2. Buy Requests
CREATE TABLE IF NOT EXISTS buy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory_id VARCHAR(50),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  purchase_type VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (purchase_type IN ('cash', 'exchange', 'both')),
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  exchange_offer TEXT,
  exchange_category_id VARCHAR(50),
  exchange_description TEXT,
  governorate VARCHAR(50),
  city VARCHAR(100),
  desired_specs JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'expired', 'deleted')),
  matches_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_buy_requests_user ON buy_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_buy_requests_category ON buy_requests(category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buy_requests_active ON buy_requests(status, created_at DESC) WHERE status = 'active';

-- 3. Buy Request Matches
CREATE TABLE IF NOT EXISTS buy_request_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_request_id UUID REFERENCES buy_requests(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) DEFAULT 0,
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('exact', 'category', 'exchange', 'price')),
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buy_request_id, ad_id)
);
CREATE INDEX IF NOT EXISTS idx_matches_request ON buy_request_matches(buy_request_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_ad ON buy_request_matches(ad_id);

-- 4. RLS Policies
ALTER TABLE buy_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_requests' AND policyname = 'Buy requests viewable by everyone') THEN
    CREATE POLICY "Buy requests viewable by everyone" ON buy_requests FOR SELECT USING (status != 'deleted');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_requests' AND policyname = 'Users can create own buy requests') THEN
    CREATE POLICY "Users can create own buy requests" ON buy_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_requests' AND policyname = 'Users can update own buy requests') THEN
    CREATE POLICY "Users can update own buy requests" ON buy_requests FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
ALTER TABLE buy_request_matches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_request_matches' AND policyname = 'Matches viewable by request owner and ad owner') THEN
    CREATE POLICY "Matches viewable by request owner and ad owner" ON buy_request_matches
      FOR SELECT USING (
        buy_request_id IN (SELECT id FROM buy_requests WHERE user_id = auth.uid())
        OR ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- 5. Matching Function
CREATE OR REPLACE FUNCTION find_matches_for_buy_request(
  p_request_id UUID, p_limit INTEGER DEFAULT 20
) RETURNS TABLE(ad_id UUID, match_score DECIMAL, match_type VARCHAR) AS $$
DECLARE v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM buy_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  WITH scored_ads AS (
    SELECT a.id AS ad_id,
      CASE
        WHEN a.category_id = v_request.category_id
          AND to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
            @@ plainto_tsquery('arabic', v_request.title) THEN 90.0
        WHEN a.category_id = v_request.category_id
          AND (v_request.budget_max IS NULL OR a.price <= v_request.budget_max)
          AND (v_request.budget_min IS NULL OR a.price >= v_request.budget_min) THEN 70.0
        WHEN a.category_id = v_request.category_id THEN 50.0
        WHEN v_request.purchase_type IN ('exchange', 'both')
          AND a.sale_type IN ('exchange')
          AND a.category_id = v_request.exchange_category_id THEN 80.0
        ELSE 0
      END AS match_score,
      CASE
        WHEN a.category_id = v_request.category_id
          AND to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
            @@ plainto_tsquery('arabic', v_request.title) THEN 'exact'
        WHEN v_request.purchase_type IN ('exchange', 'both') AND a.sale_type = 'exchange' THEN 'exchange'
        WHEN v_request.budget_max IS NOT NULL AND a.price <= v_request.budget_max THEN 'price'
        ELSE 'category'
      END AS match_type
    FROM ads a
    WHERE a.status = 'active' AND a.user_id != v_request.user_id
      AND (a.category_id = v_request.category_id
        OR (v_request.exchange_category_id IS NOT NULL AND a.category_id = v_request.exchange_category_id))
  )
  SELECT sa.ad_id, sa.match_score, sa.match_type FROM scored_ads sa
  WHERE sa.match_score > 0 ORDER BY sa.match_score DESC, sa.ad_id LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Done!
DO $$ BEGIN RAISE NOTICE 'All tables created successfully'; END $$;
`;

export async function GET() {
  return new NextResponse(MISSING_TABLES_SQL, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
