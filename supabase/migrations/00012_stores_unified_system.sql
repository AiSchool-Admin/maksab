-- ============================================
-- Migration 012: Stores & Unified Seller System
-- نظام المحلات والبائعين الموحد
-- ============================================
-- Adapts the CLAUDE_CODE_DIRECTIVES Phase 1 schema
-- Table mappings: users → profiles, products → ads

-- ============================================
-- 1.1 Modify Existing Tables
-- ============================================

-- Add seller_type to profiles (individual or store)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_type') THEN
    ALTER TABLE profiles ADD COLUMN seller_type TEXT NOT NULL DEFAULT 'individual'
      CHECK (seller_type IN ('individual', 'store'));
  END IF;
END $$;

-- ============================================
-- 1.2 Create New Tables
-- ============================================

-- ==========================================
-- TABLE: stores
-- ==========================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  slug VARCHAR(60) NOT NULL UNIQUE,
  logo_url TEXT,
  cover_url TEXT,
  description VARCHAR(500),
  main_category TEXT NOT NULL,
  sub_categories TEXT[] DEFAULT '{}',
  primary_color VARCHAR(7) DEFAULT '#1B5E20',
  secondary_color VARCHAR(7),
  theme TEXT NOT NULL DEFAULT 'classic'
    CHECK (theme IN ('classic', 'modern', 'elegant', 'sporty')),
  layout TEXT NOT NULL DEFAULT 'grid'
    CHECK (layout IN ('grid', 'list', 'showcase')),
  location_gov TEXT,
  location_area TEXT,
  phone VARCHAR(20),
  working_hours JSONB,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_main_category ON stores(main_category);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);

-- ==========================================
-- TABLE: store_categories (internal sections)
-- ==========================================
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  products_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_store ON store_categories(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_unique ON store_categories(store_id, slug);

-- ==========================================
-- Now add store_id FK to profiles (depends on stores table)
-- ==========================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'store_id') THEN
    ALTER TABLE profiles ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_seller_type ON profiles(seller_type);
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);

-- ==========================================
-- Add store fields to ads table
-- ==========================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'store_id') THEN
    ALTER TABLE ads ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'store_category_id') THEN
    ALTER TABLE ads ADD COLUMN store_category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'is_pinned') THEN
    ALTER TABLE ads ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'original_price') THEN
    ALTER TABLE ads ADD COLUMN original_price DECIMAL(12,2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ads_store_id ON ads(store_id);

-- ==========================================
-- TABLE: store_followers
-- ==========================================
CREATE TABLE IF NOT EXISTS store_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_followers_user ON store_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_store ON store_followers(store_id);

-- ==========================================
-- TABLE: store_reviews
-- ==========================================
CREATE TABLE IF NOT EXISTS store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL UNIQUE,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  accuracy_rating SMALLINT CHECK (accuracy_rating BETWEEN 1 AND 5),
  response_rating SMALLINT CHECK (response_rating BETWEEN 1 AND 5),
  commitment_rating SMALLINT CHECK (commitment_rating BETWEEN 1 AND 5),
  comment TEXT,
  seller_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_reviewer ON store_reviews(reviewer_id);

-- ==========================================
-- TABLE: store_badges
-- ==========================================
CREATE TABLE IF NOT EXISTS store_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL
    CHECK (badge_type IN ('verified', 'trusted', 'active', 'top_seller', 'gold', 'platinum')),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(store_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_store_badges_store ON store_badges(store_id);

-- ==========================================
-- TABLE: store_pinned_products
-- ==========================================
CREATE TABLE IF NOT EXISTS store_pinned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0 CHECK (sort_order <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_store_pinned_store ON store_pinned_products(store_id);

-- ==========================================
-- TABLE: store_analytics
-- ==========================================
CREATE TABLE IF NOT EXISTS store_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_views INT NOT NULL DEFAULT 0,
  unique_visitors INT NOT NULL DEFAULT 0,
  source_search INT NOT NULL DEFAULT 0,
  source_direct INT NOT NULL DEFAULT 0,
  source_followers INT NOT NULL DEFAULT 0,
  source_product_card INT NOT NULL DEFAULT 0,
  top_products UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, date)
);

CREATE INDEX IF NOT EXISTS idx_store_analytics_store_date ON store_analytics(store_id, date DESC);

-- ==========================================
-- TABLE: store_promotions
-- ==========================================
CREATE TABLE IF NOT EXISTS store_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  promo_type TEXT NOT NULL
    CHECK (promo_type IN ('discount', 'bundle', 'free_shipping', 'timed')),
  discount_percent SMALLINT,
  original_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_promotions_store ON store_promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_promotions_active ON store_promotions(is_active, end_at);

-- ==========================================
-- TABLE: store_subscriptions
-- ==========================================
CREATE TABLE IF NOT EXISTS store_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'gold', 'platinum')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'cancelled')),
  price DECIMAL(10,2),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_subscriptions_store ON store_subscriptions(store_id);

-- ==========================================
-- TABLE: user_wishlist
-- ==========================================
CREATE TABLE IF NOT EXISTS user_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_user ON user_wishlist(user_id);

-- ==========================================
-- TABLE: user_recently_viewed
-- ==========================================
CREATE TABLE IF NOT EXISTS user_recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_recently_viewed ON user_recently_viewed(user_id, viewed_at DESC);

