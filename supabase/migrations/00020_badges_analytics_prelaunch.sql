-- Migration 00020: Badges, Analytics, and Pre-launch Tables
-- Supports the marketing features: badges, analytics tracking, and pre-launch signups

-- ══════════════════════════════════════════════════════════
-- 1. User Badges Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id VARCHAR(50) NOT NULL CHECK (badge_id IN ('pioneer', 'supporter', 'ambassador')),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Indexes for badge lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_id);

-- RLS for user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
  ON user_badges FOR SELECT
  USING (true);

CREATE POLICY "System can insert badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- 2. Analytics Events Table
-- ══════════════════════════════════════════════════════════

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

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at DESC);

-- RLS for analytics — insert only, no read from client
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can read analytics"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- ══════════════════════════════════════════════════════════
-- 3. Pre-launch Signups Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pre_launch_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(11) NOT NULL UNIQUE,
  referral_code VARCHAR(50),
  referred_by_code VARCHAR(50),
  user_referral_code VARCHAR(50) UNIQUE,
  signed_up_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_prelaunch_referral ON pre_launch_signups(referred_by_code);
CREATE INDEX IF NOT EXISTS idx_prelaunch_user_code ON pre_launch_signups(user_referral_code);

-- RLS for pre-launch signups
ALTER TABLE pre_launch_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can sign up for pre-launch"
  ON pre_launch_signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view pre-launch signups"
  ON pre_launch_signups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- ══════════════════════════════════════════════════════════
-- 4. Loyalty Referrals Table (for server-side referral tracking)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS loyalty_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL UNIQUE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'posted_ad', 'active')),
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_referrals_referrer ON loyalty_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_referrals_code ON loyalty_referrals(referral_code);

ALTER TABLE loyalty_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON loyalty_referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referral codes"
  ON loyalty_referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- ══════════════════════════════════════════════════════════
-- 5. Loyalty Points Table (for server-side point tracking)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  reference_id VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points(user_id, created_at DESC);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
  ON loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can earn points"
  ON loyalty_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- 6. Add loyalty columns to profiles (if not exists)
-- ══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'loyalty_points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN loyalty_points INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'loyalty_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN loyalty_level VARCHAR(20) DEFAULT 'member';
  END IF;
END $$;
