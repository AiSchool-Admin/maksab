-- Ensure server_fetch_blocked column exists and has no NULLs
-- This fixes the issue where .eq('server_fetch_blocked', false) returns 0 results
-- because the column might not exist or rows have NULL values.

ALTER TABLE ahe_scopes
  ADD COLUMN IF NOT EXISTS server_fetch_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS server_fetch_blocked_at TIMESTAMPTZ;

-- Set any NULL values to FALSE so the default filter works
UPDATE ahe_scopes
  SET server_fetch_blocked = FALSE
  WHERE server_fetch_blocked IS NULL;

-- Add NOT NULL constraint with default to prevent future NULLs
ALTER TABLE ahe_scopes
  ALTER COLUMN server_fetch_blocked SET DEFAULT FALSE,
  ALTER COLUMN server_fetch_blocked SET NOT NULL;
