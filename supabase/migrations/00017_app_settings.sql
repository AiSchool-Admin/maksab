-- App-level settings (API keys, configuration)
-- Stored securely in database so admin can manage via dashboard
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- RLS: Only admins can read/write settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- No public access at all — only service role can access
CREATE POLICY "No public access to settings" ON app_settings
  FOR ALL USING (false);
