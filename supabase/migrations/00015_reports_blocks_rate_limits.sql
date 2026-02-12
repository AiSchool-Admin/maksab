-- Migration 00015: Reports, Blocks, and Rate Limiting
-- Phase 1: Critical fixes and legal essentials

-- ============================================
-- 1. REPORTS TABLE (Report ads/users)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- What is being reported (ad or user)
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('ad', 'user')),
  target_ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Reason
  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'spam',           -- محتوى مكرر أو سبام
    'fake',           -- إعلان وهمي أو احتيال
    'offensive',      -- محتوى مسيء أو غير لائق
    'wrong_category', -- قسم خاطئ
    'wrong_price',    -- سعر غير واقعي
    'stolen_photos',  -- صور مسروقة
    'prohibited',     -- منتج محظور
    'harassment',     -- تحرش أو إزعاج
    'scam',           -- نصب واحتيال
    'other'           -- سبب تاني
  )),
  details TEXT,       -- تفاصيل إضافية من المستخدم
  -- Admin review
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate reports
  CONSTRAINT unique_report UNIQUE (reporter_id, target_type, COALESCE(target_ad_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(target_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_target_ad ON reports(target_ad_id) WHERE target_ad_id IS NOT NULL;
CREATE INDEX idx_reports_target_user ON reports(target_user_id) WHERE target_user_id IS NOT NULL;

-- RLS for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can see own reports" ON reports
  FOR SELECT USING (reporter_id = auth.uid());

-- ============================================
-- 2. BLOCKED USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_blocked ON blocked_users(blocked_id);

-- RLS for blocked_users
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks" ON blocked_users
  FOR ALL USING (blocker_id = auth.uid());

CREATE POLICY "Users can see if they are blocked" ON blocked_users
  FOR SELECT USING (blocked_id = auth.uid());

-- ============================================
-- 3. RATE LIMITING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(100) NOT NULL,  -- phone number or user_id
  action VARCHAR(30) NOT NULL CHECK (action IN ('otp_send', 'ad_create', 'report', 'message')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, action, created_at DESC);

-- Auto-cleanup: delete rate limit records older than 24 hours
-- (will be called periodically by a background worker or Supabase cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier VARCHAR,
  p_action VARCHAR,
  p_max_count INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  RETURN v_count < p_max_count;
END;
$$ LANGUAGE plpgsql;

-- Record rate limit usage
CREATE OR REPLACE FUNCTION record_rate_limit(
  p_identifier VARCHAR,
  p_action VARCHAR
) RETURNS void AS $$
BEGIN
  INSERT INTO rate_limits (identifier, action) VALUES (p_identifier, p_action);
END;
$$ LANGUAGE plpgsql;

-- RLS for rate_limits (service role only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. SOFT DELETE for profiles (account deletion)
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- When a profile is soft-deleted, anonymize personal data
CREATE OR REPLACE FUNCTION anonymize_deleted_profile() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    NEW.display_name := 'مستخدم محذوف';
    NEW.avatar_url := NULL;
    NEW.bio := NULL;
    NEW.deleted_at := NOW();
    -- Mark all active ads as deleted
    UPDATE ads SET status = 'deleted' WHERE user_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_anonymize_deleted_profile ON profiles;
CREATE TRIGGER trigger_anonymize_deleted_profile
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_deleted_profile();
