import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

// SQL to create all CRM tables
const CRM_TABLES_SQL = `
-- Function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- TABLE: crm_agents
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
  monthly_targets JSONB DEFAULT '{}',
  base_salary_egp NUMERIC DEFAULT 0,
  compensation_structure JSONB DEFAULT '{}',
  total_earned_egp NUMERIC DEFAULT 0,
  current_month_earned_egp NUMERIC DEFAULT 0,
  work_schedule JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: crm_customers
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

-- TABLE: crm_campaigns
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
  stats JSONB DEFAULT '{}',
  created_by UUID REFERENCES crm_agents(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: crm_conversations
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

-- TABLE: crm_activity_log
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

-- TABLE: crm_message_templates
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

-- TABLE: crm_promotions
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

-- TABLE: crm_loyalty_transactions
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

-- TABLE: crm_listing_assists
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

-- TABLE: crm_competitor_sources
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

-- TABLE: crm_referrals
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

-- TABLE: crm_daily_metrics
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
  total_gmv_egp NUMERIC DEFAULT 0,
  total_revenue_egp NUMERIC DEFAULT 0,
  churned INTEGER DEFAULT 0,
  at_risk INTEGER DEFAULT 0,
  reactivated INTEGER DEFAULT 0,
  by_category JSONB DEFAULT '{}',
  by_governorate JSONB DEFAULT '{}',
  by_source JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: crm_subscription_history
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
`;

const CRM_RLS_SQL = `
-- Enable RLS on all tables
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

-- Drop existing policies to avoid conflicts
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'crm_agents','crm_customers','crm_conversations','crm_campaigns',
    'crm_message_templates','crm_promotions','crm_loyalty_transactions',
    'crm_listing_assists','crm_activity_log','crm_competitor_sources',
    'crm_referrals','crm_daily_metrics','crm_subscription_history'
  ]) LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Create permissive policies for all CRM tables
CREATE POLICY "crm_full_access" ON crm_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_message_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_loyalty_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_listing_assists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_competitor_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_referrals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_daily_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_full_access" ON crm_subscription_history FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL ON crm_agents TO anon, authenticated;
GRANT ALL ON crm_customers TO anon, authenticated;
GRANT ALL ON crm_conversations TO anon, authenticated;
GRANT ALL ON crm_campaigns TO anon, authenticated;
GRANT ALL ON crm_message_templates TO anon, authenticated;
GRANT ALL ON crm_promotions TO anon, authenticated;
GRANT ALL ON crm_loyalty_transactions TO anon, authenticated;
GRANT ALL ON crm_listing_assists TO anon, authenticated;
GRANT ALL ON crm_activity_log TO anon, authenticated;
GRANT ALL ON crm_competitor_sources TO anon, authenticated;
GRANT ALL ON crm_referrals TO anon, authenticated;
GRANT ALL ON crm_daily_metrics TO anon, authenticated;
GRANT ALL ON crm_subscription_history TO anon, authenticated;
`;

