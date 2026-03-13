-- ════════════════════════════════════════════════════════════
-- محرك حصاد المشترين (Buyer Harvesting Engine - BHE)
-- Migration 00058
-- ════════════════════════════════════════════════════════════

-- ═══ المشترين المكتشفين ═══
CREATE TABLE IF NOT EXISTS bhe_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- مصدر الاكتشاف
  source TEXT NOT NULL,
    -- 'facebook_group' | 'dubizzle_comment' | 'facebook_marketplace'
    -- 'opensooq_wanted' | 'seo_organic' | 'whatsapp_group' | 'manual'

  source_url TEXT,
  source_group_name TEXT,
  source_platform TEXT, -- 'facebook' | 'dubizzle' | 'opensooq'

  -- بيانات المشتري
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  buyer_profile_url TEXT,

  -- ماذا يريد
  product_wanted TEXT,
  category TEXT,
  subcategory TEXT,
  condition_wanted TEXT, -- 'new' | 'used' | null
  budget_min INTEGER,
  budget_max INTEGER,
  governorate TEXT,
  city TEXT,

  -- النص الأصلي
  original_text TEXT,

  -- التصنيف
  buyer_tier TEXT DEFAULT 'unknown',
    -- 'hot_buyer' | 'warm_buyer' | 'cold_buyer' | 'unknown'
  buyer_score INTEGER DEFAULT 0,
  estimated_purchase_value INTEGER DEFAULT 0,

  -- Pipeline
  pipeline_status TEXT DEFAULT 'discovered',
    -- 'discovered' | 'phone_found' | 'matched' | 'contacted'
    -- 'responded' | 'signed_up' | 'purchased' | 'lost'

  -- المطابقة
  matched_listings JSONB DEFAULT '[]',
  matched_sellers JSONB DEFAULT '[]',
  matches_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,

  -- التواصل
  crm_customer_id UUID,
  wa_conversation_id UUID,
  contacted_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,

  -- Dedup
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID,

  -- Timestamps
  posted_at TIMESTAMPTZ,
  harvested_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_bhe_buyers_dedup
  ON bhe_buyers(source, source_url, buyer_profile_url)
  WHERE is_duplicate = false AND source_url IS NOT NULL AND buyer_profile_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bhe_buyers_phone ON bhe_buyers(buyer_phone) WHERE buyer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_category ON bhe_buyers(category, governorate);
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_tier ON bhe_buyers(buyer_tier);
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_pipeline ON bhe_buyers(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_score ON bhe_buyers(buyer_score DESC);
CREATE INDEX IF NOT EXISTS idx_bhe_buyers_created ON bhe_buyers(created_at DESC);

-- ═══ جروبات فيسبوك المراقبة ═══
CREATE TABLE IF NOT EXISTS bhe_facebook_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  group_name TEXT NOT NULL,
  group_url TEXT NOT NULL UNIQUE,
  group_id TEXT,

  category TEXT,
  governorate TEXT,
  members_count INTEGER,

  -- الأداء
  total_harvests INTEGER DEFAULT 0,
  total_buyers_found INTEGER DEFAULT 0,
  total_phones_found INTEGER DEFAULT 0,
  avg_buyers_per_harvest NUMERIC(6,1) DEFAULT 0,
  last_harvest_at TIMESTAMPTZ,

  -- التصنيف
  quality_score INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ المقاييس اليومية ═══
CREATE TABLE IF NOT EXISTS bhe_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  source TEXT NOT NULL, -- 'facebook_group' | 'dubizzle_comment' | ...

  buyers_discovered INTEGER DEFAULT 0,
  phones_found INTEGER DEFAULT 0,
  matches_made INTEGER DEFAULT 0,
  contacts_sent INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,

  UNIQUE(date, source)
);

CREATE INDEX IF NOT EXISTS idx_bhe_metrics_date ON bhe_daily_metrics(date DESC);
