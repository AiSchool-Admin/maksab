-- Unblock dubizzle scopes for server-side fetching
-- Railway confirmed working: GET /test-dubizzle → 200 + 45 articles
UPDATE ahe_scopes
SET server_fetch_blocked = false,
    server_fetch_blocked_at = NULL
WHERE source_platform = 'dubizzle';
