-- ============================================================
-- Bookmarklet authentication tokens
-- Each employee gets a unique token embedded in their bookmarklet
-- ============================================================

CREATE TABLE ahe_bookmarklet_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  employee_name TEXT NOT NULL,
  scope_code TEXT,  -- optional: pre-assigned scope (NULL = auto-detect)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  total_submissions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: admin-only
ALTER TABLE ahe_bookmarklet_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin-only access" ON ahe_bookmarklet_tokens
  FOR ALL USING (false);

-- Index for fast token lookup
CREATE INDEX idx_ahe_bookmarklet_tokens_token ON ahe_bookmarklet_tokens(token) WHERE is_active = TRUE;

-- RPC to increment submissions counter
CREATE OR REPLACE FUNCTION increment_bookmarklet_submissions(p_token_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ahe_bookmarklet_tokens
  SET total_submissions = total_submissions + 1,
      last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = p_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
