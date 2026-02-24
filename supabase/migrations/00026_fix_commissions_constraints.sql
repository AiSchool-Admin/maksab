-- ============================================
-- Migration 026: Fix commissions table constraints
-- 1. Allow amount >= 0 (for declined/later records)
-- 2. Add 'declined' and 'later' status values
-- 3. Add payment_ref column for tracking
-- ============================================

-- Drop old constraints
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_amount_check;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_status_check;

-- Add updated constraints
ALTER TABLE commissions ADD CONSTRAINT commissions_amount_check CHECK (amount >= 0);
ALTER TABLE commissions ADD CONSTRAINT commissions_status_check
  CHECK (status IN ('pending', 'paid', 'cancelled', 'declined', 'later'));

-- Add payment reference column (for InstaPay/Vodafone Cash transfer refs)
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payment_ref TEXT;

-- Add RLS policy for commissions if not exists
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commissions' AND policyname = 'Users can insert own commissions'
  ) THEN
    CREATE POLICY "Users can insert own commissions" ON commissions
      FOR INSERT WITH CHECK (payer_id = auth.uid());
  END IF;
END $$;

-- Users can read their own commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commissions' AND policyname = 'Users can read own commissions'
  ) THEN
    CREATE POLICY "Users can read own commissions" ON commissions
      FOR SELECT USING (payer_id = auth.uid());
  END IF;
END $$;
