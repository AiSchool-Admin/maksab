-- ══════════════════════════════════════════════════════════
-- MAKSAB CRM v2.0 — Core Tables (Sprint 1)
-- 13 جداول CRM + Indexes + Triggers + RLS
-- ══════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════
-- TABLE 4 (created first due to FK dependencies): crm_agents
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  employee_id TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  permissions JSONB DEFAULT '[]',
  specialties TEXT[] DEFAULT '{}',
  assigned_governorates TEXT[] DEFAULT '{}',
  max_customers INTEGER DEFAULT 500,
  current_customers_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  last_online_at TIMESTAMPTZ,
  current_status TEXT DEFAULT 'available',
  performance JSONB DEFAULT '{}',
  monthly_targets JSONB DEFAULT '{
    "customers_to_acquire": 100,
    "customers_to_activate": 50,
    "response_time_max_minutes": 5,
    "satisfaction_min_rating": 4.5,
    "listings_to_assist": 80,
    "revenue_target_egp": 10000
  }',
  base_salary_egp NUMERIC DEFAULT 0,
  compensation_structure JSONB DEFAULT '{
    "per_acquisition_egp": 5,
    "per_activation_egp": 10,
    "per_listing_assisted_egp": 2,
    "per_retained_customer_egp": 3,
    "per_subscription_sold_pct": 10,
    "per_upsell_completed_egp": 25,
    "monthly_target_bonus_egp": 500,
    "quality_bonus_egp": 200,
    "quality_bonus_min_rating": 4.5,
    "top_performer_bonus_egp": 1000
  }',
  total_earned_egp NUMERIC DEFAULT 0,
  current_month_earned_egp NUMERIC DEFAULT 0,
  work_schedule JSONB DEFAULT '{
    "sunday": {"start": "09:00", "end": "17:00"},
    "monday": {"start": "09:00", "end": "17:00"},
    "tuesday": {"start": "09:00", "end": "17:00"},
    "wednesday": {"start": "09:00", "end": "17:00"},
    "thursday": {"start": "09:00", "end": "17:00"},
    "friday": null,
    "saturday": null
  }',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- TABLE 1: crm_customers — الجدول الرئيسي
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  display_name TEXT,
  phone TEXT UNIQUE NOT NULL,
  phone_verified BOOLEAN DEFAULT false,
  whatsapp TEXT,
  whatsapp_verified BOOLEAN DEFAULT false,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  national_id TEXT,
  account_type TEXT NOT NULL DEFAULT 'individual',
  role TEXT NOT NULL DEFAULT 'both',
  is_verified BOOLEAN DEFAULT false,
  verification_level TEXT DEFAULT 'none',
  business_name TEXT,
  business_name_ar TEXT,
  business_license_number TEXT,
  tax_id TEXT,
  business_category TEXT,
  business_description TEXT,
  business_logo_url TEXT,
  business_cover_url TEXT,
  website_url TEXT,
  subscription_plan TEXT DEFAULT 'free',
  subscription_billing TEXT DEFAULT 'none',
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  subscription_auto_renew BOOLEAN DEFAULT true,
  max_active_listings INTEGER DEFAULT 5,
  max_featured_listings INTEGER DEFAULT 0,
  governorate TEXT,
  city TEXT,
  area TEXT,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  primary_category TEXT,
  secondary_categories TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'organic',
  source_detail TEXT,
  source_url TEXT,
  source_platform TEXT,
  referral_code TEXT,
  referred_by UUID REFERENCES crm_customers(id),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  lifecycle_stage TEXT DEFAULT 'lead',
  lifecycle_changed_at TIMESTAMPTZ DEFAULT now(),
  lifecycle_history JSONB DEFAULT '[]',
  acquisition_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  value_score INTEGER DEFAULT 0,
  churn_risk_score INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 0,
  scores_updated_at TIMESTAMPTZ,
  total_listings INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_exchanges INTEGER DEFAULT 0,
  total_auctions_created INTEGER DEFAULT 0,
  total_auctions_won INTEGER DEFAULT 0,
  total_views_received INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  avg_listing_quality_score NUMERIC(3,1),
  total_gmv_egp NUMERIC DEFAULT 0,
  total_commission_paid_egp NUMERIC DEFAULT 0,
  commission_payment_rate NUMERIC(5,2) DEFAULT 0,
  is_commission_supporter BOOLEAN DEFAULT false,
  last_commission_paid_at TIMESTAMPTZ,
  total_subscription_paid_egp NUMERIC DEFAULT 0,
  total_addons_paid_egp NUMERIC DEFAULT 0,
  total_featured_purchased INTEGER DEFAULT 0,
  total_boosts_purchased INTEGER DEFAULT 0,
  preferred_channel TEXT DEFAULT 'whatsapp',
  preferred_language TEXT DEFAULT 'ar',
  notification_enabled BOOLEAN DEFAULT true,
  marketing_consent BOOLEAN DEFAULT true,
  marketing_consent_at TIMESTAMPTZ,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  do_not_contact BOOLEAN DEFAULT false,
  do_not_contact_reason TEXT,
  outreach_attempts INTEGER DEFAULT 0,
  last_outreach_at TIMESTAMPTZ,
  last_outreach_channel TEXT,
  last_response_at TIMESTAMPTZ,
  last_response_sentiment TEXT,
  last_active_at TIMESTAMPTZ,
  last_app_open_at TIMESTAMPTZ,
  last_listing_posted_at TIMESTAMPTZ,
  last_transaction_at TIMESTAMPTZ,
  first_listing_at TIMESTAMPTZ,
  first_transaction_at TIMESTAMPTZ,
  app_sessions_count INTEGER DEFAULT 0,
  days_since_last_active INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (now() - COALESCE(last_active_at, created_at)))
  ) STORED,
  assigned_agent_id UUID REFERENCES crm_agents(id),
  assigned_at TIMESTAMPTZ,
  loyalty_tier TEXT DEFAULT 'bronze',
  loyalty_points INTEGER DEFAULT 0,
  loyalty_points_lifetime INTEGER DEFAULT 0,
  loyalty_tier_upgraded_at TIMESTAMPTZ,
  lifetime_value_egp NUMERIC DEFAULT 0,
  competitor_profiles JSONB DEFAULT '{}',
  estimated_competitor_listings INTEGER DEFAULT 0,
  migrated_from TEXT,
  tags TEXT[] DEFAULT '{}',
  internal_notes TEXT,
  app_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══ crm_customers INDEXES ══
