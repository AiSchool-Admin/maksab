-- ══════════════════════════════════════════════════════════
-- MIGRATION 37: CRM RLS — Admin Only Access
-- تأمين جداول CRM بحيث admin فقط يقدر يوصلها
-- Uses service_role key (bypasses RLS) for API routes
-- Regular authenticated users get NO access to CRM tables
-- ══════════════════════════════════════════════════════════

-- Drop all existing permissive CRM policies
DROP POLICY IF EXISTS "crm_agents_read" ON crm_agents;
DROP POLICY IF EXISTS "crm_agents_write" ON crm_agents;
DROP POLICY IF EXISTS "crm_customers_read" ON crm_customers;
DROP POLICY IF EXISTS "crm_customers_write" ON crm_customers;
DROP POLICY IF EXISTS "crm_conversations_read" ON crm_conversations;
DROP POLICY IF EXISTS "crm_conversations_write" ON crm_conversations;
DROP POLICY IF EXISTS "crm_campaigns_read" ON crm_campaigns;
DROP POLICY IF EXISTS "crm_campaigns_write" ON crm_campaigns;
DROP POLICY IF EXISTS "crm_templates_read" ON crm_message_templates;
DROP POLICY IF EXISTS "crm_templates_write" ON crm_message_templates;
DROP POLICY IF EXISTS "crm_promotions_read" ON crm_promotions;
DROP POLICY IF EXISTS "crm_promotions_write" ON crm_promotions;
DROP POLICY IF EXISTS "crm_loyalty_read" ON crm_loyalty_transactions;
DROP POLICY IF EXISTS "crm_loyalty_write" ON crm_loyalty_transactions;
DROP POLICY IF EXISTS "crm_listing_assists_read" ON crm_listing_assists;
DROP POLICY IF EXISTS "crm_listing_assists_write" ON crm_listing_assists;
DROP POLICY IF EXISTS "crm_activity_read" ON crm_activity_log;
DROP POLICY IF EXISTS "crm_activity_write" ON crm_activity_log;
DROP POLICY IF EXISTS "crm_competitor_read" ON crm_competitor_sources;
DROP POLICY IF EXISTS "crm_competitor_write" ON crm_competitor_sources;
DROP POLICY IF EXISTS "crm_referrals_read" ON crm_referrals;
DROP POLICY IF EXISTS "crm_referrals_write" ON crm_referrals;
DROP POLICY IF EXISTS "crm_metrics_read" ON crm_daily_metrics;
DROP POLICY IF EXISTS "crm_metrics_write" ON crm_daily_metrics;
DROP POLICY IF EXISTS "crm_sub_history_read" ON crm_subscription_history;
DROP POLICY IF EXISTS "crm_sub_history_write" ON crm_subscription_history;

-- ══════════════════════════════════════════════════════════
-- Helper function: check if user is an admin
-- Checks if the user's phone is in the admin phones list
-- stored in app_settings table
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION is_crm_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_phone TEXT;
  admin_phones TEXT[];
BEGIN
  -- Get current user's phone from profiles
  SELECT phone INTO user_phone
  FROM profiles
  WHERE id = auth.uid();

  IF user_phone IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get admin phones from app_settings
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(value::jsonb)
    FROM app_settings
    WHERE key = 'admin_phones'
  ) INTO admin_phones;

  IF admin_phones IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN user_phone = ANY(admin_phones);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════
-- New restrictive policies: admin-only access
-- service_role bypasses RLS automatically
-- ══════════════════════════════════════════════════════════

-- crm_agents
CREATE POLICY "crm_agents_admin_select" ON crm_agents
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_agents_admin_insert" ON crm_agents
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_agents_admin_update" ON crm_agents
  FOR UPDATE USING (is_crm_admin());
CREATE POLICY "crm_agents_admin_delete" ON crm_agents
  FOR DELETE USING (is_crm_admin());

