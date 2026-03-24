-- ══════════════════════════════════════════════════════════
-- Migration 00080: نموذج الإيرادات الهجين
-- Free + Subscription + Pay-per-Lead + عمولة مزاد
-- ══════════════════════════════════════════════════════════

-- 1. باقات الاشتراك
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price_egp INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  max_listings INTEGER DEFAULT 2,
  max_photos INTEGER DEFAULT 5,
  has_priority_search BOOLEAN DEFAULT false,
  has_ai_pricing BOOLEAN DEFAULT false,
  has_auctions BOOLEAN DEFAULT false,
  max_auctions_per_month INTEGER DEFAULT 0,
  has_dedicated_agent BOOLEAN DEFAULT false,
  has_analytics BOOLEAN DEFAULT false,
  has_whatsapp_leads BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_plans (
  code, name_ar, name_en, price_egp,
  max_listings, max_photos,
  has_priority_search, has_ai_pricing,
  has_auctions, max_auctions_per_month,
  has_dedicated_agent, has_analytics,
  has_whatsapp_leads, sort_order
) VALUES
  ('free', 'مجاني', 'Free', 0,
    2, 5, false, false, false, 0,
    false, false, false, 1),
  ('silver', 'فضي', 'Silver', 299,
    10, 10, true, false, false, 0,
    false, true, false, 2),
  ('gold', 'ذهبي', 'Gold', 699,
    50, 999, true, true, true, 1,
    false, true, true, 3),
  ('diamond', 'ماسي', 'Diamond', 1499,
    999, 999, true, true, true, 999,
    true, true, true, 4)
ON CONFLICT (code) DO NOTHING;

-- 2. اشتراكات المستخدمين
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  seller_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  payment_method TEXT,
  payment_reference TEXT,
  amount_paid_egp INTEGER,
  auto_renew BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_seller ON user_subscriptions(seller_id, status);

-- 3. أسعار الـ Leads
CREATE TABLE IF NOT EXISTS lead_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  lead_type TEXT NOT NULL
    CHECK (lead_type IN ('contact', 'inspection', 'offer')),
  price_egp INTEGER NOT NULL,
  description_ar TEXT,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO lead_pricing (category, lead_type, price_egp, description_ar) VALUES
  ('سيارات', 'contact', 50, 'تواصل واتساب أو مكالمة'),
  ('سيارات', 'inspection', 150, 'طلب معاينة السيارة'),
  ('سيارات', 'offer', 300, 'عرض سعر جاد'),
  ('عقارات', 'contact', 100, 'تواصل واتساب أو مكالمة'),
  ('عقارات', 'inspection', 300, 'طلب معاينة العقار'),
  ('عقارات', 'offer', 500, 'عرض سعر جاد');

-- 4. الـ Leads
CREATE TABLE IF NOT EXISTS listing_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID,
  seller_id UUID,
  buyer_name TEXT,
  buyer_phone TEXT,
  lead_type TEXT DEFAULT 'contact'
    CHECK (lead_type IN ('contact', 'inspection', 'offer')),
  lead_score INTEGER DEFAULT 1,
  price_egp INTEGER DEFAULT 0,
  category TEXT,
  is_purchased BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ,
  purchase_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_leads_seller ON listing_leads(seller_id, is_purchased);

-- 5. معدلات عمولة المزادات
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT UNIQUE NOT NULL,
  rate DECIMAL(5,4) NOT NULL,
  min_commission_egp INTEGER DEFAULT 0,
  max_commission_egp INTEGER,
  description_ar TEXT
);

INSERT INTO commission_rates (category, rate, min_commission_egp, max_commission_egp, description_ar) VALUES
  ('سيارات', 0.0050, 500, 5000, '0.5% من سعر البيع'),
  ('عقارات', 0.0030, 1000, 10000, '0.3% من سعر البيع'),
  ('إيجار', 0.0833, 500, 5000, 'شهر إيجار واحد')
ON CONFLICT (category) DO NOTHING;

-- 6. عمولات المزادات
CREATE TABLE IF NOT EXISTS auction_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID,
  seller_id UUID,
  category TEXT,
  sale_price_egp INTEGER,
  commission_rate DECIMAL(5,4),
  commission_egp INTEGER,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'waived', 'disputed')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. سجل المدفوعات الكامل
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('subscription', 'lead_purchase', 'auction_commission')),
  reference_id UUID,
  seller_id UUID,
  amount_egp INTEGER NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON revenue_transactions(transaction_type, payment_status);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_date ON revenue_transactions(created_at DESC);

-- 8. قوالب أحمد (عقارات)
CREATE TABLE IF NOT EXISTS ahmed_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  platform TEXT DEFAULT 'all',
  seller_type TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
