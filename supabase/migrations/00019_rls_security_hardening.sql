-- ============================================
-- Migration 019: RLS Security Hardening
-- Fixes overly permissive policies found during production review
-- ============================================

-- ─── 1. store_analytics: Restrict INSERT/UPDATE to authenticated users ───

-- Drop the old overly-permissive policies
DO $$ BEGIN
  DROP POLICY IF EXISTS analytics_insert ON store_analytics;
  DROP POLICY IF EXISTS analytics_update ON store_analytics;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Recreate with auth check: only authenticated users can record analytics
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_analytics') THEN
    CREATE POLICY analytics_insert ON store_analytics FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);

    CREATE POLICY analytics_update ON store_analytics FOR UPDATE
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Revoke anon INSERT/UPDATE on store_analytics (read-only for anon)
DO $$ BEGIN
  REVOKE INSERT, UPDATE ON store_analytics FROM anon;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ─── 2. price_offers: Remove redundant public SELECT policy ─────────
-- The "Ad viewers can see offer counts" policy with USING(true)
-- makes ALL offer details (amounts, buyer_id) visible to everyone.
-- This exposes sensitive negotiation data. Remove it.

DO $$ BEGIN
  DROP POLICY IF EXISTS "Ad viewers can see offer counts" ON price_offers;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- The remaining "Offer participants can view offers" policy correctly
-- restricts SELECT to buyer_id or seller_id — which is sufficient.


-- ─── 3. reports: Require authenticated user for INSERT ──────────────
-- Current policy: WITH CHECK (true) — allows anonymous inserts
-- Fix: require auth.uid() = reporter_id

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create reports" ON reports;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
    CREATE POLICY "Users can create reports" ON reports
      FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
END $$;


-- ─── 4. store_reviews.transaction_id: Make nullable ─────────────────
-- There is no transactions table, so this NOT NULL constraint
-- prevents any reviews from being created. Make it nullable.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_reviews' AND column_name = 'transaction_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE store_reviews ALTER COLUMN transaction_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ─── 5. Verify all critical tables have RLS enabled ─────────────────
-- This is a safety net — these should already be enabled from earlier migrations

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles', 'ads', 'favorites', 'auction_bids', 'conversations', 'messages',
    'notifications', 'push_subscriptions', 'user_signals', 'commissions',
    'stores', 'store_followers', 'store_reviews', 'store_badges', 'store_analytics',
    'price_offers', 'reports', 'blocked_users', 'rate_limits'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;
