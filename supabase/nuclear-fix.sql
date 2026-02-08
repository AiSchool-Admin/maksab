-- ============================================
-- مكسب — NUCLEAR FIX
-- This drops ALL tables and lets complete-setup.sql recreate them
-- Run this FIRST, then run complete-setup.sql
-- ============================================

-- Drop all tables in correct order (respecting FK dependencies)
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_interest_profiles CASCADE;
DROP TABLE IF EXISTS user_signals CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS auction_bids CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS ads CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS governorates CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop any triggers/functions that might reference old table
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_signals() CASCADE;

-- Verify everything is clean
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    RAISE NOTICE 'Still exists: %', tbl.table_name;
  END LOOP;
  RAISE NOTICE '✅ Cleanup done — now run complete-setup.sql';
END $$;
