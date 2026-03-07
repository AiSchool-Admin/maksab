-- Migration 00037: Acquisition System
-- Tables for tracking seller/buyer acquisition pipeline
-- Used by: bulk-import.ts, OLX Extension, outreach tracking

-- ══════════════════════════════════════════════════════════
-- 1. Acquisition Leads Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS acquisition_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(11) NOT NULL UNIQUE,
  name VARCHAR(100),
  source VARCHAR(50) NOT NULL CHECK (
    source IN ('olx', 'facebook', 'marketplace', 'manual', 'referral', 'instagram', 'tiktok', 'whatsapp_group', 'store_visit')
  ),
  source_profile_url TEXT,
  categories TEXT[] DEFAULT '{}',
  active_ads_count INTEGER DEFAULT 0,
  seller_score INTEGER DEFAULT 0 CHECK (seller_score >= 0 AND seller_score <= 50),
  seller_tier VARCHAR(20) DEFAULT 'bronze' CHECK (
    seller_tier IN ('platinum', 'gold', 'silver', 'bronze')
  ),
  governorate VARCHAR(50),
  city VARCHAR(100),
  notes TEXT,

  -- Status tracking
  status VARCHAR(30) DEFAULT 'new' CHECK (
    status IN ('new', 'contacted', 'interested', 'registered', 'active_seller', 'declined', 'blacklist')
  ),
  contacted_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  first_ad_at TIMESTAMPTZ,
  registered_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  imported_by VARCHAR(100),
  batch_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acq_leads_status ON acquisition_leads(status);
