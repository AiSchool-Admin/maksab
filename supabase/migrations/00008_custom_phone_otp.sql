-- Custom phone OTP table for free phone verification
-- Instead of relying on Supabase Phone Auth (which requires Twilio/paid SMS),
-- we generate and verify OTP codes ourselves.

CREATE TABLE IF NOT EXISTS phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(11) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by phone + code
CREATE INDEX idx_phone_otps_lookup ON phone_otps(phone, code, expires_at DESC);

-- Index for cleanup of expired codes
CREATE INDEX idx_phone_otps_expires ON phone_otps(expires_at);

-- Rate limiting: max 5 OTPs per phone per hour
CREATE INDEX idx_phone_otps_rate ON phone_otps(phone, created_at DESC);

-- Auto-cleanup: delete expired OTPs older than 1 hour (run via cron)
-- This keeps the table small and fast

-- RLS: Only server-side (service role) should access this table
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- No public access at all — only service_role key can read/write
-- This ensures OTP codes are never exposed to the client
