-- ═══ Human + AI Hybrid System ═══
-- Supports: escalations, daily targets, approval queue, Nora reports, human decisions

-- 1. Human Decisions Log — every decision by ممدوح gets saved
CREATE TABLE IF NOT EXISTS human_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decision_type TEXT NOT NULL,
  context TEXT,
  decision TEXT NOT NULL,
  outcome TEXT,
  admin_id UUID
);
CREATE INDEX IF NOT EXISTS idx_human_decisions_type ON human_decisions(decision_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_human_decisions_admin ON human_decisions(admin_id, created_at DESC);

-- 2. Extend admin_alerts to support escalation fields
ALTER TABLE admin_alerts
  ADD COLUMN IF NOT EXISTS conversation_id UUID,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS issue_summary TEXT,
  ADD COLUMN IF NOT EXISTS admin_response TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- 3. Daily outreach targets set by ممدوح for وليد
CREATE TABLE IF NOT EXISTS daily_outreach_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  target_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  governorate TEXT,
  tier TEXT CHECK (tier IN ('medium', 'big', 'whale')),
  message_count INTEGER NOT NULL DEFAULT 50,
  set_by UUID,
  notes TEXT,
  UNIQUE(target_date)
);

-- 4. Extend ai_daily_reports to support admin decisions
ALTER TABLE ai_daily_reports
  ADD COLUMN IF NOT EXISTS admin_decision TEXT,
  ADD COLUMN IF NOT EXISTS admin_decision_at TIMESTAMPTZ;

-- 5. Extend listing_moderation to support human approval queue
ALTER TABLE listing_moderation
  ADD COLUMN IF NOT EXISTS human_decision TEXT CHECK (human_decision IN ('approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS human_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS human_decided_by UUID;
