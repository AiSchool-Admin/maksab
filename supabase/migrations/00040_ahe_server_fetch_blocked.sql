-- Add server_fetch_blocked to ahe_scopes
-- When a scope returns 403, it's marked as blocked and skipped by cron.
-- The Bookmarklet is the alternative for blocked scopes.

ALTER TABLE ahe_scopes
  ADD COLUMN IF NOT EXISTS server_fetch_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS server_fetch_blocked_at TIMESTAMPTZ;
