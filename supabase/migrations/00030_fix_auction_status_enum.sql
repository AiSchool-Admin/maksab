-- ============================================
-- Migration 030: Fix auction_status CHECK constraint
-- ============================================
-- The original schema only allowed: active, ended, bought_now, cancelled
-- But the code uses 'ended_winner' and 'ended_no_bids' for more specific statuses.
-- This migration updates the constraint to match the code.

-- Drop the old constraint
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_auction_status_check;

-- Add the updated constraint with all valid statuses
ALTER TABLE ads ADD CONSTRAINT ads_auction_status_check
  CHECK (auction_status IN ('active', 'ended', 'ended_winner', 'ended_no_bids', 'bought_now', 'cancelled'));