const CRM_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_crm_cust_lifecycle ON crm_customers(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_cust_category ON crm_customers(primary_category);
CREATE INDEX IF NOT EXISTS idx_crm_cust_gov ON crm_customers(governorate);
CREATE INDEX IF NOT EXISTS idx_crm_cust_health ON crm_customers(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_cust_source ON crm_customers(source);
CREATE INDEX IF NOT EXISTS idx_crm_cust_phone ON crm_customers(phone);
CREATE INDEX IF NOT EXISTS idx_crm_cust_active ON crm_customers(last_active_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_crm_cust_type ON crm_customers(account_type, role);
CREATE INDEX IF NOT EXISTS idx_conv_customer ON crm_conversations(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_customer ON crm_activity_log(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON crm_activity_log(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON crm_loyalty_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_history_customer ON crm_subscription_history(customer_id, created_at DESC);
`;

const DEMO_CUSTOMERS = [
  {
    full_name: "أحمد محمد حسن",
    phone: "01012345678",
    whatsapp: "01012345678",
    email: "ahmed.m@example.com",
    account_type: "individual",
    role: "seller",
    governorate: "القاهرة",
    city: "مدينة نصر",
    primary_category: "cars",
    source: "organic",
    lifecycle_stage: "active",
    total_listings: 8,
    active_listings: 3,
    total_sales: 5,
    total_gmv_egp: 450000,
    health_score: 82,
    acquisition_score: 70,
    engagement_score: 85,
    value_score: 75,
    churn_risk_score: 15,
    tags: ["vip", "بائع_نشط"],
    internal_notes: "بائع سيارات مستعملة — نشط جداً",
  },
  {
    full_name: "فاطمة علي إبراهيم",
    phone: "01123456789",
    whatsapp: "01123456789",
    email: "fatma.ali@example.com",
    account_type: "store",
    role: "seller",
    governorate: "الإسكندرية",
    city: "سيدي بشر",
    primary_category: "fashion",
    source: "facebook_ad",
    lifecycle_stage: "power_user",
    business_name: "بوتيك فاطمة",
    business_name_ar: "بوتيك فاطمة للأزياء",
    total_listings: 35,
    active_listings: 20,
    total_sales: 120,
    total_gmv_egp: 85000,
    total_commission_paid_egp: 850,
    is_commission_supporter: true,
    health_score: 95,
    acquisition_score: 90,
    engagement_score: 95,
    value_score: 80,
    churn_risk_score: 5,
    subscription_plan: "gold",
    loyalty_tier: "gold",
    loyalty_points: 2500,
    tags: ["متجر", "موضة", "champion"],
    internal_notes: "صاحبة متجر أزياء — أفضل بائعة في الإسكندرية",
  },
  {
    full_name: "محمود عبدالله سعيد",
    phone: "01098765432",
    whatsapp: "01098765432",
    account_type: "individual",
    role: "both",
    governorate: "الجيزة",
    city: "الدقي",
    primary_category: "phones",
    source: "google_ad",
    lifecycle_stage: "active",
    total_listings: 5,
    active_listings: 2,
    total_sales: 3,
    total_purchases: 2,
    total_gmv_egp: 65000,
    health_score: 68,
    acquisition_score: 55,
    engagement_score: 70,
    value_score: 60,
    churn_risk_score: 25,
    tags: ["موبايلات"],
    internal_notes: "يبيع ويشتري موبايلات مستعملة",
  },
  {
    full_name: "سارة أحمد عبدالرحمن",
    phone: "01234567890",
    whatsapp: "01234567890",
    email: "sara.ahmed@example.com",
    account_type: "individual",
    role: "buyer",
    governorate: "القاهرة",
    city: "المعادي",
    primary_category: "real_estate",
    source: "referral",
    lifecycle_stage: "lead",
    total_listings: 0,
    active_listings: 0,
    total_purchases: 0,
    total_gmv_egp: 0,
    health_score: 25,
    acquisition_score: 40,
    engagement_score: 20,
    value_score: 10,
    churn_risk_score: 60,
    tags: ["عميل_محتمل", "عقارات"],
    internal_notes: "بتدور على شقة في المعادي — تم التواصل معاها",
  },
  {
    full_name: "عمر حسين محمد",
    phone: "01556789012",
    whatsapp: "01556789012",
    email: "omar.h@example.com",
    account_type: "wholesaler",
    role: "seller",
    governorate: "القاهرة",
    city: "العتبة",
    primary_category: "scrap",
    source: "cs_agent",
    lifecycle_stage: "champion",
    business_name: "عمر للخردة والمعادن",
    business_name_ar: "عمر للخردة والمعادن",
    total_listings: 50,
    active_listings: 15,
    total_sales: 200,
    total_gmv_egp: 1200000,
    total_commission_paid_egp: 5000,
    is_commission_supporter: true,
    health_score: 98,
    acquisition_score: 95,
    engagement_score: 98,
    value_score: 95,
    churn_risk_score: 2,
    subscription_plan: "platinum",
    loyalty_tier: "platinum",
    loyalty_points: 8000,
    estimated_competitor_listings: 30,
    tags: ["vip", "platinum", "خردة", "أعلى_قيمة"],
    internal_notes: "أكبر تاجر خردة على المنصة — عميل استراتيجي",
  },
  {
    full_name: "نورا خالد مصطفى",
    phone: "01078901234",
    whatsapp: "01078901234",
    account_type: "individual",
    role: "seller",
    governorate: "المنصورة",
    city: "المنصورة",
    primary_category: "gold",
    source: "instagram",
    lifecycle_stage: "at_risk",
    total_listings: 12,
    active_listings: 0,
    total_sales: 8,
    total_gmv_egp: 95000,
    health_score: 30,
    acquisition_score: 65,
    engagement_score: 25,
    value_score: 55,
    churn_risk_score: 75,
    tags: ["معرض_للخطر", "ذهب"],
    internal_notes: "كانت نشطة — توقفت من شهرين — محتاجة متابعة",
  },
  {
    full_name: "يوسف إبراهيم علي",
    phone: "01145678901",
    whatsapp: "01145678901",
    email: "youssef.i@example.com",
    account_type: "store",
    role: "seller",
    governorate: "القاهرة",
    city: "وسط البلد",
    primary_category: "luxury",
    source: "whatsapp_campaign",
    lifecycle_stage: "active",
    business_name: "يوسف للساعات الفاخرة",
    business_name_ar: "يوسف للساعات الفاخرة",
    total_listings: 15,
    active_listings: 8,
    total_sales: 25,
    total_gmv_egp: 350000,
    total_commission_paid_egp: 1500,
    is_commission_supporter: true,
    health_score: 78,
    acquisition_score: 75,
    engagement_score: 80,
    value_score: 85,
    churn_risk_score: 18,
    subscription_plan: "silver",
    loyalty_tier: "silver",
    loyalty_points: 1200,
    tags: ["متجر", "ساعات", "فاخر"],
    internal_notes: "متجر ساعات فاخرة — عميل مميز",
  },
  {
    full_name: "هند محمد سالم",
    phone: "01289012345",
    whatsapp: "01289012345",
    account_type: "individual",
    role: "both",
    governorate: "الجيزة",
    city: "6 أكتوبر",
    primary_category: "home_appliances",
    source: "sms_campaign",
    lifecycle_stage: "dormant",
    total_listings: 3,
    active_listings: 0,
    total_sales: 1,
    total_purchases: 2,
    total_gmv_egp: 15000,
    health_score: 12,
    acquisition_score: 30,
    engagement_score: 10,
    value_score: 20,
    churn_risk_score: 88,
    tags: ["خامل"],
    internal_notes: "آخر نشاط من 4 شهور — محتاجة حملة إعادة تنشيط",
  },
  {
    full_name: "كريم سامي عبدالعزيز",
    phone: "01567890123",
    whatsapp: "01567890123",
    email: "karim.sami@example.com",
    account_type: "individual",
    role: "seller",
    governorate: "القاهرة",
    city: "مصر الجديدة",
    primary_category: "hobbies",
    source: "facebook_group",
    lifecycle_stage: "qualified",
    total_listings: 2,
    active_listings: 2,
    total_sales: 0,
    total_gmv_egp: 0,
    health_score: 45,
    acquisition_score: 50,
    engagement_score: 55,
    value_score: 15,
    churn_risk_score: 40,
    estimated_competitor_listings: 5,
    tags: ["جديد", "هوايات"],
    internal_notes: "بيبيع بلايستيشن وألعاب — جاي من جروب فيسبوك",
  },
  {
    full_name: "ياسمين عادل حسني",
    phone: "01034567891",
    whatsapp: "01034567891",
    email: "yasmin.a@example.com",
    account_type: "chain",
    role: "seller",
    governorate: "القاهرة",
    city: "التجمع الخامس",
    primary_category: "furniture",
    source: "partnership",
    lifecycle_stage: "onboarding",
    business_name: "ياسمين هوم",
    business_name_ar: "ياسمين هوم للأثاث",
    total_listings: 0,
    active_listings: 0,
    total_sales: 0,
    total_gmv_egp: 0,
    health_score: 35,
    acquisition_score: 80,
    engagement_score: 30,
    value_score: 10,
    churn_risk_score: 35,
    estimated_competitor_listings: 50,
    tags: ["سلسلة", "أثاث", "شراكة"],
    internal_notes: "سلسلة أثاث — 3 فروع — في مرحلة التسجيل",
  },
  {
    full_name: "حسن جمال الدين",
    phone: "01190123456",
    whatsapp: "01190123456",
    account_type: "individual",
    role: "seller",
    governorate: "أسيوط",
    city: "أسيوط",
    primary_category: "tools",
    source: "offline_event",
    lifecycle_stage: "contacted",
    total_listings: 0,
    active_listings: 0,
    total_gmv_egp: 0,
    health_score: 20,
    acquisition_score: 45,
    engagement_score: 15,
    value_score: 5,
    churn_risk_score: 50,
    tags: ["صعيد", "عدد"],
    internal_notes: "عنده ورشة — تم التواصل معاه في معرض أسيوط",
  },
  {
    full_name: "منى عبدالفتاح",
    phone: "01201234567",
    whatsapp: "01201234567",
    email: "mona.af@example.com",
    account_type: "individual",
    role: "both",
    governorate: "الإسكندرية",
    city: "العصافرة",
    primary_category: "services",
    source: "organic",
    lifecycle_stage: "active",
    total_listings: 4,
    active_listings: 2,
    total_sales: 10,
    total_gmv_egp: 25000,
    health_score: 72,
    acquisition_score: 60,
    engagement_score: 75,
    value_score: 50,
    churn_risk_score: 20,
    tags: ["خدمات", "تنظيف"],
    internal_notes: "بتقدم خدمات تنظيف — تقييمات ممتازة",
  },
  {
    full_name: "طارق عبدالحميد النجار",
    phone: "01567891234",
    whatsapp: "01567891234",
    account_type: "manufacturer",
    role: "seller",
    governorate: "الشرقية",
    city: "العاشر من رمضان",
    primary_category: "home_appliances",
    source: "competitor_migration",
    lifecycle_stage: "interested",
    business_name: "النجار للأجهزة",
    business_name_ar: "النجار للأجهزة المنزلية",
    total_listings: 0,
    active_listings: 0,
    total_gmv_egp: 0,
    health_score: 40,
    acquisition_score: 85,
    engagement_score: 35,
    value_score: 15,
    churn_risk_score: 30,
    estimated_competitor_listings: 100,
    tags: ["مصنع", "أجهزة", "هجرة_منافس"],
    internal_notes: "مصنع أجهزة — عنده 100 إعلان على OLX — محتاج عرض خاص",
  },
  {
    full_name: "رانيا محمد فؤاد",
    phone: "01023456790",
    whatsapp: "01023456790",
    email: "rania.f@example.com",
    account_type: "individual",
    role: "buyer",
    governorate: "القاهرة",
    city: "الزمالك",
    primary_category: "luxury",
    source: "tiktok_ad",
    lifecycle_stage: "lead",
    total_listings: 0,
    active_listings: 0,
    total_purchases: 3,
    total_gmv_egp: 45000,
    health_score: 38,
    acquisition_score: 35,
    engagement_score: 40,
    value_score: 45,
    churn_risk_score: 45,
    tags: ["مشتري", "فاخر"],
    internal_notes: "مهتمة بالماركات — اشترت 3 حاجات في أول شهر",
  },
  {
    full_name: "إبراهيم خليل عثمان",
    phone: "01112345670",
    whatsapp: "01112345670",
    account_type: "individual",
    role: "seller",
    governorate: "الفيوم",
    city: "الفيوم",
    primary_category: "cars",
    source: "qr_code",
    lifecycle_stage: "churned",
    total_listings: 6,
    active_listings: 0,
    total_sales: 2,
    total_gmv_egp: 180000,
    health_score: 8,
    acquisition_score: 50,
    engagement_score: 5,
    value_score: 40,
    churn_risk_score: 95,
    tags: ["مفقود", "سيارات"],
    internal_notes: "كان بيبيع سيارات — مارجعش من 6 شهور",
  },
];

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const results: { step: string; status: string; error?: string }[] = [];

  // Step 1: Create tables
  try {
    const { error } = await supabase.rpc("exec_sql", { sql: CRM_TABLES_SQL });
    if (error) {
      // Try direct SQL via REST API as fallback
      results.push({ step: "create_tables", status: "rpc_failed", error: error.message });
    } else {
      results.push({ step: "create_tables", status: "success" });
    }
  } catch (e) {
    results.push({ step: "create_tables", status: "error", error: String(e) });
  }

  // Step 2: Apply RLS and grants
  try {
    const { error } = await supabase.rpc("exec_sql", { sql: CRM_RLS_SQL });
    if (error) {
      results.push({ step: "rls_grants", status: "rpc_failed", error: error.message });
    } else {
      results.push({ step: "rls_grants", status: "success" });
    }
  } catch (e) {
    results.push({ step: "rls_grants", status: "error", error: String(e) });
  }

  // Step 3: Create indexes
  try {
    const { error } = await supabase.rpc("exec_sql", { sql: CRM_INDEXES_SQL });
    if (error) {
      results.push({ step: "indexes", status: "rpc_failed", error: error.message });
    } else {
      results.push({ step: "indexes", status: "success" });
    }
  } catch (e) {
    results.push({ step: "indexes", status: "error", error: String(e) });
  }

  // Step 4: Check if table exists and try to seed
  let tableExists = false;
  try {
    const { count, error } = await supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true });

    if (!error) {
      tableExists = true;
      results.push({ step: "table_check", status: "exists", error: `${count || 0} rows found` });

      // Seed only if empty
      if ((count || 0) === 0) {
        let imported = 0;
        let errors = 0;
        const errorDetails: string[] = [];

        for (const customer of DEMO_CUSTOMERS) {
          const { data, error: insertError } = await supabase
            .from("crm_customers")
            .insert({
              ...customer,
              lifecycle_history: [{ stage: customer.lifecycle_stage, at: new Date().toISOString() }],
            })
            .select("id")
            .single();

          if (insertError) {
            errors++;
            errorDetails.push(`${customer.full_name}: ${insertError.message}`);
          } else {
            imported++;
            await supabase.from("crm_activity_log").insert({
              customer_id: data.id,
              activity_type: "lifecycle_change",
              description: "تم إنشاء العميل (بيانات تجريبية)",
              metadata: { from: null, to: customer.lifecycle_stage, source: "setup" },
              is_system: true,
            });
          }
        }

        results.push({
          step: "seed_data",
          status: errors === 0 ? "success" : "partial",
          error: errors > 0 ? `${imported} imported, ${errors} failed: ${errorDetails.join("; ")}` : `${imported} customers seeded`,
        });
      } else {
        results.push({ step: "seed_data", status: "skipped", error: "Data already exists" });
      }
    } else {
      results.push({ step: "table_check", status: "not_found", error: error.message });
    }
  } catch (e) {
    results.push({ step: "table_check", status: "error", error: String(e) });
  }

  const allSuccess = results.every(r => r.status === "success" || r.status === "skipped" || r.status === "exists");

  return NextResponse.json({
    message: allSuccess ? "تم إعداد نظام CRM بنجاح" : "تم إعداد نظام CRM مع بعض التحذيرات",
    success: allSuccess,
    table_exists: tableExists,
    results,
    instructions: !tableExists ? [
      "الجداول لم يتم إنشاؤها عبر API — يجب تطبيق الـ migration يدوياً",
      "1. افتح Supabase Dashboard → SQL Editor",
      "2. انسخ محتوى ملف supabase/migrations/00021_crm_core_tables.sql",
      "3. نفذ الـ SQL",
      "4. ثم نفذ الأوامر التالية لمنح الصلاحيات:",
      "GRANT ALL ON crm_customers TO anon, authenticated;",
      "GRANT ALL ON crm_activity_log TO anon, authenticated;",
      "GRANT ALL ON crm_agents TO anon, authenticated;",
      "GRANT ALL ON crm_conversations TO anon, authenticated;",
      "GRANT ALL ON crm_campaigns TO anon, authenticated;",
      "5. بعد ذلك ارجع اضغط Setup تاني لإضافة البيانات التجريبية",
    ] : undefined,
  }, { status: allSuccess ? 200 : 207 });
}

// GET: Check CRM status
export async function GET() {
  const supabase = getServiceClient();

  const checks: Record<string, { exists: boolean; count?: number; error?: string }> = {};

  const tables = [
    "crm_customers",
    "crm_agents",
    "crm_conversations",
    "crm_campaigns",
    "crm_activity_log",
    "crm_message_templates",
    "crm_promotions",
    "crm_loyalty_transactions",
    "crm_listing_assists",
    "crm_competitor_sources",
    "crm_referrals",
    "crm_daily_metrics",
    "crm_subscription_history",
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        checks[table] = { exists: false, error: error.message };
      } else {
        checks[table] = { exists: true, count: count || 0 };
      }
    } catch (e) {
      checks[table] = { exists: false, error: String(e) };
    }
  }

  const allExist = Object.values(checks).every(c => c.exists);
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    status: allExist ? "ready" : "needs_setup",
    has_service_role_key: hasServiceKey,
    tables: checks,
    total_customers: checks.crm_customers?.count || 0,
  });
}
