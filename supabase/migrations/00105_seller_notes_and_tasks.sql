-- Migration 00105: Seller notes and tasks for in-app CRM workflow
-- Allows sales agents to add notes and schedule follow-up tasks per seller

-- ─── Seller Notes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES ahe_sellers(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL DEFAULT 'system',
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_notes_seller ON seller_notes(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_notes_pinned ON seller_notes(seller_id, is_pinned) WHERE is_pinned = TRUE;

-- ─── Seller Tasks (follow-up reminders) ────────────────────────
CREATE TABLE IF NOT EXISTS seller_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES ahe_sellers(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL DEFAULT 'system',
  task_text TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_tasks_seller ON seller_tasks(seller_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_seller_tasks_pending ON seller_tasks(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_seller_tasks_agent ON seller_tasks(agent_name, status, due_at);

-- ─── RLS: Admin-only access ─────────────────────────────────────
ALTER TABLE seller_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_tasks ENABLE ROW LEVEL SECURITY;

-- Service role has full access (API uses service role key)
CREATE POLICY "Service role full access on seller_notes" ON seller_notes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on seller_tasks" ON seller_tasks
  FOR ALL USING (true) WITH CHECK (true);

-- ─── Helpful view: seller_full_view ─────────────────────────────
-- Provides a single query for the Seller 360 page
CREATE OR REPLACE VIEW seller_full_view AS
SELECT
  s.id,
  s.name,
  s.phone,
  s.primary_category,
  s.primary_governorate,
  s.source_platform,
  s.detected_account_type,
  s.pipeline_status,
  s.total_listings_seen,
  s.active_listings,
  s.whale_score,
  s.priority_score,
  s.buy_probability_score,
  s.outreach_count,
  s.first_outreach_at,
  s.last_outreach_at,
  s.last_response_at,
  s.notes as legacy_notes,
  s.rejection_reason,
  s.created_at,
  s.updated_at,
  -- Counts
  (SELECT COUNT(*) FROM ahe_listings WHERE ahe_seller_id = s.id AND is_duplicate = false) as listings_count,
  (SELECT COUNT(*) FROM outreach_logs WHERE seller_id = s.id) as outreach_logs_count,
  (SELECT COUNT(*) FROM seller_notes WHERE seller_id = s.id) as notes_count,
  (SELECT COUNT(*) FROM seller_tasks WHERE seller_id = s.id AND status = 'pending') as pending_tasks_count
FROM ahe_sellers s;

COMMENT ON TABLE seller_notes IS 'Agent-added notes per seller for collaborative sales workflow';
COMMENT ON TABLE seller_tasks IS 'Scheduled follow-up tasks per seller (call tomorrow, email next week, etc.)';
COMMENT ON VIEW seller_full_view IS 'Unified view for Seller 360 page — single query gets all seller data';