CREATE INDEX IF NOT EXISTS idx_acq_leads_source ON acquisition_leads(source, status);
CREATE INDEX IF NOT EXISTS idx_acq_leads_tier ON acquisition_leads(seller_tier, status);
CREATE INDEX IF NOT EXISTS idx_acq_leads_batch ON acquisition_leads(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_leads_governorate ON acquisition_leads(governorate) WHERE governorate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acq_leads_created ON acquisition_leads(created_at DESC);

-- ══════════════════════════════════════════════════════════
-- 2. Acquisition Outreach Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS acquisition_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES acquisition_leads(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (
    channel IN ('whatsapp', 'sms', 'call', 'facebook_dm', 'instagram_dm', 'email')
  ),
  template_id VARCHAR(50),
  message_preview TEXT,
  status VARCHAR(20) DEFAULT 'sent' CHECK (
    status IN ('sent', 'delivered', 'read', 'replied', 'opted_out', 'failed')
  ),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  replied_at TIMESTAMPTZ,
  response_summary TEXT,
  sent_by VARCHAR(100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acq_outreach_lead ON acquisition_outreach(lead_id);
CREATE INDEX IF NOT EXISTS idx_acq_outreach_status ON acquisition_outreach(status);
CREATE INDEX IF NOT EXISTS idx_acq_outreach_sent ON acquisition_outreach(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_outreach_channel ON acquisition_outreach(channel, sent_at DESC);

-- ══════════════════════════════════════════════════════════
-- 3. Acquisition Goals Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS acquisition_goals (
  id VARCHAR(50) PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('sellers', 'buyers')),
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial goals
INSERT INTO acquisition_goals (id, target_type, target_count, deadline) VALUES
  ('sellers_1000', 'sellers', 1000, '2026-06-07'),
  ('buyers_10000', 'buyers', 10000, '2026-06-07')
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════
-- 4. RLS Policies — Admin Only
-- ══════════════════════════════════════════════════════════

ALTER TABLE acquisition_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_goals ENABLE ROW LEVEL SECURITY;

-- Only admins can access acquisition data
CREATE POLICY "Admins can manage acquisition_leads"
  ON acquisition_leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

CREATE POLICY "Admins can manage acquisition_outreach"
  ON acquisition_outreach FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

CREATE POLICY "Admins can manage acquisition_goals"
  ON acquisition_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- Service role can bypass RLS for bulk import script
-- (service_role key automatically bypasses RLS)

-- ══════════════════════════════════════════════════════════
-- 5. Helper Functions
-- ══════════════════════════════════════════════════════════

-- Update lead status when user registers
CREATE OR REPLACE FUNCTION update_lead_on_registration()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE acquisition_leads
  SET
    status = 'registered',
    registered_at = NOW(),
    registered_user_id = NEW.id,
    updated_at = NOW()
  WHERE phone = (
    SELECT phone FROM profiles WHERE id = NEW.id
  )
  AND status IN ('new', 'contacted', 'interested');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new profile creation
DROP TRIGGER IF EXISTS on_profile_created_update_lead ON profiles;
CREATE TRIGGER on_profile_created_update_lead
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_on_registration();

-- Update lead status when first ad is created
CREATE OR REPLACE FUNCTION update_lead_on_first_ad()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE acquisition_leads
  SET
    status = 'active_seller',
    first_ad_at = NOW(),
    updated_at = NOW()
  WHERE registered_user_id = NEW.user_id
  AND status = 'registered'
  AND first_ad_at IS NULL;

  -- Update goal counter
  UPDATE acquisition_goals
  SET
    current_count = (
      SELECT COUNT(DISTINCT user_id) FROM ads WHERE status = 'active'
    ),
    updated_at = NOW()
  WHERE id = 'sellers_1000';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ad_created_update_lead ON ads;
CREATE TRIGGER on_ad_created_update_lead
  AFTER INSERT ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_on_first_ad();

-- ══════════════════════════════════════════════════════════
-- 6. Acquisition Stats View
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW acquisition_stats AS
SELECT
  -- Overall counts
  (SELECT COUNT(*) FROM acquisition_leads) AS total_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE status = 'new') AS new_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE status = 'contacted') AS contacted_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE status = 'interested') AS interested_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE status = 'registered') AS registered_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE status = 'active_seller') AS active_sellers,
  (SELECT COUNT(*) FROM acquisition_leads WHERE status = 'declined') AS declined_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE status = 'blacklist') AS blacklisted_leads,

  -- By source
  (SELECT COUNT(*) FROM acquisition_leads WHERE source = 'olx') AS olx_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE source = 'facebook') AS facebook_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE source = 'marketplace') AS marketplace_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE source = 'manual') AS manual_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE source = 'referral') AS referral_leads,

  -- By tier
  (SELECT COUNT(*) FROM acquisition_leads WHERE seller_tier = 'platinum') AS platinum_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE seller_tier = 'gold') AS gold_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE seller_tier = 'silver') AS silver_leads,
  (SELECT COUNT(*) FROM acquisition_leads WHERE seller_tier = 'bronze') AS bronze_leads,

  -- Outreach stats
  (SELECT COUNT(*) FROM acquisition_outreach WHERE sent_at > NOW() - INTERVAL '24 hours') AS outreach_today,
  (SELECT COUNT(*) FROM acquisition_outreach WHERE status = 'replied') AS total_replies,
  (SELECT COUNT(*) FROM acquisition_outreach WHERE status = 'opted_out') AS total_opt_outs,

  -- Conversion rates
  CASE
    WHEN (SELECT COUNT(*) FROM acquisition_leads WHERE status != 'new') > 0
    THEN ROUND(
      (SELECT COUNT(*)::NUMERIC FROM acquisition_leads WHERE status IN ('registered', 'active_seller'))
      / (SELECT COUNT(*)::NUMERIC FROM acquisition_leads WHERE status != 'new') * 100, 1
    )
    ELSE 0
  END AS conversion_rate,

  -- Goals
  (SELECT target_count FROM acquisition_goals WHERE id = 'sellers_1000') AS seller_goal,
  (SELECT current_count FROM acquisition_goals WHERE id = 'sellers_1000') AS seller_current,
  (SELECT target_count FROM acquisition_goals WHERE id = 'buyers_10000') AS buyer_goal,
  (SELECT current_count FROM acquisition_goals WHERE id = 'buyers_10000') AS buyer_current;
