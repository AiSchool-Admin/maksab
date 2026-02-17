-- Migration 00021: Founder System + UTM Tracking
-- Supports "مؤسس مكسب" badge and visitor source tracking

-- ══════════════════════════════════════════════════════════
-- 1. Add 'founder' to user_badges allowed types
-- ══════════════════════════════════════════════════════════

-- Drop the existing check constraint and add founder
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_id_check;
ALTER TABLE user_badges ADD CONSTRAINT user_badges_badge_id_check
  CHECK (badge_id IN ('pioneer', 'supporter', 'ambassador', 'founder'));

-- ══════════════════════════════════════════════════════════
-- 2. Founder Invites Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS founder_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_phone VARCHAR(11),
  invitee_phone VARCHAR(11) NOT NULL,
  invitee_name VARCHAR(100),
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'expired')),
  registered_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_founder_invites_code ON founder_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_founder_invites_inviter ON founder_invites(inviter_phone);
CREATE INDEX IF NOT EXISTS idx_founder_invites_status ON founder_invites(status);

-- RLS
ALTER TABLE founder_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invite by code"
  ON founder_invites FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create invites"
  ON founder_invites FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update invite status"
  ON founder_invites FOR UPDATE
  USING (true);

-- ══════════════════════════════════════════════════════════
-- 3. UTM Visits Tracking Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS utm_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(200),
  utm_content VARCHAR(200),
  referrer VARCHAR(500),
  landing_page VARCHAR(500),
  user_agent TEXT,
  ip_hash VARCHAR(64),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utm_visits_source ON utm_visits(utm_source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utm_visits_campaign ON utm_visits(utm_campaign, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utm_visits_date ON utm_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utm_visits_session ON utm_visits(session_id);

-- RLS
ALTER TABLE utm_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert UTM visits"
  ON utm_visits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can read UTM data"
  ON utm_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- ══════════════════════════════════════════════════════════
-- 4. Add founder columns to profiles
-- ══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_founder'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_founder BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'founder_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN founder_number INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invited_by VARCHAR(20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invite_code VARCHAR(20) UNIQUE;
  END IF;
END $$;

-- Index for founder lookups
CREATE INDEX IF NOT EXISTS idx_profiles_founder ON profiles(is_founder) WHERE is_founder = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code) WHERE invite_code IS NOT NULL;
