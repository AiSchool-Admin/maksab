-- ============================================
-- Migration 032: InstaPay Payment Verification & Commission Reminders
--
-- Features:
-- 1. Payment verification tracking columns on commissions
-- 2. Commission reminder tracking to avoid spamming
-- 3. New notification types for payment
-- 4. Admin payment verification log
-- ============================================

-- ═══════════════════════════════════════════════════════════════════════
-- 1. PAYMENT VERIFICATION — Track InstaPay payment verification
-- ═══════════════════════════════════════════════════════════════════════

-- Add verification tracking to commissions
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS verified_by VARCHAR(50); -- 'system', 'admin', 'user_confirmed'
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS instapay_reference TEXT; -- User-provided InstaPay reference
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payment_reference TEXT; -- For Paymob order_id matching

-- Index for finding pending payments that need reminders
CREATE INDEX IF NOT EXISTS idx_commissions_pending_reminders
  ON commissions(status, created_at)
  WHERE status = 'pending';

-- Index for payment verification lookups
CREATE INDEX IF NOT EXISTS idx_commissions_verification
  ON commissions(payer_id, status, commission_type);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. NOTIFICATION TYPES — Add payment-related notification types
-- ═══════════════════════════════════════════════════════════════════════

-- Expand the notification type check constraint to include payment types
-- First drop the old constraint, then add the new one
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'chat', 'auction_bid', 'auction_outbid', 'auction_ending',
    'auction_ended', 'auction_won', 'auction_ended_no_bids',
    'favorite_price_drop', 'recommendation', 'system',
    'new_match', 'exchange_match', 'seller_interest',
    'buy_request_match', 'buyer_looking', 'buy_request_offer',
    'commission_thank_you', 'commission_reminder', 'commission_verified'
  ));

-- ═══════════════════════════════════════════════════════════════════════
-- 3. PAYMENT VERIFICATION LOG — For admin tracking
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID REFERENCES commissions(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL CHECK (action IN (
    'auto_verified', 'admin_verified', 'admin_rejected',
    'user_confirmed', 'reminder_sent', 'expired'
  )),
  notes TEXT,
  performed_by UUID, -- admin user ID or NULL for system
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_log_commission
  ON payment_verification_log(commission_id, created_at DESC);

-- RLS for payment verification log
ALTER TABLE payment_verification_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view verification log (through service role)
-- Regular users can't see this table
CREATE POLICY "Service role only for payment verification log"
  ON payment_verification_log FOR ALL
  USING (false);
