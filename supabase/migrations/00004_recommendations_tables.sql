-- ============================================
-- Migration 004: Recommendations Engine Tables
-- user_signals, user_interest_profiles
-- ============================================

-- ============================================
-- User Signals (إشارات سلوك المستخدم)
-- Collects user behavior for recommendation engine
-- ============================================
CREATE TABLE user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  signal_type VARCHAR(20) NOT NULL CHECK (
    signal_type IN ('search', 'view', 'favorite', 'ad_created', 'bid_placed', 'chat_initiated')
  ),
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory_id VARCHAR(50),
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  -- Flexible data: keywords, filters, brand, model, price range, etc.
  signal_data JSONB DEFAULT '{}',
  governorate VARCHAR(50),
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recent signals per user (for real-time recommendations)
CREATE INDEX idx_signals_user_recent ON user_signals(user_id, created_at DESC);
-- User + category weighted signals (for category-level recommendations)
CREATE INDEX idx_signals_user_category ON user_signals(user_id, category_id, weight DESC);
-- JSONB signal data (for filtering by brand, price, etc.)
CREATE INDEX idx_signals_data ON user_signals USING GIN (signal_data);
-- Signal type (for analytics)
CREATE INDEX idx_signals_type ON user_signals(signal_type, created_at DESC);

-- ============================================
-- User Interest Profiles (ملفات اهتمامات المستخدمين)
-- Precomputed by background worker, used for fast recommendations
-- ============================================
CREATE TABLE user_interest_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  interests JSONB NOT NULL DEFAULT '[]',
  -- Example structure:
  -- [
  --   { "category": "cars", "brand": "Toyota", "price_range": [200000, 400000], "score": 25 },
  --   { "category": "phones", "brand": "Apple", "price_range": [10000, 25000], "score": 18 }
  -- ]
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Cleanup: Auto-delete old signals (> 90 days)
-- Run periodically via background worker
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM user_signals
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
