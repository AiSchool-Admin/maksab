export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

/**
 * Execute SQL against Supabase using multiple methods (with fallbacks).
 * Tries: 1) exec_sql RPC, 2) /pg/query endpoint, 3) statement-by-statement via RPC
 */
async function executeSQLRobust(sql: string): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !serviceKey) {
    return { success: false, error: "Missing Supabase URL or service key" };
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  // Method 1: Try exec_sql RPC function
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: sql }),
    });
    if (rpcRes.ok) return { success: true };
  } catch {
    // Continue to next method
  }

  // Method 2: Try /pg/query endpoint (Supabase v2+)
  try {
    const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: sql }),
    });
    if (pgRes.ok) return { success: true };
  } catch {
    // Continue to next method
  }

  // Method 3: Create exec_sql function via /pg/query, then use it
  try {
    const createFnSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(query text)
      RETURNS void AS $$
      BEGIN EXECUTE query; END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    const createRes = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: createFnSQL }),
    });
    if (createRes.ok) {
      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: sql }),
      });
      if (rpcRes.ok) return { success: true };
    }
  } catch {
    // Continue
  }

  // Method 4: Try executing SQL statements one by one via the supabase client
  // This splits the SQL by semicolons and executes each CREATE TABLE IF NOT EXISTS
  try {
    const supabase = getServiceClient();
    // Try calling rpc with the sql param name used in some setups
    const { error } = await supabase.rpc("exec_sql" as never, { sql } as never);
    if (!error) return { success: true };

    // Try alternate param name
    const { error: error2 } = await supabase.rpc("exec_sql" as never, { query: sql } as never);
    if (!error2) return { success: true };
  } catch {
    // Continue
  }

  return {
    success: false,
    error: "مش قادر ينفذ SQL — جرب انسخ CRM SQL وشغله في Supabase SQL Editor يدوياً",
  };
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

// RLS: Enable RLS on all tables but do NOT create permissive policies.
// Admin access is handled via service_role key (bypasses RLS) in API routes.
// Migration 00037 creates proper admin-only RLS policies.
const CRM_RLS_SQL = `
-- Enable RLS on all tables (service_role bypasses RLS automatically)
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

// Demo data is managed in the dedicated seed endpoint:
// /api/admin/crm/customers/seed

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const results: { step: string; status: string; error?: string }[] = [];

  // Combine all SQL into one big script for efficiency
  const fullSQL = [CRM_TABLES_SQL, CRM_RLS_SQL, CRM_INDEXES_SQL].join("\n\n");

  // Step 1: Try executing all SQL at once
  const execResult = await executeSQLRobust(fullSQL);
  if (execResult.success) {
    results.push({ step: "create_tables", status: "success" });
    results.push({ step: "rls_grants", status: "success" });
    results.push({ step: "indexes", status: "success" });
  } else {
    // Try each part separately
    const tableResult = await executeSQLRobust(CRM_TABLES_SQL);
    results.push({
      step: "create_tables",
      status: tableResult.success ? "success" : "failed",
      error: tableResult.error,
    });

    if (tableResult.success) {
      const rlsResult = await executeSQLRobust(CRM_RLS_SQL);
      results.push({
        step: "rls_grants",
        status: rlsResult.success ? "success" : "failed",
        error: rlsResult.error,
      });

      const indexResult = await executeSQLRobust(CRM_INDEXES_SQL);
      results.push({
        step: "indexes",
        status: indexResult.success ? "success" : "failed",
        error: indexResult.error,
      });
    } else {
      results.push({ step: "rls_grants", status: "skipped", error: "Tables creation failed" });
      results.push({ step: "indexes", status: "skipped", error: "Tables creation failed" });
    }
  }

  // Check if tables exist now and seed data
  let tableExists = false;
  try {
    const { count, error } = await supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true });

    if (!error) {
      tableExists = true;
      results.push({ step: "table_check", status: "exists", error: `${count || 0} rows found` });

      // Seed only if empty — delegate to the dedicated seed endpoint
      if ((count || 0) === 0) {
        try {
          const baseUrl = req.nextUrl.origin;
          const seedRes = await fetch(`${baseUrl}/api/admin/crm/customers/seed`, { method: "POST" });
          const seedData = await seedRes.json();
          results.push({
            step: "seed_data",
            status: seedRes.ok ? "success" : "partial",
            error: `${seedData.imported || 0} customers seeded`,
          });
        } catch (seedErr) {
          results.push({ step: "seed_data", status: "failed", error: String(seedErr) });
        }
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
      "4. تأكد أن SUPABASE_SERVICE_ROLE_KEY متعرف في .env.local (الوصول عبر service_role يتجاوز RLS)",
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
