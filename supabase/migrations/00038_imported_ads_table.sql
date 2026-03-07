-- Migration 00038: Imported Ads Table
-- Stores ads collected from external sources (OLX, etc.)
-- Separate from main 'ads' table to avoid polluting user-generated content
-- Used by: olx-collector/importer.ts, admin dashboard

-- ══════════════════════════════════════════════════════════
-- 1. Imported Ads Table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS imported_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ad content
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id VARCHAR(50),
  subcategory_id VARCHAR(50),
  sale_type VARCHAR(10) DEFAULT 'cash',
  price DECIMAL(12,2),
  is_negotiable BOOLEAN DEFAULT FALSE,
  category_fields JSONB DEFAULT '{}',

  -- Location
  governorate VARCHAR(50),
  city VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Media
  images TEXT[] DEFAULT '{}',

  -- Source tracking
  source VARCHAR(50) NOT NULL DEFAULT 'olx',
  source_url TEXT,
  source_id VARCHAR(100) NOT NULL,
  source_seller_id VARCHAR(100),
  source_seller_name VARCHAR(200),
  source_seller_phone VARCHAR(20),
  extracted_at TIMESTAMPTZ,

  -- Processing status
  status VARCHAR(30) DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'published', 'rejected', 'duplicate', 'expired')
  ),

  -- If published as a real ad, link to it
  published_ad_id UUID,
  published_at TIMESTAMPTZ,

  -- If linked to a registered seller
  linked_seller_id UUID,
  linked_lead_id UUID,

  -- Admin notes
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  batch_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate imports
  UNIQUE(source, source_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_imported_ads_status ON imported_ads(status);
CREATE INDEX IF NOT EXISTS idx_imported_ads_source ON imported_ads(source, status);
CREATE INDEX IF NOT EXISTS idx_imported_ads_category ON imported_ads(category_id, status);
CREATE INDEX IF NOT EXISTS idx_imported_ads_governorate ON imported_ads(governorate) WHERE governorate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_imported_ads_seller ON imported_ads(source_seller_id);
CREATE INDEX IF NOT EXISTS idx_imported_ads_batch ON imported_ads(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_imported_ads_created ON imported_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imported_ads_price ON imported_ads(price) WHERE price IS NOT NULL;

-- Full text search on imported ads
CREATE INDEX IF NOT EXISTS idx_imported_ads_search ON imported_ads
  USING GIN (to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ══════════════════════════════════════════════════════════
-- 2. Add source_id to acquisition_leads (if not exists)
-- ══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'acquisition_leads' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE acquisition_leads ADD COLUMN source_id VARCHAR(100);
    CREATE INDEX IF NOT EXISTS idx_acq_leads_source_id ON acquisition_leads(source_id) WHERE source_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'acquisition_leads' AND column_name = 'member_since'
  ) THEN
    ALTER TABLE acquisition_leads ADD COLUMN member_since TEXT;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 3. Import Statistics View
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW imported_ads_stats AS
SELECT
  source,
  status,
  category_id,
  governorate,
  COUNT(*) as count,
  COUNT(DISTINCT source_seller_id) as unique_sellers,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(*) FILTER (WHERE array_length(images, 1) > 0) as with_images,
  COUNT(*) FILTER (WHERE price IS NOT NULL AND price > 0) as with_price,
  MIN(extracted_at) as first_extracted,
  MAX(extracted_at) as last_extracted
FROM imported_ads
GROUP BY source, status, category_id, governorate;

-- ══════════════════════════════════════════════════════════
-- 4. RLS Policies (admin only)
-- ══════════════════════════════════════════════════════════

ALTER TABLE imported_ads ENABLE ROW LEVEL SECURITY;

-- Only admins can read imported ads
CREATE POLICY "Admins can manage imported_ads" ON imported_ads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert (for import scripts)
CREATE POLICY "Service role can insert imported_ads" ON imported_ads
  FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════════════════════
-- 5. Function to publish imported ad as real ad
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION publish_imported_ad(
  p_imported_ad_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_imported imported_ads%ROWTYPE;
  v_new_ad_id UUID;
BEGIN
  -- Get imported ad
  SELECT * INTO v_imported FROM imported_ads WHERE id = p_imported_ad_id;

  IF v_imported IS NULL THEN
    RAISE EXCEPTION 'Imported ad not found: %', p_imported_ad_id;
  END IF;

  IF v_imported.status = 'published' THEN
    RAISE EXCEPTION 'Ad already published';
  END IF;

  -- Create real ad
  INSERT INTO ads (
    user_id, title, description, category_id, subcategory_id,
    sale_type, price, is_negotiable, category_fields,
    governorate, city, latitude, longitude, images, status
  ) VALUES (
    p_user_id, v_imported.title, v_imported.description,
    v_imported.category_id, v_imported.subcategory_id,
    v_imported.sale_type, v_imported.price, v_imported.is_negotiable,
    v_imported.category_fields, v_imported.governorate, v_imported.city,
    v_imported.latitude, v_imported.longitude, v_imported.images, 'active'
  ) RETURNING id INTO v_new_ad_id;

  -- Update imported ad status
  UPDATE imported_ads SET
    status = 'published',
    published_ad_id = v_new_ad_id,
    published_at = NOW(),
    linked_seller_id = p_user_id,
    updated_at = NOW()
  WHERE id = p_imported_ad_id;

  RETURN v_new_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════
-- 6. Function to get import batch statistics
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_import_batch_stats(p_batch_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
  batch_id VARCHAR,
  total_ads BIGINT,
  total_sellers BIGINT,
  by_status JSONB,
  by_category JSONB,
  by_governorate JSONB,
  avg_price NUMERIC,
  imported_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ia.batch_id::VARCHAR,
    COUNT(*)::BIGINT as total_ads,
    COUNT(DISTINCT ia.source_seller_id)::BIGINT as total_sellers,
    jsonb_object_agg(
      COALESCE(ia.status, 'unknown'),
      status_count
    ) as by_status,
    (
      SELECT jsonb_object_agg(cat, cnt)
      FROM (
        SELECT category_id as cat, COUNT(*) as cnt
        FROM imported_ads ia2
        WHERE (p_batch_id IS NULL OR ia2.batch_id = p_batch_id)
        GROUP BY category_id
      ) sub
    ) as by_category,
    (
      SELECT jsonb_object_agg(gov, cnt)
      FROM (
        SELECT COALESCE(governorate, 'غير محدد') as gov, COUNT(*) as cnt
        FROM imported_ads ia3
        WHERE (p_batch_id IS NULL OR ia3.batch_id = p_batch_id)
        GROUP BY governorate
      ) sub
    ) as by_governorate,
    AVG(ia.price)::NUMERIC as avg_price,
    MIN(ia.created_at)::TIMESTAMPTZ as imported_at
  FROM imported_ads ia
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as status_count FROM imported_ads WHERE status = ia.status
    AND (p_batch_id IS NULL OR batch_id = p_batch_id)
  ) sc ON true
  WHERE (p_batch_id IS NULL OR ia.batch_id = p_batch_id)
  GROUP BY ia.batch_id;
END;
$$ LANGUAGE plpgsql;