-- Keep only last 20 per user
CREATE OR REPLACE FUNCTION trim_recently_viewed() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_recently_viewed
  WHERE id IN (
    SELECT id FROM user_recently_viewed
    WHERE user_id = NEW.user_id
    ORDER BY viewed_at DESC
    OFFSET 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trim_recently_viewed ON user_recently_viewed;
CREATE TRIGGER trg_trim_recently_viewed
  AFTER INSERT ON user_recently_viewed
  FOR EACH ROW EXECUTE FUNCTION trim_recently_viewed();

-- ============================================
-- 1.3 RLS Policies
-- ============================================

-- stores: public read, owner write
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_select') THEN
    CREATE POLICY stores_select ON stores FOR SELECT USING (status = 'active');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_select_own') THEN
    CREATE POLICY stores_select_own ON stores FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_insert') THEN
    CREATE POLICY stores_insert ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_update') THEN
    CREATE POLICY stores_update ON stores FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- store_categories: public read, store owner write
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_select') THEN
    CREATE POLICY store_cats_select ON store_categories FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_insert') THEN
    CREATE POLICY store_cats_insert ON store_categories FOR INSERT
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_update') THEN
    CREATE POLICY store_cats_update ON store_categories FOR UPDATE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_delete') THEN
    CREATE POLICY store_cats_delete ON store_categories FOR DELETE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_followers: public read, user controls own follows
ALTER TABLE store_followers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_followers' AND policyname = 'followers_select') THEN
    CREATE POLICY followers_select ON store_followers FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_followers' AND policyname = 'followers_insert') THEN
    CREATE POLICY followers_insert ON store_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_followers' AND policyname = 'followers_delete') THEN
    CREATE POLICY followers_delete ON store_followers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- store_reviews: public read, reviewer insert, store owner reply
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_reviews' AND policyname = 'reviews_select') THEN
    CREATE POLICY reviews_select ON store_reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_reviews' AND policyname = 'reviews_insert') THEN
    CREATE POLICY reviews_insert ON store_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_reviews' AND policyname = 'reviews_reply') THEN
    CREATE POLICY reviews_reply ON store_reviews FOR UPDATE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()))
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_analytics: owner only
ALTER TABLE store_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_analytics' AND policyname = 'analytics_owner') THEN
    CREATE POLICY analytics_owner ON store_analytics FOR SELECT
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_badges: public read
ALTER TABLE store_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_badges' AND policyname = 'badges_select') THEN
    CREATE POLICY badges_select ON store_badges FOR SELECT USING (true);
  END IF;
END $$;

-- store_pinned_products: public read, store owner write
ALTER TABLE store_pinned_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_pinned_products' AND policyname = 'pinned_select') THEN
    CREATE POLICY pinned_select ON store_pinned_products FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_pinned_products' AND policyname = 'pinned_insert') THEN
    CREATE POLICY pinned_insert ON store_pinned_products FOR INSERT
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_pinned_products' AND policyname = 'pinned_delete') THEN
    CREATE POLICY pinned_delete ON store_pinned_products FOR DELETE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_promotions: public read active, store owner write
ALTER TABLE store_promotions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_select') THEN
    CREATE POLICY promotions_select ON store_promotions FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_select_own') THEN
    CREATE POLICY promotions_select_own ON store_promotions FOR SELECT
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_insert') THEN
    CREATE POLICY promotions_insert ON store_promotions FOR INSERT
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_update') THEN
    CREATE POLICY promotions_update ON store_promotions FOR UPDATE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_subscriptions: owner only
ALTER TABLE store_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_subscriptions' AND policyname = 'subscriptions_select_own') THEN
    CREATE POLICY subscriptions_select_own ON store_subscriptions FOR SELECT
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- user_wishlist: user own data
ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_wishlist' AND policyname = 'wishlist_select') THEN
    CREATE POLICY wishlist_select ON user_wishlist FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_wishlist' AND policyname = 'wishlist_insert') THEN
    CREATE POLICY wishlist_insert ON user_wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_wishlist' AND policyname = 'wishlist_delete') THEN
    CREATE POLICY wishlist_delete ON user_wishlist FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- user_recently_viewed: user own data
ALTER TABLE user_recently_viewed ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_recently_viewed' AND policyname = 'recent_select') THEN
    CREATE POLICY recent_select ON user_recently_viewed FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_recently_viewed' AND policyname = 'recent_insert') THEN
    CREATE POLICY recent_insert ON user_recently_viewed FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_recently_viewed' AND policyname = 'recent_delete') THEN
    CREATE POLICY recent_delete ON user_recently_viewed FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 1.4 Helper Functions
-- ============================================

-- Auto-generate unique slug from store name
CREATE OR REPLACE FUNCTION generate_store_slug(store_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Replace non-alphanumeric (including Arabic) chars with dashes
  base_slug := lower(regexp_replace(store_name, '[^a-zA-Z0-9\u0600-\u06FF]', '-', 'g'));
  -- Collapse multiple dashes
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  -- Trim leading/trailing dashes
  base_slug := trim(both '-' from base_slug);

  -- If slug is empty after cleanup, use a random string
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'store-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM stores WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at for stores (reuse existing function if available)
DROP TRIGGER IF EXISTS trg_stores_updated ON stores;
CREATE TRIGGER trg_stores_updated
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