-- crm_customers
CREATE POLICY "crm_customers_admin_select" ON crm_customers
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_customers_admin_insert" ON crm_customers
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_customers_admin_update" ON crm_customers
  FOR UPDATE USING (is_crm_admin());
CREATE POLICY "crm_customers_admin_delete" ON crm_customers
  FOR DELETE USING (is_crm_admin());

-- crm_conversations
CREATE POLICY "crm_conversations_admin_select" ON crm_conversations
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_conversations_admin_insert" ON crm_conversations
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_conversations_admin_update" ON crm_conversations
  FOR UPDATE USING (is_crm_admin());
CREATE POLICY "crm_conversations_admin_delete" ON crm_conversations
  FOR DELETE USING (is_crm_admin());

-- crm_campaigns
CREATE POLICY "crm_campaigns_admin_select" ON crm_campaigns
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_campaigns_admin_insert" ON crm_campaigns
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_campaigns_admin_update" ON crm_campaigns
  FOR UPDATE USING (is_crm_admin());
CREATE POLICY "crm_campaigns_admin_delete" ON crm_campaigns
  FOR DELETE USING (is_crm_admin());

-- crm_message_templates
CREATE POLICY "crm_templates_admin_select" ON crm_message_templates
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_templates_admin_insert" ON crm_message_templates
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_templates_admin_update" ON crm_message_templates
  FOR UPDATE USING (is_crm_admin());
CREATE POLICY "crm_templates_admin_delete" ON crm_message_templates
  FOR DELETE USING (is_crm_admin());

-- crm_promotions
CREATE POLICY "crm_promotions_admin_select" ON crm_promotions
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_promotions_admin_insert" ON crm_promotions
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_promotions_admin_update" ON crm_promotions
  FOR UPDATE USING (is_crm_admin());
CREATE POLICY "crm_promotions_admin_delete" ON crm_promotions
  FOR DELETE USING (is_crm_admin());

-- crm_loyalty_transactions
CREATE POLICY "crm_loyalty_admin_select" ON crm_loyalty_transactions
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_loyalty_admin_insert" ON crm_loyalty_transactions
  FOR INSERT WITH CHECK (is_crm_admin());

-- crm_listing_assists
CREATE POLICY "crm_listing_assists_admin_select" ON crm_listing_assists
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_listing_assists_admin_insert" ON crm_listing_assists
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_listing_assists_admin_update" ON crm_listing_assists
  FOR UPDATE USING (is_crm_admin());

-- crm_activity_log
CREATE POLICY "crm_activity_admin_select" ON crm_activity_log
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_activity_admin_insert" ON crm_activity_log
  FOR INSERT WITH CHECK (is_crm_admin());

-- crm_competitor_sources
CREATE POLICY "crm_competitor_admin_select" ON crm_competitor_sources
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_competitor_admin_insert" ON crm_competitor_sources
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_competitor_admin_update" ON crm_competitor_sources
  FOR UPDATE USING (is_crm_admin());
CREATE POLICY "crm_competitor_admin_delete" ON crm_competitor_sources
  FOR DELETE USING (is_crm_admin());

-- crm_referrals
CREATE POLICY "crm_referrals_admin_select" ON crm_referrals
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_referrals_admin_insert" ON crm_referrals
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_referrals_admin_update" ON crm_referrals
  FOR UPDATE USING (is_crm_admin());

-- crm_daily_metrics
CREATE POLICY "crm_metrics_admin_select" ON crm_daily_metrics
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_metrics_admin_insert" ON crm_daily_metrics
  FOR INSERT WITH CHECK (is_crm_admin());
CREATE POLICY "crm_metrics_admin_update" ON crm_daily_metrics
  FOR UPDATE USING (is_crm_admin());

-- crm_subscription_history
CREATE POLICY "crm_sub_history_admin_select" ON crm_subscription_history
  FOR SELECT USING (is_crm_admin());
CREATE POLICY "crm_sub_history_admin_insert" ON crm_subscription_history
  FOR INSERT WITH CHECK (is_crm_admin());
