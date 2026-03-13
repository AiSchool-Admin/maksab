-- ============================================================
-- Team Members & Role-Based Access Control (RBAC)
-- Unified system for managing staff roles and permissions
-- ============================================================

-- Team roles enum
DO $$ BEGIN
  CREATE TYPE team_role AS ENUM (
    'ceo',          -- المدير العام — كل الصلاحيات
    'cto',          -- المدير التقني — التقنية + الحصاد + النظام
    'cmo',          -- مدير التسويق — التسويق + المحتوى + SEO
    'coo',          -- مدير العمليات — العمليات + الجودة + المراجعة
    'cfo',          -- المدير المالي — المالية + الاشتراكات + الإيرادات
    'cs_manager',   -- مدير خدمة العملاء — المحادثات + التصعيدات
    'sales_manager',-- مدير المبيعات — Pipeline + التواصل + النطاقات
    'cs_agent',     -- موظف خدمة عملاء — المحادثات فقط
    'sales_agent',  -- موظف مبيعات — التواصل فقط
    'moderator',    -- مراجع محتوى — مراجعة الإعلانات + البلاغات
    'content_editor',-- محرر محتوى — التسويق + المحتوى
    'viewer'        -- مشاهد فقط — لوحة القيادة فقط
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to auth user (nullable — can invite before they sign up)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Basic info
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,

  -- Role & access
  role team_role NOT NULL DEFAULT 'viewer',
  title VARCHAR(100),           -- e.g., "مدير التسويق", "موظف خدمة عملاء"
  department VARCHAR(50),       -- cs, sales, marketing, ops, finance, tech

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,

  -- Audit
  invited_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role, is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_phone ON team_members(phone) WHERE phone IS NOT NULL;

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,     -- e.g., 'login', 'approve_ad', 'send_message', 'change_setting'
  resource_type VARCHAR(50),         -- e.g., 'ad', 'user', 'campaign', 'setting'
  resource_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_member ON team_activity_log(team_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON team_activity_log(action, created_at DESC);

-- RLS policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;

-- Team members: only accessible via service role (admin API routes)
CREATE POLICY "Service role full access to team_members" ON team_members
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to team_activity_log" ON team_activity_log
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Seed: register the CEO (first admin) from existing admin_phones setting
-- This will be handled by the app on first login
