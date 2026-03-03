-- ============================================
-- Migration 033: Proper Payment Verification System
--
-- Problem: Manual payments (InstaPay, Vodafone Cash) have no real
-- verification — users self-confirm and immediately get benefits.
--
-- Solution:
-- 1. New status 'pending_verification' for unverified manual payments
-- 2. Unique amounts (with random piasters) for transfer matching
-- 3. Screenshot upload as payment proof
-- 4. Benefits only granted after admin verification
-- ============================================

-- ═══════════════════════════════════════════════════════════════════════
-- 1. UPDATE COMMISSIONS TABLE — Add verification columns
-- ═══════════════════════════════════════════════════════════════════════

-- Add unique_amount: the actual amount with random piasters for matching
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS unique_amount DECIMAL(12,2);

-- Add screenshot_url: user-uploaded proof of payment
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add admin_notes: notes from admin during verification
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update status constraint to include 'pending_verification'
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_status_check;
ALTER TABLE commissions ADD CONSTRAINT commissions_status_check
  CHECK (status IN ('pending', 'pending_verification', 'paid', 'cancelled', 'declined', 'later'));

-- Update verified_by to include new verification methods
-- (No constraint on this column, just documenting possible values:
--  'user_confirmed', 'admin_verified', 'admin_rejected', 'system', 'paymob_webhook')

-- ═══════════════════════════════════════════════════════════════════════
-- 2. UPDATE PAYMENT VERIFICATION LOG — Add new actions
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE payment_verification_log DROP CONSTRAINT IF EXISTS payment_verification_log_action_check;
ALTER TABLE payment_verification_log ADD CONSTRAINT payment_verification_log_action_check
  CHECK (action IN (
    'auto_verified', 'admin_verified', 'admin_rejected',
    'user_confirmed', 'reminder_sent', 'expired',
    'screenshot_uploaded', 'pending_verification'
  ));

-- ═══════════════════════════════════════════════════════════════════════
-- 3. INDEX FOR ADMIN REVIEW QUEUE
-- ═══════════════════════════════════════════════════════════════════════

-- Index for finding payments awaiting admin verification
CREATE INDEX IF NOT EXISTS idx_commissions_pending_verification
  ON commissions(status, created_at DESC)
  WHERE status = 'pending_verification';

-- ═══════════════════════════════════════════════════════════════════════
-- 4. UPDATE NOTIFICATION TYPES
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'chat', 'auction_bid', 'auction_outbid', 'auction_ending',
    'auction_ended', 'auction_won', 'auction_ended_no_bids',
    'favorite_price_drop', 'recommendation', 'system',
    'new_match', 'exchange_match', 'seller_interest',
    'buy_request_match', 'buyer_looking', 'buy_request_offer',
    'commission_thank_you', 'commission_reminder', 'commission_verified',
    'commission_pending_verification', 'commission_rejected'
  ));

-- ═══════════════════════════════════════════════════════════════════════
-- 5. STORAGE BUCKET FOR PAYMENT SCREENSHOTS
-- ═══════════════════════════════════════════════════════════════════════

-- Create storage bucket for payment screenshots (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-screenshots',
  'payment-screenshots',
  false,  -- Private — only accessible through admin or the uploader
  2097152,  -- 2MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS for payment screenshots bucket
CREATE POLICY "Users can upload their own payment screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-screenshots' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-screenshots' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all screenshots (via service role — no RLS policy needed)
