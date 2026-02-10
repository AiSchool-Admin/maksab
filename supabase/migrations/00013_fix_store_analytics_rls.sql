-- ============================================
-- Migration 013: Fix store_analytics RLS policies
-- Allow INSERT/UPDATE for analytics recording
-- ============================================

-- Allow any authenticated user to insert analytics (recordStoreView)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_analytics' AND policyname = 'analytics_insert') THEN
    CREATE POLICY analytics_insert ON store_analytics FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow upsert (UPDATE) for analytics recording
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_analytics' AND policyname = 'analytics_update') THEN
    CREATE POLICY analytics_update ON store_analytics FOR UPDATE
      USING (true);
  END IF;
END $$;

-- Also allow anon users to read stores (ensure the policy works for anon role)
-- The existing stores_select policy should already work, but let's make sure
-- by also granting table-level SELECT to anon and authenticated roles
GRANT SELECT ON stores TO anon;
GRANT SELECT ON stores TO authenticated;
GRANT SELECT ON store_followers TO anon;
GRANT SELECT ON store_followers TO authenticated;
GRANT SELECT ON store_reviews TO anon;
GRANT SELECT ON store_reviews TO authenticated;
GRANT SELECT ON store_badges TO anon;
GRANT SELECT ON store_badges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON store_analytics TO anon;
GRANT SELECT, INSERT, UPDATE ON store_analytics TO authenticated;
