-- ============================================
-- Security Fixes Migration
-- 1. Add RLS to search_queries table
-- 2. Add explicit policies for rate_limits table
-- ============================================

-- 1. Enable RLS on search_queries (was missing — privacy issue)
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own search queries
CREATE POLICY "Users can view own search queries"
  ON search_queries FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own search queries
CREATE POLICY "Users can insert own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Service role can access all (for trending/analytics)
-- (Service role bypasses RLS automatically)

-- Allow anonymous search logging (user_id IS NULL for unauthenticated searches)
CREATE POLICY "Allow anonymous search logging"
  ON search_queries FOR INSERT
  WITH CHECK (user_id IS NULL);

-- 2. Document rate_limits: RLS enabled, no policies = DENY ALL (by design)
-- rate_limits is only accessed via service role in server-side API routes.
-- This is intentional — no client access needed.
COMMENT ON TABLE rate_limits IS 'Rate limiting records. RLS enabled with no client policies by design — server-only access via service role.';

-- 3. Document phone_otps: RLS enabled, no policies = DENY ALL (by design)
COMMENT ON TABLE phone_otps IS 'Phone OTP records. RLS enabled with no client policies by design — server-only access via service role.';
