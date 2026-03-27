-- ══════════════════════════════════════════════
-- Migration 00094: Acquisition Engine tables
-- محرك الاستحواذ الموحد — يدوي + تلقائي
-- ══════════════════════════════════════════════

-- 1. Engine config per asset type
CREATE TABLE IF NOT EXISTS acquisition_engine_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL,
  mode TEXT DEFAULT 'manual' CHECK (mode IN ('auto', 'manual')),
  whatsapp_api_enabled BOOLEAN DEFAULT false,
  whatsapp_api_token TEXT,
  whatsapp_phone_id TEXT,
  daily_target INTEGER DEFAULT 50,
  auto_followup_hours INTEGER DEFAULT 48,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO acquisition_engine_config (asset_type, mode, daily_target) VALUES
('cars', 'manual', 50),
('properties', 'manual', 50)
ON CONFLICT DO NOTHING;

-- 2. Message queue
CREATE TABLE IF NOT EXISTS acquisition_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES ahe_sellers(id) ON DELETE CASCADE,
  asset_type TEXT,
  message_number INTEGER DEFAULT 1,
  message_text TEXT,
  magic_link TEXT,
  template_id UUID,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled', 'skipped')),
  mode TEXT DEFAULT 'manual',
  agent_name TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acq_queue_status ON acquisition_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_acq_queue_seller ON acquisition_queue(seller_id);

-- 3. Extend outreach_logs
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'manual';
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS message_number INTEGER DEFAULT 1;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS followup_scheduled_at TIMESTAMPTZ;

-- 4. AI Insights (future)
CREATE TABLE IF NOT EXISTS acquisition_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT,
  insight_type TEXT,
  insight_data JSONB DEFAULT '{}',
  confidence_score NUMERIC,
  generated_at TIMESTAMPTZ DEFAULT now()
);
