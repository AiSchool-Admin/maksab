-- ═══════════════════════════════════════════════════════════════
-- المرحلة 3 — الخطوة 2: معاملات النطاق المتقدمة
-- Phase 3 — Step 2: Advanced Scope Parameters
-- ═══════════════════════════════════════════════════════════════

-- أعمدة جديدة على ahe_scopes
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS subcategory_ar TEXT;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS price_min INTEGER;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS price_max INTEGER;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS product_condition TEXT;  -- 'new' | 'used' | null (الكل)
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS target_seller_type TEXT DEFAULT 'all';  -- 'all' | 'business' | 'individual' | 'verified' | 'whales'
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS target_listing_type TEXT DEFAULT 'all';  -- 'all' | 'featured' | 'elite' | 'featured_and_elite'
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS scope_group TEXT DEFAULT 'general';  -- 'general' | 'whale_hunting' | 'high_value' | 'seasonal'
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS description TEXT;

-- أعمدة إحصائيات الحيتان لكل نطاق
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS total_whales_found INTEGER DEFAULT 0;
ALTER TABLE ahe_scopes ADD COLUMN IF NOT EXISTS total_filtered_out INTEGER DEFAULT 0;

-- CHECK constraints
ALTER TABLE ahe_scopes ADD CONSTRAINT chk_scope_target_seller_type
  CHECK (target_seller_type IN ('all', 'business', 'individual', 'verified', 'whales'));

ALTER TABLE ahe_scopes ADD CONSTRAINT chk_scope_target_listing_type
  CHECK (target_listing_type IN ('all', 'featured', 'elite', 'featured_and_elite'));

ALTER TABLE ahe_scopes ADD CONSTRAINT chk_scope_group
  CHECK (scope_group IN ('general', 'whale_hunting', 'high_value', 'seasonal'));

ALTER TABLE ahe_scopes ADD CONSTRAINT chk_scope_product_condition
  CHECK (product_condition IS NULL OR product_condition IN ('new', 'used'));

-- Index for scope group queries
CREATE INDEX IF NOT EXISTS idx_ahe_scopes_group ON ahe_scopes(scope_group);
CREATE INDEX IF NOT EXISTS idx_ahe_scopes_target ON ahe_scopes(target_seller_type, target_listing_type);