CREATE INDEX IF NOT EXISTS idx_crm_cust_lifecycle ON crm_customers(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_cust_category ON crm_customers(primary_category);
CREATE INDEX IF NOT EXISTS idx_crm_cust_gov ON crm_customers(governorate);
CREATE INDEX IF NOT EXISTS idx_crm_cust_health ON crm_customers(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_cust_source ON crm_customers(source);
CREATE INDEX IF NOT EXISTS idx_crm_cust_agent ON crm_customers(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_cust_loyalty ON crm_customers(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_crm_cust_churn ON crm_customers(churn_risk_score DESC) WHERE lifecycle_stage = 'at_risk';
CREATE INDEX IF NOT EXISTS idx_crm_cust_phone ON crm_customers(phone);
CREATE INDEX IF NOT EXISTS idx_crm_cust_active ON crm_customers(last_active_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_crm_cust_sub ON crm_customers(subscription_plan) WHERE account_type != 'individual';
CREATE INDEX IF NOT EXISTS idx_crm_cust_commission ON crm_customers(is_commission_supporter) WHERE is_commission_supporter = true;
CREATE INDEX IF NOT EXISTS idx_crm_cust_type ON crm_customers(account_type, role);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crm_customers_updated
  BEFORE UPDATE ON crm_customers
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- ══════════════════════════════════════════════════════════
-- TABLE 3: crm_campaigns (created before conversations due to FK)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL,
  target_filters JSONB NOT NULL DEFAULT '{}',
  messages JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  daily_send_limit INTEGER DEFAULT 500,
  hourly_send_limit INTEGER DEFAULT 50,
  send_window_start TIME DEFAULT '09:00',
  send_window_end TIME DEFAULT '21:00',
  send_timezone TEXT DEFAULT 'Africa/Cairo',
  min_gap_between_messages_seconds INTEGER DEFAULT 15,
  max_messages_per_customer_per_week INTEGER DEFAULT 3,
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_variants JSONB,
  stats JSONB DEFAULT '{
    "targeted": 0, "queued": 0, "sent": 0, "delivered": 0,
    "read": 0, "responded": 0, "positive_responses": 0,
    "negative_responses": 0, "converted": 0, "unsubscribed": 0,
    "failed": 0, "blocked": 0, "response_rate_pct": 0,
    "conversion_rate_pct": 0, "cost_egp": 0,
    "cost_per_acquisition_egp": 0, "revenue_generated_egp": 0, "roi_pct": 0
  }',
  created_by UUID REFERENCES crm_agents(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- TABLE 2: crm_conversations — صندوق الوارد الموحد
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  content_translated TEXT,
  media_urls TEXT[],
  template_id TEXT,
  status TEXT DEFAULT 'sent',
  campaign_id UUID REFERENCES crm_campaigns(id),
  agent_id UUID REFERENCES crm_agents(id),
  is_automated BOOLEAN DEFAULT false,
  sentiment TEXT,
  intent TEXT,
  ai_suggested_response TEXT,
  requires_human_response BOOLEAN DEFAULT false,
  external_message_id TEXT,
  external_status TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_customer ON crm_conversations(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_agent ON crm_conversations(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_queue ON crm_conversations(status, scheduled_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_conv_unread ON crm_conversations(customer_id, status) WHERE direction = 'inbound' AND status != 'replied';
CREATE INDEX IF NOT EXISTS idx_conv_campaign ON crm_conversations(campaign_id) WHERE campaign_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════
-- TABLE 5: crm_message_templates
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_message_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL,
  category TEXT,
  campaign_type TEXT,
  language TEXT DEFAULT 'ar',
  subject TEXT,
  body TEXT NOT NULL,
  media_url TEXT,
  wa_template_name TEXT,
  wa_template_status TEXT DEFAULT 'pending',
  wa_template_category TEXT,
  times_sent INTEGER DEFAULT 0,
  times_delivered INTEGER DEFAULT 0,
  times_read INTEGER DEFAULT 0,
  times_responded INTEGER DEFAULT 0,
  times_converted INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- TABLE 6: crm_promotions
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_ar TEXT,
  promo_type TEXT NOT NULL,
  value_type TEXT,
  value_amount NUMERIC,
  target_lifecycle_stages TEXT[] DEFAULT '{}',
  target_loyalty_tiers TEXT[] DEFAULT '{}',
  target_categories TEXT[] DEFAULT '{}',
  target_account_types TEXT[] DEFAULT '{}',
  target_subscription_plans TEXT[] DEFAULT '{}',
  min_listings INTEGER DEFAULT 0,
  min_transactions INTEGER DEFAULT 0,
  min_tenure_days INTEGER DEFAULT 0,
  new_customers_only BOOLEAN DEFAULT false,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  max_redemptions INTEGER,
  max_per_customer INTEGER DEFAULT 1,
  current_redemptions INTEGER DEFAULT 0,
  promo_code TEXT UNIQUE,
  auto_trigger BOOLEAN DEFAULT false,
  trigger_event TEXT,
  trigger_conditions JSONB,
  banner_image_url TEXT,
  display_priority INTEGER DEFAULT 0,
  show_in_app BOOLEAN DEFAULT true,
  show_in_notification BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- TABLE 7: crm_loyalty_transactions
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON crm_loyalty_transactions(customer_id, created_at DESC);

-- ══════════════════════════════════════════════════════════
-- TABLE 8: crm_listing_assists
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_listing_assists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) NOT NULL,
  agent_id UUID REFERENCES crm_agents(id),
  assist_type TEXT NOT NULL,
  source_url TEXT,
  source_platform TEXT,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  approved_items INTEGER DEFAULT 0,
  published_items INTEGER DEFAULT 0,
  rejected_items INTEGER DEFAULT 0,
  raw_data JSONB,
  processed_data JSONB,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════
-- TABLE 9: crm_activity_log
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  agent_id UUID REFERENCES crm_agents(id),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_customer ON crm_activity_log(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON crm_activity_log(activity_type, created_at DESC);

-- ══════════════════════════════════════════════════════════
-- TABLE 10: crm_competitor_sources
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_competitor_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  category TEXT,
  governorate TEXT,
  city TEXT,
  estimated_sellers INTEGER,
  estimated_active_sellers INTEGER,
  estimated_listings INTEGER,
  estimated_monthly_transactions INTEGER,
  activity_level TEXT,
  posting_frequency TEXT,
  is_monitored BOOLEAN DEFAULT true,
  monitoring_priority INTEGER DEFAULT 5,
  last_checked_at TIMESTAMPTZ,
  sellers_discovered INTEGER DEFAULT 0,
  sellers_acquired INTEGER DEFAULT 0,
  acquisition_rate NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- TABLE 11: crm_referrals
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES crm_customers(id) NOT NULL,
  referrer_code TEXT NOT NULL,
  referred_phone TEXT,
  referred_name TEXT,
  referred_customer_id UUID REFERENCES crm_customers(id),
  status TEXT DEFAULT 'pending',
  referrer_reward_type TEXT,
  referrer_reward_amount NUMERIC,
  referrer_reward_granted BOOLEAN DEFAULT false,
  referred_reward_type TEXT,
  referred_reward_granted BOOLEAN DEFAULT false,
  channel TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════
-- TABLE 12: crm_daily_metrics
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  new_leads INTEGER DEFAULT 0,
  new_qualified INTEGER DEFAULT 0,
  new_contacted INTEGER DEFAULT 0,
  new_interested INTEGER DEFAULT 0,
  new_onboarding INTEGER DEFAULT 0,
  new_activated INTEGER DEFAULT 0,
  acquisition_conversion_rate NUMERIC(5,2),
  daily_active_users INTEGER DEFAULT 0,
  monthly_active_users INTEGER DEFAULT 0,
  listings_posted INTEGER DEFAULT 0,
  listings_sold INTEGER DEFAULT 0,
  exchanges_completed INTEGER DEFAULT 0,
  auctions_completed INTEGER DEFAULT 0,
  messages_exchanged INTEGER DEFAULT 0,
  commission_revenue_egp NUMERIC DEFAULT 0,
  commission_transactions INTEGER DEFAULT 0,
  avg_commission_egp NUMERIC DEFAULT 0,
  subscription_revenue_egp NUMERIC DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  subscription_upgrades INTEGER DEFAULT 0,
  addon_revenue_egp NUMERIC DEFAULT 0,
  total_revenue_egp NUMERIC DEFAULT 0,
  total_gmv_egp NUMERIC DEFAULT 0,
  take_rate_pct NUMERIC(5,3),
  churned INTEGER DEFAULT 0,
  at_risk INTEGER DEFAULT 0,
  reactivated INTEGER DEFAULT 0,
  retention_rate NUMERIC(5,2),
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_responded INTEGER DEFAULT 0,
  campaign_cost_egp NUMERIC DEFAULT 0,
  avg_response_time_minutes NUMERIC DEFAULT 0,
  avg_satisfaction_rating NUMERIC(3,1),
  complaints_filed INTEGER DEFAULT 0,
  complaints_resolved INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  tier_upgrades INTEGER DEFAULT 0,
  promotions_redeemed INTEGER DEFAULT 0,
  by_category JSONB DEFAULT '{}',
  by_governorate JSONB DEFAULT '{}',
  by_source JSONB DEFAULT '{}',
  by_agent JSONB DEFAULT '{}',
  by_lifecycle_stage JSONB DEFAULT '{}',
  by_account_type JSONB DEFAULT '{}',
  by_subscription_plan JSONB DEFAULT '{}',
  cac_egp NUMERIC,
  ltv_egp NUMERIC,
  ltv_cac_ratio NUMERIC,
  arpu_egp NUMERIC,
  nps_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- TABLE 13: crm_subscription_history
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) NOT NULL,
  action TEXT NOT NULL,
  plan_from TEXT,
  plan_to TEXT,
  billing TEXT,
  amount_egp NUMERIC NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  agent_id UUID REFERENCES crm_agents(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_history_customer ON crm_subscription_history(customer_id, created_at DESC);

-- ══════════════════════════════════════════════════════════
-- RLS POLICIES for CRM tables
-- ══════════════════════════════════════════════════════════
ALTER TABLE crm_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_listing_assists ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_competitor_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_subscription_history ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (for Edge Functions and admin API routes)
-- For now, allow authenticated users to read CRM data (admin-only access enforced at app level)
CREATE POLICY "crm_agents_read" ON crm_agents FOR SELECT USING (true);
CREATE POLICY "crm_agents_write" ON crm_agents FOR ALL USING (true);

CREATE POLICY "crm_customers_read" ON crm_customers FOR SELECT USING (true);
CREATE POLICY "crm_customers_write" ON crm_customers FOR ALL USING (true);

CREATE POLICY "crm_conversations_read" ON crm_conversations FOR SELECT USING (true);
CREATE POLICY "crm_conversations_write" ON crm_conversations FOR ALL USING (true);

CREATE POLICY "crm_campaigns_read" ON crm_campaigns FOR SELECT USING (true);
CREATE POLICY "crm_campaigns_write" ON crm_campaigns FOR ALL USING (true);

CREATE POLICY "crm_templates_read" ON crm_message_templates FOR SELECT USING (true);
CREATE POLICY "crm_templates_write" ON crm_message_templates FOR ALL USING (true);

CREATE POLICY "crm_promotions_read" ON crm_promotions FOR SELECT USING (true);
CREATE POLICY "crm_promotions_write" ON crm_promotions FOR ALL USING (true);

CREATE POLICY "crm_loyalty_read" ON crm_loyalty_transactions FOR SELECT USING (true);
CREATE POLICY "crm_loyalty_write" ON crm_loyalty_transactions FOR ALL USING (true);

CREATE POLICY "crm_listing_assists_read" ON crm_listing_assists FOR SELECT USING (true);
CREATE POLICY "crm_listing_assists_write" ON crm_listing_assists FOR ALL USING (true);

CREATE POLICY "crm_activity_read" ON crm_activity_log FOR SELECT USING (true);
CREATE POLICY "crm_activity_write" ON crm_activity_log FOR ALL USING (true);

CREATE POLICY "crm_competitor_read" ON crm_competitor_sources FOR SELECT USING (true);
CREATE POLICY "crm_competitor_write" ON crm_competitor_sources FOR ALL USING (true);

CREATE POLICY "crm_referrals_read" ON crm_referrals FOR SELECT USING (true);
CREATE POLICY "crm_referrals_write" ON crm_referrals FOR ALL USING (true);

CREATE POLICY "crm_metrics_read" ON crm_daily_metrics FOR SELECT USING (true);
CREATE POLICY "crm_metrics_write" ON crm_daily_metrics FOR ALL USING (true);

CREATE POLICY "crm_sub_history_read" ON crm_subscription_history FOR SELECT USING (true);
CREATE POLICY "crm_sub_history_write" ON crm_subscription_history FOR ALL USING (true);

-- ══════════════════════════════════════════════════════════
-- Trigger for updated_at on other tables
-- ══════════════════════════════════════════════════════════
CREATE TRIGGER trg_crm_agents_updated
  BEFORE UPDATE ON crm_agents
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER trg_crm_campaigns_updated
  BEFORE UPDATE ON crm_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER trg_crm_templates_updated
  BEFORE UPDATE ON crm_message_templates
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER trg_crm_competitor_updated
  BEFORE UPDATE ON crm_competitor_sources
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
