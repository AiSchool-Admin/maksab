-- ═══ AI Team Sprint — Database Tables ═══
-- Tables for tracking AI agent interactions, listing moderation, reports, and alerts

-- AI Interactions: tracks all AI agent (Sara/Waleed/Mazen/Nora) conversations
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  agent TEXT NOT NULL CHECK (agent IN ('sara', 'waleed', 'mazen', 'nora')),
  source TEXT NOT NULL,
  user_message TEXT,
  ai_response TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  outcome TEXT DEFAULT 'pending' CHECK (outcome IN (
    'registered','listed_item','subscribed',
    'resolved','escalated','abandoned','pending'
  )),
  conversation_id UUID,
  user_id UUID REFERENCES auth.users(id),
  user_phone TEXT,
  city TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Listing Moderation: AI-powered review decisions for new ads
CREATE TABLE IF NOT EXISTS listing_moderation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  listing_id UUID NOT NULL,
  decision TEXT CHECK (decision IN ('approve', 'reject', 'review')),
  fraud_score INTEGER DEFAULT 0,
  confidence DECIMAL DEFAULT 0,
  reasons TEXT[] DEFAULT '{}',
  ai_model TEXT DEFAULT 'rule_based',
  response_time_ms INTEGER,
  human_override TEXT,
  human_override_reason TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Daily Reports: aggregated daily analytics
CREATE TABLE IF NOT EXISTS ai_daily_reports (
  date DATE PRIMARY KEY,
  report_text TEXT NOT NULL,
  raw_data JSONB DEFAULT '{}',
  sent_to_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Alerts: real-time alerts from AI agents
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  message TEXT NOT NULL,
  listing_id UUID,
  user_id UUID,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ai_interactions_agent ON ai_interactions(agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_outcome ON ai_interactions(outcome);
CREATE INDEX IF NOT EXISTS idx_listing_moderation_decision ON listing_moderation(decision, fraud_score);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_priority ON admin_alerts(priority, resolved);
