-- ═══ 1. Pause blocked scopes ═══
UPDATE ahe_scopes
SET is_paused = true, server_fetch_blocked = true, updated_at = NOW()
WHERE code IN ('SEM-PROP-ALEX', 'CC-CAR-ALEX');

-- ═══ 2. Add agent_name to outreach_logs for Waleed/Ahmed tracking ═══
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index for agent-specific daily counts
CREATE INDEX IF NOT EXISTS idx_outreach_logs_agent ON outreach_logs(agent_name, created_at DESC);
